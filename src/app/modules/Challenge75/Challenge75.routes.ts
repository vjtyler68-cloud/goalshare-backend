import express from 'express';
import auth from '../../middlewares/auth';
import { Challenge75Controllers } from './Challenge75.controller';

const router = express.Router();

// Optional friend accountability for the 75 Challenge. All routes are
// authenticated with the app's own account (JWT) — no Firebase involved.
router.post('/crew', auth('ANY'), Challenge75Controllers.createCrew);
router.post('/crew/join', auth('ANY'), Challenge75Controllers.joinCrew);
router.post('/crew/leave', auth('ANY'), Challenge75Controllers.leaveCrew);
router.post('/crew/progress', auth('ANY'), Challenge75Controllers.pushProgress);
router.get('/crew/:code/members', auth('ANY'), Challenge75Controllers.listMembers);

export const Challenge75Routes = router;
