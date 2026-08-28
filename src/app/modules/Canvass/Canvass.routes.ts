import express from 'express';
import auth from '../../middlewares/auth';
import { CanvassControllers } from './Canvass.controller';

const router = express.Router();

// All membership-enforced in the service layer (admin → all org pins,
// rep → only their own).
router.post('/:orgId/pin', auth('ANY'), CanvassControllers.createPin);
router.get('/:orgId/pins', auth('ANY'), CanvassControllers.listPins);
router.patch('/pin/:pinId', auth('ANY'), CanvassControllers.updatePin);
// Assign/reassign a lead to a rep (admin only, enforced in the service).
router.patch('/pin/:pinId/assign', auth('ANY'), CanvassControllers.assignPin);
router.delete('/pin/:pinId', auth('ANY'), CanvassControllers.deletePin);

export const CanvassRoutes = router;
