
import { prisma } from '../../utils/prisma';

// ================= HELPER =================
const calculateBudgetSummary = (budget: any) => {
  const totalIncome = budget.incomeSources.reduce(
    (sum: number, item: { amount: number }) => sum + item.amount,
    0,
  );

  const totalExpenseTarget = budget.expenseItems.reduce(
    (sum: number, item: { totalAmount: number }) => sum + item.totalAmount,
    0,
  );

  const totalSpent = budget.expenseItems.reduce(
    (sum: number, item: { spentAmount: number }) => sum + item.spentAmount,
    0,
  );

  const expensePercentage =
    totalExpenseTarget > 0
      ? Math.min(100, Math.round((totalSpent / totalExpenseTarget) * 100))
      : 0;

  return {
    ...budget,
    totalIncome,
    totalExpenseTarget,
    totalSpent,
    expensePercentage,
  };
};

// ================= SERVICES =================

// 1. Get Budget by user
const getBudgetByUserId = async (userId: string) => {
  const budgetData = await prisma.budget.findFirst({
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

  if (!budgetData) return null;
  return calculateBudgetSummary(budgetData);
};

// 2. Create or Update Budget
const createOrUpdateBudget = async (userId: string, targetAmount: number) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const existingBudget = await prisma.budget.findFirst({
    where: { userId, month: currentMonth, year: currentYear },
  });

  if (existingBudget) {
    return await prisma.budget.update({
      where: { id: existingBudget.id },
      data: { targetAmount },
    });
  }

  return await prisma.budget.create({
    data: { userId, targetAmount, month: currentMonth, year: currentYear },
  });
};

// 3. Create or Update Income
const addOrUpdateIncome = async (
  budgetId: string,
  name: string,
  amount: number,
) => {
  const existingIncome = await prisma.incomeSource.findFirst({
    where: { budgetId, name },
  });

  if (existingIncome) {
    return await prisma.incomeSource.update({
      where: { id: existingIncome.id },
      data: { amount },
      select: { id: true, name: true, amount: true, budgetId: true },
    });
  }

  return await prisma.incomeSource.create({
    data: { budgetId, name, amount },
    select: { id: true, name: true, amount: true, budgetId: true },
  });
};

// 4. Create or Update Expense
const addExpense = async (
  budgetId: string,
  name: string,
  totalAmount: number,
) => {
  return await prisma.expenseItem.create({
    data: { budgetId, name, totalAmount },
    select: {
      id: true,
      name: true,
      totalAmount: true,
      spentAmount: true,
      budgetId: true,
    },
  });
};

// 5. Update Spent Amount
const updateExpenseSpentAmount = async (
  expenseItemId: string,
  spentAmount: number,
) => {
  return await prisma.expenseItem.update({
    where: { id: expenseItemId },
    data: { spentAmount },
    select: { id: true, spentAmount: true, budgetId: true },
  });
};

export const BudgetServices = {
  getBudgetByUserId,
  createOrUpdateBudget,
  addOrUpdateIncome,
  addExpense,
  updateExpenseSpentAmount,
};
