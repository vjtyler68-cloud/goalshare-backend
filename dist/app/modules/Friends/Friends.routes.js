"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const Friends_controller_1 = require("./Friends.controller");
const router = express_1.default.Router();

// Literal paths before parameterised ones.
router.get('/requests', (0, auth_1.default)('ANY'), Friends_controller_1.FriendsControllers.listRequests);
router.post('/requests', (0, auth_1.default)('ANY'), Friends_controller_1.FriendsControllers.sendRequest);
router.post('/requests/:id/accept', (0, auth_1.default)('ANY'), Friends_controller_1.FriendsControllers.acceptRequest);
router.post('/requests/:id/decline', (0, auth_1.default)('ANY'), Friends_controller_1.FriendsControllers.declineRequest);
router.delete('/requests/:id', (0, auth_1.default)('ANY'), Friends_controller_1.FriendsControllers.cancelRequest);

router.get('/', (0, auth_1.default)('ANY'), Friends_controller_1.FriendsControllers.listFriends);
router.delete('/:userId', (0, auth_1.default)('ANY'), Friends_controller_1.FriendsControllers.removeFriend);

exports.FriendsRoutes = router;
