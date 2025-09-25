import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { MessageControllers } from './message.controller';
import auth from '../../middlewares/auth';
import { messageValidation } from './message.validation';

const router = express.Router();

// Send message
router.post(
  '/send',
  auth('ANY'),
  validateRequest.body(messageValidation.sendMessage),
  MessageControllers.sendMessage
);

// Get conversation between two users
router.get(
  '/conversation/:id',
  auth('ANY'),
  MessageControllers.getConversation
);
router.get(
  '/conversation-list',
  auth('ANY'),
  MessageControllers.getAllConversationUsers
);

// Mark message as read
router.patch(
  '/mark-read/:messageId',
  auth('ANY'),
  MessageControllers.markMessageAsRead
);

// Delete message
router.delete(
  '/delete/:messageId',
  auth('ANY'),
  MessageControllers.deleteMessage
);

export const MessageRouters = router;
