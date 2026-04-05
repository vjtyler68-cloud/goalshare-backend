import { PaymentStatus, UserRoleEnum, UserStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';

const fetchDashboardMetaData = async (userId: string) => {
  // First, get the current user's role to ensure they are an ADMIN
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== UserRoleEnum.ADMIN) {
    throw new Error('Unauthorized access');
  }

  const totalUsers = await prisma.user.count({
    where: { role: UserRoleEnum.USER },
  });
  const suspendedUsers = await prisma.user.count({
    where: { role: UserRoleEnum.USER, status: UserStatus.SUSPENDED },
  });
  const activeUsers = await prisma.user.count({
    where: { role: UserRoleEnum.USER, status: UserStatus.ACTIVE },
  });
  const incomeData = await prisma.payment.groupBy({
    by: ['createdAt'],
    _sum: {
      amount: true,
    },
    where: {
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
      status: PaymentStatus.SUCCESS,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Fetch recent pending approvals
  const approvals = await prisma.user.findMany({
    where: {
      isApproved: false,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profile: true,
      createdAt: true,
    },
    take: 4,
    orderBy: {
      createdAt: 'asc',
    },
  });

  return {
    users: {
      total: totalUsers,
      suspended: suspendedUsers,
      active: activeUsers,
    },
    income: incomeData.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      income: item._sum.amount,
    })),
    approvals: approvals,
  };
};

const getReportTableData = async (
  userId: string,
  startDate?: string,
  endDate?: string,
) => {
  // Check if user is ADMIN
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    throw new AppError(401, 'Unauthorized access');
  }

  // Build optional date filter
  const dateFilter: any = {};
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start.getTime())) dateFilter.gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) dateFilter.lte = end;
  }

  const payments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.SUCCESS,
      userId: { not: null },
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
    },
    select: {
      createdAt: true,
      user: {
        select: { fullName: true },
      },
      amount: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Map the data to table structure
  const reportData = payments.map(payment => ({
    date: payment.createdAt.toISOString().split('T')[0],
    type: 'Monthly',
    user: payment.user?.fullName || 'Unknown',
    amount: payment.amount || 0,
  }));

  return reportData;
};

export const MetaService = {
  fetchDashboardMetaData,
  getReportTableData,
};
