import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { BudgetServices } from './budget.service';

// GET /api/budget/my - Retrieves the user's budget, income, expenses, and summary
const getMyBudget = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await BudgetServices.getBudgetByUserId(userId);

  if (!result) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: true,
      message: 'Budget not found for user. Please set a target.',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved budget summary.',
    data: result,
  });
});

// POST /api/budget/target - Creates or updates the main budget target amount
const updateBudgetTarget = catchAsync(async (req: Request, res: Response) => {
  const { targetAmount } = req.body;
  const userId = req.user.id;

  if (typeof targetAmount !== 'number' || targetAmount < 0) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Invalid target amount.',
      data: null,
    });
  }

  const result = await BudgetServices.createOrUpdateBudget(
    userId,
    targetAmount,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated budget target',
    data: result,
  });
});

// POST /api/budget/:budgetId/income - Adds or updates an income source
const addIncomeSource = catchAsync(async (req: Request, res: Response) => {
  const { budgetId } = req.params;
  const { name, amount } = req.body;

  if (!name || typeof amount !== 'number' || amount <= 0) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Invalid income name or amount.',
      data: null,
    });
  }

  const result = await BudgetServices.addOrUpdateIncome(budgetId, name, amount);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully added/updated income source.',
    data: result,
  });
});

// POST /api/budget/:budgetId/expense - Adds or updates an expense item
const addExpenseItem = catchAsync(async (req: Request, res: Response) => {
  const { budgetId } = req.params;
  const { name, totalAmount } = req.body;

  if (!name || typeof totalAmount !== 'number' || totalAmount <= 0) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Invalid expense name or amount.',
      data: null,
    });
  }

  const result = await BudgetServices.addExpense(
    budgetId,
    name,
    totalAmount,
  );
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully added/updated expense item.',
    data: result,
  });
});

// PATCH /api/budget/expense/:expenseItemId/spent - Updates the spent amount for an expense
const updateSpent = catchAsync(async (req: Request, res: Response) => {
  const { expenseItemId } = req.params;
  const { spentAmount } = req.body;

  if (typeof spentAmount !== 'number' || spentAmount < 0) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Invalid spent amount.',
      data: null,
    });
  }

  const result = await BudgetServices.updateExpenseSpentAmount(
    expenseItemId,
    spentAmount,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated spent amount.',
    data: result,
  });
});

export const BudgetController = {
  getMyBudget,
  updateBudgetTarget,
  addIncomeSource,
  addExpenseItem,
  updateSpent,
};
