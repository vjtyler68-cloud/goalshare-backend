import httpStatus from 'http-status';
import { Request } from 'express';
import { prisma } from '../../utils/prisma';
import { PaymentStatus, SubscriptionType } from '@prisma/client';
import AppError from '../../errors/AppError';
import { stripe } from '../../utils/stripe';
import config from '../../../config';
import Stripe from 'stripe';

// Create Subscription
const createIntoDb = async (req: Request) => {
  const { title, price, subscriptionType, duration } = req.body;

  let stripePriceId: string | null = null;
  let stripeProductId: string | null = null;

  // Only create Stripe price for paid subscriptions
  if (
    subscriptionType === SubscriptionType.MONTHLY ||
    subscriptionType === SubscriptionType.YEARLY
  ) {
    if (!price || price <= 0)
      throw new AppError(
        400,
        'Price must be greater than 0 for paid subscriptions',
      );

    // Create Stripe Product
    const product = await stripe.products.create({
      name: title,
      description: subscriptionType,
      active: true,
    });

    // Create Stripe Price
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100),
      currency: 'usd',
      recurring: {
        interval:
          subscriptionType === SubscriptionType.MONTHLY ? 'month' : 'year',
      },
    });
    stripeProductId = product.id;
    stripePriceId = stripePrice.id;
  }

  const subscription = await prisma.subscription.create({
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
};

// Get All Subscription (Optional Filtering)
const getAllSubscription = async (query: Record<string, any>) => {
  const { subscriptionType } = query;

  const subscriptions = await prisma.subscription.findMany({
    where: subscriptionType
      ? {
          subscriptionType: subscriptionType as any,
        }
      : {},
    orderBy: {
      createdAt: 'desc',
    },
  });

  return subscriptions;
};
const assignSubscriptionToUser = async (userId: string, payload: any) => {
  const { subscriptionId, methodId, stripePriceId } = payload;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  // Check required user fields for Stripe
  if (!user.email || !user.fullName) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User profile must be complete (email and name) before purchasing a subscription.',
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription)
    throw new AppError(httpStatus.BAD_REQUEST, 'Subscription not found');

  const isPaidSubscription =
    subscription.subscriptionType === SubscriptionType.MONTHLY ||
    subscription.subscriptionType === SubscriptionType.YEARLY;

  if (isPaidSubscription) {
    if (
      user.subscriptionId &&
      user.subscriptionEnd &&
      user.subscriptionEnd > new Date()
    ) {
      if (user.subscriptionId === subscriptionId) {
        throw new AppError(
          httpStatus.CONFLICT,
          'You are already subscribed to this plan.',
        );
      }

      throw new AppError(
        httpStatus.CONFLICT,
        'You currently have an active subscription. Please cancel your current plan or wait for it to expire before purchasing a new one.',
      );
    }
  }

  // --- 2. FREE Subscription Flow (Direct Activation) ---
  if (subscription.subscriptionType === SubscriptionType.FREE) {
    if (user.hasUsedFree) {
      throw new AppError(
        httpStatus.CONFLICT,
        'You have already used FREE subscription',
      );
    } // Calculate start and end dates for FREE plan

    const startDate = new Date();
    const endDate = new Date();
    if (subscription.subscriptionType === SubscriptionType.FREE) {
      endDate.setDate(endDate.getDate() + subscription.duration);
    } else if (subscription.subscriptionType === SubscriptionType.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + subscription.duration);
    } else if (subscription.subscriptionType === SubscriptionType.YEARLY) {
      endDate.setFullYear(endDate.getFullYear() + subscription.duration);
    }
    // Update user subscription info

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionId: subscription.id,
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        hasUsedFree: true,
      },
    }); // Create SUCCESS payment row

    await prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        amount: 0,
        currency: 'usd',
        status: PaymentStatus.SUCCESS,
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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment method ID is required for paid subscriptions.',
    );
  }

  console.log('method', methodId);

  // A. Validate Stripe Price ID
  if (!subscription.stripePriceId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Subscription plan is missing Stripe Price ID. Contact support.',
    );
  }

  try {
    // B. Get or Create Stripe Customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // C. Attach Payment Method and set as default
    const retrievedMethod = await stripe.paymentMethods.retrieve(methodId);
    console.log('Retrieved PaymentMethod:', retrievedMethod.id);

    await stripe.paymentMethods.attach(methodId, { customer: customerId });

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: methodId,
      },
    });

    // D. Create Stripe Subscription with 'default_incomplete' payment behavior
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: subscription.stripePriceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    // E. Extract Client Secret
    const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Payment initiation failed. Could not retrieve client secret.',
      );
    }

    // const clientSecret = paymentIntent.client_secret;
    const stripeSubscriptionId = stripeSubscription.id;
    const stripePaymentId = paymentIntent.id;

    // F. Create PENDING local Payment record
    await prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        amount: subscription.price,
        currency: 'usd',
        status: PaymentStatus.PENDING,
        stripePaymentId,
        stripeSubscriptionId,
        stripeCustomerId: customerId,
      },
    });

    // G. Return clientSecret for frontend payment confirmation
    return {
      message:
        'Payment initiation successful. Client secret provided for confirmation.',
      // clientSecret: clientSecret,
      stripeSubscriptionId: stripeSubscriptionId,
      // NOTE: We DO NOT update user's local subscription start/end/ID here. The Webhook handles it.
    };
  } catch (error: any) {
    console.error('Stripe Subscription Creation Error:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to initiate payment with Stripe: ${error.message || 'Unknown error'}. Please try again.`,
    );
  }
};

