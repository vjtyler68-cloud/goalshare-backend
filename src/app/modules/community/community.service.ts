import { Request } from 'express';
import { prisma } from '../../utils/prisma';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import QueryBuilder from '../../builder/QueryBuilder';

const createIntoDb = async (
  communityCreatorId: string,
  file: Express.Multer.File | undefined,
  req: Request,
) => {
  const communityData = JSON.parse(req.body.data);
  const { name, description, usersToAdd } = communityData;

  let fileUrl: string | null = null;
  if (file) {
    const location = await uploadToDigitalOceanAWS(file);
    fileUrl = location.Location;
  }

  // Combine the creator's ID with the list of users to add
  const allUserIds = [communityCreatorId];
  if (usersToAdd && Array.isArray(usersToAdd)) {
    allUserIds.push(...usersToAdd);
  }

  try {
    const newCommunity = await prisma.community.create({
      data: {
        name,
        description,
        image: fileUrl,
        userId: communityCreatorId,
        users: {
          createMany: {
            data: allUserIds.map((userId: string) => ({ userId })),
          },
        },
      },
      include: {
        users: true,
      },
    });
    return newCommunity;
  } catch (error) {
    console.error('Error creating community:', error);
    throw new Error('Failed to create community');
  }
};

const getAllCommunity = async (query: any) => {
  const communityQuery = new QueryBuilder<typeof prisma.community>(
    prisma.community,
    query,
  );

  const result = await communityQuery
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .execute();
  return result;
};

const getCommunityByIdFromDB = async (id: string) => {
  const result = await prisma.community.findUnique({
    where: { id },
  });
  return result;
};

const getMyCommunities = async (userId: string, query: any) => {
  const communityQuery = new QueryBuilder<typeof prisma.community>(
    prisma.community,
    query,
  );

  const andConditions = [];

  // Filter for the user's communities
  andConditions.push({
    users: {
      some: {
        userId,
      },
    },
  });

  // Check if a search term exists and add the OR condition
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
            contains: query.searchTerm,
            mode: 'insensitive',
          },
        },
        {
          users: {
            some: {
              user: {
                fullName: {
                  contains: query.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        {
          users: {
            some: {
              user: {
                email: {
                  contains: query.searchTerm,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ],
    });
  }

  const result = await communityQuery
    .filter()
    .sort()
    .paginate()
    .where({
      AND: andConditions,
    })
    .select({
      id: true,
      userId: true,
      name: true,
      image: true,
      users: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: true,
            },
          },
        },
      },
    })
    .execute();

  return result;
};

const updateIntoDb = async (id: string, data: Partial<any>) => {
  const result = await prisma.community.update({
    where: { id },
    data,
  });
  return result;
};

const deleteIntoDb = async (id: string) => {
  const result = await prisma.community.delete({
    where: { id },
  });
  return result;
};
export const CommunityServices = {
  createIntoDb,
  getAllCommunity,
  getCommunityByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  getMyCommunities,
};
