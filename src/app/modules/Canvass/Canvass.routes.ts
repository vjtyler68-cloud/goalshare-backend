import express from 'express';
import auth from '../../middlewares/auth';
import { CanvassControllers } from './Canvass.controller';

const router = express.Router();

// All membership-enforced in the service layer (admin → all org pins,
// rep → only their own).
router.post('/:orgId/pin', auth('ANY'), CanvassControllers.createPin);
// Pre-load a pin on every home in an area (admin).
router.post('/:orgId/seed-area', auth('ANY'), CanvassControllers.seedArea);
router.get('/:orgId/pins', auth('ANY'), CanvassControllers.listPins);
router.patch('/pin/:pinId', auth('ANY'), CanvassControllers.updatePin);
// Assign/reassign a lead to a rep (admin only, enforced in the service).
router.patch('/pin/:pinId/assign', auth('ANY'), CanvassControllers.assignPin);
router.delete('/pin/:pinId', auth('ANY'), CanvassControllers.deletePin);

// Property enrichment. Pin-based is CACHED (one paid lookup per door, ever) and
// on-demand; the address form stays for ad-hoc lookups.
router.get('/pin/:pinId/enrich', auth('ANY'), CanvassControllers.enrichPin);
// Skip-trace a door for resident name + phone + email (cached).
router.get('/pin/:pinId/contact', auth('ANY'), CanvassControllers.contactPin);
// Google Solar potential for a door (cached).
router.get('/pin/:pinId/solar', auth('ANY'), CanvassControllers.solarPin);
router.get('/:orgId/enrich', auth('ANY'), CanvassControllers.enrich);

// Territories (drawn areas assigned to reps).
router.post('/:orgId/territory', auth('ANY'), CanvassControllers.createTerritory);
router.get('/:orgId/territories', auth('ANY'), CanvassControllers.listTerritories);
router.patch(
  '/territory/:territoryId',
  auth('ANY'),
  CanvassControllers.updateTerritory,
);
router.post(
  '/territory/:territoryId/populate',
  auth('ANY'),
  CanvassControllers.populateTerritory,
);
router.post(
  '/territory/:territoryId/populate/cancel',
  auth('ANY'),
  CanvassControllers.cancelTerritoryPopulation,
);
router.delete(
  '/territory/:territoryId',
  auth('ANY'),
  CanvassControllers.deleteTerritory,
);

export const CanvassRoutes = router;
