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
exports.SubscriptionServices = void 0;
const http_status_1 = __importDefault(require("http-status"));
const prisma_1 = require("../../utils/prisma");
const client_1 = require("@prisma/client");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const stripe_1 = require("../../utils/stripe");
// Create Subscription
const createIntoDb = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, price, subscriptionType, duration } = req.body;
    let stripePriceId = null;
    let stripeProductId = null;
    // Only create Stripe price for paid subscriptions
    if (subscriptionType === client_1.SubscriptionType.MONTHLY ||
        subscriptionType === client_1.SubscriptionType.YEARLY) {
        if (!price || price <= 0)
            throw new AppError_1.default(400, 'Price must be greater than 0 for paid subscriptions');
        // Create Stripe Product
        const product = yield stripe_1.stripe.products.create({
            name: title,
            description: subscriptionType,
            active: true,
        });
        // Create Stripe Price
        const stripePrice = yield stripe_1.stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(price * 100),
            currency: 'usd',
            recurring: {
                interval: subscriptionType === client_1.SubscriptionType.MONTHLY ? 'month' : 'year',
            },
        });
        stripeProductId = product.id;
        stripePriceId = stripePrice.id;
    }
    const subscription = yield prisma_1.prisma.subscription.create({
        data: {
            title,
            price: parseFloat(price),
            subscriptionType,
            duration,
            stripePriceId,
            stripeProductId,
        },
    });
    return subscription;
});
// Get All Subscription (Optional Filtering)
const getAllSubscription = () => __awaiter(void 0, void 0, void 0, function* () {
    const subscriptions = yield prisma_1.prisma.subscription.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    return subscriptions;
});
const assignSubscriptionToUser = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { subscriptionId, methodId } = payload;
    const user = yield prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    // Check required user fields for Stripe
    if (!user.email || !user.fullName) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'User profile must be complete (email and name) before purchasing a subscription.');
    }
    const subscription = yield prisma_1.prisma.subscription.findUnique({
        where: { id: subscriptionId },
    });
    if (!subscription)
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Subscription not found');
    const isPaidSubscription = subscription.subscriptionType === client_1.SubscriptionType.MONTHLY ||
        subscription.subscriptionType === client_1.SubscriptionType.YEARLY;
    if (isPaidSubscription) {
        if (user.subscriptionId &&
            user.subscriptionEnd &&
            user.subscriptionEnd > new Date()) {
            if (user.subscriptionId === subscriptionId) {
                throw new AppError_1.default(http_status_1.default.CONFLICT, 'You are already subscribed to this plan.');
            }
            throw new AppError_1.default(http_status_1.default.CONFLICT, 'You currently have an active subscription. Please cancel your current plan or wait for it to expire before purchasing a new one.');
        }
    }
    // --- 2. FREE Subscription Flow (Direct Activation) ---
    if (subscription.subscriptionType === client_1.SubscriptionType.FREE) {
        if (user.hasUsedFree) {
            throw new AppError_1.default(http_status_1.default.CONFLICT, 'You have already used FREE subscription');
        } // Calculate start and end dates for FREE plan
        const startDate = new Date();
        const endDate = new Date();
        if (subscription.subscriptionType === client_1.SubscriptionType.FREE) {
            endDate.setDate(endDate.getDate() + subscription.duration);
        }
        else if (subscription.subscriptionType === client_1.SubscriptionType.MONTHLY) {
            endDate.setMonth(endDate.getMonth() + subscription.duration);
        }
        else if (subscription.subscriptionType === client_1.SubscriptionType.YEARLY) {
            endDate.setFullYear(endDate.getFullYear() + subscription.duration);
        }
        // Update user subscription info
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                subscriptionId: subscription.id,
                subscriptionStart: startDate,
                subscriptionEnd: endDate,
                hasUsedFree: true,
            },
        });
        yield prisma_1.prisma.payment.create({
            data: {
                userId,
                subscriptionId: subscription.id,
                amount: 0,
                currency: 'usd',
                status: client_1.PaymentStatus.SUCCESS,
            },
        });
        return {
            message: 'FREE Subscription assigned successfully.',
            user: updatedUser,
        };
    }
    // --- 3. PAID Subscription Flow (Stripe Initiation) ---
    // Check if Payment Method ID is provided for paid plans
    if (!methodId) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Payment method ID is required for paid subscriptions.');
    }
    // A. Validate Stripe Price ID
    if (!subscription.stripePriceId) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Subscription plan is missing Stripe Price ID. Contact support.');
    }
    try {
        // B. Get or Create Stripe Customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = yield stripe_1.stripe.customers.create({
                email: user.email,
                name: user.fullName,
                metadata: { userId: user.id },
            });
            console.log('Created Stripe customer:', customer.id);
            customerId = customer.id;
            yield prisma_1.prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customerId },
            });
        }
        const retrievedMethod = yield stripe_1.stripe.paymentMethods.retrieve(methodId);
        console.log('Retrieved PaymentMethod:', retrievedMethod.id); // If this fails, error is here
        // If using Stripe Connect, add stripeAccount header if needed: { stripeAccount: 'acct_xxx' }
        yield stripe_1.stripe.paymentMethods.attach(methodId, { customer: customerId });
        yield stripe_1.stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: methodId },
        });
        // D. Create Stripe Subscription
        const stripeSubscription = yield stripe_1.stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: subscription.stripePriceId }],
            expand: ['latest_invoice.payment_intent'],
        });
        // E. Extract PaymentIntent (uncomment clientSecret if needed for 3D Secure)
        const latestInvoice = stripeSubscription.latest_invoice;
        const paymentIntent = latestInvoice === null || latestInvoice === void 0 ? void 0 : latestInvoice.payment_intent;
        if (!paymentIntent) {
            throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Payment initiation failed. Could not retrieve payment intent.');
        }
        yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                subscriptionId: subscription.id,
            },
        });
        // const clientSecret = paymentIntent.client_secret; // Uncomment if frontend needs it
        const stripeSubscriptionId = stripeSubscription.id;
        const stripePaymentId = paymentIntent.id;
        // F. Create PENDING local Payment record
        yield prisma_1.prisma.payment.create({
            data: {
                userId,
                subscriptionId: subscription.id,
                amount: subscription.price,
                currency: 'usd',
                status: client_1.PaymentStatus.PENDING,
                stripePaymentId,
                stripeSubscriptionId,
                stripeCustomerId: customerId,
            },
        });
        // G. Return to frontend
        return {
            message: 'Payment initiation successful.',
            // clientSecret, // Uncomment if needed
            stripeSubscriptionId,
        };
    }
    catch (error) {
        console.error('Stripe Subscription Creation Error:', error);
        if (error.type === 'StripeInvalidRequestError' &&
            error.code === 'resource_missing') {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, `Invalid PaymentMethod ID: ${methodId}. Ensure it's created with the correct API keys and try again.`);
        }
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, `Failed to initiate payment with Stripe: ${error.message || 'Unknown error'}. Please try again.`);
    }
});
//* in app purchase
const verifyToken = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { productId, purchaseToken, // Android
    receipt, // iOS
    platform, // 'android' | 'ios'
     } = req.body;
    // ── Validation ───────────────────────────────────────────────────────────
    if (!productId || !platform) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Missing required fields');
    }
    if (!['android', 'ios'].includes(platform)) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'platform must be "android" or "ios"');
    }
    if (platform === 'android' && !purchaseToken) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'purchaseToken required for Android');
    }
    if (platform === 'ios' && !receipt) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'receipt required for iOS');
    }
    // // ── Verify ───────────────────────────────────────────────────────────────
    // if (platform === 'android') {
    //   const { isValid, expiryTime } = await verifyGooglePlayToken(
    //     productId,
    //     purchaseToken,
    //   );
    //   if (!isValid) {
    //     throw new AppError(
    //       httpStatus.BAD_REQUEST,
    //       'Invalid or expired Google Play purchase',
    //     );
    //   }
    //   return { isValid, expiryTime, platform };
    // }
    // if (platform === 'ios') {
    //   const { isValid, expiryTime } = await verifyAppleReceipt(receipt);
    //   if (!isValid) {
    //     throw new AppError(
    //       httpStatus.BAD_REQUEST,
    //       'Invalid or expired Apple receipt',
    //     );
    //   }
    //   return { isValid, expiryTime, platform };
    // }
});
const updateInAppPurchasePlanData = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { subscriptionId, amount, currency = 'usd', subscriptionStart, subscriptionEnd, planPurchaseToken, platform, // 'android' | 'ios'
     } = req.body;
    if (!subscriptionId || !amount || !subscriptionStart || !subscriptionEnd) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Missing required fields');
    }
    if (!subscriptionId || !amount || !subscriptionStart || !subscriptionEnd) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Missing required fields');
    }
    return yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const currentUser = yield tx.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                email: true,
                subscriptionId: true,
                subscriptionStart: true,
                subscriptionEnd: true,
            },
        });
        if (!currentUser) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'User not found');
        }
        yield tx.payment.create({
            data: {
                userId,
                subscriptionId,
                amount,
                currency,
                status: client_1.PaymentStatus.SUCCESS,
            },
        });
        const updateUser = yield tx.user.update({
            where: { id: userId },
            data: {
                subscriptionId,
                subscriptionStart: new Date(subscriptionStart),
                subscriptionEnd: new Date(subscriptionEnd),
                planPurchaseToken,
                platform,
            },
        });
        return {
            updateUser,
        };
    }));
});
const getMySubscription = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = req.user.id;
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            subscriptionStart: true,
            subscriptionEnd: true,
            platform: true,
            subscriptionId: true,
        },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    }
    // ─── No Subscription ──────────────────────────────────────
    if (!user.subscriptionStart || !user.subscriptionEnd) {
        return {
            hasPlan: false,
            subscription: {
                platform: null,
                startDate: user.subscriptionStart,
                endDate: user.subscriptionEnd,
                remainingDays: null,
            },
        };
    }
    const now = new Date();
    const endDate = new Date(user.subscriptionEnd);
    const startDate = new Date(user.subscriptionStart);
    const remainingDays = Math.max(Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0);
    // ─── Expired ──────────────────────────────────────────────
    if (remainingDays === 0) {
        yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                subscriptionId: null,
                subscriptionStart: null,
                subscriptionEnd: null,
            },
        });
        return {
            hasPlan: false,
            subscription: {
                platform: (_a = user.platform) !== null && _a !== void 0 ? _a : null,
                startDate,
                endDate,
                remainingDays,
            },
        };
    }
    // ─── Active ───────────────────────────────────────────────
    return {
        hasPlan: true,
        subscription: {
            platform: user.platform,
            startDate,
            endDate,
            remainingDays,
        },
    };
});
const getSubscriptionByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield prisma_1.prisma.subscription.findUnique({
        where: { id },
    });
    return subscription;
});
// // Update Subscription
const updateIntoDb = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield prisma_1.prisma.subscription.update({
        where: { id },
        data: Object.assign(Object.assign(Object.assign(Object.assign({}, (data.title && { title: data.title })), (data.price && { price: parseFloat(data.price) })), (data.subscriptionType && {
            subscriptionType: data.subscriptionType,
        })), (data.duration && { duration: data.duration })),
    });
    return subscription;
});
// const updateIntoDb = async (id: string, data: Partial<any>) => {
//   const existing = await prisma.subscription.findUnique({
//     where: { id },
//   });
//   if (!existing) {
//     throw new AppError(404, 'Subscription not found');
//   }
//   const title = data.title || existing.title;
//   const price = data.price ? parseFloat(data.price) : existing.price;
//   const subscriptionType = data.subscriptionType || existing.subscriptionType;
//   const duration =
//     data.duration !== undefined ? data.duration : existing.duration;
//   let stripePriceId: string | null = existing.stripePriceId;
//   let stripeProductId: string | null = existing.stripeProductId;
//   // Handle Stripe updates for paid subscriptions (create new product and price)
//   if (
//     subscriptionType === SubscriptionType.MONTHLY ||
//     subscriptionType === SubscriptionType.YEARLY
//   ) {
//     if (!price || price <= 0) {
//       throw new AppError(
//         400,
//         'Price must be greater than 0 for paid subscriptions',
//       );
//     }
//     // Create new Stripe Product
//     const product = await stripe.products.create({
//       name: title,
//       description: subscriptionType,
//       active: true,
//     });
//     // Create new Stripe Price
//     const stripePrice = await stripe.prices.create({
//       product: product.id,
//       unit_amount: Math.round(price * 100),
//       currency: 'usd',
//       recurring: {
//         interval:
//           subscriptionType === SubscriptionType.MONTHLY ? 'month' : 'year',
//       },
//     });
//     stripeProductId = product.id;
//     stripePriceId = stripePrice.id;
//   } else {
//     stripePriceId = null;
//     stripeProductId = null;
//   }
//   const subscription = await prisma.subscription.update({
//     where: { id },
//     data: {
//       title,
//       price,
//       subscriptionType,
//       duration,
//       stripePriceId,
//       stripeProductId,
//     },
//   });
//   return subscription;
// };
// Hard Delete Subscription
const deleteIntoDb = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield prisma_1.prisma.subscription.update({
        where: { id },
        data: { isActive: false },
    });
    return subscription;
});
const deleteMySubscription = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    }
    if (!user.subscriptionId) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'You do not have an active subscription to delete');
    }
    const updatedUser = yield prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            subscriptionId: null,
            subscriptionStart: null,
            subscriptionEnd: null,
        },
    });
    return updatedUser;
});
exports.SubscriptionServices = {
    createIntoDb,
    assignSubscriptionToUser,
    getAllSubscription,
    getSubscriptionByIdFromDB,
    updateIntoDb,
    deleteIntoDb,
    getMySubscription,
    deleteMySubscription,
    updateInAppPurchasePlanData,
    verifyToken,
};
