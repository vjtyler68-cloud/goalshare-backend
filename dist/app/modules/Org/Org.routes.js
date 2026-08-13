"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Org_controller_1 = require("./Org.controller");
const router = express_1.default.Router();
router.post('/create', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.createOrg);
router.post('/join', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.joinOrg);
router.get('/mine', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.getMine);
router.get('/all', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.getMyOrgs);
router.get('/:id/roster', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.getRoster);
router.post('/summary', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.pushSummary);
router.post('/leave', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.leaveOrg);
router.post('/:id/map', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.setMap); // admin — territory map
router.post('/:id/booking', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.setBooking); // admin — scheduler
router.post('/:id/member-role', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.setMemberRole); // admin — promote/demote co-admin
// Team HQ (org-private) — all membership-enforced in the service layer.
router.get('/:id/space', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.getSpace);
router.post('/:id/post', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.createPost);
router.post('/post/:postId/like', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.toggleLike);
router.delete('/post/:postId', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.deletePost);
router.post('/:id/goal', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.createGoal);
router.post('/goal/:goalId/bump', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.bumpGoal);
router.delete('/goal/:goalId', (0, auth_1.default)('ANY'), Org_controller_1.OrgControllers.deleteGoal);
exports.OrgRoutes = router;
