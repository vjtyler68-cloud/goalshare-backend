import express from 'express';
import { LeadsController } from './Leads.controller';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

// Every route requires the user's token (raw JWT, no Bearer prefix — app
// convention) and operates only on the authenticated user's own leads.
router.get('/', auth(UserRoleEnum.USER, UserRoleEnum.ADMIN), LeadsController.getMyLeads);
router.post('/', auth(UserRoleEnum.USER, UserRoleEnum.ADMIN), LeadsController.createLead);

// One-time bulk upload of a phone's existing local leads (upsert by clientId).
// Declared before '/:id' so 'sync' is never captured as an id parameter.
router.post('/sync', auth(UserRoleEnum.USER, UserRoleEnum.ADMIN), LeadsController.syncLeads);

router.patch('/:id', auth(UserRoleEnum.USER, UserRoleEnum.ADMIN), LeadsController.updateLead);
router.delete('/:id', auth(UserRoleEnum.USER, UserRoleEnum.ADMIN), LeadsController.deleteLead);

export const LeadsRoutes = router;
