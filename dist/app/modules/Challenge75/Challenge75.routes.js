"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Challenge75Routes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Challenge75_controller_1 = require("./Challenge75.controller");
const router = express_1.default.Router();
// Optional friend accountability for the 75 Challenge. All routes are
// authenticated with the app's own account (JWT) — no Firebase involved.
router.post('/crew', (0, auth_1.default)('ANY'), Challenge75_controller_1.Challenge75Controllers.createCrew);
router.post('/crew/join', (0, auth_1.default)('ANY'), Challenge75_controller_1.Challenge75Controllers.joinCrew);
router.post('/crew/leave', (0, auth_1.default)('ANY'), Challenge75_controller_1.Challenge75Controllers.leaveCrew);
router.post('/crew/progress', (0, auth_1.default)('ANY'), Challenge75_controller_1.Challenge75Controllers.pushProgress);
router.get('/crew/:code/members', (0, auth_1.default)('ANY'), Challenge75_controller_1.Challenge75Controllers.listMembers);
exports.Challenge75Routes = router;
