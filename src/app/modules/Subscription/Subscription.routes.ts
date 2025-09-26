import express from 'express';
import { SubscriptionController } from './Subscription.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { ensureApproved } from '../../middlewares/ensureApprove';

const router = express.Router();

router.get(
  '/',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  SubscriptionController.getAllSubscription,
);
router.get(
  '/my-subscription',
  auth(UserRoleEnum.USER),
  // ensureApproved,
  SubscriptionController.getMySubscription,
);
router.get(
  '/:id',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  SubscriptionController.getSubscriptionById,
);
//user-select subscription
router.post(
  '/assign',
  auth(UserRoleEnum.USER),
  SubscriptionController.assignSubscription,
);
// admin create subscription
router.post('/', auth(UserRoleEnum.ADMIN), SubscriptionController.createIntoDb);
router.put(
  '/:id',
  auth(UserRoleEnum.ADMIN),
  SubscriptionController.updateIntoDb,
);

router.delete(
  '/delete-my-subscription',
  auth(UserRoleEnum.USER),
  SubscriptionController.deleteMySubscription,
);

router.delete(
  '/:id',
  auth(UserRoleEnum.ADMIN),
  SubscriptionController.deleteIntoDb,
);

export const SubscriptionRoutes = router;
