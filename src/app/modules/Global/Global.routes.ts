import express from 'express';
import { GlobalController } from './Global.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

// MyWhy Routes
router.get('/mywhy', auth(UserRoleEnum.USER, UserRoleEnum.ADMIN), GlobalController.getMyMyWhy);
router.get(
  '/mywhy/:id',
  auth(UserRoleEnum.USER, UserRoleEnum.ADMIN),
  GlobalController.getMyWhyById,
);
router.post('/mywhy', auth(UserRoleEnum.USER, UserRoleEnum.ADMIN), GlobalController.createMyWhy);
router.delete(
  '/mywhy/:id',
  auth(UserRoleEnum.USER, UserRoleEnum.ADMIN),
  GlobalController.deleteMyWhy,
);

// Affirmation Routes

router.get(
  '/affirmation/my-affirmation',
  auth(UserRoleEnum.USER, UserRoleEnum.ADMIN),
  GlobalController.getMyAffirmation,
);
router.get(
  '/affirmation/:id',
  auth(UserRoleEnum.USER, UserRoleEnum.ADMIN),
  GlobalController.getAffirmationById,
);
router.post(
  '/affirmation',
  auth(UserRoleEnum.USER, UserRoleEnum.ADMIN),
  GlobalController.createAffirmation,
);
router.delete(
  '/affirmation/my-affirmation/:id',
  auth(UserRoleEnum.USER, UserRoleEnum.ADMIN),
  GlobalController.deleteAffirmation,
);

export const GlobalRoutes = router;
