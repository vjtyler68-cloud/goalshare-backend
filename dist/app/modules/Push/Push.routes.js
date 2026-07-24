"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Push_controller_1 = require("./Push.controller");
const router = express_1.default.Router();
router.get('/health', Push_controller_1.PushControllers.health);
router.post('/notify', (0, auth_1.default)('ANY'), Push_controller_1.PushControllers.notify);
exports.PushRoutes = router;
