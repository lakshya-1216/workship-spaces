const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Workspace = require('../models/Workspace');

// ─── GET /conversations ───────────────────────────────────────────────────────
// Returns conversations for the authenticated user, filtered by view mode.
//
// ?view=host  → returns ONLY conversations where the caller is the host
//              (i.e. workspace conversations where they own the workspace)
// ?view=user  → (default) returns conversations where the caller is a guest/user
//              Excludes conversations where they are the hostParticipant.
//
// This lets the same schema and endpoint power both /chat and /host-messages
// with proper inbox separation — no duplicate data, no separate schemas.
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const view = req.query.view; // 'host' | 'user' | undefined

    // Build the MongoDB filter based on view mode.
    // hostParticipant uses $ne (not-equal) for user-view:
    //   - $ne matches both "different ObjectId" AND "field missing" (legacy docs)
    //   - so old conversations (without hostParticipant) always appear in user-view
    const filter =
      view === 'host'
        ? { participants: userId, hostParticipant: userId }         // host sees their workspace convs
        : { participants: userId, hostParticipant: { $ne: userId } }; // user sees everything else

    const conversations = await Conversation.find(filter)
      .populate('participants', 'name profilePicture')
      .populate('workspace', 'title city images')
      .sort({ updatedAt: -1 });

    // Shape into the form the frontend needs
    const shaped = conversations.map((conv) => {
      const other = conv.participants.find((p) => p._id.toString() !== userId);
      const unread = conv.unreadCounts?.get(userId) ?? 0;
      return {
        _id: conv._id,
        other: other
          ? { _id: other._id, name: other.name, profilePicture: other.profilePicture }
          : null,
        workspace: conv.workspace
          ? {
              _id: conv.workspace._id,
              title: conv.workspace.title,
              city: conv.workspace.city,
              image: conv.workspace.images?.[0] || null,
            }
          : null,
        lastMessage: conv.lastMessage,
        unread,
        updatedAt: conv.updatedAt,
      };
    });

    res.json(shaped);
  } catch (err) {
    console.error('getConversations:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// ─── POST /conversations/open ─────────────────────────────────────────────────
// Opens (or re-opens) a conversation between the logged-in user and a host
// for a given workspace. Returns existing conversation if one already exists.
exports.openConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ message: 'workspaceId is required' });
    }

    // Find the workspace to get its host
    const workspace = await Workspace.findById(workspaceId).select('host title city images');
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const hostId = workspace.host?.toString();
    if (!hostId) {
      return res.status(400).json({ message: 'Workspace has no host' });
    }

    if (hostId === userId) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }

    // Look for an existing conversation with both participants and workspace
    const participants = [userId, hostId].sort(); // sort for consistent lookup
    let conv = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
      workspace: workspaceId,
    })
      .populate('participants', 'name profilePicture')
      .populate('workspace', 'title city images');

    let isNew = false;
    if (!conv) {
      isNew = true;
      conv = await Conversation.create({
        participants,
        workspace: workspaceId,
        // Stamp the host participant so getConversations can filter by view mode.
        // userId = guest (the one clicking "Chat with Host")
        // hostId = workspace owner — they see this only in Host Messages.
        hostParticipant: hostId,
        lastMessage: { text: '', at: new Date() },
        unreadCounts: {},
      });
      conv = await conv.populate([
        { path: 'participants', select: 'name profilePicture' },
        { path: 'workspace', select: 'title city images' },
      ]);
    }

    const other = conv.participants.find((p) => p._id.toString() !== userId);
    const payload = {
      _id: conv._id,
      other: other
        ? { _id: other._id, name: other.name, profilePicture: other.profilePicture }
        : null,
      workspace: conv.workspace
        ? {
            _id: conv.workspace._id,
            title: conv.workspace.title,
            city: conv.workspace.city,
            image: conv.workspace.images?.[0] || null,
          }
        : null,
      // Include hostParticipant so the frontend can decide which view (user/host)
      // this conversation belongs in — prevents it appearing in the wrong inbox.
      hostParticipant: hostId,
      lastMessage: conv.lastMessage,
      unread: conv.unreadCounts?.get(userId) ?? 0,
      updatedAt: conv.updatedAt,
    };


    // If this is a brand-new conversation, notify all participants via socket
    // so their stores refresh without a page reload (especially the host)
    if (isNew) {
      const io = req.app.get('io');
      if (io) {
        for (const participantId of conv.participants) {
          const pid = participantId._id?.toString() ?? participantId.toString();
          // Each user's socket joins their own personal room on connect
          io.to(`user:${pid}`).emit('conversation:new', payload);
        }
      }
    }

    res.json(payload);
  } catch (err) {
    console.error('openConversation:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /conversations/:id/messages ─────────────────────────────────────────
// Returns all messages for a conversation. Marks unread messages as read
// for the authenticated user.
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conv.participants.some((p) => p.toString() === userId);
    if (!isParticipant) return res.status(403).json({ message: 'Forbidden' });

    // Fetch messages
    const messages = await Message.find({ conversation: id })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 });

    // Mark all unread messages (sent by others) as read
    await Message.updateMany(
      { conversation: id, sender: { $ne: userId }, read: false },
      { read: true }
    );

    // Reset unread count for this user
    conv.unreadCounts.set(userId, 0);
    await conv.save();

    res.json(messages);
  } catch (err) {
    console.error('getMessages:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /conversations/:id/messages ─────────────────────────────────────────
// Sends a new message in a conversation.
// Also emits a Socket.io event so the other participant gets it instantly.
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conv.participants.some((p) => p.toString() === userId);
    if (!isParticipant) return res.status(403).json({ message: 'Forbidden' });

    const message = await Message.create({
      conversation: id,
      sender: userId,
      text: text.trim(),
    });

    await message.populate('sender', 'name profilePicture');

    // Update conversation snapshot
    conv.lastMessage = { text: text.trim(), sender: userId, at: new Date() };

    // Increment unread for all other participants
    for (const participantId of conv.participants) {
      if (participantId.toString() !== userId) {
        const current = conv.unreadCounts.get(participantId.toString()) ?? 0;
        conv.unreadCounts.set(participantId.toString(), current + 1);
      }
    }
    conv.updatedAt = new Date();
    await conv.save();

    // Emit via Socket.io if available (attached in server.js)
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${id}`).emit('message:new', {
        conversationId: id,
        message: {
          _id: message._id,
          text: message.text,
          sender: { _id: userId },
          read: false,
          createdAt: message.createdAt,
        },
      });
    }

    res.status(201).json({
      _id: message._id,
      text: message.text,
      sender: { _id: message.sender._id, name: message.sender.name, profilePicture: message.sender.profilePicture },
      read: message.read,
      createdAt: message.createdAt,
    });
  } catch (err) {
    console.error('sendMessage:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /conversations/:id/typing ──────────────────────────────────────────
// Broadcasts typing indicator to other participants
exports.sendTyping = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${id}`).emit('typing', { conversationId: id, userId });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
