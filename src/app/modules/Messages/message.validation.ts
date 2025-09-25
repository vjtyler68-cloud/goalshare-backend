import z from "zod";

// Send Message Validation
const sendMessage = z.object({
  body: z.object({
    receiverId: z.string({
      required_error: 'ReceiverId is required!',
    }),
    content: z.string().optional(),
    fileUrls: z.array(z.string()).optional()
  }),
});

// Get Conversation Validation
const getConversation = z.object({
  body: z.object({
    with: z.string({
      required_error: 'Other members id is required!',
    }),
  }),
});

export const messageValidation = {
  sendMessage,
  getConversation,
};
