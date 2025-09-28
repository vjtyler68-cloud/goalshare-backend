import { PaymentStatus, UserRoleEnum, UserStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';

const fetchDashboardMetaData = async (userId: string) => {
  // First, get the current user's role to ensure they are an ADMIN
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== UserRoleEnum.ADMIN) {
    throw new Error('Unauthorized access');
  }

  // Calculate the key metrics
  const totalUsers = await prisma.user.count();
  const suspendedUsers = await prisma.user.count({
    where: { status: UserStatus.SUSPENDED },
  }); // Assuming you have a 'status' field
  const activeUsers = await prisma.user.count({
    where: { status: UserStatus.ACTIVE },
  }); // Or you can calculate this as total - suspended

  // Fetch the income data for the graph (e.g., last 30 days)
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
  startDate: string,
  endDate: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    throw new Error('Unauthorized access');
  }

  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: PaymentStatus.SUCCESS,  
    },
    select: {
      createdAt: true,
      user: {
        select: {
          fullName: true, 
        },
      },
      amount: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Map the data to match the table structure (Date, Type, User, Amount)
  const reportData = payments.map(payment => ({
    date: payment.createdAt.toISOString().split('T')[0],
    type: 'Monthly', 
    user: payment.user.fullName || 'Unknown', 
    amount: payment.amount || 0, 
  }));

  return reportData;
};

export const MetaService = {
  fetchDashboardMetaData,
  getReportTableData,
};
