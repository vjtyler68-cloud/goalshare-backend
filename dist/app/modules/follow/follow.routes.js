"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const follow_controller_1 = require("./follow.controller");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.get('/my-counts', (0, auth_1.default)(client_1.UserRoleEnum.USER), follow_controller_1.FollowController.getMyFollowCountsController);
router.get('/suggested-people', (0, auth_1.default)(client_1.UserRoleEnum.USER), follow_controller_1.FollowController.getMyFollowerFollowingList);
router.get('/counts/:userId', follow_controller_1.FollowController.getFollowCountsController);
router.get('/followers/:userId', follow_controller_1.FollowController.getFollowers);
router.get('/following/:userId', follow_controller_1.FollowController.getFollowing);
router.post('/follow-user', (0, auth_1.default)(client_1.UserRoleEnum.USER), follow_controller_1.FollowController.followUser);
router.post('/unfollow-user', (0, auth_1.default)(client_1.UserRoleEnum.USER), follow_controller_1.FollowController.unfollowUser);
exports.FollowRoutes = router;
