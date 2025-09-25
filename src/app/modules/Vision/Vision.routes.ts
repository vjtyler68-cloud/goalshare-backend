import express from 'express';
import { VisionController } from './Vision.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { upload } from '../../utils/fileUploader';

const router = express.Router();

router.get('/', VisionController.getAllVision);
router.get('/my-vision', auth(UserRoleEnum.USER), VisionController.getMyVision);
router.get('/:id', VisionController.getVisionById);

router.post(
  '/',
  auth(UserRoleEnum.USER),
  upload.single('file'),
  VisionController.createIntoDb,
);

router.delete('/:id', VisionController.deleteIntoDb);

export const VisionRoutes = router;
