import httpStatus from 'http-status';
import {
  SubscriptionType,
  User,
  UserRoleEnum,
  UserStatus,
} from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';
import { Request } from 'express';
import AppError from '../../errors/AppError';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';

interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}
const getAllUsersFromDB = async (query: any) => {
  const usersQuery = new QueryBuilder<typeof prisma.user>(prisma.user, query);
  usersQuery.where({ role: 'USER' });
  const result = await usersQuery
    .search(['fullName', 'email', 'address', 'city'])
    .filter()
    .sort()
    .fields()
    .exclude()
    .paginate()
    .include({ subscription: true })
    .execute();
  return result;
};

const getAllUnApproveUser = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        isApproved: false,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.user.count({
      where: {
        isApproved: false,
        isDeleted: false,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

const getMyProfileFromDB = async (id: string) => {
  const Profile = await prisma.user.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      fullName: true,
      businessType: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      describe: true,
      city: true,
      address: true,
      profile: true,
      // subscription: {
      //   select: {
      //     id: true,
      //     title: true,
      //     price: true,
      //   },
      // },
      isApproved: true,
      subscriptionId: true,
      subscriptionStart: true,
      subscriptionEnd: true,
    },
  });

  return Profile;
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    // select: {
    //   id: true,
    //   fullName: true,
    //   email: true,
    //   role: true,
    //   createdAt: true,
    //   updatedAt: true,
    //   profile: true,
    // },
  });
  return user;
};

const updateProfileImg = async (
  id: string,
  previousImg: string,
  req: Request,
  file: Express.Multer.File | undefined,
) => {
  if (file) {
    // const location = uploadToDigitalOceanAWS(file);
    const location = uploadToCloudinary(file);

    const result = await prisma.user.update({
      where: {
        id,
      },
      data: {
        profile: (await location).Location,
      },
    });

    req.user.profile = location;
    return result;
  }
  throw new AppError(httpStatus.NOT_FOUND, 'Please provide image');
};

const updateMyProfileIntoDB = async (id: string, payload: Partial<User>) => {
  delete payload.email;

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: payload,
  });
  return result;
};

const updateUserRoleStatusIntoDB = async (id: string, role: UserRoleEnum) => {
  const result = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      role: role,
    },
  });
  return result;
};
const updateUserStatus = async (id: string, status: UserStatus) => {
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      status,
    },
    select: {
      id: true,
      status: true,
      role: true,
    },
  });
  return result;
};

interface ApprovalResult {
  userId: string;
  fullName: string;
  email: string;
  isApproved: boolean;
  subscription?: {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    type: SubscriptionType;
  };
}

const updateUserApproval = async (userId: string): Promise<ApprovalResult> => {
  return await prisma.$transaction(async tx => {
    // 1. Find user
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isApproved: true,
        subscriptionId: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        hasUsedFree: true,
      },
    });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (user.isApproved) {
      throw new AppError(httpStatus.BAD_REQUEST, 'User is already approved');
    }

    // 2. Find the 3-month free subscription plan
    //    → Preferably use a fixed ID or unique identifier
    const freePlan = await tx.subscription.findFirst({
      where: {
        subscriptionType: SubscriptionType.FREE,
        price: 0,
        duration: 90, // or title: "3-Month Free (Approval Reward)"
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        subscriptionType: true,
        duration: true,
      },
    });

    if (!freePlan) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Free 3-month plan not found in database. Please contact support.',
      );
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days

    // 4. Update user
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        subscriptionId: freePlan.id,
        subscriptionStart: now,
        subscriptionEnd: endDate,
        hasUsedFree: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isApproved: true,
        subscriptionId: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      },
    });

    return {
      userId: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      isApproved: updatedUser.isApproved,
      subscription: {
        id: freePlan.id,
        title: freePlan.title,
        startDate: now,
        endDate,
        type: freePlan.subscriptionType,
      },
    };
  });
};

const softDeleteUserIntoDB = async (id: string) => {
  const result = await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
    select: {
      id: true,
      isDeleted: true,
    },
  });
  return result;
};
const hardDeleteUserIntoDB = async (id: string, adminId: string) => {
  const adminUser = await prisma.user.findUnique({
    where: {
      id: adminId,
      role: UserRoleEnum.ADMIN,
    },
  });
  if (!adminUser) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not a admin');
  }

  return await prisma.$transaction(
    async tx => {
      // related tables delete
      await tx.goal.deleteMany({ where: { userId: id } });
      // await tx.message.deleteMany({ where: { senderId: id } });
      // await tx.message.deleteMany({ where: { receiverId: id } });
      await tx.payment.deleteMany({ where: { userId: id } });
      await tx.motivation.deleteMany({ where: { userId: id } });
      await tx.notificationUser.deleteMany({ where: { userId: id } });
      await tx.vision.deleteMany({ where: { userId: id } });
      // await tx.groupRoom.deleteMany({ where: { userId: id } });
      // await tx.communityMembers.deleteMany({ where: { userId: id } });
      await tx.follow.deleteMany({
        where: {
          OR: [{ followerId: id }, { followingId: id }],
        },
      });

      const deletedUser = await tx.user.delete({
        where: { id },
        select: { id: true, email: true },
      });

      return deletedUser;
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );
};

const updateUserIntoDb = async (req: Request, id: string) => {
  // Step 1️⃣: Check if user exists
  const userInfo = await prisma.user.findUnique({
    where: { id },
  });

  if (!userInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found with id: ' + id);
  }

  // Step 2️⃣: Parse incoming data
  const { fullName, businessType, describe, city, address, phoneNumber } =
    JSON.parse(req.body.data);

  // Step 3️⃣: Handle file upload (optional)
  const file = req.file as Express.Multer.File | undefined;
  let profileUrl: string | null = userInfo.profile;

  if (file) {
    // const location = await uploadToDigitalOceanAWS(file);
    const location = await uploadToCloudinary(file);
    profileUrl = location.Location;
  }

  // Step 4️⃣: Update user in DB
  const result = await prisma.user.update({
    where: { id },
    data: {
      fullName,
      businessType,
      describe,
      city,
      address,
      phoneNumber,
      profile: profileUrl,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profile: true,
      role: true,
      businessType: true,
      describe: true,
      city: true,
      address: true,
      status: true,
    },
  });

  if (!result) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update user profile',
    );
  }

  return result;
};

export const UserServices = {
  getAllUsersFromDB,
  getMyProfileFromDB,
  getUserDetailsFromDB,
  updateMyProfileIntoDB,
  updateUserRoleStatusIntoDB,
  getAllUnApproveUser,
  updateUserStatus,
  updateUserApproval,
  softDeleteUserIntoDB,
  hardDeleteUserIntoDB,
  updateUserIntoDb,
  updateProfileImg,
};
