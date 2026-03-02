import express, { Request, Response } from 'express';
import { SubscriptionController } from './Subscription.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
// import { ensureApproved } from '../../middlewares/ensureApprove';
import httpStatus from 'http-status';

const router = express.Router();

router.get('/', SubscriptionController.getAllSubscription);
router.post('/verify-token', SubscriptionController.verifySubscription);
router.get(
  '/current-date',
  catchAsync(async (req: Request, res: Response) => {
    const currentDate = new Date();
    const date = {
      currentDate,
    };
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Successfully retrieved my Subscription ',
      data: date,
    });
  }),
);
router.get(
  '/my-subscription',
  auth(UserRoleEnum.USER),
  // ensureApproved,
  SubscriptionController.getMySubscription,
);
router.get('/:id', SubscriptionController.getSubscriptionById);
//user-select subscription
router.post('/buy-plan', auth(), SubscriptionController.updateInAppPlan);
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