// const assignSubscriptionToUser = async (userId: string, payload: any) => {
//   const { subscriptionId, methodId } = payload;
//   console.log({ subscriptionId, methodId });

//   const user = await prisma.user.findUnique({ where: { id: userId } });
//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

//   const subscription = await prisma.subscription.findUnique({
//     where: { id: subscriptionId },
//   });
//   if (!subscription)
//     throw new AppError(httpStatus.BAD_REQUEST, 'Subscription not found');

//   const isPaidSubscription =
//     subscription.subscriptionType === 'MONTHLY' ||
//     subscription.subscriptionType === 'YEARLY';

//   if (isPaidSubscription) {
//     if (
//       user.subscriptionId &&
//       user.subscriptionEnd &&
//       user.subscriptionEnd > new Date()
//     ) {
//       if (user.subscriptionId === subscriptionId) {
//         throw new AppError(
//           httpStatus.CONFLICT,
//           'You are already subscribed to this plan.',
//         );
//       }

//       throw new AppError(
//         httpStatus.CONFLICT,
//         'You currently have an active subscription. Please cancel your current plan or wait for it to expire before purchasing a new one.',
//       );
//     }
//   }

//   // FREE subscription check
//   if (
//     subscription.subscriptionType === SubscriptionType.FREE &&
//     user.hasUsedFree
//   ) {
//     throw new AppError(
//       httpStatus.CONFLICT,
//       'You have already used FREE subscription',
//     );
//   }

//   // Calculate start and end dates
//   const startDate = new Date();
//   const endDate = new Date();
//   if (subscription.subscriptionType === SubscriptionType.FREE) {
//     endDate.setDate(endDate.getDate() + subscription.duration);
//   } else if (subscription.subscriptionType === SubscriptionType.MONTHLY) {
//     endDate.setMonth(endDate.getMonth() + subscription.duration);
//   } else if (subscription.subscriptionType === SubscriptionType.YEARLY) {
//     endDate.setFullYear(endDate.getFullYear() + subscription.duration);
//   }

