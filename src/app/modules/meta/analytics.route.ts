import express from 'express';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { MetaController } from './analytics.controller';
import { ReportController } from './report.controller';
const router = express.Router();

router.get(
  '/admin',
  auth(UserRoleEnum.ADMIN),
  MetaController.fetchDashboardMetaData,
);
router.get(
  '/report-table-data',
  auth(UserRoleEnum.ADMIN),
  MetaController.getReportTableData,
);
router.get('/user', auth(UserRoleEnum.USER), ReportController.getUserReports);

export const MetaRoutes = router;
