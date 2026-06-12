"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const Subscription_controller_1 = require("./Subscription.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
// import { ensureApproved } from '../../middlewares/ensureApprove';
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = require("../../utils/prisma");
const router = express_1.default.Router();
router.get('/', Subscription_controller_1.SubscriptionController.getAllSubscription);
router.post('/verify-token', Subscription_controller_1.SubscriptionController.verifySubscription);
router.get('/current-date', (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentDate = new Date();
    const date = {
        currentDate,
    };
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved my Subscription ',
        data: date,
    });
})));
router.get('/my-subscription', (0, auth_1.default)(client_1.UserRoleEnum.USER), 
// ensureApproved,
Subscription_controller_1.SubscriptionController.getMySubscription);
router.get('/:id', Subscription_controller_1.SubscriptionController.getSubscriptionById);
//user-select subscription
router.post('/buy-plan', (0, auth_1.default)(), Subscription_controller_1.SubscriptionController.updateInAppPlan);
router.post('/cancel-plan', (0, auth_1.default)(), (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const updateUser = yield prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionId: null,
            subscriptionStart: null,
            subscriptionEnd: null,
            planPurchaseToken: null,
            platform: null,
        },
    });
    res.send(updateUser).json();
})));
// admin create subscription
router.post('/', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), Subscription_controller_1.SubscriptionController.createIntoDb);
router.put('/:id', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), Subscription_controller_1.SubscriptionController.updateIntoDb);
router.delete('/delete-my-subscription', (0, auth_1.default)(client_1.UserRoleEnum.USER), Subscription_controller_1.SubscriptionController.deleteMySubscription);
router.delete('/:id', (0, auth_1.default)(client_1.UserRoleEnum.ADMIN), Subscription_controller_1.SubscriptionController.deleteIntoDb);
exports.SubscriptionRoutes = router;
