"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("./payment.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.get('/admin', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), payment_controller_1.PaymentController.getAllForAdmin);
router.post('/cancel/:id', (0, auth_1.default)('ANY'), payment_controller_1.PaymentController.cancelPayment);
router.get('/admin/:id', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), payment_controller_1.PaymentController.getSingleForAdmin);
router.get('/', (0, auth_1.default)(client_1.UserRoleEnum.USER), payment_controller_1.PaymentController.getAllForUser);
router.get('/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER), payment_controller_1.PaymentController.getSingleForUser);
router.get('/session/:stripeSessionId', (0, auth_1.default)(client_1.UserRoleEnum.USER), payment_controller_1.PaymentController.singleTransactionHistoryBySessionId);
exports.PaymentRoutes = router;
