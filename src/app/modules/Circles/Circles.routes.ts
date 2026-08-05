import express from 'express';
import auth from '../../middlewares/auth';
import { CirclesControllers } from './Circles.controller';

const router = express.Router();

router.post('/create', auth('ANY'), CirclesControllers.createCircle);
router.get('/mine', auth('ANY'), CirclesControllers.getMyCircle);
router.post('/checkin', auth('ANY'), CirclesControllers.checkinCircle);
router.post('/shield', auth('ANY'), CirclesControllers.burnShield);
router.post('/leave', auth('ANY'), CirclesControllers.leaveCircle);

export const CirclesRoutes = router;
