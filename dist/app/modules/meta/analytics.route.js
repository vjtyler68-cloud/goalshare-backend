"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const analytics_controller_1 = require("./analytics.controller");
const report_controller_1 = require("./report.controller");
const router = express_1.default.Router();
router.get('/admin', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), analytics_controller_1.MetaController.fetchDashboardMetaData);
router.get('/report-table-data', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), analytics_controller_1.MetaController.getReportTableData);
router.get('/user', (0, auth_1.default)(client_1.UserRoleEnum.USER), report_controller_1.ReportController.getUserReports);
exports.MetaRoutes = router;
