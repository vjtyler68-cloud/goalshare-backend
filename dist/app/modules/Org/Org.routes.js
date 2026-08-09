"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Org_controller_1 = require("./Org.controller");
const router = express_1.default.Router();
router.post('/create', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.createOrg);
router.post('/join', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.joinOrg);
router.get('/mine', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.getMine);
router.get('/:id/roster', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.getRoster);
router.post('/summary', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.pushSummary);
router.post('/leave', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.leaveOrg);
exports.OrgRoutes = router;
