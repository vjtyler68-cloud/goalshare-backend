// import { prisma } from '../../utils/prisma';
// import httpStatus from 'http-status';
// import AppError from '../../errors/AppError';

// /**
//  * একজন সদস্যকে কমিউনিটি থেকে সরিয়ে দেয়।
//  * শুধুমাত্র একজন সাধারণ সদস্যই কমিউনিটি ত্যাগ করতে পারে।
//  * ক্রিয়েটরকে কমিউনিটিটি ডিলিট করতে হবে।
//  * @param communityId কমিউনিটির আইডি
//  * @param userId যে ইউজার ত্যাগ করছেন তার আইডি
//  * @returns মেসেজ
//  */
// const leaveCommunity = async (communityId: string, userId: string) => {
//   // 1. নিশ্চিত করা যে ইউজার কমিউনিটির একজন সদস্য
//   const communityMember = await prisma.communityMembers.findFirst({
//     where: { communityId, userId },
//   });

//   if (!communityMember) {
//     throw new AppError(
//       httpStatus.NOT_FOUND,
//       'You are not a member of this community.',
//     );
//   }

//   // 2. নিশ্চিত করা যে ইউজার ক্রিয়েটর নয়
//   const community = await prisma.community.findUniqueOrThrow({
//     where: { id: communityId },
//     select: { userId: true },
//   });

//   if (community.userId === userId) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'As the creator, you cannot leave the community. You must delete it instead.',
//     );
//   }

//   // 3. সাধারণ সদস্যের জন্য isLeft ফিল্ডটি true করা
//   await prisma.communityMembers.update({
//     where: { id: communityMember.id },
//     data: { isLeft: true },
//   });

//   return { message: 'You have left the community successfully.' };
// };

// /**
//  * একটি সম্পূর্ণ কমিউনিটি ডিলিট করে দেয়।
//  * শুধুমাত্র কমিউনিটির ক্রিয়েটরই এটি করতে পারেন।
//  * @param communityId কমিউনিটির আইডি
//  * @param userId যে ইউজার ডিলিট করছেন তার আইডি
//  * @returns ডিলিট করা কমিউনিটির তথ্য
//  */
// const deleteCommunity = async (communityId: string, userId: string) => {
//   // 1. নিশ্চিত করা যে ইউজার কমিউনিটির ক্রিয়েটর
//   const community = await prisma.community.findUniqueOrThrow({
//     where: { id: communityId },
//   });

//   if (community.userId !== userId) {
//     throw new AppError(
//       httpStatus.FORBIDDEN,
//       'You are not the creator of this community',
//     );
//   }

//   // 2. কমিউনিটির সকল মেসেজ ডিলিট করা
//   await prisma.message.deleteMany({
//     where: { communityId: communityId },
//   });

//   // 3. কমিউনিটির সকল সদস্যকে ডিলিট করা
//   await prisma.communityMembers.deleteMany({
//     where: { communityId: communityId },
//   });

//   // 4. অবশেষে, কমিউনিটিটিকে isDeleted হিসেবে চিহ্নিত করা
//   const deletedCommunity = await prisma.community.update({
//     where: { id: communityId },
//     data: { isDeleted: true },
//   });

//   return deletedCommunity;
// };

// export const CommunityServices = {
//   leaveCommunity,
//   deleteCommunity,
//   // এখানে আপনার অন্যান্য সার্ভিসগুলো থাকবে
// };

// import express from 'express';
// import auth from '../../middlewares/auth';
// import { CommunityControllers } from './community.controller';

// const router = express.Router();

// // ... existing routes

// // ⭐ নতুন রাউট: কমিউনিটি থেকে বেরিয়ে যাওয়ার জন্য ⭐
// router.patch('/leave/:id', auth('ANY'), CommunityControllers.leaveCommunity);

// // ⭐ নতুন রাউট: কমিউনিটি ডিলিট করার জন্য ⭐
// router.delete('/delete/:id', auth('ANY'), CommunityControllers.deleteCommunity);

// export const CommunityRouters = router;

// import httpStatus from 'http-status';
// import catchAsync from '../../utils/catchAsync';
// import sendResponse from '../../utils/sendResponse';
// import { CommunityServices } from './community.service';

// // ⭐ নতুন কন্ট্রোলার: কমিউনিটি থেকে বেরিয়ে যাওয়ার জন্য ⭐
// const leaveCommunity = catchAsync(async (req, res) => {
//   const { id } = req.params;
//   const userId = req.user.id;

//   const result = await CommunityServices.leaveCommunity(id, userId);

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: 'You have successfully left the community.',
//     data: result,
//   });
// });

// // ⭐ নতুন কন্ট্রোলার: কমিউনিটি ডিলিট করার জন্য ⭐
// const deleteCommunity = catchAsync(async (req, res) => {
//   const { id } = req.params; // কমিউনিটি আইডি
//   const userId = req.user.id; // অথেন্টিকেটেড ইউজার আইডি

