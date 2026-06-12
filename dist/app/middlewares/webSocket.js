"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineUsers = void 0;
exports.setupWebSocket = setupWebSocket;
const ws_1 = require("ws");
const verifyToken_1 = require("../utils/verifyToken");
const config_1 = __importDefault(require("../../config"));
const prisma_1 = require("../utils/prisma");
exports.onlineUsers = new Set();
const userSockets = new Map();
function setupWebSocket(server) {
    return __awaiter(this, void 0, void 0, function* () {
        const wss = new ws_1.WebSocketServer({ server });
        console.log('WebSocket server is running');
        wss.on('connection', (ws) => {
            console.log('New user connected');
            ws.on('message', (data) => __awaiter(this, void 0, void 0, function* () {
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
                            const user = (0, verifyToken_1.verifyToken)(token, config_1.default.jwt.access_secret);
                            if (!user) {
                                console.log('Invalid token');
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid token' }));
                                ws.close();
                                return;
                            }
                            const { id } = user;
                            ws.userId = id;
                            ws.role = user.role;
                            exports.onlineUsers.add(id);
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
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            // Check receiver exists
                            const receiverExists = yield prisma_1.prisma.user.findUnique({
                                where: { id: receiverId },
                            });
                            if (!receiverExists) {
                                ws.send(JSON.stringify({
                                    event: 'error',
                                    message: 'Receiver not found',
                                }));
                                return;
                            }
                            let room = yield prisma_1.prisma.room.findFirst({
                                where: {
                                    OR: [
                                        { senderId: ws.userId, receiverId },
                                        { senderId: receiverId, receiverId: ws.userId },
                                    ],
                                },
                            });
                            if (!room) {
                                room = yield prisma_1.prisma.room.create({
                                    data: { senderId: ws.userId, receiverId },
                                });
                                console.log('Room created:', room.id);
                            }
                            const chat = yield prisma_1.prisma.chat.create({
                                data: {
                                    senderId: ws.userId,
                                    receiverId,
                                    roomId: room.id,
                                    message,
                                },
                                // ADDED: Include sender and receiver profile info
                                include: {
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                    receiver: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                },
                            });
                            console.log('Chat saved to DB:', chat.id);
                            const receiverSocket = userSockets.get(receiverId);
                            if (receiverSocket) {
                                receiverSocket.send(JSON.stringify({ event: 'message', data: chat }));
                            }
                            ws.send(JSON.stringify({ event: 'message', data: chat })); // Echo to sender
                            break;
                        }
                        // FreeStyleMessage
                        case 'freeStyleMessage': {
                            const { receiverId, message } = parsedData;
                            if (!ws.userId || !receiverId || !message) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const receiverExists = yield prisma_1.prisma.user.findUnique({
                                where: { id: receiverId },
                            });
                            if (!receiverExists) {
                                ws.send(JSON.stringify({
                                    event: 'error',
                                    message: 'Receiver not found',
                                }));
                                return;
                            }
                            let room = yield prisma_1.prisma.room.findFirst({
                                where: {
                                    OR: [
                                        { senderId: ws.userId, receiverId },
                                        { senderId: receiverId, receiverId: ws.userId },
                                    ],
                                },
                            });
                            if (!room) {
                                room = yield prisma_1.prisma.room.create({
                                    data: { senderId: ws.userId, receiverId },
                                });
                                console.log('Room created:', room.id);
                            }
                            const chat = yield prisma_1.prisma.chat.create({
                                data: {
                                    senderId: ws.userId,
                                    receiverId,
                                    roomId: room.id,
                                    message,
                                },
                                // ADDED: Include sender and receiver profile info
                                include: {
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                    receiver: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                },
                            });
                            console.log('FreeStyle Chat saved:', chat.id);
                            const receiverSocket = userSockets.get(receiverId);
                            if (receiverSocket) {
                                receiverSocket.send(JSON.stringify({ event: 'freeStyleMessage', data: chat }));
                            }
                            ws.send(JSON.stringify({ event: 'freeStyleMessage', data: chat }));
                            break;
                        }
                        // Fetch Chats (One-to-One)
                        case 'fetchChats': {
                            const { receiverId } = parsedData;
                            if (!ws.userId || !receiverId) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const room = yield prisma_1.prisma.room.findFirst({
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
                            const chats = yield prisma_1.prisma.chat.findMany({
                                where: { roomId: room.id },
                                orderBy: { createdAt: 'asc' },
                                include: {
                                    // MODIFIED: Added profile field to sender and receiver
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                    receiver: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                },
                            });
                            // Mark unread as read for this user
                            yield prisma_1.prisma.chat.updateMany({
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
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const room = yield prisma_1.prisma.room.findFirst({
                                where: {
                                    OR: [
                                        { senderId: ws.userId, receiverId },
                                        { senderId: receiverId, receiverId: ws.userId },
                                    ],
                                },
                            });
                            if (!room) {
                                ws.send(JSON.stringify({
                                    event: 'unReadMessages',
                                    data: { messages: [], count: 0 },
                                }));
                                return;
                            }
                            const unReadMessages = yield prisma_1.prisma.chat.findMany({
                                where: { roomId: room.id, isRead: false, receiverId: ws.userId },
                                // ADDED: Include sender profile info in unread messages
                                include: {
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                },
                            });
                            ws.send(JSON.stringify({
                                event: 'unReadMessages',
                                data: {
                                    messages: unReadMessages,
                                    count: unReadMessages.length,
                                },
                            }));
                            break;
                        }
                        // messageList (One-to-One)
                        case 'messageList': {
                            if (!ws.userId) {
                                ws.send(JSON.stringify({
                                    event: 'error',
                                    message: 'Not authenticated',
                                }));
                                return;
                            }
                            const rooms = yield prisma_1.prisma.room.findMany({
                                where: {
                                    OR: [{ senderId: ws.userId }, { receiverId: ws.userId }],
                                },
                                include: {
                                    chat: {
                                        orderBy: { createdAt: 'desc' },
                                        take: 1,
                                        // ADDED: Include sender profile in last message
                                        include: {
                                            sender: {
                                                select: {
                                                    id: true,
                                                    fullName: true,
                                                    profile: true, // Profile image URL
                                                },
                                            },
                                        },
                                    },
                                    // MODIFIED: Added profile field to sender and receiver
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                        },
                                    },
                                    receiver: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                        },
                                    },
                                },
                            });
                            const userWithLastMessages = rooms.map(room => {
                                const otherUser = room.senderId === ws.userId ? room.receiver : room.sender;
                                return {
                                    user: {
                                        id: otherUser.id,
                                        fullName: otherUser.fullName,
                                        profile: otherUser.profile, // ADDED: Include profile image
                                    },
                                    lastMessage: room.chat[0],
                                };
                            });
                            ws.send(JSON.stringify({
                                event: 'messageList',
                                data: userWithLastMessages,
                            }));
                            break;
                        }
                        // Online Users
                        case 'onlineUsers': {
                            const onlineUserList = Array.from(exports.onlineUsers);
                            const users = yield prisma_1.prisma.user.findMany({
                                where: { id: { in: onlineUserList } },
                                // MODIFIED: Added profile field
                                select: {
                                    id: true,
                                    email: true,
                                    role: true,
                                    fullName: true,
                                    profile: true, // Profile image URL
                                },
                            });
                            ws.send(JSON.stringify({ event: 'onlineUsers', data: users }));
                            break;
                        }
                        // Group Events
                        case 'createGroup': {
                            const { name, memberIds, image, description } = parsedData;
                            if (!ws.userId ||
                                !name ||
                                !Array.isArray(memberIds) ||
                                memberIds.length === 0) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            if (image &&
                                (typeof image !== 'string' || !image.startsWith('http'))) {
                                ws.send(JSON.stringify({
                                    event: 'error',
                                    message: 'Invalid image URL',
                                }));
                                return;
                            }
                            const validMembers = yield prisma_1.prisma.user.findMany({
                                where: { id: { in: memberIds } },
                            });
                            if (validMembers.length !== memberIds.length) {
                                ws.send(JSON.stringify({
                                    event: 'error',
                                    message: 'Some members not found',
                                }));
                                return;
                            }
                            const group = yield prisma_1.prisma.groupRoom.create({
                                data: {
                                    name,
                                    createdBy: ws.userId,
                                    image: image || null,
                                    description: description || '',
                                    members: {
                                        create: [
                                            { userId: ws.userId, role: 'admin' },
                                            ...memberIds.map(id => ({ userId: id, role: 'member' })),
                                        ],
                                    },
                                },
                                include: {
                                    members: {
                                        // ADDED: Include user profile in group members
                                        include: {
                                            user: {
                                                select: {
                                                    id: true,
                                                    fullName: true,
                                                    profile: true, // Profile image URL
                                                    email: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            });
                            console.log('Group created:', group.id, 'with image:', group.image);
                            const allMemberIds = [ws.userId, ...memberIds];
                            allMemberIds.forEach(id => {
                                const socket = userSockets.get(id);
                                if (socket)
                                    socket.send(JSON.stringify({ event: 'groupCreated', data: group }));
                            });
                            break;
                        }
                        case 'joinGroup': {
                            const { groupId } = parsedData;
                            if (!ws.userId || !groupId) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const group = yield prisma_1.prisma.groupRoom.findUnique({
                                where: { id: groupId },
                            });
                            if (!group) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Group not found' }));
                                return;
                            }
                            const existing = yield prisma_1.prisma.groupMember.upsert({
                                where: { groupId_userId: { groupId, userId: ws.userId } },
                                create: { groupId, userId: ws.userId, role: 'member' },
                                update: {},
                            });
                            console.log('Group member joined:', existing.id);
                            ws.send(JSON.stringify({
                                event: 'joinGroup',
                                data: { groupId, success: true },
                            }));
                            break;
                        }
                        case 'leaveGroup': {
                            const { groupId } = parsedData;
                            if (!ws.userId || !groupId) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const myRole = yield prisma_1.prisma.groupMember.findFirst({
                                where: { groupId, userId: ws.userId },
                            });
                            if ((myRole === null || myRole === void 0 ? void 0 : myRole.role) === 'admin') {
                                const nextMember = yield prisma_1.prisma.groupMember.findFirst({
                                    where: { groupId, userId: { not: ws.userId } },
                                });
                                if (nextMember) {
                                    yield prisma_1.prisma.groupMember.update({
                                        where: { id: nextMember.id },
                                        data: { role: 'admin' },
                                    });
                                }
                            }
                            yield prisma_1.prisma.groupMember.deleteMany({
                                where: { groupId, userId: ws.userId },
                            });
                            console.log('User left group:', groupId);
                            ws.send(JSON.stringify({
                                event: 'leaveGroup',
                                data: { groupId, success: true },
                            }));
                            break;
                        }
                        case 'groupMessage': {
                            const { groupId, message } = parsedData;
                            if (!ws.userId || !groupId || !message) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const member = yield prisma_1.prisma.groupMember.findFirst({
                                where: { groupId, userId: ws.userId },
                            });
                            if (!member) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Not a member' }));
                                return;
                            }
                            const groupChat = yield prisma_1.prisma.groupChat.create({
                                data: { senderId: ws.userId, groupId, message },
                                // ADDED: Include sender profile info
                                include: {
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                },
                            });
                            console.log('Group chat saved:', groupChat.id);
                            const members = yield prisma_1.prisma.groupMember.findMany({
                                where: { groupId },
                                select: { userId: true },
                            });
                            members.forEach(({ userId }) => {
                                if (userId !== ws.userId) {
                                    const socket = userSockets.get(userId);
                                    if (socket)
                                        socket.send(JSON.stringify({ event: 'groupMessage', data: groupChat }));
                                }
                            });
                            ws.send(JSON.stringify({ event: 'groupMessage', data: groupChat })); // Echo
                            break;
                        }
                        case 'fetchGroupChats': {
                            const { groupId } = parsedData;
                            if (!ws.userId || !groupId) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const member = yield prisma_1.prisma.groupMember.findFirst({
                                where: { groupId, userId: ws.userId },
                            });
                            if (!member) {
                                ws.send(JSON.stringify({ event: 'error', message: 'Not a member' }));
                                return;
                            }
                            const chats = yield prisma_1.prisma.groupChat.findMany({
                                where: { groupId },
                                orderBy: { createdAt: 'asc' },
                                // MODIFIED: Added profile field to sender
                                include: {
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                            email: true,
                                        },
                                    },
                                },
                            });
                            // Per-user read status
                            for (const chat of chats.filter(c => c.senderId !== ws.userId)) {
                                yield prisma_1.prisma.groupChatReadStatus.upsert({
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
                                ws.send(JSON.stringify({ event: 'error', message: 'Invalid payload' }));
                                return;
                            }
                            const readStatuses = yield prisma_1.prisma.groupChatReadStatus.findMany({
                                where: { userId: ws.userId },
                                select: { chatId: true },
                            });
                            const readIds = readStatuses.map(rs => rs.chatId);
                            const unreadMessages = yield prisma_1.prisma.groupChat.findMany({
                                where: {
                                    groupId,
                                    senderId: { not: ws.userId },
                                    id: { notIn: readIds },
                                },
                                // ADDED: Include sender profile info in unread messages
                                include: {
                                    sender: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                            profile: true, // Profile image URL
                                        },
                                    },
                                },
                            });
                            ws.send(JSON.stringify({
                                event: 'groupUnReadMessages',
                                data: {
                                    messages: unreadMessages,
                                    count: unreadMessages.length,
                                },
                            }));
                            break;
                        }
                        case 'groupMessageList': {
                            if (!ws.userId) {
                                ws.send(JSON.stringify({
                                    event: 'error',
                                    message: 'Not authenticated',
                                }));
                                return;
                            }
                            const groups = yield prisma_1.prisma.groupMember.findMany({
                                where: { userId: ws.userId },
                                include: {
                                    group: {
                                        include: {
                                            chats: {
                                                orderBy: { createdAt: 'desc' },
                                                take: 1,
                                                // ADDED: Include sender profile in last message
                                                include: {
                                                    sender: {
                                                        select: {
                                                            id: true,
                                                            fullName: true,
                                                            profile: true, // Profile image URL
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            });
                            const groupList = groups.map(m => ({
                                groupId: m.group.id,
                                groupName: m.group.name,
                                groupImage: m.group.image, // ADDED: Include group image
                                lastMessage: m.group.chats[0] || null,
                            }));
                            ws.send(JSON.stringify({ event: 'groupMessageList', data: groupList }));
                            break;
                        }
                        case 'project': {
                            ws.send(JSON.stringify({ event: 'project', data: parsedData }));
                            break;
                        }
                        default:
                            console.log('Unknown event:', parsedData.event);
                            ws.send(JSON.stringify({ event: 'error', message: 'Unknown event' }));
                    }
                }
                catch (error) {
                    ws.send(JSON.stringify({
                        event: 'error',
                        message: error.message || 'Server error',
                    }));
                }
            }));
            ws.on('close', () => {
                const extendedWs = ws;
                if (extendedWs.userId) {
                    const userId = extendedWs.userId;
                    exports.onlineUsers.delete(userId);
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
    });
}
function broadcastToAll(wss, message) {
    wss.clients.forEach(client => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}
