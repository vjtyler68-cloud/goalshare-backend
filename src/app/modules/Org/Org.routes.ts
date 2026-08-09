import express from 'express';
import auth from '../../middlewares/auth';
import { OrgControllers } from './Org.controller';

const router = express.Router();

router.post('/create', auth('ANY'), OrgControllers.createOrg);
router.post('/join', auth('ANY'), OrgControllers.joinOrg);
router.get('/mine', auth('ANY'), OrgControllers.getMine);
router.get('/:id/roster', auth('ANY'), OrgControllers.getRoster);
router.post('/summary', auth('ANY'), OrgControllers.pushSummary);
router.post('/leave', auth('ANY'), OrgControllers.leaveOrg);

export const OrgRoutes = router;
