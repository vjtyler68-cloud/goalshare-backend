import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { Motivation } from '@prisma/client';

const createIntoDb = async (
  id: string,
  file: Express.Multer.File | undefined,
  title: string,
) => {
  await prisma.user.findUniqueOrThrow({
    where: { id },
  });

  let fileUrl: string | null = null;
  if (file) {
    const location = await uploadToDigitalOceanAWS(file);
    fileUrl = location.Location;
  }

  const result = await prisma.motivation.create({
    data: {
      title,
      userId: id,
      image: fileUrl as string,
    },
  });

  return result;
};

const getAllMotivation = async (query: any) => {
  const motivationQuery = new QueryBuilder<typeof prisma.motivation>(
    prisma.motivation,
    query,
  );

  const result = await motivationQuery.sort().paginate().execute();
  return result;
};

const getMotivationByIdFromDB = async (id: string) => {
  const motivation = await prisma.motivation.findUnique({
    where: { id },
  });

  return motivation;
};

/** ✅ return all motivation created by the logged-in user */
const getMyMotivation = async (userId: string) => {
  const motivations = await prisma.motivation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return motivations;
};

/** ✅ delete one */
const deleteIntoDb = async (id: string) => {
  const motivation = await prisma.motivation.delete({
    where: { id },
  });

  return motivation;
};

/** ✅ update title and/or image */
const updateIntoDb = async (
  id: string,
  bodyData: Partial<Motivation>,
  file?: Express.Multer.File,
) => {
  // fetch the existing record first (optional but good for validation)
  await prisma.motivation.findUniqueOrThrow({ where: { id } });

  let fileUrl: string | undefined;
  if (file) {
    const location = await uploadToDigitalOceanAWS(file);
    fileUrl = location.Location;
  }

  const result = await prisma.motivation.update({
    where: { id },
    data: {
      ...bodyData,
      ...(fileUrl && { image: fileUrl }),
    },
  });

  return result;
};

export const MotivationServices = {
  createIntoDb,
  getAllMotivation,
  getMotivationByIdFromDB,
  getMyMotivation,
  deleteIntoDb,
  updateIntoDb,
};
