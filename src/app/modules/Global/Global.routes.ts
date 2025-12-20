import express from 'express';
import { GlobalController } from './Global.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

// MyWhy Routes
router.get('/mywhy', auth(UserRoleEnum.USER), GlobalController.getMyMyWhy);
router.get(
  '/mywhy/:id',
  auth(UserRoleEnum.USER),
  GlobalController.getMyWhyById,
);
router.post('/mywhy', auth(UserRoleEnum.USER), GlobalController.createMyWhy);
router.delete(
  '/mywhy/:id',
  auth(UserRoleEnum.USER),
  GlobalController.deleteMyWhy,
);

// Affirmation Routes

router.get(
  '/affirmation/my-affirmation',
  auth(UserRoleEnum.USER),
  GlobalController.getMyAffirmation,
);
router.get(
  '/affirmation/:id',
  auth(UserRoleEnum.USER),
  GlobalController.getAffirmationById,
);
router.post(
  '/affirmation',
  auth(UserRoleEnum.USER),
  GlobalController.createAffirmation,
);
router.delete(
  '/affirmation/my-affirmation/:id',
  auth(UserRoleEnum.USER),
  GlobalController.deleteAffirmation,
);

export const GlobalRoutes = router;
