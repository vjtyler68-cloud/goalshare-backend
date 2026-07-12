"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const Leads_controller_1 = require("./Leads.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();

// Every route requires the user's token (raw JWT, no Bearer prefix — app
// convention) and operates only on the authenticated user's own leads.
router.get('/', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Leads_controller_1.LeadsController.getMyLeads);
router.post('/', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Leads_controller_1.LeadsController.createLead);

// One-time bulk upload of a phone's existing local leads (upsert by clientId).
// Declared before '/:id' so 'sync' is never captured as an id parameter.
router.post('/sync', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Leads_controller_1.LeadsController.syncLeads);

router.patch('/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Leads_controller_1.LeadsController.updateLead);
router.delete('/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Leads_controller_1.LeadsController.deleteLead);

exports.LeadsRoutes = router;
