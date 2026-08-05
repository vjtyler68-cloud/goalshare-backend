"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CirclesRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Circles_controller_1 = require("./Circles.controller");
const router = express_1.default.Router();
router.post('/create', (0, auth_1.default)('ANY'), Circles_controller_1.CirclesControllers.createCircle);
router.get('/mine', (0, auth_1.default)('ANY'), Circles_controller_1.CirclesControllers.getMyCircle);
router.post('/checkin', (0, auth_1.default)('ANY'), Circles_controller_1.CirclesControllers.checkinCircle);
router.post('/shield', (0, auth_1.default)('ANY'), Circles_controller_1.CirclesControllers.burnShield);
router.post('/leave', (0, auth_1.default)('ANY'), Circles_controller_1.CirclesControllers.leaveCircle);
exports.CirclesRoutes = router;
