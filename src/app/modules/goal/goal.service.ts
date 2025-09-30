import { Request } from 'express';
import { prisma } from '../../utils/prisma';
import { GoalCategory, GoalPriority, GoalStatus } from '@prisma/client';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

interface PaginationQuery {
  page?: number | string;
  limit?: number | string;
  category?: string;
}

// ---------- Goal ----------
const createGoal = async (req: Request, userId: string) => {
  const { title, clientTarget, description, category, priority, dueDate } =
    req.body;

  const goalDueDate = new Date(dueDate);
  const now = new Date();

  // now.setHours(0, 0, 0, 0);

  if (goalDueDate < now) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Goal due date cannot be a date in the past.',
    );
  }

  return await prisma.goal.create({
    data: {
      title,
      clientTarget,
      description,
      category,
      priority,
      dueDate: goalDueDate,
      userId,
    },
  });
};

const getMyGoals = async (userId: string, query: PaginationQuery) => {
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 10;
  const skip = (page - 1) * limit;

  const categoryFilter = query.category;

  const baseWhere = {
    userId,
    ...(categoryFilter && {
      category: categoryFilter as GoalCategory,
      priority: categoryFilter as GoalPriority,
      status: categoryFilter as GoalStatus,
    }),
  };

  const total = await prisma.goal.count({ where: baseWhere });

  const goals = await prisma.goal.findMany({
    where: baseWhere,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      clientTarget: true,
      description: true,
      category: true,
      priority: true,
      dueDate: true,
      status: true,
      breakTimeSpent: true,
      clients: {
        select: {
          status: true,
          timeSpent: true,
        },
      },
    },
  });

  // Add report for reached clients
  const goalsWithReport = goals.map(goal => {
    const reachedCount = goal.clients
      .filter(c => c.status === 'REACHED' || 'TALKED_TO' || 'COMPLETED')
      .reduce((total, c) => total + c.timeSpent, 0);



    // 1. Client Reached Count: Uses the new 'REACHED' status
    const clientsReachedCount = goal.clients.filter(
      client => client.status === 'REACHED',
    ).length;
    return {
      ...goal,
      reachedClientsTime: reachedCount,
      clientsReachedCount,
    };
  });

  return {
    goals: goalsWithReport,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getGoalById = async (id: string) => {
  const goalData = await prisma.goal.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      clientTarget: true,
      category: true,
      priority: true,
      dueDate: true,
      status: true,
      userId: true,
      clients: {
        select: {
          id: true,
          name: true,
          status: true,
          timeSpent: true,
          notes: true,
          phone: true,
        },
      },
      myWhies: {
        select: {
          id: true,
          text: true,
        },
      },
      affirmations: {
        select: {
          id: true,
          text: true,
        },
      },
      description: true,
      breakTimeSpent: true,
    },
  });

  if (!goalData) {
    return null;
  }

  // --- APPLICATION LOGIC FOR CALCULATING COUNTS AND PROGRESS ---

  const totalClients = goalData.clients.length;
  const clientTarget = goalData.clientTarget || 0;

  // 1. Client Reached Count: Uses the new 'REACHED' status
  const clientsReachedCount = goalData.clients.filter(
    client => client.status === 'REACHED',
  ).length;

  // 2. Client Talked To Count: Uses the new 'TALKED_TO' status
  const clientsTalkedToCount = goalData.clients.filter(
    client => client.status === 'TALKED_TO',
  ).length;

  // 3. Sales Completed Count: Uses your 'COMPLETED' status (Final step)
  const salesCompletedCount = goalData.clients.filter(
    client => client.status === 'COMPLETED',
  ).length;

  const totalReached =
    clientsReachedCount + clientsTalkedToCount + salesCompletedCount;
  const totalTalkedTo = clientsTalkedToCount + salesCompletedCount;

  let progressPercentage = 0;
  if (clientTarget > 0) {
    progressPercentage = (clientsReachedCount / clientTarget) * 100;
  }
  // You might also want a progress based on total clients contacted:
  const contactProgress = (clientTarget / clientsReachedCount) * 100;

  // Return the goal data WITH the calculated fields added
  return {
    ...goalData,
    // clientsReachedCount,
    // clientsTalkedToCount,
    salesCompletedCount,
    contactProgress,
    totalReached,
    totalTalkedTo,
    progressPercentage: Math.min(100, Math.round(progressPercentage)),
  };
};

const updateGoal = async (id: string, data: Partial<any>) => {
  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  return await prisma.goal.update({ where: { id }, data });
};

const deleteGoal = async (id: string) => {
  return await prisma.goal.delete({ where: { id } });
};

const updateGoalStatus = async (
  id: string,
  status: 'PENDING' | 'COMPLETED',
) => {
  return await prisma.goal.update({ where: { id }, data: { status } });
};

const goalBreakTimeSpent = async (goalId: string, breakTimeSpent: number) => {
  return await prisma.goal.update({
    where: { id: goalId },
    data: { breakTimeSpent },
  });
};

// ---------- Client ----------
const addClient = async (
  goalId: string,
  clientData: { name?: string; phone?: string; notes?: string },
) => {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { clientTarget: true, clients: { select: { id: true } } },
  });

  if (!goal) {
    throw new Error('Goal not found.');
  }

  if (goal.clients.length >= goal.clientTarget) {
    throw new Error(
      `Client limit reached. Goal target is ${goal.clientTarget} clients.`,
    );
  }
  return await prisma.client.create({
    data: {
      goalId,
      ...clientData,
    },
  });
};

const getAllClientsByGoalId = async (goalId: string) => {
  await prisma.goal.findUniqueOrThrow({
    where: { id: goalId },
    select: { id: true },
  });

  const clients = await prisma.client.findMany({
    where: {
      goalId: goalId,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      notes: true,
      status: true,
      timeSpent: true,
      goalId: true,
    },
  });

  if (clients.length === 0) {
    console.log(`No clients found for goal ID: ${goalId}`);
  }

  return clients;
};

const getClientById = async (id: string) => {
  return await prisma.client.findUnique({
    where: { id },
    select: {
      name: true,
      phone: true,
      notes: true,
      status: true,
    },
  });
};

const updateClient = async (clientId: string, data: Partial<any>) => {
  return await prisma.client.update({
    where: { id: clientId },
    data: data,
    select: {
      name: true,
      notes: true,
      phone: true,
    },
  });
};

const updateClientStatus = async (
  clientId: string,
  status: 'PENDING' | 'REACHED' | 'TALKED_TO' | 'COMPLETED',
) => {
  console.log({ clientId, status });
  return await prisma.client.update({
    where: { id: clientId },
    data: { status },
  });
};

const updateClientTimeSpent = async (clientId: string, timeSpent: number) => {
  return await prisma.client.update({
    where: { id: clientId },
    data: { timeSpent },
  });
};

// ---------- MyWhy ----------
const addMyWhy = async (goalId: string, text: string) => {
  return await prisma.myWhy.create({ data: { goalId, text } });
};

// ---------- Affirmation ----------
const addAffirmation = async (goalId: string, text: string) => {
  return await prisma.affirmation.create({ data: { goalId, text } });
};

export const GoalServices = {
  createGoal,
  getMyGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  updateGoalStatus,
  goalBreakTimeSpent,

  addClient,
  getAllClientsByGoalId,
  getClientById,
  updateClient,
  updateClientTimeSpent,
  updateClientStatus,
  addMyWhy,
  addAffirmation,
};
