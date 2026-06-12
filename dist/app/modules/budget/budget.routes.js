"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetRoutes = void 0;
const express_1 = __importDefault(require("express"));
const budget_controller_1 = require("./budget.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// Goal: Retrieve the main budget page data
router.get('/my', (0, auth_1.default)(client_1.UserRoleEnum.USER), budget_controller_1.BudgetController.getMyBudget);
// Goal: Update the main Budget target amount
router.post('/target', (0, auth_1.default)(client_1.UserRoleEnum.USER), budget_controller_1.BudgetController.updateBudgetTarget);
// Goal: Add an income source
router.post('/:budgetId/income', (0, auth_1.default)(client_1.UserRoleEnum.USER), budget_controller_1.BudgetController.addIncomeSource);
// Goal: Add a new expense item
router.post('/:budgetId/expense', (0, auth_1.default)(client_1.UserRoleEnum.USER), budget_controller_1.BudgetController.addExpenseItem);
// Goal: Update the amount spent for a specific expense item
router.patch('/expense/:expenseItemId/spent', (0, auth_1.default)(client_1.UserRoleEnum.USER), budget_controller_1.BudgetController.updateSpent);
exports.BudgetRoutes = router;
