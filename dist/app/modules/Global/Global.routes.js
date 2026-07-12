"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalRoutes = void 0;
const express_1 = __importDefault(require("express"));
const Global_controller_1 = require("./Global.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// MyWhy Routes
router.get('/mywhy', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.getMyMyWhy);
router.get('/mywhy/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.getMyWhyById);
router.post('/mywhy', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.createMyWhy);
router.patch('/mywhy/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.updateMyWhy);
router.delete('/mywhy/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.deleteMyWhy);
// Affirmation Routes
router.get('/affirmation/my-affirmation', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.getMyAffirmation);
router.get('/affirmation/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.getAffirmationById);
router.post('/affirmation', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.createAffirmation);
router.patch('/affirmation/my-affirmation/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.updateAffirmation);
router.delete('/affirmation/my-affirmation/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER, client_1.UserRoleEnum.ADMIN), Global_controller_1.GlobalController.deleteAffirmation);
exports.GlobalRoutes = router;
