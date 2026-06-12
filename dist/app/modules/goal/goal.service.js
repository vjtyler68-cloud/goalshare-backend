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
exports.GoalServices = void 0;
const prisma_1 = require("../../utils/prisma");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const http_status_1 = __importDefault(require("http-status"));
// ---------- Goal ----------
const createGoal = (req, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, clientTarget, description, category, priority, dueDate } = req.body;
    const goalDueDate = new Date(dueDate);
    const now = new Date();
    // now.setHours(0, 0, 0, 0);
    if (goalDueDate < now) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Goal due date cannot be a date in the past.');
    }
    return yield prisma_1.prisma.goal.create({
        data: {
            title,
            clientTarget,
            description,
            category,
            priority,
            dueDate: goalDueDate,
            userId,
        },
    });
});
const getMyGoals = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;
    const categoryFilter = query.category;
    const baseWhere = Object.assign({ userId }, (categoryFilter && {
        category: categoryFilter,
        priority: categoryFilter,
        status: categoryFilter,
    }));
    const total = yield prisma_1.prisma.goal.count({ where: baseWhere });
    const goals = yield prisma_1.prisma.goal.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
            id: true,
            title: true,
            clientTarget: true,
            description: true,
            category: true,
            priority: true,
            dueDate: true,
            status: true,
            breakTimeSpent: true,
            clients: {
                select: {
                    status: true,
                    timeSpent: true,
                },
            },
        },
    });
    // Add report for reached clients
    const goalsWithReport = goals.map(goal => {
        const reachedCount = goal.clients
            .filter(c => c.status === 'REACHED' || 'TALKED_TO' || 'COMPLETED')
            .reduce((total, c) => total + c.timeSpent, 0);
        const clientsReachedCount = goal.clients.filter(client => client.status === 'REACHED').length;
        // 2. Client Talked To Count: Uses the new 'TALKED_TO' status
        const clientsTalkedToCount = goal.clients.filter(client => client.status === 'TALKED_TO').length;
        // 3. Sales Completed Count: Uses your 'COMPLETED' status (Final step)
        const salesCompletedCount = goal.clients.filter(client => client.status === 'COMPLETED').length;
        const totalReached = clientsReachedCount + clientsTalkedToCount + salesCompletedCount;
        return Object.assign(Object.assign({}, goal), { reachedClientsTime: reachedCount, totalReached });
    });
    return {
        goals: goalsWithReport,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
});
const getGoalById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const goalData = yield prisma_1.prisma.goal.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            clientTarget: true,
            category: true,
            priority: true,
            dueDate: true,
            status: true,
            userId: true,
            clients: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                    timeSpent: true,
                    notes: true,
                    phone: true,
                },
            },
            myWhies: {
                select: {
                    id: true,
                    text: true,
                },
            },
            affirmations: {
                select: {
                    id: true,
                    text: true,
                },
            },
            description: true,
            breakTimeSpent: true,
        },
    });
    if (!goalData) {
        return null;
    }
    // --- APPLICATION LOGIC FOR CALCULATING COUNTS AND PROGRESS ---
    const totalClients = goalData.clients.length;
    const clientTarget = goalData.clientTarget || 0;
    // 1. Client Reached Count: Uses the new 'REACHED' status
    const clientsReachedCount = goalData.clients.filter(client => client.status === 'REACHED').length;
    // 2. Client Talked To Count: Uses the new 'TALKED_TO' status
    const clientsTalkedToCount = goalData.clients.filter(client => client.status === 'TALKED_TO').length;
    // 3. Sales Completed Count: Uses your 'COMPLETED' status (Final step)
    const salesCompletedCount = goalData.clients.filter(client => client.status === 'COMPLETED').length;
    const totalReached = clientsReachedCount + clientsTalkedToCount + salesCompletedCount;
    const totalTalkedTo = clientsTalkedToCount + salesCompletedCount;
    let progressPercentage = 0;
    if (clientTarget > 0) {
        progressPercentage = (clientsReachedCount / clientTarget) * 100;
    }
    // You might also want a progress based on total clients contacted:
    const contactProgress = (clientTarget / clientsReachedCount) * 100;
    // Return the goal data WITH the calculated fields added
    return Object.assign(Object.assign({}, goalData), { 
        // clientsReachedCount,
        // clientsTalkedToCount,
        salesCompletedCount,
        contactProgress,
        totalReached,
        totalTalkedTo, progressPercentage: Math.min(100, Math.round(progressPercentage)) });
});
const updateGoal = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    if (data.dueDate)
        data.dueDate = new Date(data.dueDate);
    return yield prisma_1.prisma.goal.update({ where: { id }, data });
});
const deleteGoal = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.goal.delete({ where: { id } });
});
const updateGoalStatus = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.goal.update({ where: { id }, data: { status } });
});
const goalBreakTimeSpent = (goalId, breakTimeSpent) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.goal.update({
        where: { id: goalId },
        data: { breakTimeSpent },
    });
});
// ---------- Client ----------
const addClient = (goalId, clientData) => __awaiter(void 0, void 0, void 0, function* () {
    const goal = yield prisma_1.prisma.goal.findUnique({
        where: { id: goalId },
        select: { clientTarget: true, clients: { select: { id: true } } },
    });
    if (!goal) {
        throw new Error('Goal not found.');
    }
    if (goal.clients.length >= goal.clientTarget) {
        throw new Error(`Client limit reached. Goal target is ${goal.clientTarget} clients.`);
    }
    return yield prisma_1.prisma.client.create({
        data: Object.assign({ goalId }, clientData),
    });
});
const getAllClientsByGoalId = (goalId) => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma_1.prisma.goal.findUnique({
        where: { id: goalId },
        select: { id: true },
    });
    const clients = yield prisma_1.prisma.client.findMany({
        where: {
            goalId: goalId,
        },
        select: {
            id: true,
            name: true,
            phone: true,
            notes: true,
            status: true,
            timeSpent: true,
            goalId: true,
        },
    });
    if (clients.length === 0) {
        console.log(`No clients found for goal ID: ${goalId}`);
    }
    return clients;
});
const getClientById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.client.findUnique({
        where: { id },
        select: {
            name: true,
            phone: true,
            notes: true,
            status: true,
        },
    });
});
const updateClient = (clientId, data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.client.update({
        where: { id: clientId },
        data: data,
        select: {
            name: true,
            notes: true,
            phone: true,
        },
    });
});
const updateClientStatus = (clientId, status) => __awaiter(void 0, void 0, void 0, function* () {
    console.log({ clientId, status });
    return yield prisma_1.prisma.client.update({
        where: { id: clientId },
        data: { status },
    });
});
const updateClientTimeSpent = (clientId, timeSpent) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.client.update({
        where: { id: clientId },
        data: { timeSpent },
    });
});
// ---------- MyWhy ----------
const addMyWhy = (goalId, text) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.myWhy.create({ data: { goalId, text } });
});
// ---------- Affirmation ----------
const addAffirmation = (goalId, text) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.affirmation.create({ data: { goalId, text } });
});
exports.GoalServices = {
    createGoal,
    getMyGoals,
    getGoalById,
    updateGoal,
    deleteGoal,
    updateGoalStatus,
    goalBreakTimeSpent,
    addClient,
    getAllClientsByGoalId,
    getClientById,
    updateClient,
    updateClientTimeSpent,
    updateClientStatus,
    addMyWhy,
    addAffirmation,
};
