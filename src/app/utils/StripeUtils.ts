import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import catchAsync from './catchAsync';
import sendResponse from './sendResponse';
import Stripe from 'stripe';
import config from '../../config';
import { prisma } from './prisma';
import { stripe } from './stripe';
import { PaymentStatus } from '@prisma/client';

export const StripeWebHook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig)
    throw new AppError(httpStatus.BAD_REQUEST, 'Missing Stripe signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      config.stripe.stripe_webhook as string,
    );
  } catch (err) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${(err as Error).message}`,
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCanceled(session);
      break;
    }

    default:
      console.log('Unhandled Stripe event:', event.type);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Webhook processed successfully',
    data: '',
  });
});

// export const checkout = async (data: {
//   stripePriceId: string;
//   email: string;
//   paymentId: string;
// }) => {
//   const session = await stripe.checkout.sessions.create({
//     mode: 'payment',
//     success_url: `${config.base_url_client}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: `${config.base_url_client}/checkout/cancel?paymentId=${data.paymentId}`,
//     line_items: [
//       {
//         price: data.stripePriceId,
//         quantity: 1,
//       },
//     ],
//     customer_email: data.email,
//     metadata: {
//       paymentId: data.paymentId,
//     },
//   });

//   return session.url;
// };

const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session,
) => {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.SUCCESS,
      stripeSessionId: session.id,
      stripeCustomerId: session.customer as string,
      stripePaymentId: session.payment_intent as string,
    },
  });
};
const handleCheckoutSessionCanceled = async (
  session: Stripe.Checkout.Session,
) => {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.CANCELED, stripeSessionId: session.id },
  });
};
