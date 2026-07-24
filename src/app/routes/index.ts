import express from 'express';
import { UserRouters } from '../modules/User/user.routes';
import { NotificationsRouters } from '../modules/Notification/notification.route';
import { AssetRouters } from '../modules/Asset/asset.route';
import { AuthRouters } from '../modules/Auth/Auth.routes';
import { SubscriptionRoutes } from '../modules/Subscription/Subscription.routes';
import { MotivationRoutes } from '../modules/Motivation/Motivation.routes';
import { VisionRoutes } from '../modules/Vision/Vision.routes';
import { FollowRoutes } from '../modules/follow/follow.routes';
import { MetaRoutes } from '../modules/meta/analytics.route';
import { GoalRoutes } from '../modules/goal/goal.routes';
import { BudgetRoutes } from '../modules/budget/budget.routes';
import { PaymentRoutes } from '../modules/Payment/payment.route';
import { GlobalRoutes } from '../modules/Global/Global.routes';
import { LeadsRoutes } from '../modules/Leads/Leads.routes';
import { DataRoutes } from '../modules/Data/Data.routes';
import { FriendsRoutes } from '../modules/Friends/Friends.routes';
import { PushRoutes } from '../modules/Push/Push.routes';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRouters,
  },
  {
    path: '/user',
    route: UserRouters,
  },
  {
    path: '/notifications',
    route: NotificationsRouters,
  },
  {
    path: '/assets',
    route: AssetRouters,
  },
  {
    path: '/subscription',
    route: SubscriptionRoutes,
  },
  {
    path: '/motivation',
    route: MotivationRoutes,
  },
  {
    path: '/vision',
    route: VisionRoutes,
  },
  {
    path: '/follow',
    route: FollowRoutes,
  },
  {
    path: '/meta',
    route: MetaRoutes,
  },
  {
    path: '/goals',
    route: GoalRoutes,
  },
  {
    path: '/budget',
    route: BudgetRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/global',
    route: GlobalRoutes,
  },
  {
    path: '/leads',
    route: LeadsRoutes,
  },
  {
    path: '/friends',
    route: FriendsRoutes,
  },
  {
    path: '/push',
    route: PushRoutes,
  },
  {
    path: '/data',
    route: DataRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