//   const result = await CommunityServices.deleteCommunity(id, userId);

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: 'Community deleted successfully.',
//     data: result,
//   });
// });

// export const CommunityControllers = {
//   // ... existing controllers
//   leaveCommunity,
//   deleteCommunity,
// };

// model Community {
//     id          String     @id @default(auto()) @map("_id") @db.ObjectId
//     userId      String     @db.ObjectId // কমিউনিটি কে তৈরি করেছে তার আইডি
//     name        String
//     description String
//     image       String?
//     isDeleted   Boolean    @default(false)
//     user        User       @relation(fields: [userId], references: [id])
//     members     CommunityMembers[]
//     messages    Message[]

//     @@map("community")
// }

// model CommunityMembers {
//     id          String     @id @default(auto()) @map("_id") @db.ObjectId
//     userId      String     @db.ObjectId
//     communityId String     @db.ObjectId

//     // ⭐ নতুন ফিল্ড: ইউজার রোল এবং অবস্থা ট্র্যাক করার জন্য ⭐
//     role        String     @default("MEMBER") // ADMIN or MEMBER
//     isMuted     Boolean    @default(false)
//     isLeft      Boolean    @default(false)

//     user        User       @relation(fields: [userId], references: [id])
//     community   Community  @relation(fields: [communityId], references: [id])

//     @@map("community_members")
// }

// .......................messaging part with group message.......................//
// import httpStatus from 'http-status';
// import AppError from '../../errors/AppError';
// import { prisma } from '../../utils/prisma';
// import { getSocket } from '../../utils/socket';

// // Assuming the Message payload now includes 'receiverId' or 'communityId'
// interface MessagePayload {
//   senderId?: string; // Will be set by controller/service
//   receiverId?: string;
//   communityId?: string;
//   content: string;
//   fileUrls?: string[];
//   createdAt?: Date;
// }

// // ⭐ UPDATED: Handle both Private and Group messages ⭐
// const sendMessage = async (senderId: string, payload: MessagePayload) => {
//   const { receiverId, communityId, content, fileUrls = [] } = payload;
//   const time = new Date();

//   // 1. Validation: Must be EITHER a receiverId OR a communityId, not both or neither.
//   if ((!receiverId && !communityId) || (receiverId && communityId)) {
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'Message must target EITHER a single user (receiverId) OR a community (communityId).',
//     );
//   }

//   // 2. Data Preparation
//   const messageData = {
//     senderId: senderId,
//     receiverId: receiverId, // null for group chat
//     communityId: communityId, // null for private chat
//     content: content,
//     fileUrls: fileUrls,
//     createdAt: time,
//   };

//   // 3. Create Message
//   const message = await prisma.message.create({
//     data: messageData,
//   });

//   // 4. Socket Handling
//   const io = getSocket();

//   if (receiverId) {
//     // Private Chat: Emit to sender and receiver
//     io.to(receiverId).emit('message', message);
//     io.to(senderId).emit('message', message);
//   } else if (communityId) {
//     // Group Chat: Emit to all members of the community (excluding sender's room)
//     // NOTE: You'll need to set up socket rooms for each community.
//     io.to(communityId).emit('groupMessage', message);
//   }

//   return message;
// };

// // ⭐ KEPT AS-IS: This function should now only fetch private conversations ⭐
// const getConversation = async (me: string, other: string) => {
//   await prisma.user.findUniqueOrThrow({ where: { id: other } });

//   const messages = await prisma.message.findMany({
//     where: {
//       communityId: null, // ONLY fetch private messages
//       OR: [
//         { senderId: me, receiverId: other },
//         { senderId: other, receiverId: me },
//       ],
//     },
//     orderBy: { createdAt: 'asc' },
//   });

//   return messages;
// };

// // ⭐ NEW FUNCTION: Get Group Conversation ⭐
// const getGroupConversation = async (communityId: string) => {
//   await prisma.community.findUniqueOrThrow({ where: { id: communityId } });

//   const messages = await prisma.message.findMany({
//     where: {
//       communityId: communityId,
//     },
//     orderBy: { createdAt: 'asc' },
//     // Optionally include the sender's profile for group messages
//     include: {
//       sender: {
//         select: { id: true, fullName: true, profile: true },
//       },
//     },
//   });

//   return messages;
// };

