// import { GoalCategory, GoalStatus } from '@prisma/client';
// import { prisma } from '../../utils/prisma';
// import { getWeek } from './report.constant';

// const fetchUserReports = async (userId: string) => {
//   // 1. Progress (Sales, Client Sessions)
//   const totalGoals = await prisma.goal.count({ where: { userId } });
//   const completedGoals = await prisma.goal.count({
//     where: { userId, status: GoalStatus.COMPLETED },
//   });

//   // Percentage completed (sales)
//   const salesPercent =
//     totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);

//   // Client sessions (count clients of this user’s goals)
//   const totalClients = await prisma.client.count({
//     where: {
//       goal: { userId },
//     },
//   });

//   //! Reason: timeSpent is now DateTime?, which cannot be summed using Prisma's _sum aggregation.
//   // (If timeSpent is Int again)
//   // const timeSpentAgg = await prisma.client.aggregate({
//   //   _sum: { timeSpent: true },
//   //   where: { goal: { userId } },
//   // });

//   //* If you need total duration, you MUST change the Client model's timeSpent back to Int.

//   const last7days = new Date();
//   last7days.setDate(last7days.getDate() - 6);

//   // 2. Goal Trend (Last 7 Days)
//   const goalsTrend = await prisma.goal.groupBy({
//     by: ['status'],
//     _count: { _all: true },
//     where: {
//       userId,
//       status: { in: [GoalStatus.COMPLETED, GoalStatus.PENDING] },
//       createdAt: { gte: last7days },
//     },
//   });

//   // 3. Progress Distribution (Daily/Weekly/Monthly/Yearly)
//   const categories = Object.values(GoalCategory);
//   const categoryDistribution = await Promise.all(
//     categories.map(async category => {
//       const count = await prisma.goal.count({ where: { userId, category } });
//       return { category, count };
//     }),
//   );

//   // 4. Performance Analytics — per week, target vs completed (Manual Grouping)
//   const performance = await prisma.goal.findMany({
//     where: { userId },
//     select: { status: true, createdAt: true },
//   });

//   // group manually into weeks
//   const weeks: Record<string, { target: number; completed: number }> = {};
//   performance.forEach(g => {
//     // Assuming getWeek helper is available and correct
//     const week = getWeek(g.createdAt);
//     if (!weeks[week]) weeks[week] = { target: 0, completed: 0 };
//     weeks[week].target += 1;
//     if (g.status === GoalStatus.COMPLETED) weeks[week].completed += 1;
//   });

//   // 5. Recent Activity (latest clients, goals, etc.)
//   const recentActivity = await prisma.client.findMany({
//     where: { goal: { userId } },
//     select: {
//       id: true,
//       name: true,
//       status: true,
//       createdAt: true,

//       timeSpent: true,
//     },
//     orderBy: { createdAt: 'desc' },
//     take: 5,
//   });

//   return {
//     progress: {
//       salesPercent,
//       totalClients,

//       totalTimeSpent: 0,
//     },
//     goalTrend: goalsTrend,
//     categoryDistribution,
//     performance: weeks,
//     recentActivity,
//   };
// };

// export const ReportService = {
//   fetchUserReports,
// };

import { GoalCategory, GoalStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { getWeek } from './report.constant';

/**
 * @param {string | null | undefined} utcTimestamp - The UTC ISO 8601 timestamp
 * @returns {{hour: number, minute: number} | null} - Object containing hour (0-23) and minute (0-59)
 */
function extractHourAndMinute(
  utcTimestamp: string | null | undefined,
): { hour: number; minute: number } | null {
  if (!utcTimestamp) return null;

  const dateObj = new Date(utcTimestamp);

  if (isNaN(dateObj.getTime())) return null;

  const hour = dateObj.getUTCHours();
  const minute = dateObj.getUTCMinutes();

  return {
    hour: hour,
    minute: minute,
  };
}
// ----------------------------------------------------

const fetchUserReports = async (userId: string) => {
  // 1. Progress (Sales, Client Sessions)
  const totalGoals = await prisma.goal.count({ where: { userId } });
  const completedGoals = await prisma.goal.count({
    where: { userId, status: GoalStatus.COMPLETED },
  });

  // Percentage completed (sales)
  const salesPercent =
    totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);

  // Client sessions (count clients of this user’s goals)
  const totalClients = await prisma.client.count({
    where: {
      goal: { userId },
    },
  });

  const last7days = new Date();
  last7days.setDate(last7days.getDate() - 6);

  // 2. Goal Trend (Last 7 Days)
  const goalsTrend = await prisma.goal.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: {
      userId,
      status: { in: [GoalStatus.COMPLETED, GoalStatus.PENDING] },
      createdAt: { gte: last7days },
    },
  });

  // 3. Progress Distribution (Daily/Weekly/Monthly/Yearly)
  const categories = Object.values(GoalCategory);
  const categoryDistribution = await Promise.all(
    categories.map(async category => {
      const count = await prisma.goal.count({ where: { userId, category } });
      return { category, count };
    }),
  );

  // 4. Performance Analytics — per week, target vs completed (Manual Grouping)
  const performance = await prisma.goal.findMany({
    where: { userId },
    select: { status: true, createdAt: true },
  });

  // group manually into weeks
  const weeks: Record<string, { target: number; completed: number }> = {};
  performance.forEach(g => {
    const week = getWeek(g.createdAt);
    if (!weeks[week]) weeks[week] = { target: 0, completed: 0 };
    weeks[week].target += 1;
    if (g.status === GoalStatus.COMPLETED) weeks[week].completed += 1;
  });

  // 5. Recent Activity (latest clients, goals, etc.)
  let recentActivity = await prisma.client.findMany({
    where: { goal: { userId } },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      timeSpent: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // 💡 2. recentActivity

  const processedRecentActivity = recentActivity.map(activity => {
    const timeComponents = extractHourAndMinute(
      activity.timeSpent?.toISOString(),
    );

    return {
      ...activity,

      timeSpent: timeComponents,
    };
  });

  return {
    progress: {
      salesPercent,
      totalClients,
      totalTimeSpent: 0,
    },
    goalTrend: goalsTrend,
    categoryDistribution,
    performance: weeks,
    recentActivity: processedRecentActivity,
  };
};

export const ReportService = {
  fetchUserReports,
};
