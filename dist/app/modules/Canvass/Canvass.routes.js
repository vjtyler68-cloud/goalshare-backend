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
// Pre-load a pin on every home in an area (admin).
router.post('/:orgId/seed-area', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.seedArea);
router.get('/:orgId/pins', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.listPins);
router.patch('/pin/:pinId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.updatePin);
// Assign/reassign a lead to a rep (admin only, enforced in the service).
router.patch('/pin/:pinId/assign', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.assignPin);
router.delete('/pin/:pinId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.deletePin);
// Property enrichment. Pin-based is CACHED (one paid lookup per door, ever) and
// on-demand; the address form stays for ad-hoc lookups.
router.get('/pin/:pinId/enrich', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.enrichPin);
// Skip-trace a door for resident name + phone + email (cached).
router.get('/pin/:pinId/contact', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.contactPin);
// Google Solar potential for a door (cached).
router.get('/pin/:pinId/solar', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.solarPin);
// Location sunlight from PVGIS — free, no key, global coverage.
router.post('/:orgId/irradiance', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.irradiance);
router.get('/:orgId/enrich', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.enrich);
// Territories (drawn areas assigned to reps).
router.post('/:orgId/territory', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.createTerritory);
router.get('/:orgId/territories', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.listTerritories);
router.patch('/territory/:territoryId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.updateTerritory);
router.post('/territory/:territoryId/populate', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.populateTerritory);
router.post('/territory/:territoryId/populate/cancel', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.cancelTerritoryPopulation);
router.delete('/territory/:territoryId', (0, auth_1.default)('ANY'), Canvass_controller_1.CanvassControllers.deleteTerritory);
exports.CanvassRoutes = router;
