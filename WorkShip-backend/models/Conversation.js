const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // The two participants: [userId, hostId] — both stored as User ObjectIds
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    // Workspace this conversation is about
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    // Which participant is the workspace host (denormalized for efficient filtering).
    // Set at conversation creation time. Allows GET /conversations?view=host to
    // return only conversations where the caller is the host, and the default
    // user view to exclude those same conversations from the user's inbox.
    hostParticipant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Snapshot of the last message for sidebar preview
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now },
    },
    // Per-participant unread counts: { userId: count }
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

// Index for fast lookup: find all conversations a user participates in
conversationSchema.index({ participants: 1 });
// Prevent duplicate conversation for same pair + workspace
conversationSchema.index({ participants: 1, workspace: 1 });
// Efficient host-view filtering
conversationSchema.index({ participants: 1, hostParticipant: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);

