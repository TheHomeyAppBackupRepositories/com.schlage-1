"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const homey_log_1 = require("homey-log");
const homey_oauth2app_1 = require("homey-oauth2app");
const source_map_support_1 = __importDefault(require("source-map-support"));
const SchlageDefinitions_1 = require("./types/SchlageDefinitions");
source_map_support_1.default.install();
class SchlageApp extends homey_oauth2app_1.OAuth2App {
    constructor() {
        super(...arguments);
        this._webhook = null;
        this._lastRegistrationRefresh = null;
    }
    async onOAuth2Init() {
        try {
            await super.onOAuth2Init();
            this.homeyLog = new homey_log_1.Log({ homey: this.homey });
            // Register flows
            // Triggers are only assigned to a class variable to easier trigger them, done through another method
            this._lockTrigger = this.homey.flow.getDeviceTriggerCard('locked_true');
            this._unlockTrigger = this.homey.flow.getDeviceTriggerCard('locked_false');
            // Condition
            const alarmIntrusionCondition = this.homey.flow.getConditionCard('alarm_intrusion');
            alarmIntrusionCondition.registerRunListener(async (args) => {
                return args.device.getCapabilityValue('alarm_intrusion');
            });
            // Action
            const addCloudPINAction = this.homey.flow.getActionCard('add_pin_cloud');
            addCloudPINAction.registerRunListener(async (args) => {
                const name = args.name;
                if (name.length < 1 || name.length > 12) {
                    throw new Error('User name should be between 1 and 12 characters!');
                }
                // First delete
                await this.deletePin(args.pin, args.device, name);
                // Then add
                this.log('Add pin', args.pin);
                await args.device.oAuth2Client.createAccessCode(args.device.id, args.pin, name).catch(this.error);
            });
            const deleteCloudPINAction = this.homey.flow.getActionCard('delete_pin_cloud');
            deleteCloudPINAction.registerRunListener(async (args) => {
                this.log('Delete pin', args.pin);
                await this.deletePin(args.pin, args.device);
            });
            const setZwavePINAction = this.homey.flow.getActionCard('set_pin_zwave');
            setZwavePINAction.registerRunListener(async (args) => {
                await args.device.setPinCode(args.ID, args.pin);
            });
            const deleteZwavePINAction = this.homey.flow.getActionCard('delete_pin_zwave');
            deleteZwavePINAction.registerRunListener(async (args) => {
                await args.device.deletePinCode(args.ID);
            });
            this.log('Schlage has been initialized');
        }
        catch (e) {
            this.log('Schlage failed to initialize');
            this.error(e);
        }
    }
    async deletePin(pin, device, name = null) {
        const existingAccessCodes = await device.oAuth2Client.listAccessCodes(device.id).catch(this.error);
        this.log('Existing codes', existingAccessCodes);
        if (existingAccessCodes) {
            pin = pin.trim();
            const firstAccessCode = existingAccessCodes.accessCodes[0];
            if (pin.length !== firstAccessCode.accessCodeLength || isNaN(Number(pin))) {
                throw new Error('Pin should be the a number of the same length as the existing codes');
            }
            const matchingAccessCode = existingAccessCodes.accessCodes.find(accessCode => accessCode.code === pin);
            this.log('Matching code', matchingAccessCode);
            if (matchingAccessCode) {
                await device.oAuth2Client.deleteAccessCode(device.id, matchingAccessCode.accessCodeId).catch(this.error);
            }
            if (name !== null) {
                const matchingNameAccessCode = existingAccessCodes.accessCodes.find(accessCode => accessCode.name.toLowerCase() === name.toLowerCase());
                this.log('Matching code by name', matchingNameAccessCode);
                if (matchingNameAccessCode && (!matchingAccessCode || matchingNameAccessCode.accessCodeId !== matchingAccessCode?.accessCodeId)) {
                    await device.oAuth2Client.deleteAccessCode(device.id, matchingNameAccessCode.accessCodeId).catch(this.error);
                }
            }
        }
    }
    /** Check if there's an Athom webhook */
    hasWebhook() {
        return this._webhook !== null;
    }
    /** Athom webhook registration */
    async registerWebhook(userId) {
        if (this._webhook) {
            await this._webhook.unregister().catch(this.error);
        }
        this._webhook = await this.homey.cloud.createWebhook(homey_1.default.env.WEBHOOK_ID, homey_1.default.env.WEBHOOK_SECRET, {
            $keys: [userId],
        }).catch(this.error);
        this._webhook?.on('message', this._onWebhookMessage.bind(this));
    }
    /** Make Schlage event registration, will be valid for one day */
    async registerRegistration(userId, api) {
        if (!this.shallHandleRegistration()) {
            return;
        }
        this.log('Try to unregister, is ok if it fails');
        await api.unregisterRegistration().catch(this.log);
        await api.registerRegistration(userId).catch(this.error);
        this._lastRegistrationRefresh = Date.now();
    }
    async refreshRegistration(userId, api) {
        if (!this.shallHandleRegistration()) {
            return;
        }
        this.log('Refreshing registration');
        const registrationDetails = await api.getRegistrationDetails().catch(this.error);
        this.log('Current registration details', registrationDetails);
        if (!registrationDetails || registrationDetails.customIdentifier !== userId) {
            this.log('Registration not correct, re-registering');
            await this.registerRegistration(userId, api);
        }
        else {
            // Simply refresh
            await api.refreshRegistration().catch(this.error);
        }
        this._lastRegistrationRefresh = Date.now();
    }
    shallHandleRegistration() {
        return !this._lastRegistrationRefresh || Date.now() - this._lastRegistrationRefresh > 1000 * 60 * 60; // Only handle registration stuff once per hour
    }
    async _onWebhookMessage(message) {
        this.log('Webhook received', message);
        if (message.body.length !== 1) {
            return this.error('Webhook can not be processed!');
        }
        const payload = message.body[0].data;
        // Find device
        const device = this.homey.drivers.getDriver('cloud_lock').getDevices()
            .find((device) => device.getData().id === payload.deviceId);
        if (!device) {
            return this.error('Webhook for unknown device received!');
        }
        // Handle message
        switch (payload.eventType) {
            case SchlageDefinitions_1.eventType_accessCode:
                await this.setAndTriggerLocked(device, payload.lockState === SchlageDefinitions_1.lockState_locked, 'Access code: ' + payload.triggeredBy);
                break;
            case SchlageDefinitions_1.eventType_autoRelock:
                await this.setAndTriggerLocked(device, payload.lockState === SchlageDefinitions_1.lockState_locked, 'Auto relock');
                break;
            case SchlageDefinitions_1.eventType_1TouchLocking:
                await this.setAndTriggerLocked(device, payload.lockState === SchlageDefinitions_1.lockState_locked, '1 touch lock');
                break;
            case SchlageDefinitions_1.eventType_thumbturn:
                await this.setAndTriggerLocked(device, payload.lockState === SchlageDefinitions_1.lockState_locked, 'Thumbturn');
                break;
            case SchlageDefinitions_1.eventType_virtualKey:
                await this.setAndTriggerLocked(device, payload.lockState === SchlageDefinitions_1.lockState_locked, 'Virtual key: ' + payload.triggeredBy);
                break;
            case SchlageDefinitions_1.eventType_forcedEntry:
                await device.setCapabilityValue('alarm_intrusion', true);
                this.homey.setTimeout(() => device.setCapabilityValue('alarm_intrusion', false), 1000 * 60 * 5 // Reset after 5 minutes
                );
                break;
            case SchlageDefinitions_1.eventType_batteryLow:
            case SchlageDefinitions_1.eventType_batteryCriticallyLow:
                await device.setCapabilityValue('alarm_battery', true);
                break;
            case SchlageDefinitions_1.eventType_lockOffline:
                await device.setUnavailable(this.homey.__('unavailable-not-connected'));
                break;
            case SchlageDefinitions_1.eventType_accessCodeCreate:
                await this.homey.notifications.createNotification({
                    excerpt: this.homey.__('access-code-create', {
                        deviceName: payload.deviceName,
                        accessCodeName: payload.accessCode?.name
                    })
                });
                break;
            case SchlageDefinitions_1.eventType_accessCodeUpdate:
                await this.homey.notifications.createNotification({
                    excerpt: this.homey.__('access-code-update', {
                        deviceName: payload.deviceName,
                        accessCodeName: payload.accessCode?.name
                    })
                });
                break;
            case SchlageDefinitions_1.eventType_accessCodeDelete:
                await this.homey.notifications.createNotification({
                    excerpt: this.homey.__('access-code-delete', {
                        deviceName: payload.deviceName,
                        accessCodeName: payload.accessCode?.name
                    })
                });
                break;
            case SchlageDefinitions_1.eventType_lockOnline:
                await device.setAvailable();
                break;
            default:
                throw new Error('Webhook type not supported!');
        }
    }
    /** Set capability, then trigger with source token */
    async setAndTriggerLocked(device, locked, source) {
        await device.setCapabilityValue('locked', locked);
        const trigger = locked ? this._lockTrigger : this._unlockTrigger;
        await trigger.trigger(device, { source: source });
    }
    // Flow triggers
    // eslint-disable-next-line @typescript-eslint/ban-types
    triggerLock(device, tokens) {
        this.log('Triggering lock', tokens);
        const lockValue = device.getCapabilityValue('locked');
        if (lockValue === false) {
            this.log('Not triggering flow, value changed in the mean time');
            return;
        }
        this._lockTrigger.trigger(device, tokens).catch(this.error);
    }
    // eslint-disable-next-line @typescript-eslint/ban-types
    triggerUnlock(device, tokens) {
        this.log('Triggering unlock', tokens);
        const lockValue = device.getCapabilityValue('locked');
        if (lockValue === true) {
            this.log('Not triggering flow, value changed in the mean time');
            return;
        }
        this._unlockTrigger.trigger(device, tokens).catch(this.error);
    }
}
exports.default = SchlageApp;
SchlageApp.OAUTH2_CLIENT = require('./lib/SchlageApi');
SchlageApp.OAUTH2_DRIVERS = ['cloud_view_series'];
SchlageApp.OAUTH2_DEBUG = homey_1.default.env.DEBUG === '1';
module.exports = SchlageApp;
//# sourceMappingURL=app.js.map