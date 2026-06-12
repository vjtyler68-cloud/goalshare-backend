"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRouters = void 0;
const express_1 = __importDefault(require("express"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const message_controller_1 = require("./message.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const message_validation_1 = require("./message.validation");
const router = express_1.default.Router();
// Send message
router.post('/send', (0, auth_1.default)('ANY'), validateRequest_1.default.body(message_validation_1.messageValidation.sendMessage), message_controller_1.MessageControllers.sendMessage);
// Get conversation between two users
router.get('/conversation/:id', (0, auth_1.default)('ANY'), message_controller_1.MessageControllers.getConversation);
router.get('/conversation-list', (0, auth_1.default)('ANY'), message_controller_1.MessageControllers.getAllConversationUsers);
// Mark message as read
router.patch('/mark-read/:messageId', (0, auth_1.default)('ANY'), message_controller_1.MessageControllers.markMessageAsRead);
// Delete message
router.delete('/delete/:messageId', (0, auth_1.default)('ANY'), message_controller_1.MessageControllers.deleteMessage);
exports.MessageRouters = router;
