"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharingRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Sharing_controller_1 = require("./Sharing.controller");
const router = express_1.default.Router();
router.post('/settings', (0, auth_1.default)('ANY'), Sharing_controller_1.SharingControllers.upsertSettings);
router.get('/summary/:userId', (0, auth_1.default)('ANY'), Sharing_controller_1.SharingControllers.getSummary);
exports.SharingRoutes = router;
