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
exports.CommunityServices = void 0;
const prisma_1 = require("../../utils/prisma");
const uploadToDigitalOceanAWS_1 = require("../../utils/uploadToDigitalOceanAWS");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const createIntoDb = (communityCreatorId, file, req) => __awaiter(void 0, void 0, void 0, function* () {
    const communityData = JSON.parse(req.body.data);
    const { name, description, usersToAdd } = communityData;
    let fileUrl = null;
    if (file) {
        const location = yield (0, uploadToDigitalOceanAWS_1.uploadToDigitalOceanAWS)(file);
        fileUrl = location.Location;
    }
    // Combine the creator's ID with the list of users to add
    const allUserIds = [communityCreatorId];
    if (usersToAdd && Array.isArray(usersToAdd)) {
        allUserIds.push(...usersToAdd);
    }
    try {
        const newCommunity = yield prisma_1.prisma.community.create({
            data: {
                name,
                description,
                image: fileUrl,
                userId: communityCreatorId,
                users: {
                    createMany: {
                        data: allUserIds.map((userId) => ({ userId })),
                    },
                },
            },
            include: {
                users: true,
            },
        });
        return newCommunity;
    }
    catch (error) {
        console.error('Error creating community:', error);
        throw new Error('Failed to create community');
    }
});
const getAllCommunity = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const communityQuery = new QueryBuilder_1.default(prisma_1.prisma.community, query);
    const result = yield communityQuery
        .search(['name'])
        .filter()
        .sort()
        .paginate()
        .execute();
    return result;
});
const getCommunityByIdFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.community.findUnique({
        where: { id },
    });
    return result;
});
const getAllUsersForCommunityDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const usersQuery = new QueryBuilder_1.default(prisma_1.prisma.user, query);
    const result = yield usersQuery
        .search(['fullName', 'email', 'address', 'city'])
        .filter()
        .sort()
        .fields()
        .exclude()
        .paginate()
        .customFields({
        id: true,
        profile: true,
        fullName: true,
        email: true,
        address: true,
        city: true,
        communityMembers: {
            select: {
                isLeft: true,
                isMuted: true,
            },
        },
    })
        .execute();
    return result;
});
const getMyCommunities = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const communityQuery = new QueryBuilder_1.default(prisma_1.prisma.community, query);
    const andConditions = [];
    // Filter for the user's communities
    andConditions.push({
        users: {
            some: {
                userId,
            },
        },
    });
    // Check if a search term exists and add the OR condition
    if (query.searchTerm) {
        andConditions.push({
            OR: [
                {
                    name: {
                        contains: query.searchTerm,
                        mode: 'insensitive',
                    },
                },
                {
                    users: {
                        some: {
                            user: {
                                fullName: {
                                    contains: query.searchTerm,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    },
                },
                {
                    users: {
                        some: {
                            user: {
                                email: {
                                    contains: query.searchTerm,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    },
                },
            ],
        });
    }
    const result = yield communityQuery
        .filter()
        .sort()
        .paginate()
        .where({
        AND: andConditions,
    })
        .customFields({
        id: true,
        userId: true,
        name: true,
        image: true,
    })
        .execute();
    return result;
});
const updateIntoDb = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.community.update({
        where: { id },
        data,
    });
    return result;
});
const deleteIntoDb = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.prisma.community.delete({
        where: { id },
    });
    return result;
});
exports.CommunityServices = {
    createIntoDb,
    getAllCommunity,
    getCommunityByIdFromDB,
    updateIntoDb,
    deleteIntoDb,
    getMyCommunities,
    getAllUsersForCommunityDB,
};
