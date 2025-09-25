import express from 'express';
import { MotivationController } from './Motivation.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { upload } from '../../utils/fileUploader';

const router = express.Router();

router.get('/', MotivationController.getAllMotivation);
router.get(
  '/my-motivation',
  auth(UserRoleEnum.USER),
  MotivationController.getMyMotivation,
);
router.get('/:id', MotivationController.getMotivationById);

router.post(
  '/',
  auth(UserRoleEnum.USER),
  upload.single('file'),
  MotivationController.createIntoDb,
);

router.patch(
  '/:id',
  auth(UserRoleEnum.USER),
  upload.single('file'),
  MotivationController.updateIntoDb,
);

router.delete('/:id', MotivationController.deleteIntoDb);

export const MotivationRoutes = router;
