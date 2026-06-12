"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const Vision_controller_1 = require("./Vision.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const fileUploader_1 = require("../../utils/fileUploader");
const router = express_1.default.Router();
router.get('/', Vision_controller_1.VisionController.getAllVision);
router.get('/my-vision', (0, auth_1.default)(client_1.UserRoleEnum.USER), Vision_controller_1.VisionController.getMyVision);
router.get('/:id', Vision_controller_1.VisionController.getVisionById);
router.post('/', (0, auth_1.default)(client_1.UserRoleEnum.USER), fileUploader_1.upload.single('file'), Vision_controller_1.VisionController.createIntoDb);
router.delete('/:id', Vision_controller_1.VisionController.deleteIntoDb);
exports.VisionRoutes = router;
