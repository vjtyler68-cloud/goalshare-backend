
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import { uploadToDigitalOcean } from '../../utils/uploadToDigitalOceanAWS';

const createIntoDb = async (
  id: string,
  file: Express.Multer.File | undefined,
  year: string,
) => {
  await prisma.user.findUnique({
    where: { id },
  });

  let fileUrl: string | null = null;
  if (file) {
    const location = await uploadToDigitalOcean(file);
    // const location = await uploadToCloudinary(file);
    console.log('Uploaded File URL:', location.Location);
    fileUrl = location.Location;
  }

  const result = await prisma.vision.create({
    data: {
      year: new Date(year),
      userId: id,
      image: fileUrl as string,
    },
  });

  return result;
};

const getAllVision = async (query: any) => {
  const visionQuery = new QueryBuilder<typeof prisma.vision>(
    prisma.vision,
    query,
  );

  const result = await visionQuery.sort().paginate().execute();
  return result;
};

const getVisionByIdFromDB = async (id: string) => {
  const vision = await prisma.vision.findUnique({
    where: { id },
  });

  return vision;
};
const getMyVision = async (userId: string) => {
  const vision = await prisma.vision.findMany({
    where: { userId },
    select: {
      id: true,
      year: true,
      image: true,
      user: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return vision;
};

const updateIntoDb = async (
  id: string,
  data: Partial<{ year: string }>,
  file?: Express.Multer.File,
) => {
  await prisma.vision.findUnique({ where: { id } });

  let fileUrl: string | undefined;
  if (file) {
    const location = await uploadToDigitalOcean(file);
    // const location = await uploadToCloudinary(file);
    fileUrl = location.Location;
  }

  const updatedVision = await prisma.vision.update({
    where: { id },
    data: {
      year: data.year,
      ...(fileUrl && { image: fileUrl }),
    },
  });

  return updatedVision;
};

const deleteIntoDb = async (id: string) => {
  const vision = await prisma.vision.delete({
    where: { id },
  });

  return vision;
};

export const visionServices = {
  createIntoDb,
  getAllVision,
  getMyVision,
  getVisionByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
};
