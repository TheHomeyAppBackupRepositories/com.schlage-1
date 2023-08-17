"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_zwavedriver_1 = require("homey-zwavedriver");
const homey_1 = __importDefault(require("homey"));
class ZwaveLockDevice extends homey_zwavedriver_1.ZwaveDevice {
    async onNodeInit() {
        if (homey_1.default.env.DEBUG === '1') {
            this.enableDebug();
        }
        this.registerCapability('locked', 'DOOR_LOCK');
        this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', async (report) => {
            if (report
                && report['Notification Type'] === 'Access Control'
                && report['Event (Parsed)'] !== undefined) {
                let source, lockValue;
                switch (report['Event (Parsed)']) {
                    // Lock was locked manually, automatically or via external controller
                    case 'Manual Lock Operation':
                        source = 'Manual';
                        lockValue = true;
                        break;
                    case 'RF Lock Operation':
                        source = 'Remote';
                        lockValue = true;
                        break;
                    case 'Auto Lock Locked Operation':
                        source = 'Auto-lock';
                        lockValue = true;
                        break;
                    case 'Keypad Lock Operation':
                        source = 'Keypad, ID ' + (report['Event Parameter']?.readUInt8() ?? 'unknown');
                        lockValue = true;
                        break;
                    // Lock was unlocked manually or via external controller
                    case 'Manual Unlock Operation':
                        source = 'Manual';
                        lockValue = false;
                        break;
                    case 'RF Unlock Operation':
                        source = 'Remote';
                        lockValue = false;
                        break;
                    case 'Keypad Unlock Operation':
                        source = 'Keypad, ID ' + (report['Event Parameter']?.readUInt8() ?? 'unknown');
                        lockValue = false;
                        break;
                    case 'Lock Jammed':
                        // Lock is jammed, emit event
                        await this.lockJammed().catch(this.error);
                        return;
                    case 'Keypad temporary disabled':
                        // We do not support this event at this time
                        return;
                    default:
                        this.error('Unknown event ' + report['Event (Parsed)']);
                        return;
                }
                const app = this.homey.app;
                await app.setAndTriggerLocked(this, lockValue, source).catch(this.error);
            }
        });
        this.registerCapability('measure_battery', 'BATTERY', {
            getOpts: {
                getOnStart: true,
            },
        });
    }
    async lockJammed() {
        const triggerCard = this.homey.flow.getDeviceTriggerCard('lock_jammed');
        await triggerCard.trigger(this).catch(this.error);
        await this.setCapabilityValue('locked', false).catch(this.error);
    }
    async setPinCode(ID, pin) {
        pin = pin.trim();
        // Check with settings id 16
        const codeLength = this.getSettings()["16"];
        if (pin.length !== codeLength || isNaN(Number(pin))) {
            throw new Error(`Pin should be ${codeLength} digits, ${pin} given`);
        }
        this.log(await this.getCommandClass('USER_CODE').USER_CODE_SET({
            'User Identifier': ID,
            'User ID Status': 'Occupied',
            USER_CODE: Buffer.from(pin),
        }).catch(this.error));
    }
    async deletePinCode(ID) {
        this.log(await this.getCommandClass('USER_CODE').USER_CODE_SET({
            'User Identifier': ID,
            'User ID Status': 'Available (not set)',
            USER_CODE: Buffer.from([0, 0, 0, 0]),
        }).catch(this.error));
    }
    async addCapabilityIfNotPresent(capability) {
        if (this.hasCapability(capability)) {
            return;
        }
        await this.addCapability(capability).catch(this.error);
    }
    async removeCapabilityIfPresent(capability) {
        if (!this.hasCapability(capability)) {
            return;
        }
        await this.removeCapability(capability).catch(this.error);
    }
}
exports.default = ZwaveLockDevice;
module.exports = ZwaveLockDevice;
//# sourceMappingURL=zwaveLockDevice.js.map