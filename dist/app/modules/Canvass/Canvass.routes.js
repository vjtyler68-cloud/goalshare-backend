"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvassRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Canvass_controller_1 = require("./Canvass.controller");
const router = express_1.default.Router();
// All membership-enforced in the service layer (admin → all org pins,
// rep → only their own).
router.post('/:orgId/pin', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.createPin);
router.get('/:orgId/pins', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.listPins);
router.patch('/pin/:pinId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.updatePin);
// Assign/reassign a lead to a rep (admin only, enforced in the service).
router.patch('/pin/:pinId/assign', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.assignPin);
router.delete('/pin/:pinId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.deletePin);
// Territories (drawn areas assigned to reps).
router.post('/:orgId/territory', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.createTerritory);
router.get('/:orgId/territories', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.listTerritories);
router.patch('/territory/:territoryId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.updateTerritory);
router.delete('/territory/:territoryId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.deleteTerritory);
exports.CanvassRoutes = router;
