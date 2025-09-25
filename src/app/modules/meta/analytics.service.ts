import { UserRoleEnum, UserStatus } from '@prisma/client';
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
  //   const incomeData = await prisma.transaction.groupBy({
  //     by: ['createdAt'],
  //     _sum: {
  //       amount: true,
  //     },
  //     where: {
  //       createdAt: {
  //         gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
  //       },
  //       status: 'completed', // Only consider completed transactions
  //     },
  //     orderBy: {
  //       createdAt: 'asc',
  //     },
  //   });

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
    // income: incomeData.map(item => ({
    //   date: item.createdAt.toISOString().split('T')[0], // Format date to YYYY-MM-DD
    //   income: item._sum.amount,
    // })),
    approvals: approvals,
  };
};

export const MetaService = {
  fetchDashboardMetaData,
};
