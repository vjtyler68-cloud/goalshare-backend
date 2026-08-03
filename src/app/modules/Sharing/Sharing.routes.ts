import express from 'express';
import auth from '../../middlewares/auth';
import { SharingControllers } from './Sharing.controller';

const router = express.Router();

router.post('/settings', auth('ANY'), SharingControllers.upsertSettings);
router.get('/summary/:userId', auth('ANY'), SharingControllers.getSummary);

export const SharingRoutes = router;
