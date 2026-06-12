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
exports.BudgetController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const budget_service_1 = require("./budget.service");
// GET /api/budget/my - Retrieves the user's budget, income, expenses, and summary
const getMyBudget = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield budget_service_1.BudgetServices.getBudgetByUserId(userId);
    if (!result) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.NOT_FOUND,
            success: true,
            message: 'Budget not found for user. Please set a target.',
            data: null,
        });
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved budget summary.',
        data: result,
    });
}));
// POST /api/budget/target - Creates or updates the main budget target amount
const updateBudgetTarget = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { targetAmount } = req.body;
    const userId = req.user.id;
    if (typeof targetAmount !== 'number' || targetAmount < 0) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: 'Invalid target amount.',
            data: null,
        });
    }
    const result = yield budget_service_1.BudgetServices.createOrUpdateBudget(userId, targetAmount);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully updated budget target',
        data: result,
    });
}));
// POST /api/budget/:budgetId/income - Adds or updates an income source
const addIncomeSource = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { budgetId } = req.params;
    const { name, amount } = req.body;
    if (!name || typeof amount !== 'number' || amount <= 0) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: 'Invalid income name or amount.',
            data: null,
        });
    }
    const result = yield budget_service_1.BudgetServices.addOrUpdateIncome(budgetId, name, amount);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Successfully added/updated income source.',
        data: result,
    });
}));
// POST /api/budget/:budgetId/expense - Adds or updates an expense item
const addExpenseItem = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { budgetId } = req.params;
    const { name, totalAmount } = req.body;
    if (!name || typeof totalAmount !== 'number' || totalAmount <= 0) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: 'Invalid expense name or amount.',
            data: null,
        });
    }
    const result = yield budget_service_1.BudgetServices.addExpense(budgetId, name, totalAmount);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Successfully added/updated expense item.',
        data: result,
    });
}));
// PATCH /api/budget/expense/:expenseItemId/spent - Updates the spent amount for an expense
const updateSpent = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { expenseItemId } = req.params;
    const { spentAmount } = req.body;
    if (typeof spentAmount !== 'number' || spentAmount < 0) {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: 'Invalid spent amount.',
            data: null,
        });
    }
    const result = yield budget_service_1.BudgetServices.updateExpenseSpentAmount(expenseItemId, spentAmount);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully updated spent amount.',
        data: result,
    });
}));
exports.BudgetController = {
    getMyBudget,
    updateBudgetTarget,
    addIncomeSource,
    addExpenseItem,
    updateSpent,
};
