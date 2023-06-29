"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
const homey_oauth2app_1 = require("homey-oauth2app");
const SchlageDefinitions_1 = require("../types/SchlageDefinitions");
class SchlageApiImpl extends homey_oauth2app_1.OAuth2Client {
    async listDevices() {
        return await this.get({
            path: '/Devices',
        });
    }
    async getDeviceStatus(id) {
        return await this.get({
            path: `/Devices/${id}`,
        });
    }
    async lock(id) {
        await this.post({
            path: `/Devices/${id}/lock`,
        });
    }
    async unlock(id) {
        await this.post({
            path: `/Devices/${id}/unlock`,
        });
    }
    async registerRegistration(userId) {
        return await this.post({
            path: `/Events/registrations/${userId}`,
        });
    }
    async refreshRegistration() {
        return await this.put({
            path: '/Events/registrations',
        });
    }
    async unregisterRegistration() {
        return await this.delete({
            path: `/Events/registrations`,
        });
    }
    async getRegistrationDetails() {
        return await this.get({
            path: '/Events/registrations',
        });
    }
    async listWebhook() {
        return await this.get({
            path: '/Events/subscriptions',
        });
    }
    async createAccessCode(id, code, user) {
        const existingAccessCodes = await this.listAccessCodes(id);
        code = code.trim();
        if (existingAccessCodes) {
            const firstAccessCode = existingAccessCodes.accessCodes[0];
            if (code.length !== firstAccessCode.accessCodeLength || isNaN(Number(code))) {
                throw new Error('Pin should be the a number of the same length as the existing codes');
            }
        }
        return await this.post({
            path: `/Devices/${id}/accesscodes`,
            json: {
                name: user,
                accessCode: code,
                schedule: {
                    scheduleType: SchlageDefinitions_1.scheduleType_always,
                },
            },
        });
    }
    async listAccessCodes(id) {
        return await this.get({
            path: `/Devices/${id}/accesscodes`,
        });
    }
    async deleteAccessCode(id, codeId) {
        return await this.delete({
            path: `/Devices/${id}/accesscodes/${codeId}`,
        });
    }
    async get(data) {
        return super.get(this.addHeaders(data));
    }
    async delete(data) {
        return super.delete(this.addHeaders(data));
    }
    async post(data) {
        return super.post(this.addHeaders(data));
    }
    async put(data) {
        return super.put(this.addHeaders(data));
    }
    addHeaders(data) {
        const headers = {
            'Content-Type': 'application/json',
            'alle-subscription-key': SchlageApiImpl.API_KEY,
        };
        data.headers = data.headers ? { ...data.headers, ...headers } : headers;
        return data;
    }
    async onHandleNotOK(args) {
        this.log('Not ok', args);
        this.log('body', args.body);
        return super.onHandleNotOK(args);
    }
}
SchlageApiImpl.AUTHORIZATION_URL = homey_1.default.env.OAUTH_AUTHORIZATION_URL;
SchlageApiImpl.TOKEN_URL = homey_1.default.env.OAUTH_TOKEN_URL;
SchlageApiImpl.API_URL = homey_1.default.env.API_BASE_URL;
SchlageApiImpl.SCOPES = ['openid', 'email'];
SchlageApiImpl.API_KEY = homey_1.default.env.SCHLAGE_API_KEY;
module.exports = SchlageApiImpl;
//# sourceMappingURL=SchlageApi.js.map