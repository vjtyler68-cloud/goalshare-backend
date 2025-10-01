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
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
