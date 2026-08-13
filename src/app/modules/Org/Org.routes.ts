import express from 'express';
import auth from '../../middlewares/auth';
import { OrgControllers } from './Org.controller';

const router = express.Router();

router.post('/create', auth('ANY'), OrgControllers.createOrg);
router.post('/join', auth('ANY'), OrgControllers.joinOrg);
router.get('/mine', auth('ANY'), OrgControllers.getMine);
router.get('/all', auth('ANY'), OrgControllers.getMyOrgs);
router.get('/:id/roster', auth('ANY'), OrgControllers.getRoster);
router.post('/summary', auth('ANY'), OrgControllers.pushSummary);
router.post('/leave', auth('ANY'), OrgControllers.leaveOrg);
router.post('/:id/map', auth('ANY'), OrgControllers.setMap); // admin — territory map
router.post('/:id/booking', auth('ANY'), OrgControllers.setBooking); // admin — scheduler
router.post('/:id/member-role', auth('ANY'), OrgControllers.setMemberRole); // admin — promote/demote co-admin

// Team HQ (org-private) — all membership-enforced in the service layer.
router.get('/:id/space', auth('ANY'), OrgControllers.getSpace);
router.post('/:id/post', auth('ANY'), OrgControllers.createPost);
router.post('/post/:postId/like', auth('ANY'), OrgControllers.toggleLike);
router.delete('/post/:postId', auth('ANY'), OrgControllers.deletePost);
router.post('/:id/goal', auth('ANY'), OrgControllers.createGoal);
router.post('/goal/:goalId/bump', auth('ANY'), OrgControllers.bumpGoal);
router.delete('/goal/:goalId', auth('ANY'), OrgControllers.deleteGoal);

// Task Hub (org-private tasks + projects) — all membership-enforced.
router.post('/:id/task-hub', auth('ANY'), OrgControllers.setTaskHub); // admin — enable/disable the module
router.get('/:id/tasks', auth('ANY'), OrgControllers.listTasks);
router.post('/:id/task', auth('ANY'), OrgControllers.createTask);
router.patch('/task/:taskId', auth('ANY'), OrgControllers.updateTask);
router.delete('/task/:taskId', auth('ANY'), OrgControllers.deleteTask);
router.post('/:id/project', auth('ANY'), OrgControllers.createProject);
router.delete('/project/:projectId', auth('ANY'), OrgControllers.deleteProject);

export const OrgRoutes = router;
