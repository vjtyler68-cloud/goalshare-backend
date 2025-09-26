import httpStatus from 'http-status';
import { Request } from 'express';
import { prisma } from '../../utils/prisma';
import { PaymentStatus, SubscriptionType } from '@prisma/client';
import AppError from '../../errors/AppError';
import { stripe } from '../../utils/stripe';
import config from '../../../config';

// Create Subscription
const createIntoDb = async (req: Request) => {
  const { title, price, subscriptionType, duration } = req.body;

  let stripePriceId: string | null = null;

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

    stripePriceId = stripePrice.id;
  }

  const subscription = await prisma.subscription.create({
    data: {
      title,
      price: parseFloat(price),
      subscriptionType,
      duration,
      stripePriceId,
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

const assignSubscriptionToUser = async (
  userId: string,
  subscriptionId: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription)
    throw new AppError(httpStatus.BAD_REQUEST, 'Subscription not found');

  // FREE subscription check
  if (
    subscription.subscriptionType === SubscriptionType.FREE &&
    user.hasUsedFree
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      'You have already used FREE subscription',
    );
  }

  // Calculate start and end dates
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
      hasUsedFree:
        subscription.subscriptionType === SubscriptionType.FREE ||
        user.hasUsedFree,
    },
  });

  // Create payment row
  const payment = await prisma.payment.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      amount:
        subscription.subscriptionType === SubscriptionType.FREE
          ? 0
          : subscription.price,
      currency: 'usd',
      status:
        subscription.subscriptionType === SubscriptionType.FREE
          ? PaymentStatus.SUCCESS
          : PaymentStatus.PENDING,
    },
  });

  // Create Stripe checkout session for paid subscriptions
  let checkoutUrl: string | null = null;
  if (
    subscription.subscriptionType === SubscriptionType.MONTHLY ||
    subscription.subscriptionType === SubscriptionType.YEARLY
  ) {
    if (!subscription.stripePriceId)
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Stripe price not found for this subscription',
      );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: `${config.base_url_client}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.base_url_client}/checkout/cancel?paymentId=${payment.id}`,
      line_items: [
        {
          price: subscription.stripePriceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      metadata: { paymentId: payment.id },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeSessionId: session.id,
      },
    });

    checkoutUrl = session.url!;
  }

  return {
    message:
      subscription.subscriptionType === SubscriptionType.FREE
        ? 'Subscription assigned successfully'
        : 'Subscription assigned. Please complete payment.',
    user: updatedUser,
    subscription,
    checkoutUrl,
  };
};
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