// // ⭐ UPDATED: Must account for both private (receiverId) and group (communityId) messages ⭐
// const getAllConversationUsers = async (userId: string) => {
//   // Use a temporary field 'targetId' to group by either receiver or community.
//   const result = await prisma.$runCommandRaw({
//     aggregate: 'messages',
//     pipeline: [
//       {
//         $match: {
//           $or: [
//             { senderId: { $oid: userId } },
//             { receiverId: { $oid: userId } },
//           ],
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//       {
//         $project: {
//           targetId: {
//             $cond: [
//               // If it's a group message
//               { $ne: ['$communityId', null] },
//               '$communityId',
//               // If it's a private message, find the other user
//               {
//                 $cond: [
//                   { $eq: ['$senderId', { $oid: userId }] },
//                   '$receiverId',
//                   '$senderId',
//                 ],
//               },
//             ],
//           },
//           isGroup: { $ne: ['$communityId', null] }, // New field to identify groups
//           content: 1,
//           createdAt: 1,
//         },
//       },
//       {
//         $group: {
//           _id: '$targetId',
//           isGroup: { $first: '$isGroup' },
//           lastMessageAt: { $first: '$createdAt' },
//           lastMessage: { $first: '$content' },
//           lastFiles: { $first: '$fileUrls' },
//         },
//       },
//       // Lookup for Users and Communities in parallel
//       {
//         $facet: {
//           users: [
//             { $match: { isGroup: false } },
//             {
//               $lookup: {
//                 from: 'users',
//                 localField: '_id',
//                 foreignField: '_id',
//                 as: 'userData',
//               },
//             },
//             { $unwind: '$userData' },
//           ],
//           communities: [
//             { $match: { isGroup: true } },
//             {
//               $lookup: {
//                 from: 'community',
//                 localField: '_id',
//                 foreignField: '_id',
//                 as: 'communityData',
//               },
//             },
//             { $unwind: '$communityData' },
//           ],
//         },
//       },
//       // Recombine results
//       {
//         $project: {
//           allConversations: {
//             $concatArrays: ['$users', '$communities'],
//           },
//         },
//       },
//       { $unwind: '$allConversations' },
//       { $replaceRoot: { newRoot: '$allConversations' } },
//       {
//         $project: {
//           id: '$_id',
//           isGroup: 1,
//           // User Data
//           fullName: '$userData.fullName',
//           profile: '$userData.profile',
//           // Community Data
//           name: '$communityData.name',
//           image: '$communityData.image',
//           // Message Data
//           lastMessage: 1,
//           lastMessageAt: 1,
//         },
//       },
//       { $sort: { lastMessageAt: -1 } },
//     ],
//     cursor: {},
//   });

//   const convertedData = (
//     result?.cursor as { firstBatch: any[] }
//   )?.firstBatch?.map(item => {
//     const newData = {
//       ...item,
//       // Common fields
//       _id: item?._id?.$oid,
//       lastMessageAt: item.lastMessageAt.$date,
//     };
//     // Clean up MongoDB specific objects
//     delete newData.lastMessageAt;
//     delete newData._id;
//     return {
//       ...newData,
//       lastMessageAt: item.lastMessageAt.$date,
//       id: item._id.$oid,
//     };
//   });
//   return convertedData;
// };

// const markMessageAsRead = async (messageId: string, userId: string) => {
//   // ... (Keep as is, or consider removing if group messages are handled differently)
// };

// const deleteMessage = async (messageId: string, userId: string) => {
//   // ... (Keep as is)
// };

// export const MessageServices = {
//   sendMessage,
//   getConversation,
//   getGroupConversation, // <-- New Export
//   markMessageAsRead,
//   deleteMessage,
//   getAllConversationUsers,
// };

// ... (existing imports)

// ... (existing sendMessage, getConversation, getAllConversationUsers, etc.)

// ⭐ NEW CONTROLLER FUNCTION: Get Group Conversation ⭐
// const getGroupConversation = catchAsync(async (req, res) => {
//   const communityId = req.params.id; // Using :id as community ID

//   const result = await MessageServices.getGroupConversation(
//     communityId as string
//   );

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: 'Group conversation fetched successfully',
//     data: result,
//   });
// });

// export const MessageControllers = {
//   sendMessage,
//   getConversation,
//   getGroupConversation, // <-- New Export
//   markMessageAsRead,
//   deleteMessage,
//   getAllConversationUsers,
// };

// import express from 'express';
// import validateRequest from '../../middlewares/validateRequest';
// import { MessageControllers } from './message.controller';
// import auth from '../../middlewares/auth';
// import { messageValidation } from './message.validation';

// const router = express.Router();

// // Send message
// router.post(
//   '/send',
//   auth('ANY'),
//   validateRequest.body(messageValidation.sendMessage),
//   MessageControllers.sendMessage,
// );

// // Get private conversation between two users (Other User's ID)
// router.get(
//   '/conversation/private/:id', // Changed path for clarity
//   auth('ANY'),
//   MessageControllers.getConversation,
// );

// // ⭐ NEW ROUTE: Get Group Conversation (Community ID) ⭐
// router.get(
//   '/conversation/group/:id',
//   auth('ANY'),
//   MessageControllers.getGroupConversation,
// );

// router.get(
//   '/conversation-list',
//   auth('ANY'),
//   MessageControllers.getAllConversationUsers,
// );

// // Mark message as read
// router.patch(
//   '/mark-read/:messageId',
//   auth('ANY'),
//   MessageControllers.markMessageAsRead,
// );

// // Delete message
// router.delete(
//   '/delete/:messageId',
//   auth('ANY'),
//   MessageControllers.deleteMessage,
// );

// export const MessageRouters = router;
