"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountabilityRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Accountability_controller_1 = require("./Accountability.controller");
const router = express_1.default.Router();
// Scheduler-triggered weekly pairing (secret-guarded, no user auth).
router.post('/run-pairing', Accountability_controller_1.AccountabilityControllers.runWeeklyPairing);
// Profile (matching pool + reputation).
router.get('/profile', (0, auth_1.default)('ANY'), Accountability_controller_1.AccountabilityControllers.getMyProfile);
router.post('/profile', (0, auth_1.default)('ANY'), Accountability_controller_1.AccountabilityControllers.upsertProfile);
router.post('/optin', (0, auth_1.default)('ANY'), Accountability_controller_1.AccountabilityControllers.setOptIn);
// Current match + cycle actions.
router.get('/match', (0, auth_1.default)('ANY'), Accountability_controller_1.AccountabilityControllers.getCurrentMatch);
router.post('/checkin', (0, auth_1.default)('ANY'), Accountability_controller_1.AccountabilityControllers.logCheckIn);
router.post('/extend', (0, auth_1.default)('ANY'), Accountability_controller_1.AccountabilityControllers.requestExtend);
router.post('/rate', (0, auth_1.default)('ANY'), Accountability_controller_1.AccountabilityControllers.submitRating);
exports.AccountabilityRoutes = router;
