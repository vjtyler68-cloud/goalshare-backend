import express from 'express';
import { CommunityController } from './community.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { upload } from '../../utils/fileUploader';

const router = express.Router();

router.get('/', CommunityController.getAllCommunity);
router.get(
  '/my-communities',
  auth(UserRoleEnum.USER),
  CommunityController.getMyCommunities,
);
router.get('/:id', CommunityController.getCommunityById);

router.post(
  '/',
  auth(UserRoleEnum.USER),
  upload.single('file'),
  CommunityController.createIntoDb,
);

router.patch('/:id', CommunityController.updateIntoDb);

router.delete('/:id', CommunityController.deleteIntoDb);

export const CommunityRoutes = router;
