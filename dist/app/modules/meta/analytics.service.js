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
exports.MetaService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const fetchDashboardMetaData = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // First, get the current user's role to ensure they are an ADMIN
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if ((user === null || user === void 0 ? void 0 : user.role) !== client_1.UserRoleEnum.ADMIN) {
        throw new Error('Unauthorized access');
    }
    const totalUsers = yield prisma_1.prisma.user.count({
        where: { role: client_1.UserRoleEnum.USER },
    });
    const suspendedUsers = yield prisma_1.prisma.user.count({
        where: { role: client_1.UserRoleEnum.USER, status: client_1.UserStatus.SUSPENDED },
    });
    const activeUsers = yield prisma_1.prisma.user.count({
        where: { role: client_1.UserRoleEnum.USER, status: client_1.UserStatus.ACTIVE },
    });
    const incomeData = yield prisma_1.prisma.payment.groupBy({
        by: ['createdAt'],
        _sum: {
            amount: true,
        },
        where: {
            createdAt: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
            status: client_1.PaymentStatus.SUCCESS,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });
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
        income: incomeData.map(item => ({
            date: item.createdAt.toISOString().split('T')[0],
            income: item._sum.amount,
        })),
        approvals: approvals,
    };
});
const getReportTableData = (userId, startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if user is ADMIN
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if ((user === null || user === void 0 ? void 0 : user.role) !== 'ADMIN') {
        throw new AppError_1.default(401, 'Unauthorized access');
    }
    // Build optional date filter
    const dateFilter = {};
    if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime()))
            dateFilter.gte = start;
    }
    if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime()))
            dateFilter.lte = end;
    }
    const payments = yield prisma_1.prisma.payment.findMany({
        where: Object.assign({ status: client_1.PaymentStatus.SUCCESS, userId: { not: null } }, (Object.keys(dateFilter).length && { createdAt: dateFilter })),
        select: {
            createdAt: true,
            user: {
                select: { fullName: true },
            },
            amount: true,
        },
        orderBy: { createdAt: 'asc' },
    });
    // Map the data to table structure
    const reportData = payments.map(payment => {
        var _a;
        return ({
            date: payment.createdAt.toISOString().split('T')[0],
            type: 'Monthly',
            user: ((_a = payment.user) === null || _a === void 0 ? void 0 : _a.fullName) || 'Unknown',
            amount: payment.amount || 0,
        });
    });
    return reportData;
});
exports.MetaService = {
    fetchDashboardMetaData,
    getReportTableData,
};
