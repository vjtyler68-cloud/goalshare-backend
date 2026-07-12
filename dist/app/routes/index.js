"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = require("../modules/User/user.routes");
const notification_route_1 = require("../modules/Notification/notification.route");
const asset_route_1 = require("../modules/Asset/asset.route");
const Auth_routes_1 = require("../modules/Auth/Auth.routes");
const Subscription_routes_1 = require("../modules/Subscription/Subscription.routes");
const Motivation_routes_1 = require("../modules/Motivation/Motivation.routes");
const Vision_routes_1 = require("../modules/Vision/Vision.routes");
const follow_routes_1 = require("../modules/follow/follow.routes");
const analytics_route_1 = require("../modules/meta/analytics.route");
const goal_routes_1 = require("../modules/goal/goal.routes");
const budget_routes_1 = require("../modules/budget/budget.routes");
const payment_route_1 = require("../modules/Payment/payment.route");
const Global_routes_1 = require("../modules/Global/Global.routes");
const Leads_routes_1 = require("../modules/Leads/Leads.routes");
const router = express_1.default.Router();
const moduleRoutes = [
    {
        path: '/auth',
        route: Auth_routes_1.AuthRouters,
    },
    {
        path: '/user',
        route: user_routes_1.UserRouters,
    },
    {
        path: '/notifications',
        route: notification_route_1.NotificationsRouters,
    },
    {
        path: '/assets',
        route: asset_route_1.AssetRouters,
    },
    {
        path: '/subscription',
        route: Subscription_routes_1.SubscriptionRoutes,
    },
    {
        path: '/motivation',
        route: Motivation_routes_1.MotivationRoutes,
    },
    {
        path: '/vision',
        route: Vision_routes_1.VisionRoutes,
    },
    {
        path: '/follow',
        route: follow_routes_1.FollowRoutes,
    },
    {
        path: '/meta',
        route: analytics_route_1.MetaRoutes,
    },
    {
        path: '/goals',
        route: goal_routes_1.GoalRoutes,
    },
    {
        path: '/budget',
        route: budget_routes_1.BudgetRoutes,
    },
    {
        path: '/payment',
        route: payment_route_1.PaymentRoutes,
    },
    {
        path: '/global',
        route: Global_routes_1.GlobalRoutes,
    },
    {
        path: '/leads',
        route: Leads_routes_1.LeadsRoutes,
    },
];
moduleRoutes.forEach(route => router.use(route.path, route.route));
exports.default = router;
