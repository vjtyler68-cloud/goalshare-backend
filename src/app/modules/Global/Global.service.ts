import { PrismaClient, UserRoleEnum } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

interface MyWhyItem {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AffirmationItem {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

// MyWhy Services
const createMyWhy = async (req: Request): Promise<MyWhyItem | null> => {
  const { text } = req.body;
  const userId = req.user.id as string;

  if (!text) {
    return null; 
  }

  const result = await prisma.globalMyWhy.create({
    data: {
      text,
      userId,
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const getAllMyWhy = async (userId: string): Promise<MyWhyItem[]> => {
  const result = await prisma.globalMyWhy.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return result;
};

const getMyWhyById = async (
  userId: string,
  id: string,
): Promise<MyWhyItem | null> => {
  const result = await prisma.globalMyWhy.findUnique({
    where: { id },

    select: {
      id: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  
  });

  if (result && result.userId === userId) {
    // Remove userId from response
    const { userId: _, ...cleanResult } = result;
    return cleanResult;
  }

  return null;
};

const deleteMyWhy = async (
  userId: string,
  id: string,
): Promise<{ deleted: true } | null> => {
  const existing = await prisma.globalMyWhy.findUnique({
    where: { id },
    select: {
      userId: true,
    },
  });

  if (existing && existing.userId === userId) {
    await prisma.globalMyWhy.delete({
      where: { id },
    });
    return { deleted: true };
  }

  return null;
};

// Affirmation Services
const createAffirmation = async (
  req: Request,
): Promise<AffirmationItem | null> => {
  const { text } = req.body;
  const userId = req.user.id as string;

  if (!text) {
    return null; 
  }

  const result = await prisma.globalAffirmation.create({
    data: {
      text,
      userId,
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const getAllAffirmation = async (
  userId: string,
): Promise<AffirmationItem[]> => {
  const result = await prisma.globalAffirmation.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return result;
};

const getAffirmationById = async (
  userId: string,
  id: string,
): Promise<AffirmationItem | null> => {
  const result = await prisma.globalAffirmation.findUnique({
    where: { id },
    select: {
      id: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
  });

  if (result && result.userId === userId) {
    // Remove userId from response
    const { userId: _, ...cleanResult } = result;
    return cleanResult;
  }

  return null;
};

const deleteAffirmation = async (
  userId: string,
  id: string,
): Promise<{ deleted: true } | null> => {
  const existing = await prisma.globalAffirmation.findUnique({
    where: { id },
    select: {
      userId: true,
    },
  });

  if (existing && existing.userId === userId) {
    await prisma.globalAffirmation.delete({
      where: { id },
    });
    return { deleted: true };
  }

  return null;
};

export const GlobalServices = {
  // MyWhy
  createMyWhy,
  getAllMyWhy,
  getMyWhyById,
  deleteMyWhy,
  // Affirmation
  createAffirmation,
  getAllAffirmation,
  getAffirmationById,
  deleteAffirmation,
};
