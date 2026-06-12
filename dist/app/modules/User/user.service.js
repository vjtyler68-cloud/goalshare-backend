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
exports.UserServices = void 0;
const http_status_1 = __importDefault(require("http-status"));
const client_1 = require("@prisma/client");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const prisma_1 = require("../../utils/prisma");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const uploadToDigitalOceanAWS_1 = require("../../utils/uploadToDigitalOceanAWS");
const getAllUsersFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const usersQuery = new QueryBuilder_1.default(prisma_1.prisma.user, query);
    usersQuery.where({ role: 'USER' });
    const result = yield usersQuery
        .search(['fullName', 'email', 'address', 'city'])
        .filter()
        .sort()
        .fields()
        .exclude()
        .paginate()
        .execute();
    return result;
});
const getAllUnApproveUser = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = yield Promise.all([
        prisma_1.prisma.user.findMany({
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
        prisma_1.prisma.user.count({
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
});
const getMyProfileFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const Profile = yield prisma_1.prisma.user.findUnique({
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
});
const getUserDetailsFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.prisma.user.findUnique({
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
});
const updateProfileImg = (id, previousImg, req, file) => __awaiter(void 0, void 0, void 0, function* () {
    if (file) {
        const location = (0, uploadToDigitalOceanAWS_1.uploadToDigitalOcean)(file);
        // const location = uploadToCloudinary(file);
        const result = yield prisma_1.prisma.user.update({
            where: {
                id,
            },
            data: {
                profile: (yield location).Location,
            },
        });
        req.user.profile = location;
        return result;
    }
    throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Please provide image');
});
const updateMyProfileIntoDB = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    delete payload.email;
    const result = yield prisma_1.prisma.user.update({
        where: {
            id,
        },
        data: payload,
    });
    return result;
});
const updateUserRoleStatusIntoDB = (id, role) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.user.update({
        where: {
            id: id,
        },
        data: {
            role: role,
        },
    });
    return result;
});
const updateUserStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.user.update({
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
});
const updateUserApproval = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Find user
        const user = yield tx.user.findUnique({
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
            throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
        }
        if (user.isApproved) {
            throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'User is already approved');
        }
        // 2. Find the 3-month free subscription plan
        //    → Preferably use a fixed ID or unique identifier
        const freePlan = yield tx.subscription.findFirst({
            where: {
                subscriptionType: client_1.SubscriptionType.FREE,
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
            throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Free 3-month plan not found in database. Please contact support.');
        }
        const now = new Date();
        const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days
        // 4. Update user
        const updatedUser = yield tx.user.update({
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
    }));
});
const softDeleteUserIntoDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.user.update({
        where: { id },
        data: { isDeleted: true },
        select: {
            id: true,
            isDeleted: true,
        },
    });
    return result;
});
const hardDeleteUserIntoDB = (id, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const adminUser = yield prisma_1.prisma.user.findUnique({
        where: {
            id: adminId,
            role: client_1.UserRoleEnum.ADMIN,
        },
    });
    if (!adminUser) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, 'You are not a admin');
    }
    return yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // related tables delete
        yield tx.goal.deleteMany({ where: { userId: id } });
        // await tx.message.deleteMany({ where: { senderId: id } });
        // await tx.message.deleteMany({ where: { receiverId: id } });
        yield tx.payment.deleteMany({ where: { userId: id } });
        yield tx.motivation.deleteMany({ where: { userId: id } });
        yield tx.notificationUser.deleteMany({ where: { userId: id } });
        yield tx.vision.deleteMany({ where: { userId: id } });
        // await tx.groupRoom.deleteMany({ where: { userId: id } });
        // await tx.communityMembers.deleteMany({ where: { userId: id } });
        yield tx.follow.deleteMany({
            where: {
                OR: [{ followerId: id }, { followingId: id }],
            },
        });
        const deletedUser = yield tx.user.delete({
            where: { id },
            select: { id: true, email: true },
        });
        return deletedUser;
    }), {
        timeout: 20000,
        maxWait: 5000,
    });
});
const updateUserIntoDb = (req, id) => __awaiter(void 0, void 0, void 0, function* () {
    // Step 1️⃣: Check if user exists
    const userInfo = yield prisma_1.prisma.user.findUnique({
        where: { id },
    });
    if (!userInfo) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found with id: ' + id);
    }
    // Step 2️⃣: Parse incoming data
    const { fullName, businessType, describe, city, address, phoneNumber } = JSON.parse(req.body.data);
    // Step 3️⃣: Handle file upload (optional)
    const file = req.file;
    let profileUrl = userInfo.profile;
    if (file) {
        const location = yield (0, uploadToDigitalOceanAWS_1.uploadToDigitalOcean)(file);
        // const location = await uploadToCloudinary(file);
        profileUrl = location.Location;
    }
    // Step 4️⃣: Update user in DB
    const result = yield prisma_1.prisma.user.update({
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
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, 'Failed to update user profile');
    }
    return result;
});
exports.UserServices = {
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
