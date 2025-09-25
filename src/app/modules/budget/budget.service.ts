import { Request } from 'express';
import { prisma } from '../../utils/prisma'; // Assuming this path is correct

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
  const selectData = {
    id: true,
    targetAmount: true,
    userId: true,
  };

  const existingBudget = await prisma.budget.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (existingBudget) {
    return await prisma.budget.update({
      where: { id: existingBudget.id },
      data: { targetAmount },
      select: selectData,
    });
  } else {
    return await prisma.budget.create({
      data: { userId, targetAmount },
      select: selectData,
    });
  }
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
