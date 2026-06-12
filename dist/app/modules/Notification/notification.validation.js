"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationValidation = void 0;
const zod_1 = require("zod");
const updateEmailSettings = zod_1.z.object({
    body: zod_1.z.object({
        scheduleEntry: zod_1.z.boolean().optional(),
        reschedule: zod_1.z.boolean().optional(),
        message: zod_1.z.boolean().optional(),
        connectionRequest: zod_1.z.boolean().optional(),
        businessCardRequest: zod_1.z.boolean().optional(),
    })
});
exports.notificationValidation = {
    updateEmailSettings
};
