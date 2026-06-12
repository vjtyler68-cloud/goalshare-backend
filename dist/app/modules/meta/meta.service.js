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
exports.MetaService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
const fetchDashboardMetaData = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // First, get the current user's role to ensure they are an ADMIN
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if ((user === null || user === void 0 ? void 0 : user.role) !== client_1.UserRoleEnum.ADMIN) {
        throw new Error('Unauthorized access');
    }
    // Calculate the key metrics
    const totalUsers = yield prisma_1.prisma.user.count();
    const suspendedUsers = yield prisma_1.prisma.user.count({
        where: { status: client_1.UserStatus.SUSPENDED },
    }); // Assuming you have a 'status' field
    const activeUsers = yield prisma_1.prisma.user.count({
        where: { status: client_1.UserStatus.ACTIVE },
    }); // Or you can calculate this as total - suspended
    // Fetch the income data for the graph (e.g., last 30 days)
    //   const incomeData = await prisma.transaction.groupBy({
    //     by: ['createdAt'],
    //     _sum: {
    //       amount: true,
    //     },
    //     where: {
    //       createdAt: {
    //         gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    //       },
    //       status: 'completed', // Only consider completed transactions
    //     },
    //     orderBy: {
    //       createdAt: 'asc',
    //     },
    //   });
    // Fetch recent pending approvals
    const approvals = yield prisma_1.prisma.user.findMany({
        where: {
            isApproved: false,
        },
        select: {
            id: true,
            fullName: true,
            email: true,
            profile: true,
            createdAt: true,
        },
        take: 4,
        orderBy: {
            createdAt: 'asc',
        },
    });
    return {
        users: {
            total: totalUsers,
            suspended: suspendedUsers,
            active: activeUsers,
        },
        // income: incomeData.map(item => ({
        //   date: item.createdAt.toISOString().split('T')[0], // Format date to YYYY-MM-DD
        //   income: item._sum.amount,
        // })),
        approvals: approvals,
    };
});
exports.MetaService = {
    fetchDashboardMetaData,
};
