"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = exports.fetchUserReports = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../utils/prisma");
/** Convert minutes (Int) to decimal hours */
function minutesToDecimalHours(minutes) {
    if (!minutes || minutes <= 0)
        return 0;
    return Math.round((minutes / 60) * 10) / 10;
}
/** Format minutes into "Xh Ym" */
function formatMinutes(minutes) {
    if (!minutes || minutes <= 0)
        return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}
/** ISO date yyyy-mm-dd (UTC) */
function toISODateUTC(d) {
    return d.toISOString().slice(0, 10);
}
/**
 * Fetch reports for a user for a given month.
 * If year/month not provided, defaults to current month.
 */
const fetchUserReports = (userId, year, month) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const now = new Date();
    const y = year !== null && year !== void 0 ? year : now.getUTCFullYear();
    const m = month ? month - 1 : now.getUTCMonth();
    const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    // ========== ALL-TIME AGGREGATIONS ==========
    const totalGoals = yield prisma_1.prisma.goal.count({ where: { userId } });
    const completedGoals = yield prisma_1.prisma.goal.count({
        where: { userId, status: client_1.GoalStatus.COMPLETED },
    });
    const pendingGoals = yield prisma_1.prisma.goal.count({
        where: { userId, status: client_1.GoalStatus.PENDING },
    });
    const salesPercent = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);
    const totalClients = yield prisma_1.prisma.client.count({
        where: { goal: { userId } },
    });
    const timeAggAll = yield prisma_1.prisma.client.aggregate({
        where: { goal: { userId } },
        _sum: { timeSpent: true },
    });
    const totalMinutesAll = (_b = (_a = timeAggAll === null || timeAggAll === void 0 ? void 0 : timeAggAll._sum) === null || _a === void 0 ? void 0 : _a.timeSpent) !== null && _b !== void 0 ? _b : 0;
    const totalTimeSpentHoursAll = minutesToDecimalHours(totalMinutesAll);
    // ========== MONTH-SPECIFIC AGGREGATIONS ==========
    const goalsCreatedInMonth = yield prisma_1.prisma.goal.findMany({
        where: {
            userId,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { id: true, createdAt: true, status: true, category: true },
    });
    const goalsCompletedInMonth = yield prisma_1.prisma.goal.findMany({
        where: {
            userId,
            status: client_1.GoalStatus.COMPLETED,
            updatedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { id: true, createdAt: true, updatedAt: true, category: true },
    });
    const clientsCompletedInMonth = yield prisma_1.prisma.client.findMany({
        where: {
            goal: { userId },
            status: client_1.ClientStatus.COMPLETED,
            updatedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { id: true, updatedAt: true, timeSpent: true },
    });
    const totalGoalsCreatedThisMonth = goalsCreatedInMonth.length;
    const totalGoalsCompletedThisMonth = goalsCompletedInMonth.length;
    const totalClientsCompletedThisMonth = clientsCompletedInMonth.length;
    // Total time spent DURING the month (clients' time)
    const timeAggMonth = yield prisma_1.prisma.client.aggregate({
        where: {
            goal: { userId },
            OR: [
                { createdAt: { gte: startOfMonth, lte: endOfMonth } },
                { updatedAt: { gte: startOfMonth, lte: endOfMonth } },
            ],
        },
        _sum: { timeSpent: true },
    });
    const totalMinutesThisMonth = (_d = (_c = timeAggMonth === null || timeAggMonth === void 0 ? void 0 : timeAggMonth._sum) === null || _c === void 0 ? void 0 : _c.timeSpent) !== null && _d !== void 0 ? _d : 0;
    const totalTimeSpentHoursThisMonth = minutesToDecimalHours(totalMinutesThisMonth);
    // ===============================
    // GOAL TREND: WEEKDAY (Sun..Sat)
    // ===============================
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayBuckets = Array.from({ length: 7 }, () => ({ created: 0, completed: 0 }));
    goalsCreatedInMonth.forEach(g => {
        const day = new Date(g.createdAt).getUTCDay();
        weekdayBuckets[day].created += 1;
    });
    goalsCompletedInMonth.forEach(g => {
        const day = new Date(g.updatedAt).getUTCDay();
        weekdayBuckets[day].completed += 1;
    });
    const goalTrend = {
        labels: weekdayNames,
        created: weekdayBuckets.map(b => b.created),
        completed: weekdayBuckets.map(b => b.completed),
        totals: {
            created: totalGoalsCreatedThisMonth,
            completed: totalGoalsCompletedThisMonth,
        },
    };
    // ===============================
    // TOTAL TIME FOR GOALS CREATED THIS MONTH
    // ===============================
    const goalIdsCreatedThisMonth = goalsCreatedInMonth.map(g => g.id);
    let totalMinutesForGoalsCreatedThisMonth = 0;
    if (goalIdsCreatedThisMonth.length > 0) {
        const aggForGoals = yield prisma_1.prisma.client.aggregate({
            where: {
                goalId: { in: goalIdsCreatedThisMonth },
            },
            _sum: { timeSpent: true },
        });
        totalMinutesForGoalsCreatedThisMonth =
            (_f = (_e = aggForGoals === null || aggForGoals === void 0 ? void 0 : aggForGoals._sum) === null || _e === void 0 ? void 0 : _e.timeSpent) !== null && _f !== void 0 ? _f : 0;
    }
    const totalHoursForGoalsCreatedThisMonth = minutesToDecimalHours(totalMinutesForGoalsCreatedThisMonth);
    // ===============================
    // CATEGORY DISTRIBUTION (month)
    // ===============================
    const categories = Object.values(client_1.GoalCategory);
    const categoryDistribution = yield Promise.all(categories.map((category) => __awaiter(void 0, void 0, void 0, function* () {
        const count = yield prisma_1.prisma.goal.count({
            where: {
                userId,
                category: category,
                createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
        });
        return { category, count };
    })));
    // ===============================
    // RECENT ACTIVITY (last 5 clients)
    // ===============================
    const recentClients = yield prisma_1.prisma.client.findMany({
        where: {
            goal: { userId },
            OR: [
                { createdAt: { gte: startOfMonth, lte: endOfMonth } },
                { updatedAt: { gte: startOfMonth, lte: endOfMonth } },
            ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            timeSpent: true,
        },
    });
    const processedRecentActivity = recentClients.map(r => {
        var _a;
        return ({
            id: r.id,
            name: (_a = r.name) !== null && _a !== void 0 ? _a : 'Unknown',
            status: r.status,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            timeSpentMinutes: r.timeSpent,
            timeSpentHoursDecimal: minutesToDecimalHours(r.timeSpent),
            timeSpentFormatted: formatMinutes(r.timeSpent),
        });
    });
    // ===============================
    // FINAL RETURN
    // ===============================
    return {
        month: {
            year: y,
            month: m + 1,
            startDate: startOfMonth,
            endDate: endOfMonth,
            totals: {
                goalsCreated: totalGoalsCreatedThisMonth,
                goalsCompleted: totalGoalsCompletedThisMonth,
                clientsCompleted: totalClientsCompletedThisMonth,
                totalTimeMinutes: totalMinutesThisMonth,
                totalTimeHours: totalTimeSpentHoursThisMonth,
                goalsCreatedTimeMinutes: totalMinutesForGoalsCreatedThisMonth,
                goalsCreatedTimeHours: totalHoursForGoalsCreatedThisMonth,
            },
        },
        goalTrend,
        categoryDistribution,
        recentActivity: processedRecentActivity,
        summaryAllTime: {
            totalGoals,
            completedGoals,
            pendingGoals,
            salesPercent,
            totalClients,
            totalTimeSpentHoursAll,
            totalTimeSpentMinutesAll: totalMinutesAll,
        },
    };
});
exports.fetchUserReports = fetchUserReports;
exports.ReportService = {
    fetchUserReports: exports.fetchUserReports,
};
// import { ClientStatus, GoalCategory, GoalStatus } from '@prisma/client';
// import { prisma } from '../../utils/prisma';
// /**
//  * Helper: return YYYY-WW week key (simple ISO week-like approximation)
//  * You can replace this with your own getWeek implementation if you already have one.
//  */
// function getWeekKey(d: Date) {
//   const date = new Date(d);
//   // ISO week number computation (approximate, good enough for grouping)
//   const target = new Date(
//     Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
//   );
//   const dayNr = (target.getUTCDay() + 6) % 7; // Monday=0, Sunday=6
//   target.setUTCDate(target.getUTCDate() - dayNr + 3);
//   const firstThursday = target.valueOf();
//   target.setUTCMonth(0, 1);
//   if (target.getUTCDay() !== 4) {
//     target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
//   }
//   const weekNumber =
//     1 +
//     Math.round((firstThursday - target.getTime()) / (7 * 24 * 60 * 60 * 1000));
//   return `${date.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
// }
// /** Convert minutes (Int) to decimal hours */
// function minutesToDecimalHours(minutes: number | null | undefined) {
//   if (!minutes || minutes <= 0) return 0;
//   return Math.round((minutes / 60) * 10) / 10; // one decimal precision
// }
// /** Format minutes into "Xh Ym" */
// function formatMinutes(minutes: number | null | undefined) {
//   if (!minutes || minutes <= 0) return '0h 0m';
//   const h = Math.floor(minutes / 60);
//   const m = minutes % 60;
//   return `${h}h ${m}m`;
// }
// export const fetchUserReports = async (userId: string) => {
//   // 1) Basic counts
//   const totalGoals = await prisma.goal.count({ where: { userId } });
//   const reachedGoals = await prisma.client.count({
//     where: { userId, status: ClientStatus.REACHED },
//   });
//   const completedGoals = await prisma.goal.count({
//     where: { userId, status: GoalStatus.COMPLETED },
//   });
//   console.log('completed', completedGoals);
//   const pendingGoals = await prisma.goal.count({
//     where: { userId, status: GoalStatus.PENDING },
//   });
//   console.log("pending goals",pendingGoals)
//   const salesPercent =
//     totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100);
//     console.log('sales',salesPercent)
//   // 2) Clients count
//   const totalClients = await prisma.client.count({
//     where: { goal: { userId } },
//   });
//   // 3) Total time spent (aggregate _sum on Client.timeSpent which is Int minutes)
//   const timeAgg = await prisma.client.aggregate({
//     where: { goal: { userId } },
//     _sum: { timeSpent: true },
//   });
//   const totalMinutes = (timeAgg as any)?._sum?.timeSpent ?? 0;
//   const totalTimeSpentHours = minutesToDecimalHours(totalMinutes);
//   // 4) Last 7 days goal trend (daily buckets)
//   const today = new Date();
//   today.setUTCHours(0, 0, 0, 0);
//   const last7Start = new Date(today);
//   last7Start.setUTCDate(last7Start.getUTCDate() - 6);
//   const goalsLast7 = await prisma.goal.findMany({
//     where: {
//       userId,
//       createdAt: { gte: last7Start },
//       status: { in: [GoalStatus.COMPLETED, GoalStatus.PENDING] },
//     },
//     select: { id: true, status: true, createdAt: true },
//   });
//   // build daily buckets
//   const dayBuckets: Record<string, { completed: number; pending: number }> = {};
//   for (let i = 0; i < 7; i++) {
//     const d = new Date(last7Start);
//     d.setUTCDate(last7Start.getUTCDate() + i);
//     const key = d.toISOString().slice(0, 10);
//     dayBuckets[key] = { completed: 0, pending: 0 };
//   }
//   goalsLast7.forEach(g => {
//     const key = new Date(g.createdAt).toISOString().slice(0, 10);
//     if (!dayBuckets[key]) dayBuckets[key] = { completed: 0, pending: 0 };
//     if (g.status === GoalStatus.COMPLETED) dayBuckets[key].completed += 1;
//     else dayBuckets[key].pending += 1;
//   });
//   const goalTrend = Object.keys(dayBuckets).map(dateKey => ({
//     date: dateKey,
//     completed: dayBuckets[dateKey].completed,
//     pending: dayBuckets[dateKey].pending,
//   }));
//   // 5) Category distribution
//   const categories = Object.values(GoalCategory) as string[];
//   const categoryDistribution = await Promise.all(
//     categories.map(async category => {
//       const count = await prisma.goal.count({
//         where: { userId, category } as any,
//       });
//       return { category, count };
//     }),
//   );
//   // 6) Weekly performance (target vs completed) using createdAt groups
//   const allGoalsForPerformance = await prisma.goal.findMany({
//     where: { userId },
//     select: { status: true, createdAt: true },
//   });
//   const weeks: Record<string, { target: number; completed: number }> = {};
//   allGoalsForPerformance.forEach(g => {
//     const weekKey = getWeekKey(new Date(g.createdAt));
//     if (!weeks[weekKey]) weeks[weekKey] = { target: 0, completed: 0 };
//     weeks[weekKey].target += 1;
//     if (g.status === GoalStatus.COMPLETED) weeks[weekKey].completed += 1;
//   });
//   // 7) Average completion time (days)
//   const completedGoalsTimes = await prisma.goal.findMany({
//     where: { userId, status: GoalStatus.COMPLETED },
//     select: { createdAt: true, updatedAt: true },
//   });
//   const completionDurationsDays = completedGoalsTimes
//     .map(g => {
//       const created = new Date(g.createdAt).getTime();
//       const completed = new Date(g.updatedAt).getTime();
//       if (!created || !completed || completed <= created) return null;
//       const diffMs = completed - created;
//       const diffDays = diffMs / (1000 * 60 * 60 * 24);
//       return diffDays;
//     })
//     .filter((v): v is number => v !== null);
//   const avgCompletionDays =
//     completionDurationsDays.length === 0
//       ? 0
//       : Math.round(
//           (completionDurationsDays.reduce((a, b) => a + b, 0) /
//             completionDurationsDays.length) *
//             10,
//         ) / 10;
//   // 8) Recent Activity (latest 5 clients)
//   const recentClients = await prisma.client.findMany({
//     where: { goal: { userId } },
//     orderBy: { createdAt: 'desc' },
//     take: 5,
//     select: {
//       id: true,
//       name: true,
//       status: true,
//       createdAt: true,
//       timeSpent: true,
//     },
//   });
//   const processedRecentActivity = recentClients.map(r => ({
//     id: r.id,
//     name: r.name ?? 'Unknown',
//     status: r.status,
//     createdAt: r.createdAt,
//     timeSpentMinutes: r.timeSpent,
//     timeSpentHoursDecimal: minutesToDecimalHours(r.timeSpent),
//     timeSpentFormatted: formatMinutes(r.timeSpent),
//   }));
//   return {
//     progress: {
//       totalGoals,
//       completedGoals,
//       pendingGoals,
//       salesPercent,
//       totalClients,
//       totalTimeSpentHours,
//       totalTimeSpentMinutes: totalMinutes,
//     },
//     goalTrend,
//     categoryDistribution,
//     performanceWeeks: weeks,
//     avgCompletionDays,
//     recentActivity: processedRecentActivity,
//   };
// };
// export const ReportService = {
//   fetchUserReports,
// };
