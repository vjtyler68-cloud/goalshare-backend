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
router.post('/friend-match', auth('ANY'), AccountabilityControllers.createFriendMatch);
router.get('/match', auth('ANY'), AccountabilityControllers.getCurrentMatch);
router.post('/checkin', auth('ANY'), AccountabilityControllers.logCheckIn);
router.post('/verify', auth('ANY'), AccountabilityControllers.verifyProof);
router.get('/checkins', auth('ANY'), AccountabilityControllers.getCheckins);
router.post('/voice', auth('ANY'), AccountabilityControllers.sendVoice);
router.get('/voice', auth('ANY'), AccountabilityControllers.getVoiceMessages);
router.post('/status', auth('ANY'), AccountabilityControllers.postStatus);
router.get('/status', auth('ANY'), AccountabilityControllers.getStatuses);
router.post('/goals', auth('ANY'), AccountabilityControllers.setGoals);
router.get('/buddy-goals', auth('ANY'), AccountabilityControllers.getBuddyGoals);
router.post('/extend', auth('ANY'), AccountabilityControllers.requestExtend);
router.post('/rate', auth('ANY'), AccountabilityControllers.submitRating);

export const AccountabilityRoutes = router;
