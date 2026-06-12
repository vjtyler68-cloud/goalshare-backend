"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageValidation = void 0;
const zod_1 = __importDefault(require("zod"));
// Send Message Validation
const sendMessage = zod_1.default.object({
    body: zod_1.default.object({
        receiverId: zod_1.default.string({
            required_error: 'ReceiverId is required!',
        }),
        content: zod_1.default.string().optional(),
        fileUrls: zod_1.default.array(zod_1.default.string()).optional()
    }),
});
// Get Conversation Validation
const getConversation = zod_1.default.object({
    body: zod_1.default.object({
        with: zod_1.default.string({
            required_error: 'Other members id is required!',
        }),
    }),
});
exports.messageValidation = {
    sendMessage,
    getConversation,
};
