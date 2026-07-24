import express from 'express';
import auth from '../../middlewares/auth';
import { PushControllers } from './Push.controller';

const router = express.Router();

router.post('/notify', auth('ANY'), PushControllers.notify);

export const PushRoutes = router;
