import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { prisma }  from '../../utils/prisma';
import { Message } from '@prisma/client';
import { getSocket } from '../../utils/socket';


const sendMessage = async (senderId: string, payload: Message) => {
    const time = new Date()
    payload.senderId = senderId

    const message = await prisma.message.create({
        data: {
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            content: payload.content,
            fileUrls: payload.fileUrls,
            createdAt: time
        },
    });
    const io = getSocket();
    io.to(payload.receiverId).emit('message', message);
    io.to(payload.senderId).emit('message', message);
    return message;
};

const getConversation = async (me: string, other: string) => {
    await prisma.user.findUniqueOrThrow({ where: { id: other } })

    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: me, receiverId: other },
                { senderId: other, receiverId: me },
            ],
        },
        orderBy: { createdAt: 'asc' },
    });

    return messages;
};

const getAllConversationUsers = async (userId: string) => {
  const result = await prisma.$runCommandRaw({
    aggregate: 'messages',
    pipeline: [
      {
        $match: {
          $or: [
            { senderId: { $oid: userId } },
            { receiverId: { $oid: userId } },
          ],
        },

      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          otherUser: {
            $cond: [
              { $eq: ["$senderId", { $oid: userId }] },
              "$receiverId",
              "$senderId"
            ]
          },
          content: 1,
          createdAt: 1
        }
      },
      {
        $group: {
          _id: "$otherUser",
          lastMessageAt: { $first: "$createdAt" },
          lastMessage: { $first: "$content" },
          lastFiles: { $first: "$fileUrls" },
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: "_id",
          foreignField: "_id",
          as: "userData"
        }
      },
      {
        $unwind: "$userData"
      },
      {
        $project: {
          _id: "$userData._id",
          firstName: "$userData.firstName",
          lastName: "$userData.lastName",
          profile: "$userData.profile",
          email: "$userData.email",
          lastMessage: 1,
          lastMessageAt: 1
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ],
    cursor: {}
  })
  const convertedData = (result?.cursor as { firstBatch: any[] })?.firstBatch?.map(item => {
    const newData = {
      ...item,
      id: item?._id?.$oid,
      lastMessageAt: item.lastMessageAt.$date

    };
    delete newData._id;
    return newData
  })
  return convertedData
}

const markMessageAsRead = async (messageId: string, userId: string) => {
    const message = await prisma.message.findUniqueOrThrow({
        where: { id: messageId },
    });

    if (message.receiverId !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'You are not allowed to mark this message');
    }

    const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
    });

    return updatedMessage;
};

const deleteMessage = async (messageId: string, userId: string) => {
    const message = await prisma.message.findUniqueOrThrow({
        where: { id: messageId },
    });

    if (message.senderId !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'You can only delete your own messages');
    }

    await prisma.message.delete({
        where: { id: messageId },
    });

    return { message: 'Message deleted successfully' };
};

export const MessageServices = {
    sendMessage,
    getConversation,
    markMessageAsRead,
    deleteMessage,
    getAllConversationUsers
};
