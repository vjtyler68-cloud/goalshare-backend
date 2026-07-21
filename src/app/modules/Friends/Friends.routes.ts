import express from 'express';
import auth from '../../middlewares/auth';
import { FriendsControllers } from './Friends.controller';

const router = express.Router();

// Literal paths before parameterised ones.
router.get('/requests', auth('ANY'), FriendsControllers.listRequests);
router.post('/requests', auth('ANY'), FriendsControllers.sendRequest);
router.post('/requests/:id/accept', auth('ANY'), FriendsControllers.acceptRequest);
router.post('/requests/:id/decline', auth('ANY'), FriendsControllers.declineRequest);
router.delete('/requests/:id', auth('ANY'), FriendsControllers.cancelRequest);

router.get('/', auth('ANY'), FriendsControllers.listFriends);
router.delete('/:userId', auth('ANY'), FriendsControllers.removeFriend);

export const FriendsRoutes = router;
