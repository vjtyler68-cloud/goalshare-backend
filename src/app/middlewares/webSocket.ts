import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from '../utils/verifyToken';
import config from '../../config';
import { Secret } from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  role?: 'USER';
}

export const onlineUsers = new Set<string>();
const userSockets = new Map<string, ExtendedWebSocket>();

export async function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });
  console.log('WebSocket server is running');

  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('New user connected');

    ws.on('message', async (data: string) => {
      try {
        const parsedData = JSON.parse(data);
        console.log('Received event:', parsedData.event, parsedData); 

        switch (parsedData.event) {
          case 'authenticate': {
            const token = parsedData.token;
            if (!token) {
              console.log('No token provided');
              ws.send(JSON.stringify({ event: 'error', message: 'No token' }));
              ws.close();
              return;
            }

            const user = verifyToken(token, config.jwt.access_secret as Secret);
            if (!user) {
              console.log('Invalid token');
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid token' }),
              );
              ws.close();
              return;
            }

            const { id } = user;
            ws.userId = id;
            ws.role = user.role as 'USER';
            onlineUsers.add(id);
            userSockets.set(id, ws);
            console.log('User authenticated:', id);

            broadcastToAll(wss, {
              event: 'userStatus',
              data: { userId: id, isOnline: true },
            });
            break;
          }

          // One-to-One Message
          case 'message': {
            const { receiverId, message } = parsedData;
            if (!ws.userId || !receiverId || !message) {
              console.log('Invalid message payload');
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            // Check receiver exists
            const receiverExists = await prisma.user.findUnique({
              where: { id: receiverId },
            });
            if (!receiverExists) {
              ws.send(
                JSON.stringify({
                  event: 'error',
                  message: 'Receiver not found',
                }),
              );
              return;
            }

            let room = await prisma.room.findFirst({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
            });

            if (!room) {
              room = await prisma.room.create({
                data: { senderId: ws.userId, receiverId },
              });
              console.log('Room created:', room.id);
            }

            const chat = await prisma.chat.create({
              data: {
                senderId: ws.userId,
                receiverId,
                roomId: room.id,
                message,
              },
            });
            console.log('Chat saved to DB:', chat.id);

            const receiverSocket = userSockets.get(receiverId);
            if (receiverSocket) {
              receiverSocket.send(
                JSON.stringify({ event: 'message', data: chat }),
              );
            }
            ws.send(JSON.stringify({ event: 'message', data: chat })); // Echo to sender
            break;
          }

          // FreeStyleMessage (similar)
          case 'freeStyleMessage': {
            // ... same as 'message' but event 'freeStyleMessage'
            const { receiverId, message } = parsedData;
            if (!ws.userId || !receiverId || !message) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const receiverExists = await prisma.user.findUnique({
              where: { id: receiverId },
            });
            if (!receiverExists) {
              ws.send(
                JSON.stringify({
                  event: 'error',
                  message: 'Receiver not found',
                }),
              );
              return;
            }

            let room = await prisma.room.findFirst({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
            });

            if (!room) {
              room = await prisma.room.create({
                data: { senderId: ws.userId, receiverId },
              });
              console.log('Room created:', room.id);
            }

            const chat = await prisma.chat.create({
              data: {
                senderId: ws.userId,
                receiverId,
                roomId: room.id,
                message,
              },
            });
            console.log('FreeStyle Chat saved:', chat.id);

            const receiverSocket = userSockets.get(receiverId);
            if (receiverSocket) {
              receiverSocket.send(
                JSON.stringify({ event: 'freeStyleMessage', data: chat }),
              );
            }
            ws.send(JSON.stringify({ event: 'freeStyleMessage', data: chat }));
            break;
          }

          // Fetch Chats (One-to-One)
          case 'fetchChats': {
            const { receiverId } = parsedData;
            if (!ws.userId || !receiverId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const room = await prisma.room.findFirst({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
            });

            if (!room) {
              ws.send(JSON.stringify({ event: 'fetchChats', data: [] }));
              return;
            }

            const chats = await prisma.chat.findMany({
              where: { roomId: room.id },
              orderBy: { createdAt: 'asc' },
              include: {
                sender: { select: { id: true, fullName: true } },
                receiver: { select: { id: true, fullName: true } },
              },
            });

            // Mark unread as read for this user
            await prisma.chat.updateMany({
              where: { roomId: room.id, receiverId: ws.userId, isRead: false },
              data: { isRead: true },
            });
            console.log('Chats marked as read for user:', ws.userId);

            ws.send(JSON.stringify({ event: 'fetchChats', data: chats }));
            break;
          }

          // unReadMessages (One-to-One)
          case 'unReadMessages': {
            const { receiverId } = parsedData;
            if (!ws.userId || !receiverId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const room = await prisma.room.findFirst({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
            });

            if (!room) {
              ws.send(
                JSON.stringify({
                  event: 'unReadMessages',
                  data: { messages: [], count: 0 },
                }),
              );
              return;
            }

            const unReadMessages = await prisma.chat.findMany({
              where: { roomId: room.id, isRead: false, receiverId: ws.userId },
            });

            ws.send(
              JSON.stringify({
                event: 'unReadMessages',
                data: {
                  messages: unReadMessages,
                  count: unReadMessages.length,
                },
              }),
            );
            break;
          }

          // messageList (One-to-One)
          case 'messageList': {
            if (!ws.userId) {
              ws.send(
                JSON.stringify({
                  event: 'error',
                  message: 'Not authenticated',
                }),
              );
              return;
            }

            const rooms = await prisma.room.findMany({
              where: {
                OR: [{ senderId: ws.userId }, { receiverId: ws.userId }],
              },
              include: {
                chat: { orderBy: { createdAt: 'desc' }, take: 1 },
                sender: { select: { id: true, fullName: true } },
                receiver: { select: { id: true, fullName: true } },
              },
            });

            const userWithLastMessages = rooms.map(room => {
              const otherUser =
                room.senderId === ws.userId ? room.receiver : room.sender;
              return {
                user: { id: otherUser.id, fullName: otherUser.fullName },
                lastMessage: room.chat[0],
              };
            });

            ws.send(
              JSON.stringify({
                event: 'messageList',
                data: userWithLastMessages,
              }),
            );
            break;
          }

          // Online Users
          case 'onlineUsers': {
            const onlineUserList = Array.from(onlineUsers);
            const users = await prisma.user.findMany({
              where: { id: { in: onlineUserList } },
              select: { id: true, email: true, role: true },
            });
            ws.send(JSON.stringify({ event: 'onlineUsers', data: users }));
            break;
          }

          // Community Events
          // case 'createCommunity': {
          //   const { name, description, usersToAdd, image } = parsedData; // usersToAdd = memberIds
          //   if (
          //     !ws.userId ||
          //     !name ||
          //     !Array.isArray(usersToAdd) ||
          //     usersToAdd.length === 0
          //   ) {
          //     console.log('Invalid createCommunity payload');
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Invalid payload' }),
          //     );
          //     return;
          //   }

          //   // Check members exist
          //   const validMembers = await prisma.user.findMany({
          //     where: { id: { in: usersToAdd } },
          //   });
          //   if (validMembers.length !== usersToAdd.length) {
          //     ws.send(
          //       JSON.stringify({
          //         event: 'error',
          //         message: 'Some members not found',
          //       }),
          //     );
          //     return;
          //   }

          //   const community = await prisma.community.create({
          //     data: {
          //       name,
          //       description: description || '',
          //       image: image || null,
          //       userId: ws.userId,
          //       users: {
          //         create: [
          //           { userId: ws.userId },
          //           ...usersToAdd.map(id => ({ userId: id })),
          //         ],
          //       },
          //     },
          //     include: { users: true },
          //   });
          //   console.log('Community created:', community.id);

          //   const allMemberIds = [ws.userId, ...usersToAdd];
          //   allMemberIds.forEach(id => {
          //     const socket = userSockets.get(id);
          //     if (socket)
          //       socket.send(
          //         JSON.stringify({
          //           event: 'communityCreated',
          //           data: community,
          //         }),
          //       );
          //   });
          //   break;
          // }

          // case 'joinCommunity': {
          //   const { communityId } = parsedData;
          //   if (!ws.userId || !communityId) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Invalid payload' }),
          //     );
          //     return;
          //   }

          //   const community = await prisma.community.findUnique({
          //     where: { id: communityId },
          //   });
          //   if (!community || community.isDeleted) {
          //     ws.send(
          //       JSON.stringify({
          //         event: 'error',
          //         message: 'Community not found',
          //       }),
          //     );
          //     return;
          //   }

          //   const existingMember = await prisma.communityMembers.upsert({
          //     where: { communityId_userId: { communityId, userId: ws.userId } },
          //     create: { communityId, userId: ws.userId },
          //     update: { isLeft: false },
          //   });
          //   console.log('Community member updated:', existingMember.id);

          //   ws.send(
          //     JSON.stringify({
          //       event: 'joinCommunity',
          //       data: { communityId, success: true },
          //     }),
          //   );
          //   break;
          // }

          // case 'leaveCommunity': {
          //   const { communityId } = parsedData;
          //   if (!ws.userId || !communityId) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Invalid payload' }),
          //     );
          //     return;
          //   }

          //   const member = await prisma.communityMembers.findFirst({
          //     where: { communityId, userId: ws.userId },
          //   });
          //   if (!member) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Not a member' }),
          //     );
          //     return;
          //   }

          //   await prisma.communityMembers.update({
          //     where: { id: member.id },
          //     data: { isLeft: true },
          //   });
          //   console.log('User left community:', communityId);

          //   ws.send(
          //     JSON.stringify({
          //       event: 'leaveCommunity',
          //       data: { communityId, success: true },
          //     }),
          //   );
          //   break;
          // }

          // case 'communityMessage': {
          //   const { communityId, message } = parsedData;
          //   if (!ws.userId || !communityId || !message) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Invalid payload' }),
          //     );
          //     return;
          //   }

          //   const member = await prisma.communityMembers.findFirst({
          //     where: { communityId, userId: ws.userId, isLeft: false },
          //   });
          //   if (!member) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Not a member' }),
          //     );
          //     return;
          //   }

          //   const communityMessage = await prisma.communityMessage.create({
          //     data: { senderId: ws.userId, communityId, message },
          //   });
          //   console.log('Community message saved:', communityMessage.id);

          //   const activeMembers = await prisma.communityMembers.findMany({
          //     where: { communityId, isLeft: false },
          //     select: { userId: true },
          //   });

          //   activeMembers.forEach(({ userId }) => {
          //     if (userId !== ws.userId) {
          //       const socket = userSockets.get(userId as string);
          //       if (socket)
          //         socket.send(
          //           JSON.stringify({
          //             event: 'communityMessage',
          //             data: communityMessage,
          //           }),
          //         );
          //     }
          //   });
          //   ws.send(
          //     JSON.stringify({
          //       event: 'communityMessage',
          //       data: communityMessage,
          //     }),
          //   ); // Echo
          //   break;
          // }

          // case 'fetchCommunityChats': {
          //   const { communityId } = parsedData;
          //   if (!ws.userId || !communityId) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Invalid payload' }),
          //     );
          //     return;
          //   }

          //   const member = await prisma.communityMembers.findFirst({
          //     where: { communityId, userId: ws.userId, isLeft: false },
          //   });
          //   if (!member) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Not a member' }),
          //     );
          //     return;
          //   }

          //   const chats = await prisma.communityMessage.findMany({
          //     where: { communityId },
          //     orderBy: { createdAt: 'asc' },
          //     include: { sender: { select: { id: true, fullName: true } } },
          //   });

          //   // Per-user read status upsert
          //   for (const chat of chats.filter(c => c.senderId !== ws.userId)) {
          //     await prisma.communityMessageReadStatus.upsert({
          //       where: {
          //         messageId_userId: { messageId: chat.id, userId: ws.userId },
          //       },
          //       create: { messageId: chat.id, userId: ws.userId },
          //       update: {},
          //     });
          //   }
          //   console.log(
          //     'Community chats fetched & marked read for:',
          //     ws.userId,
          //   );

          //   ws.send(
          //     JSON.stringify({ event: 'fetchCommunityChats', data: chats }),
          //   );
          //   break;
          // }

          // case 'communityUnReadMessages': {
          //   const { communityId } = parsedData;
          //   if (!ws.userId || !communityId) {
          //     ws.send(
          //       JSON.stringify({ event: 'error', message: 'Invalid payload' }),
          //     );
          //     return;
          //   }

          //   const readStatuses =
          //     await prisma.communityMessageReadStatus.findMany({
          //       where: { userId: ws.userId },
          //       select: { messageId: true },
          //     });
          //   const readIds = readStatuses.map(rs => rs.messageId);

          //   const unreadMessages = await prisma.communityMessage.findMany({
          //     where: {
          //       communityId,
          //       senderId: { not: ws.userId },
          //       id: { notIn: readIds },
          //     },
          //   });

          //   ws.send(
          //     JSON.stringify({
          //       event: 'communityUnReadMessages',
          //       data: {
          //         messages: unreadMessages,
          //         count: unreadMessages.length,
          //       },
          //     }),
          //   );
          //   break;
          // }

          // case 'communityMessageList': {
          //   if (!ws.userId) {
          //     ws.send(
          //       JSON.stringify({
          //         event: 'error',
          //         message: 'Not authenticated',
          //       }),
          //     );
          //     return;
          //   }

          //   const communities = await prisma.communityMembers.findMany({
          //     where: { userId: ws.userId, isLeft: false },
          //     include: {
          //       community: {
          //         include: {
          //           communityMessages: {
          //             orderBy: { createdAt: 'desc' },
          //             take: 1,
          //           },
          //         },
          //       },
          //     },
          //   });

          //   const communityList = communities.map(m => ({
          //     communityId: m.community.id,
          //     communityName: m.community.name,
          //     description: m.community.description,
          //     image: m.community.image,
          //     lastMessage: m.community.communityMessages[0] || null,
          //   }));

          //   ws.send(
          //     JSON.stringify({
          //       event: 'communityMessageList',
          //       data: communityList,
          //     }),
          //   );
          //   break;
          // }

          // Group Events (similar fixes)
          case 'createGroup': {
            const { name, memberIds ,image} = parsedData;
            if (
              !ws.userId ||
              !name ||
              !Array.isArray(memberIds) ||
              memberIds.length === 0
            ) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const validMembers = await prisma.user.findMany({
              where: { id: { in: memberIds } },
            });
            if (validMembers.length !== memberIds.length) {
              ws.send(
                JSON.stringify({
                  event: 'error',
                  message: 'Some members not found',
                }),
              );
              return;
            }

            const group = await prisma.groupRoom.create({
              data: {
                name,
                createdBy: ws.userId,
                members: {
                  create: [
                    { userId: ws.userId, role: 'admin' },
                    ...memberIds.map(id => ({ userId: id, role: 'member' })),
                  ],
                },
              },
              include: { members: true },
            });
            console.log('Group created:', group.id);

            const allMemberIds = [ws.userId, ...memberIds];
            allMemberIds.forEach(id => {
              const socket = userSockets.get(id);
              if (socket)
                socket.send(
                  JSON.stringify({ event: 'groupCreated', data: group }),
                );
            });
            break;
          }

          case 'joinGroup': {
            const { groupId } = parsedData;
            if (!ws.userId || !groupId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const group = await prisma.groupRoom.findUnique({
              where: { id: groupId },
            });
            if (!group) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Group not found' }),
              );
              return;
            }

            const existing = await prisma.groupMember.upsert({
              where: { groupId_userId: { groupId, userId: ws.userId } },
              create: { groupId, userId: ws.userId, role: 'member' },
              update: {},
            });
            console.log('Group member joined:', existing.id);

            ws.send(
              JSON.stringify({
                event: 'joinGroup',
                data: { groupId, success: true },
              }),
            );
            break;
          }

          case 'leaveGroup': {
            const { groupId } = parsedData;
            if (!ws.userId || !groupId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            await prisma.groupMember.deleteMany({
              where: { groupId, userId: ws.userId },
            });
            console.log('User left group:', groupId);

            ws.send(
              JSON.stringify({
                event: 'leaveGroup',
                data: { groupId, success: true },
              }),
            );
            break;
          }

          case 'groupMessage': {
            const { groupId, message } = parsedData;
            if (!ws.userId || !groupId || !message) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const member = await prisma.groupMember.findFirst({
              where: { groupId, userId: ws.userId },
            });
            if (!member) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Not a member' }),
              );
              return;
            }

            const groupChat = await prisma.groupChat.create({
              data: { senderId: ws.userId, groupId, message },
            });
            console.log('Group chat saved:', groupChat.id);

            const members = await prisma.groupMember.findMany({
              where: { groupId },
              select: { userId: true },
            });

            members.forEach(({ userId }) => {
              if (userId !== ws.userId) {
                const socket = userSockets.get(userId);
                if (socket)
                  socket.send(
                    JSON.stringify({ event: 'groupMessage', data: groupChat }),
                  );
              }
            });
            ws.send(JSON.stringify({ event: 'groupMessage', data: groupChat })); // Echo
            break;
          }

          case 'fetchGroupChats': {
            const { groupId } = parsedData;
            if (!ws.userId || !groupId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const member = await prisma.groupMember.findFirst({
              where: { groupId, userId: ws.userId },
            });
            if (!member) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Not a member' }),
              );
              return;
            }

            const chats = await prisma.groupChat.findMany({
              where: { groupId },
              orderBy: { createdAt: 'asc' },
              include: { sender: { select: { id: true, fullName: true } } },
            });

            // Per-user read status
            for (const chat of chats.filter(c => c.senderId !== ws.userId)) {
              await prisma.groupChatReadStatus.upsert({
                where: {
                  chatId_userId: { chatId: chat.id, userId: ws.userId },
                },
                create: { chatId: chat.id, userId: ws.userId },
                update: {},
              });
            }
            console.log('Group chats fetched & marked read');

            ws.send(JSON.stringify({ event: 'fetchGroupChats', data: chats }));
            break;
          }

          case 'groupUnReadMessages': {
            const { groupId } = parsedData;
            if (!ws.userId || !groupId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            const readStatuses = await prisma.groupChatReadStatus.findMany({
              where: { userId: ws.userId },
              select: { chatId: true },
            });
            const readIds = readStatuses.map(rs => rs.chatId);

            const unreadMessages = await prisma.groupChat.findMany({
              where: {
                groupId,
                senderId: { not: ws.userId },
                id: { notIn: readIds },
              },
            });

            ws.send(
              JSON.stringify({
                event: 'groupUnReadMessages',
                data: {
                  messages: unreadMessages,
                  count: unreadMessages.length,
                },
              }),
            );
            break;
          }

          case 'groupMessageList': {
            if (!ws.userId) {
              ws.send(
                JSON.stringify({
                  event: 'error',
                  message: 'Not authenticated',
                }),
              );
              return;
            }

            const groups = await prisma.groupMember.findMany({
              where: { userId: ws.userId },
              include: {
                group: {
                  include: {
                    chats: { orderBy: { createdAt: 'desc' }, take: 1 },
                  },
                },
              },
            });

            const groupList = groups.map(m => ({
              groupId: m.group.id,
              groupName: m.group.name,
              lastMessage: m.group.chats[0] || null,
            }));

            ws.send(
              JSON.stringify({ event: 'groupMessageList', data: groupList }),
            );
            break;
          }

          // FreeStyle variants (similar to main, copy if needed)
          // ... (freeStyleFetchChats, freeStyleUnReadMessages – message-এর মতো কপি করো)

          case 'project': {
            ws.send(JSON.stringify({ event: 'project', data: parsedData })); // Placeholder
            break;
          }

          default:
            console.log('Unknown event:', parsedData.event);
            ws.send(
              JSON.stringify({ event: 'error', message: 'Unknown event' }),
            );
        }
      } catch (error: any) {
        // console.error(
        //   'WebSocket Error [Event: ' +
        //     (parsedData ? parsedData.event : 'unknown') +
        //     ']:',
        //   error,
        // );
        ws.send(
          JSON.stringify({
            event: 'error',
            message: error.message || 'Server error',
          }),
        );
      }
    });

    ws.on('close', () => {
      const extendedWs = ws as ExtendedWebSocket;
      if (extendedWs.userId) {
        const userId = extendedWs.userId;
        onlineUsers.delete(userId);
        userSockets.delete(userId);
        broadcastToAll(wss, {
          event: 'userStatus',
          data: { userId, role: extendedWs.role, isOnline: false },
        });
        console.log('User disconnected:', userId);
      }
    });

    ws.on('error', error => console.error('WS Error:', error));
  });

  return wss;
}

function broadcastToAll(wss: WebSocketServer, message: object) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
