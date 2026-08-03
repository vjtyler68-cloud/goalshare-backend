import express from 'express';
import auth from '../../middlewares/auth';
import { AccountabilityControllers } from './Accountability.controller';

const router = express.Router();

// Scheduler-triggered weekly pairing (secret-guarded, no user auth).
router.post('/run-pairing', AccountabilityControllers.runWeeklyPairing);

// Profile (matching pool + reputation).
router.get('/profile', auth('ANY'), AccountabilityControllers.getMyProfile);
router.post('/profile', auth('ANY'), AccountabilityControllers.upsertProfile);
router.post('/optin', auth('ANY'), AccountabilityControllers.setOptIn);

// Current match + cycle actions.
router.get('/match', auth('ANY'), AccountabilityControllers.getCurrentMatch);
router.post('/checkin', auth('ANY'), AccountabilityControllers.logCheckIn);
router.post('/extend', auth('ANY'), AccountabilityControllers.requestExtend);
router.post('/rate', auth('ANY'), AccountabilityControllers.submitRating);

export const AccountabilityRoutes = router;
