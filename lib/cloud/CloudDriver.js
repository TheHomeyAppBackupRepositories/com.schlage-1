"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const homey_oauth2app_1 = require("homey-oauth2app");
class CloudDriver extends homey_oauth2app_1.OAuth2Driver {
    async onPairListDevices({ oAuth2Client }) {
        const devices = (await oAuth2Client.listDevices().catch(this.error)) ?? [];
        this.log('Cloud devices found', JSON.stringify(devices));
        return devices.map(device => this.convertDevice(device));
    }
    convertDevice(device) {
        const oAuthDeviceResult = {
            name: `${device.name} (${device.type})`,
            data: {
                id: device.id,
            },
        };
        this.log('Device result', JSON.stringify(oAuthDeviceResult));
        return oAuthDeviceResult;
    }
}
exports.default = CloudDriver;
//# sourceMappingURL=CloudDriver.js.map