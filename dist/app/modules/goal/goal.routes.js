"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalRoutes = void 0;
const express_1 = __importDefault(require("express"));
const goal_controller_1 = require("./goal.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// Goal routes
router.get('/my-goals', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.getMyGoals);
router.get('/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.getGoalById);
router.post('/', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.createGoal);
router.patch('/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.updateGoal);
router.delete('/:id', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.deleteGoal);
router.patch('/:id/status', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.updateGoalStatus);
router.patch('/:goalId/update-timeSpent', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.goalBreakTimeSpent);
// Client routes
//client view details
router.get('/clients/:clientId', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.getClientById);
router.get('/:goalId/clients', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.getAllClientsByGoal);
// client info update
router.patch('/clients/:clientId', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.updateClient);
//create client under goal id
router.post('/:goalId/clients', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.addClient);
//update client status if completed
router.patch('/clients/:clientId/status', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.updateClientStatus);
//update client time spent
router.patch('/clients/:clientId/update-timeSpent', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.updateClientTimeSpent);
// MyWhy routes
router.post('/:goalId/my-why', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.addMyWhy);
// Affirmation routes
router.post('/:goalId/affirmation', (0, auth_1.default)(client_1.UserRoleEnum.USER), goal_controller_1.GoalController.addAffirmation);
exports.GoalRoutes = router;
