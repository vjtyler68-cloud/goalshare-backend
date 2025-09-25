import { Request } from 'express';
import { prisma } from '../../utils/prisma';

// Create Subscription
const createIntoDb = async (req: Request) => {
  const { title, price, subscriptionType, duration } = req.body;

  const subscription = await prisma.subscription.create({
    data: {
      title,
      price: parseFloat(price),
      subscriptionType,
      duration,
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

// Get Subscription by ID
const getMySubscription = async (userId: string) => {
  const userWithSubscription = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  });

  return userWithSubscription?.subscription;
};

//*// services/UserSubscription.service.ts
// import { prisma } from '../../utils/prisma';
// import bcrypt from 'bcrypt';
// import AppError from '../../errors/AppError';
// import httpStatus from 'http-status';
// import { User, SubscriptionType, PaymentStatus } from '@prisma/client';
// import { otpExpiryTime } from '../../utils/otpExpiry';
// import { generateOtpEmail } from '../../utils/emailTemplates';
// import { emailSender } from '../../utils/emailSender';

// interface RegisterPayload extends User {
//   subscriptionId: string;
// }

// // ==========================
// // REGISTER USER WITH SUBSCRIPTION
// // ==========================
// export const registerWithSubscription = async (payload: RegisterPayload) => {
//   const hashedPassword = await bcrypt.hash(payload.password, 12);

//   // 1️⃣ Check if user exists
//   const existingUser = await prisma.user.findUnique({
//     where: { email: payload.email },
//   });
//   if (existingUser) throw new AppError(httpStatus.CONFLICT, 'User already exists');

//   // 2️⃣ Generate OTP
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   // 3️⃣ Fetch subscription by ID
//   const subscription = await prisma.subscription.findUnique({
//     where: { id: payload.subscriptionId },
//   });
//   if (!subscription) throw new AppError(httpStatus.BAD_REQUEST, 'Subscription not found');

//   const userData: any = {
//     ...payload,
//     password: hashedPassword,
//     otp,
//     otpExpiry: otpExpiryTime(),
//   };

//   // -------------------
//   // FREE subscription
//   // -------------------
//   if (subscription.subscriptionType === SubscriptionType.FREE) {
//     if (existingUser?.hasUsedFree) {
//       throw new AppError(httpStatus.CONFLICT, 'You have already used FREE subscription');
//     }

//     const startDate = new Date();
//     const endDate = new Date();
//     endDate.setDate(endDate.getDate() + subscription.duration);

//     const newUser = await prisma.user.create({
//       data: {
//         ...userData,
//         subscriptionId: subscription.id,
//         subscriptionStart: startDate,
//         subscriptionEnd: endDate,
//         hasUsedFree: true,
//       },
//     });

//     // Payment record for FREE subscription (amount 0)
//     await prisma.payment.create({
//       data: {
//         userId: newUser.id,
//         subscriptionId: subscription.id,
//         amount: 0,
//         currency: 'usd',
//         status: PaymentStatus.SUCCESS,
//       },
//     });

//     // Send OTP email
//     try {
//       const html = generateOtpEmail(otp);
//       await emailSender(newUser.email, html, 'OTP Verification');
//     } catch {
//       throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
//     }

//     return { message: 'Registration successful. Check your mail to verify OTP.' };
//   }

//   // -------------------
//   // PAID subscription (MONTHLY/YEARLY)
//   // -------------------
//   const startDate = new Date();
//   const endDate = new Date();
//   if (subscription.subscriptionType === SubscriptionType.MONTHLY) {
//     endDate.setMonth(endDate.getMonth() + subscription.duration);
//   } else if (subscription.subscriptionType === SubscriptionType.YEARLY) {
//     endDate.setFullYear(endDate.getFullYear() + subscription.duration);
//   }

//   const newUser = await prisma.user.create({ data: userData });

//   const payment = await prisma.payment.create({
//     data: {
//       userId: newUser.id,
//       subscriptionId: subscription.id,
//       amount: subscription.price,
//       currency: 'usd',
//       status: PaymentStatus.PENDING,
//     },
//   });

//   // Send OTP email
//   try {
//     const html = generateOtpEmail(otp);
//     await emailSender(newUser.email, html, 'OTP Verification');
//   } catch {
//     throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP email');
//   }

//   return {
//     message: 'User registered. Check email to verify OTP and complete payment.',
//     userId: newUser.id,
//     subscriptionId: subscription.id,
//     paymentId: payment.id,
//   };
// };

// ==========================
// GET MY SUBSCRIPTION
// ==========================
// export const getMySubscription = async (userId: string) => {
//   const userWithSubscription = await prisma.user.findUnique({
//     where: { id: userId },
//     include: { subscription: true },
//   });

//   if (!userWithSubscription || !userWithSubscription.subscription) return null;

//   const sub = userWithSubscription.subscription;
//   const now = new Date();
//   const end = userWithSubscription.subscriptionEnd || now;
//   const remainingDays = Math.max(
//     Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
//     0
//   );

//   return {
//     subscription: {
//       id: sub.id,
//       title: sub.title,
//       type: sub.subscriptionType,
//       duration: sub.duration,
//       startDate: userWithSubscription.subscriptionStart,
//       endDate: userWithSubscription.subscriptionEnd,
//       remainingDays,
//     },
//   };
// };

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

export const SubscriptionServices = {
  createIntoDb,
  getAllSubscription,
  getSubscriptionByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  getMySubscription,
};
