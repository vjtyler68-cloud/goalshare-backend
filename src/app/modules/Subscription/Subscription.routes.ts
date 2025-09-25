import express from 'express';
import { SubscriptionController } from './Subscription.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.get(
  '/',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  SubscriptionController.getAllSubscription,
);
router.get(
  '/my-subscription',
  auth(UserRoleEnum.USER),
  SubscriptionController.getMySubscription,
);
router.get(
  '/:id',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  SubscriptionController.getSubscriptionById,
);
router.post('/', auth(UserRoleEnum.ADMIN), SubscriptionController.createIntoDb);
router.put(
  '/:id',
  auth(UserRoleEnum.ADMIN),
  SubscriptionController.updateIntoDb,
);
router.delete(
  '/:id',
  auth(UserRoleEnum.ADMIN),
  SubscriptionController.deleteIntoDb,
);

export const SubscriptionRoutes = router;
