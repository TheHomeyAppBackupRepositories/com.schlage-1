"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const homey_oauth2app_1 = require("homey-oauth2app");
const SchlageDefinitions_1 = require("../../types/SchlageDefinitions");
class CloudDevice extends homey_oauth2app_1.OAuth2Device {
    constructor() {
        super(...arguments);
        this.debugEnabled = false;
        this.registrationInterval = null;
        this.batteryStatusTimeout = null;
    }
    async onOAuth2Init() {
        this.debugEnabled = homey_1.default.env.DEBUG === '1';
        await super.onOAuth2Init();
        this.id = this.getData().id;
        // Reset intrusion alarm
        await this.setCapabilityValue('alarm_intrusion', false).catch(this.error);
        // Get initial state
        const deviceStatus = await this.oAuth2Client.getDeviceStatus(this.id).catch(this.error);
        this.log('Initial status', deviceStatus);
        if (deviceStatus) {
            // Set lock state
            let lockCapabilityValue;
            switch (deviceStatus.lockState) {
                case SchlageDefinitions_1.lockState_locked:
                    lockCapabilityValue = true;
                    break;
                case SchlageDefinitions_1.lockState_unlocked:
                case SchlageDefinitions_1.lockState_jammed:
                    lockCapabilityValue = false;
                    break;
                case SchlageDefinitions_1.lockState_unknown:
                default:
                    lockCapabilityValue = null;
            }
            await this.setCapabilityValue('locked', lockCapabilityValue).catch(this.error);
            // Set battery state
            await this.setBatteryValue(deviceStatus.batteryState);
            // Set available
            if (deviceStatus.connected) {
                await this.setAvailable().catch(this.error);
            }
            else {
                await this.setUnavailable(this.homey.__('unavailable-not-connected'));
            }
        }
        // Get user id from oAuth
        let oAuthUserId = this.getStoreValue(CloudDevice.OAUTHUSER_STOREKEY);
        if (!oAuthUserId) {
            const accessToken = this.oAuth2Client.getToken().access_token;
            if (accessToken.length < 1) {
                throw new Error('Access token not found');
            }
            const tokenParts = accessToken.split('.');
            if (tokenParts.length < 2) {
                throw new Error('Access token has wrong format');
            }
            try {
                oAuthUserId = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString()).sub;
                await this.setStoreValue(CloudDevice.OAUTHUSER_STOREKEY, oAuthUserId).catch(this.error);
            }
            catch (e) {
                throw new Error('Access token parsing failed' + JSON.stringify(e));
            }
        }
        // Register Athom web hook
        const app = this.homey.app;
        if (!app.hasWebhook()) {
            await app.registerWebhook(oAuthUserId).catch(this.error);
        }
        // Register event registration and refresh
        await app.registerRegistration(oAuthUserId, this.oAuth2Client);
        this.registrationInterval = this.homey.setInterval(() => app.refreshRegistration(oAuthUserId, this.oAuth2Client), 1000 * 60 * 60 * 2); // Refresh every two hours
        // Register listeners
        this.registerCapabilityListener('locked', async (capabilityValue) => {
            const currentValue = this.getCapabilityValue('locked');
            this.log('Capability locked changed', capabilityValue, currentValue);
            if (currentValue === capabilityValue) {
                this.log('Value did not change?');
                return;
            }
            if (capabilityValue) {
                await this.oAuth2Client.lock(this.id).catch(this.error);
                app.triggerLock(this, { source: 'Homey' });
            }
            else {
                await this.oAuth2Client.unlock(this.id).catch(this.error);
                app.triggerUnlock(this, { source: 'Homey' });
            }
        });
        this.registerCapabilityListener('button.refresh_battery', async (pressed) => {
            if (!pressed) {
                return;
            }
            if (this.batteryStatusTimeout !== null) {
                throw new Error(this.homey.__('battery_timeout_running'));
            }
            this.log('Refreshing battery status');
            const deviceStatus = await this.oAuth2Client.getDeviceStatus(this.id).catch(this.error);
            if (deviceStatus) {
                await this.setBatteryValue(deviceStatus.batteryState);
                this.batteryStatusTimeout = this.homey.setTimeout(() => this.batteryStatusTimeout = null, 60000); // Only allow this once per minute
            }
        });
    }
    async setBatteryValue(batteryState) {
        let batteryCapabilityValue;
        switch (batteryState) {
            case SchlageDefinitions_1.batteryState_normal:
                batteryCapabilityValue = false;
                break;
            case SchlageDefinitions_1.batteryState_low:
            case SchlageDefinitions_1.batteryState_criticallylow:
                batteryCapabilityValue = true;
                break;
            case SchlageDefinitions_1.batteryState_unknown:
            default:
                batteryCapabilityValue = null;
        }
        await this.setCapabilityValue('alarm_battery', batteryCapabilityValue).catch(this.error);
    }
    async removeCapabilityIfPresent(capability) {
        if (!this.hasCapability(capability)) {
            return;
        }
        this.log('Removing capability', capability);
        await this.removeCapability(capability).catch(this.error);
    }
    async addCapabilityIfNotPresent(capability) {
        if (this.hasCapability(capability)) {
            return;
        }
        this.log('Adding capability', capability);
        await this.addCapability(capability).catch(this.error);
    }
    async onOAuth2Uninit() {
        if (this.registrationInterval) {
            this.homey.clearInterval(this.registrationInterval);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(...args) {
        super.log(`[d:${this.id}]`, ...args);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug(...args) {
        if (!this.debugEnabled) {
            return;
        }
        super.log(`[d:${this.id}]`, ...args);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(...args) {
        super.error(`[d:${this.id}]`, ...args);
    }
}
exports.default = CloudDevice;
CloudDevice.OAUTHUSER_STOREKEY = 'oauth-user-id';
//# sourceMappingURL=CloudDevice.js.map