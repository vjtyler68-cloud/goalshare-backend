import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma'; // Assuming this path is correct
import httpStatus from 'http-status';

// Helper function to calculate totals and percentages (NO CHANGE HERE)
const calculateBudgetSummary = (budget: any) => {
  // Calculate total income
  const totalIncome = budget.incomeSources.reduce(
    (sum: number, item: { amount: number }) => sum + item.amount,
    0,
  );

  // Calculate total expense target (the total amount planned to spend)
  const totalExpenseTarget = budget.expenseItems.reduce(
    (sum: number, item: { totalAmount: number }) => sum + item.totalAmount,
    0,
  );

  // Calculate total actual spent amount
  const totalSpent = budget.expenseItems.reduce(
    (sum: number, item: { spentAmount: number }) => sum + item.spentAmount,
    0,
  );

  // Calculate percentage spent based on total expense target
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

// 1. Get Budget with all details and calculated summary (NO CHANGE HERE, as it needs all data for calculation)
const getBudgetByUserId = async (userId: string) => {
  const budgetData = await prisma.budget.findFirst({
    where: { userId },
    select: {
      id: true,
      targetAmount: true,
      month: true,
      year: true,

      incomeSources: {
        select: {
          id: true,
          name: true,
          amount: true,
        },
      },
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

// 2. Create or Update the main budget target amount (MODIFIED)
const createOrUpdateBudget = async (userId: string, targetAmount: number) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const existingBudget = await prisma.budget.findFirst({
    where: {
      userId: userId,
      month: currentMonth,
      year: currentYear,
    },
  });

  const newBudget = await prisma.budget.create({
    data: {
      userId,
      targetAmount,
      month: currentMonth,
      year: currentYear,
    },
  });

  return newBudget;
};

// 3. Add a new income source (MODIFIED)
const addIncome = async (budgetId: string, name: string, amount: number) => {
  return await prisma.incomeSource.create({
    data: { budgetId, name, amount },
    select: {
      id: true,
      name: true,
      amount: true,
      budgetId: true,
    },
  });
};

// 4. Add a new expense item (MODIFIED)
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

// 5. Update the 'spentAmount' for an expense item (MODIFIED)
const updateExpenseSpentAmount = async (
  expenseItemId: string,
  spentAmount: number,
) => {
  return await prisma.expenseItem.update({
    where: { id: expenseItemId },
    data: { spentAmount },
    select: {
      id: true,
      spentAmount: true,
      budgetId: true,
    },
  });
};

export const BudgetServices = {
  getBudgetByUserId,
  createOrUpdateBudget,
  addIncome,
  addExpense,
  updateExpenseSpentAmount,
};
