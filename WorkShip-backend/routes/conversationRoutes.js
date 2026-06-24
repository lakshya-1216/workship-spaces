const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getConversations,
  openConversation,
  getMessages,
  sendMessage,
  sendTyping,
} = require('../controllers/conversationController');

// All routes require authentication (user OR host JWT — same middleware)
router.use(auth);

// GET  /conversations          — list all conversations for the logged-in user/host
router.get('/', getConversations);

// POST /conversations/open     — open or fetch existing conversation for a workspace
router.post('/open', openConversation);

// GET  /conversations/:id/messages — fetch all messages, mark as read
router.get('/:id/messages', getMessages);

// POST /conversations/:id/messages — send a message
router.post('/:id/messages', sendMessage);

// POST /conversations/:id/typing   — broadcast typing indicator
router.post('/:id/typing', sendTyping);

module.exports = router;
