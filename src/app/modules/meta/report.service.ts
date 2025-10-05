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
 * Converts a DateTime to decimal hours
 * @param {Date | null | undefined} timeSpent - The timeSpent DateTime
 * @returns {number} - Total hours as decimal (e.g., 8.5)
 */
function convertToDecimalHours(timeSpent: number | null | undefined): number {
  if (!timeSpent) return 0;

  const dateObj = new Date(timeSpent);
  if (isNaN(dateObj.getTime())) return 0;

  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();

  // Convert to decimal hours (e.g., 8 hours 30 minutes = 8.5)
  return hours + minutes / 60;
}

/**
 * Formats time for display
 * @param {Date | null | undefined} timeSpent
 * @returns {string} - Formatted time string (e.g., "8h 30m")
 */
function formatTimeSpent(timeSpent: number | null | undefined): string {
  if (!timeSpent) return '0h 0m';

  const dateObj = new Date(timeSpent);
  if (isNaN(dateObj.getTime())) return '0h 0m';

  const hours = dateObj.getUTCHours();
  const minutes = dateObj.getUTCMinutes();

  return `${hours}h ${minutes}m`;
}

const fetchUserReports = async (userId: string) => {
  // 1. Progress (Sales, Client Sessions)
  const totalGoals = await prisma.goal.count({ where: { userId } });
  const completedGoals = await prisma.goal.count({
    where: { userId, status: GoalStatus.COMPLETED },
  });

  const salesPercent =
    totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);

  const totalClients = await prisma.client.count({
    where: {
      goal: { userId },
    },
  });

  // Calculate total time spent across all clients
  const allClients = await prisma.client.findMany({
    where: { goal: { userId } },
    select: { timeSpent: true },
  });

  const totalTimeSpent = allClients.reduce((sum, client) => {
    return sum + convertToDecimalHours(client.timeSpent);
  }, 0);

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

  // 4. Performance Analytics — per week, target vs completed
  const performance = await prisma.goal.findMany({
    where: { userId },
    select: { status: true, createdAt: true },
  });

  const weeks: Record<string, { target: number; completed: number }> = {};
  performance.forEach(g => {
    const week = getWeek(g.createdAt);
    if (!weeks[week]) weeks[week] = { target: 0, completed: 0 };
    weeks[week].target += 1;
    if (g.status === GoalStatus.COMPLETED) weeks[week].completed += 1;
  });

  // 5. Recent Activity
  const recentActivity = await prisma.client.findMany({
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

  const processedRecentActivity = recentActivity.map(activity => ({
    ...activity,
    timeSpentDecimal: convertToDecimalHours(activity.timeSpent),
    timeSpentFormatted: formatTimeSpent(activity.timeSpent),
    timeSpent: activity.timeSpent,
  }));

  return {
    progress: {
      salesPercent,
      totalClients,
      totalTimeSpent: Math.round(totalTimeSpent * 10) / 10,
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
