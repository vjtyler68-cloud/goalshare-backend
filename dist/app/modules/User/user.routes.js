"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRouters = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_controller_1 = require("./user.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_validation_1 = require("./user.validation");
const fileUploader_1 = require("../../utils/fileUploader");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.get('/', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN, client_1.UserRoleEnum.USER), user_controller_1.UserControllers.getAllUsers);
router.get('/unapproved-users', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), user_controller_1.UserControllers.getUnapprovedUsers);
router.get('/me', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN, client_1.UserRoleEnum.USER), user_controller_1.UserControllers.getMyProfile);
router.get('/:id', (0, auth_1.default)('ANY'), user_controller_1.UserControllers.getUserDetails);
router.delete('/soft-delete', (0, auth_1.default)('ANY'), user_controller_1.UserControllers.softDeleteUser);
router.delete('/hard-delete/:id', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), user_controller_1.UserControllers.hardDeleteUser);
router.put('/update-profile', (0, auth_1.default)('ANY'), user_controller_1.UserControllers.updateMyProfile);
router.put('/update-profile-image', (0, auth_1.default)('ANY'), fileUploader_1.upload.single('file'), user_controller_1.UserControllers.updateProfileImage);
router.put('/user-role/:id', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), validateRequest_1.default.body(user_validation_1.userValidation.updateUserRoleSchema), user_controller_1.UserControllers.updateUserRoleStatus);
router.put('/user-status/:id', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), validateRequest_1.default.body(user_validation_1.userValidation.updateUserStatus), user_controller_1.UserControllers.updateUserStatus);
router.put('/approve-user', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), user_controller_1.UserControllers.updateUserApproval);
router.put('/update-user/:id', fileUploader_1.upload.single('file'), 
// auth(UserRoleEnum.ADMIN),
validateRequest_1.default.body(user_validation_1.userValidation.updateUser), user_controller_1.UserControllers.updateUser);
exports.UserRouters = router;