//   // Update user subscription info
//   const updatedUser = await prisma.user.update({
//     where: { id: userId },
//     data: {
//       subscriptionId: subscription.id,
//       subscriptionStart: startDate,
//       subscriptionEnd: endDate,
//       hasUsedFree:
//         subscription.subscriptionType === SubscriptionType.FREE ||
//         user.hasUsedFree,
//     },
//   });

//   // Create payment row
//   const payment = await prisma.payment.create({
//     data: {
//       userId,
//       subscriptionId: subscription.id,
//       amount:
//         subscription.subscriptionType === SubscriptionType.FREE
//           ? 0
//           : subscription.price,
//       currency: 'usd',
//       status:
//         subscription.subscriptionType === SubscriptionType.FREE
//           ? PaymentStatus.SUCCESS
//           : PaymentStatus.PENDING,
//     },
//   });
//   console.log('payment from subscription', payment);

//   const stripePrice = await stripe.prices.retrieve(
//     subscription.stripePriceId as string,
//   );
//   const product = await stripe.products.retrieve(stripePrice.product as string);

//   if (!stripePrice || !stripePrice.active) {
//     throw new AppError(httpStatus.NOT_ACCEPTABLE, 'Inactive package in Stripe');
//   }

//   // 4️⃣ Create customer if not exists
//   let customerId = user.stripeCustomerId;
//   if (!customerId) {
//     const customer = await stripe.customers.create({
//       email: user.email,
//     });
//     customerId = customer.id;
//     await prisma.user.update({
//       where: { id: userId },
//       data: { stripeCustomerId: customerId },
//     });
//   }

//   // return {
//   //   message:
//   //     subscription.subscriptionType === SubscriptionType.FREE
//   //       ? 'Subscription assigned successfully'
//   //       : 'Subscription assigned. Please complete payment.',
//   //   user: updatedUser,
//   //   subscription,
//   // };

//   return null;
// };
//............................//

// Get Subscription by ID

const getMySubscription = async (userId: string) => {
  const userWithSubscription = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      payments: {
        where: {
          status: PaymentStatus.SUCCESS,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!userWithSubscription || !userWithSubscription.subscription) {
    return null;
  }

  const sub = userWithSubscription.subscription;

  if (sub.subscriptionType === SubscriptionType.FREE) {
    const hasSuccessfulPayment = userWithSubscription.payments.some(
      payment => payment.subscriptionId === sub.id,
    );

    if (
      !userWithSubscription.subscriptionStart ||
      !userWithSubscription.subscriptionEnd ||
      !hasSuccessfulPayment
    ) {
      return null;
    }
  }

  const now = new Date();
  const end = userWithSubscription.subscriptionEnd || now;
  const remainingDays = Math.max(
    Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );

  return {
    subscription: {
      id: sub.id,
      title: sub.title,
      type: sub.subscriptionType,
      duration: sub.duration,
      startDate: userWithSubscription.subscriptionStart,
      endDate: userWithSubscription.subscriptionEnd,
      remainingDays,
    },
  };
};

const getSubscriptionByIdFromDB = async (id: string) => {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
  });

  return subscription;
};

// Update Subscription
const updateIntoDb = async (id: string, data: Partial<any>) => {
  const subscription = await prisma.subscription.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.price && { price: parseFloat(data.price) }),
      ...(data.subscriptionType && {
        subscriptionType: data.subscriptionType,
      }),
      ...(data.duration && { duration: data.duration }),
    },
  });

  return subscription;
};

// Hard Delete Subscription
const deleteIntoDb = async (id: string) => {
  const subscription = await prisma.subscription.delete({
    where: { id },
  });

  return subscription;
};

const deleteMySubscription = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.subscriptionId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You do not have an active subscription to delete',
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: null,
      subscriptionStart: null,
      subscriptionEnd: null,
    },
  });

  return updatedUser;
};

export const SubscriptionServices = {
  createIntoDb,
  assignSubscriptionToUser,
  getAllSubscription,
  getSubscriptionByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  getMySubscription,
  deleteMySubscription,
};
