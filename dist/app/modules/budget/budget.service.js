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
exports.BudgetServices = void 0;
const prisma_1 = require("../../utils/prisma");
// ================= HELPER =================
const calculateBudgetSummary = (budget) => {
    const totalIncome = budget.incomeSources.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenseTarget = budget.expenseItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalSpent = budget.expenseItems.reduce((sum, item) => sum + item.spentAmount, 0);
    const expensePercentage = totalExpenseTarget > 0
        ? Math.min(100, Math.round((totalSpent / totalExpenseTarget) * 100))
        : 0;
    return Object.assign(Object.assign({}, budget), { totalIncome,
        totalExpenseTarget,
        totalSpent,
        expensePercentage });
};
// ================= SERVICES =================
// 1. Get Budget by user
const getBudgetByUserId = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const budgetData = yield prisma_1.prisma.budget.findFirst({
        where: { userId },
        select: {
            id: true,
            targetAmount: true,
            month: true,
            year: true,
            incomeSources: { select: { id: true, name: true, amount: true } },
            expenseItems: {
                select: {
                    id: true,
                    name: true,
                    totalAmount: true,
                    spentAmount: true,
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });
    if (!budgetData)
        return null;
    return calculateBudgetSummary(budgetData);
});
// 2. Create or Update Budget
const createOrUpdateBudget = (userId, targetAmount) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const existingBudget = yield prisma_1.prisma.budget.findFirst({
        where: { userId, month: currentMonth, year: currentYear },
    });
    if (existingBudget) {
        return yield prisma_1.prisma.budget.update({
            where: { id: existingBudget.id },
            data: { targetAmount },
        });
    }
    return yield prisma_1.prisma.budget.create({
        data: { userId, targetAmount, month: currentMonth, year: currentYear },
    });
});
// 3. Create or Update Income
const addOrUpdateIncome = (budgetId, name, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const existingIncome = yield prisma_1.prisma.incomeSource.findFirst({
        where: { budgetId, name },
    });
    if (existingIncome) {
        return yield prisma_1.prisma.incomeSource.update({
            where: { id: existingIncome.id },
            data: { amount },
            select: { id: true, name: true, amount: true, budgetId: true },
        });
    }
    return yield prisma_1.prisma.incomeSource.create({
        data: { budgetId, name, amount },
        select: { id: true, name: true, amount: true, budgetId: true },
    });
});
// 4. Create or Update Expense
const addExpense = (budgetId, name, totalAmount) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.expenseItem.create({
        data: { budgetId, name, totalAmount },
        select: {
            id: true,
            name: true,
            totalAmount: true,
            spentAmount: true,
            budgetId: true,
        },
    });
});
// 5. Update Spent Amount
const updateExpenseSpentAmount = (expenseItemId, spentAmount) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.prisma.expenseItem.update({
        where: { id: expenseItemId },
        data: { spentAmount },
        select: { id: true, spentAmount: true, budgetId: true },
    });
});
exports.BudgetServices = {
    getBudgetByUserId,
    createOrUpdateBudget,
    addOrUpdateIncome,
    addExpense,
    updateExpenseSpentAmount,
};
