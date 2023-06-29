"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventTypes = exports.eventType_lockOnline = exports.eventType_accessCodeDelete = exports.eventType_accessCodeUpdate = exports.eventType_accessCodeCreate = exports.eventType_lockOffline = exports.eventType_batteryCriticallyLow = exports.eventType_batteryLow = exports.eventType_forcedEntry = exports.eventType_virtualKey = exports.eventType_thumbturn = exports.eventType_1TouchLocking = exports.eventType_autoRelock = exports.eventType_accessCode = exports.scheduleTypes = exports.scheduleType_temporary = exports.scheduleType_recurring = exports.scheduleType_always = exports.lockStates = exports.lockState_unknown = exports.lockState_jammed = exports.lockState_locked = exports.lockState_unlocked = exports.batteryStates = exports.batteryState_unknown = exports.batteryState_criticallylow = exports.batteryState_low = exports.batteryState_normal = void 0;
exports.batteryState_normal = 'Normal';
exports.batteryState_low = 'Low';
exports.batteryState_criticallylow = 'CriticallyLow';
exports.batteryState_unknown = 'Unknown';
exports.batteryStates = [
    exports.batteryState_normal,
    exports.batteryState_low,
    exports.batteryState_criticallylow,
    exports.batteryState_unknown
];
exports.lockState_unlocked = 'Unlocked';
exports.lockState_locked = 'Locked';
exports.lockState_jammed = 'Jammed';
exports.lockState_unknown = 'Unknown';
exports.lockStates = [
    exports.lockState_unlocked,
    exports.lockState_locked,
    exports.lockState_jammed,
    exports.lockState_unknown,
];
exports.scheduleType_always = 'Always';
exports.scheduleType_recurring = 'Recurring';
exports.scheduleType_temporary = 'Temporary';
exports.scheduleTypes = [
    exports.scheduleType_always,
    exports.scheduleType_recurring,
    exports.scheduleType_temporary,
];
exports.eventType_accessCode = 'AccessCode';
exports.eventType_autoRelock = 'AutoRelock';
exports.eventType_1TouchLocking = '1TouchLocking';
exports.eventType_thumbturn = 'Thumbturn';
exports.eventType_virtualKey = 'VirtualKey';
exports.eventType_forcedEntry = 'ForcedEntry';
exports.eventType_batteryLow = 'BatteryLow';
exports.eventType_batteryCriticallyLow = 'BatteryCriticallyLow';
exports.eventType_lockOffline = 'LockOffline';
exports.eventType_accessCodeCreate = 'AccessCodeCreate';
exports.eventType_accessCodeUpdate = 'AccessCodeUpdate';
exports.eventType_accessCodeDelete = 'AccessCodeDelete';
exports.eventType_lockOnline = 'LockOnline';
exports.eventTypes = [
    exports.eventType_accessCode,
    exports.eventType_autoRelock,
    exports.eventType_1TouchLocking,
    exports.eventType_thumbturn,
    exports.eventType_virtualKey,
    exports.eventType_forcedEntry,
    exports.eventType_batteryLow,
    exports.eventType_batteryCriticallyLow,
    exports.eventType_lockOffline,
    exports.eventType_accessCodeCreate,
    exports.eventType_accessCodeUpdate,
    exports.eventType_accessCodeDelete,
    exports.eventType_lockOnline,
];
//# sourceMappingURL=SchlageDefinitions.js.map