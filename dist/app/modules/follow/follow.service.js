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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowServices = exports.searchableFields = void 0;
const prisma_1 = require("../../utils/prisma");
exports.searchableFields = ['fullName', 'email'];
const followUser = (followerId, followingId) => __awaiter(void 0, void 0, void 0, function* () {
    if (followerId === followingId)
        throw new Error('You cannot follow yourself');
    // Check if already following
    const existing = yield prisma_1.prisma.follow.findUnique({
        where: {
            followerId_followingId: { followerId, followingId },
        },
    });
    if (existing)
        throw new Error('Already following this user');
    // Create follow record
    const follow = yield prisma_1.prisma.follow.create({
        data: {
            followerId,
            followingId,
        },
        include: {
            follower: { select: { id: true, fullName: true } },
            following: { select: { id: true, fullName: true } },
        },
    });
    return follow;
});
const unfollowUser = (followerId, followingId) => __awaiter(void 0, void 0, void 0, function* () {
    const follow = yield prisma_1.prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
        include: {
            follower: { select: { id: true, fullName: true } },
            following: { select: { id: true, fullName: true } },
        },
    });
    return follow;
});
const getFollowers = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const followers = yield prisma_1.prisma.follow.findMany({
        where: { followingId: userId },
        include: {
            follower: {
                select: { id: true, fullName: true, profile: true, email: true },
            },
        },
    });
    return followers.map(f => f.follower);
});
const getFollowing = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const following = yield prisma_1.prisma.follow.findMany({
        where: { followerId: userId },
        include: {
            following: {
                select: { id: true, fullName: true, profile: true, email: true },
            },
        },
    });
    return following.map(f => f.following);
});
const getFollowCounts = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Followers count
    const followersCount = yield prisma_1.prisma.follow.count({
        where: { followingId: userId },
    });
    // Following count
    const followingCount = yield prisma_1.prisma.follow.count({
        where: { followerId: userId },
    });
    return {
        followersCount,
        followingCount,
    };
});
const getMyFollowCounts = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const followersCount = yield prisma_1.prisma.follow.count({
        where: { followingId: userId },
    });
    const followingCount = yield prisma_1.prisma.follow.count({
        where: { followerId: userId },
    });
    return { followersCount, followingCount };
});
const getMyFollowerFollowingList = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, searchQuery = '') {
    // followers/following
    let followerSearchCondition = {};
    let followingSearchCondition = {};
    if (searchQuery) {
        // follower user
        followerSearchCondition = {
            follower: {
                OR: exports.searchableFields.map(field => ({
                    [field]: {
                        contains: searchQuery,
                        mode: 'insensitive',
                    },
                })),
            },
        };
        // following user
        followingSearchCondition = {
            following: {
                OR: exports.searchableFields.map(field => ({
                    [field]: {
                        contains: searchQuery,
                        mode: 'insensitive',
                    },
                })),
            },
        };
    }
    // followers list
    const followersList = yield prisma_1.prisma.follow.findMany({
        where: Object.assign({ followingId: userId }, followerSearchCondition),
        include: {
            follower: {
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    profile: true,
                },
            },
        },
    });
    // following list
    const followingList = yield prisma_1.prisma.follow.findMany({
        where: Object.assign({ followerId: userId }, followingSearchCondition),
        include: {
            following: {
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    profile: true,
                },
            },
        },
    });
    const followers = followersList.map(f => f.follower).filter(Boolean);
    const following = followingList.map(f => f.following).filter(Boolean);
    // Merge + remove duplicates
    const users = [...followers, ...following].filter((v, i, a) => a.findIndex(t => (t === null || t === void 0 ? void 0 : t.id) === (v === null || v === void 0 ? void 0 : v.id)) === i);
    return { users };
});
exports.FollowServices = {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowCounts,
    getMyFollowCounts,
    getMyFollowerFollowingList,
};
