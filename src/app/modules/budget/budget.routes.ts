import express from 'express';
import { BudgetController } from './budget.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

// Goal: Retrieve the main budget page data
router.get('/my', auth(UserRoleEnum.USER), BudgetController.getMyBudget);

// Goal: Update the main Budget target amount
router.post(
  '/target',
  auth(UserRoleEnum.USER),
  BudgetController.updateBudgetTarget,
);

// Goal: Add an income source
router.post(
  '/:budgetId/income',
  auth(UserRoleEnum.USER),
  BudgetController.addIncomeSource,
);

// Goal: Add a new expense item
router.post(
  '/:budgetId/expense',
  auth(UserRoleEnum.USER),
  BudgetController.addExpenseItem,
);

// Goal: Update the amount spent for a specific expense item
router.patch(
  '/expense/:expenseItemId/spent',
  auth(UserRoleEnum.USER),
  BudgetController.updateSpent,
);

export const BudgetRoutes = router;
