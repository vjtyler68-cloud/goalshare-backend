"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotivationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const Motivation_controller_1 = require("./Motivation.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const fileUploader_1 = require("../../utils/fileUploader");
const router = express_1.default.Router();
router.get('/', Motivation_controller_1.MotivationController.getAllMotivation);
router.get('/my-motivation', (0, auth_1.default)(client_1.UserRoleEnum.USER), Motivation_controller_1.MotivationController.getMyMotivation);
router.get('/:id', Motivation_controller_1.MotivationController.getMotivationById);
router.post('/', (0, auth_1.default)(client_1.UserRoleEnum.USER), fileUploader_1.upload.single('file'), Motivation_controller_1.MotivationController.createIntoDb);
router.patch('/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER), fileUploader_1.upload.single('file'), Motivation_controller_1.MotivationController.updateIntoDb);
router.delete('/:id', Motivation_controller_1.MotivationController.deleteIntoDb);
exports.MotivationRoutes = router;
