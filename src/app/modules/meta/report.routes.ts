import express from 'express';
import { ReportController } from './report.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.get('/user', auth(UserRoleEnum.USER), ReportController.getUserReports);

export const ReportRoutes = router;
