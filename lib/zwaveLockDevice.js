"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homey_zwavedriver_1 = require("homey-zwavedriver");
class ZwaveLockDevice extends homey_zwavedriver_1.ZwaveDevice {
    async onNodeInit() {
        this.registerCapability('locked', 'DOOR_LOCK');
        this.registerReportListener('NOTIFICATION', 'NOTIFICATION_REPORT', (report) => {
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
                        source = 'Keypad, ID ' + report['Event Parameter'].readUInt8();
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
                        source = 'Keypad, ID ' + report['Event Parameter'].readUInt8();
                        lockValue = false;
                        break;
                    // Lock is jammed, emit event
                    case 'Lock Jammed':
                        this.lockJammed()
                            .catch(this.error);
                        return;
                    default:
                        throw new Error('Unknown event ' + report['Event (Parsed)']);
                }
                const app = this.homey.app;
                app.setAndTriggerLocked(this, lockValue, source);
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
        await triggerCard.trigger(this);
        await this.setCapabilityValue('locked', false);
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
        await this.addCapability(capability);
    }
    async removeCapabilityIfPresent(capability) {
        if (!this.hasCapability(capability)) {
            return;
        }
        await this.removeCapability(capability);
    }
}
exports.default = ZwaveLockDevice;
module.exports = ZwaveLockDevice;
//# sourceMappingURL=zwaveLockDevice.js.map