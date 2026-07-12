import express from 'express';
import { DataController } from './Data.controller';
import auth from '../../middlewares/auth';

const router = express.Router();

// Everything GoalShare stores server-side about the calling user, as one JSON
// document (GDPR/CCPA-style export; also linked from the privacy policy).
router.get('/export', auth('ANY'), DataController.exportMyData);

// Crash telemetry. Deliberately unauthenticated: crashes can happen before
// login. The service hard-caps field sizes so it can't be used to store junk.
router.post('/crash', DataController.reportCrash);

export const DataRoutes = router;
