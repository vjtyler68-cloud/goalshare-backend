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
exports.StripeWebHook = void 0;
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const catchAsync_1 = __importDefault(require("./catchAsync"));
const sendResponse_1 = __importDefault(require("./sendResponse"));
const config_1 = __importDefault(require("../../config"));
const prisma_1 = require("./prisma");
const stripe_1 = require("./stripe");
const client_1 = require("@prisma/client");
exports.StripeWebHook = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Missing Stripe signature');
    }
    const result = yield StripeHook(req.body, sig);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        message: 'Webhook processed successfully',
        data: result,
    });
}));
const StripeHook = (rawBody, signature) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(rawBody, signature, config_1.default.stripe.stripe_webhook);
    }
    catch (err) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Webhook signature verification failed: ${err.message}`);
    }
    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            // Try to find a payment record first
            const existingPayment = yield prisma_1.prisma.payment.findUnique({
                where: { stripePaymentId: paymentIntent.id },
                select: { userId: true, subscriptionId: true },
            });
            if (existingPayment) {
                yield prisma_1.prisma.payment.update({
                    where: { stripePaymentId: paymentIntent.id },
                    data: {
                        status: client_1.PaymentStatus.SUCCESS,
                        amount: paymentIntent.amount,
                        stripeCustomerId: paymentIntent.customer,
                    },
                });
            }
            else {
                console.log(`No payment record found for PaymentIntent ${paymentIntent.id}`);
            }
            break;
        }
        case 'invoice.payment_succeeded': {
            const invoice = event.data.object;
            const stripeSubscriptionId = invoice.subscription;
            const stripeCustomerId = invoice.customer;
            if (!stripeSubscriptionId) {
                console.log('Invoice has no subscription ID, skipping.');
                break;
            }
            // 1. Find the local Payment record using the saved Stripe Subscription ID
            const existingPayment = yield prisma_1.prisma.payment.findUnique({
                where: { stripeSubscriptionId: stripeSubscriptionId },
                select: { id: true, userId: true, subscriptionId: true },
            });
            // **CRITICAL: The logic goes HERE**
            if (existingPayment) {
                // 2. Fetch the actual subscription details for duration
                const subscription = yield prisma_1.prisma.subscription.findUnique({
                    where: { id: existingPayment.subscriptionId },
                });
                if (subscription) {
                    // 3. Update User's subscription dates (This assumes the payment confirms the active subscription)
                    const startDate = new Date();
                    const endDate = new Date();
                    if (subscription.subscriptionType === client_1.SubscriptionType.MONTHLY) {
                        endDate.setMonth(endDate.getMonth() + subscription.duration);
                    }
                    else if (subscription.subscriptionType === client_1.SubscriptionType.YEARLY) {
                        endDate.setFullYear(endDate.getFullYear() + subscription.duration);
                    }
                    yield prisma_1.prisma.user.update({
                        where: { id: existingPayment.userId },
                        data: {
                            subscriptionStart: startDate,
                            subscriptionEnd: endDate,
                            // Optionally: store Stripe Customer ID on User if needed
                            stripeCustomerId: stripeCustomerId,
                        },
                    });
                    // 4. Update the Payment record status (Now existingPayment.id is available)
                    yield prisma_1.prisma.payment.update({
                        where: { id: existingPayment.id },
                        data: {
                            status: client_1.PaymentStatus.SUCCESS,
                            amount: invoice.amount_paid / 100,
                            stripeCustomerId: stripeCustomerId,
                            stripePaymentId: invoice.payment_intent,
                        },
                    });
                }
            }
            else {
                console.log(`No payment record found for Stripe Subscription ID ${stripeSubscriptionId}. This could be a renewal/recurring invoice.`);
            }
            break;
        }
        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            const sessionId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.paymentId;
            if (sessionId) {
                yield prisma_1.prisma.payment.update({
                    where: { id: sessionId },
                    data: { status: client_1.PaymentStatus.FAILED },
                });
            }
            else {
                console.log('Payment failed but no session/paymentId found.');
            }
            break;
        }
        case 'checkout.session.completed': {
            const session = event.data.object;
            yield handleCheckoutSessionCompleted(session);
            break;
        }
        case 'checkout.session.expired': {
            const session = event.data.object;
            yield handleCheckoutSessionCanceled(session);
            break;
        }
        default:
            console.log('Unhandled Stripe event type:', event.type);
            return { status: 'unhandled_event', type: event.type };
    }
});
// Handle one-time checkout session completion
const handleCheckoutSessionCompleted = (session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const paymentId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.paymentId;
    if (!paymentId)
        return;
    const stripeIdToLink = session.mode === 'subscription'
        ? session.subscription
        : session.payment_intent;
    if (!stripeIdToLink) {
        console.log(`No primary Stripe ID (Subscription/PaymentIntent) on session ${session.id}, skipping immediate update.`);
    }
    yield prisma_1.prisma.payment.update({
        where: { id: paymentId },
        data: Object.assign(Object.assign(Object.assign({ 
            // Save the session ID
            stripeSessionId: session.id }, (session.mode === 'subscription' &&
            session.subscription && {
            stripeSubscriptionId: session.subscription,
        })), (session.mode === 'payment' &&
            session.payment_intent && {
            stripePaymentId: session.payment_intent,
        })), { status: session.mode === 'payment'
                ? client_1.PaymentStatus.SUCCESS
                : client_1.PaymentStatus.PENDING }),
    });
    return yield prisma_1.prisma.payment.findUnique({ where: { id: paymentId } });
});
// Handle canceled checkout sessions
const handleCheckoutSessionCanceled = (session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const paymentId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.paymentId;
    if (!paymentId)
        return;
    yield prisma_1.prisma.payment.update({
        where: { id: paymentId },
        data: {
            status: client_1.PaymentStatus.CANCELED,
            stripeSessionId: session.id,
        },
    });
    return yield prisma_1.prisma.payment.findUnique({ where: { id: paymentId } });
});
