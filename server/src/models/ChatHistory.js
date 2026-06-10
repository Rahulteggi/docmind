const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: [{ chunkIndex: Number, pageNum: Number, excerpt: String }],
  createdAt: { type: Date, default: Date.now },
});

const chatHistorySchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  messages: [messageSchema],
}, { timestamps: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
