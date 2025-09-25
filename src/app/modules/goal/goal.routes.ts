import express from 'express';
import { GoalController } from './goal.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

// Goal routes
router.get('/my-goals', auth(UserRoleEnum.USER), GoalController.getMyGoals);
router.get('/:id', auth(UserRoleEnum.USER), GoalController.getGoalById);
router.post('/', auth(UserRoleEnum.USER), GoalController.createGoal);

router.patch('/:id', auth(UserRoleEnum.USER), GoalController.updateGoal);
router.delete('/:id', auth(UserRoleEnum.USER), GoalController.deleteGoal);
router.patch(
  '/:id/status',
  auth(UserRoleEnum.USER),
  GoalController.updateGoalStatus,
);

// Client routes
//client view details
router.get(
  '/clients/:clientId',
  auth(UserRoleEnum.USER),
  GoalController.getClientById,
);

// client info update
router.patch(
  '/clients/:clientId',
  auth(UserRoleEnum.USER),
  GoalController.updateClient,
);
//create client under goal id
router.post(
  '/:goalId/clients',
  auth(UserRoleEnum.USER),
  GoalController.addClient,
);
//update client status if completed
router.patch(
  '/clients/:clientId/status',
  auth(UserRoleEnum.USER),
  GoalController.updateClientStatus,
);
//update client time spent
router.patch(
  '/clients/:clientId/update-timeSpent',
  auth(UserRoleEnum.USER),
  GoalController.updateClientTimeSpent,
);

// MyWhy routes
router.post(
  '/:goalId/my-why',
  auth(UserRoleEnum.USER),
  GoalController.addMyWhy,
);

// Affirmation routes
router.post(
  '/:goalId/affirmation',
  auth(UserRoleEnum.USER),
  GoalController.addAffirmation,
);

export const GoalRoutes = router;
