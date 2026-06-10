const router = require('express').Router();
const Document = require('../models/Document');
const ChatHistory = require('../models/ChatHistory');
const { embedQuery, findTopChunks, generateAnswer } = require('../utils/rag');

// GET /api/chat/:docId — get chat history
router.get('/:docId', async (req, res) => {
  try {
    let history = await ChatHistory.findOne({ document: req.params.docId });
    if (!history) history = { messages: [] };
    res.json(history.messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chat/:docId — send message
router.post('/:docId', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: 'Question is required' });

    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.status !== 'ready') return res.status(400).json({ message: 'Document is still processing' });
    if (!doc.chunks || doc.chunks.length === 0) return res.status(400).json({ message: 'No chunks found in document' });

    // Get or create chat history
    let history = await ChatHistory.findOne({ document: req.params.docId });
    if (!history) history = new ChatHistory({ document: req.params.docId, messages: [] });

    // Embed the question and find relevant chunks
    const queryEmbedding = await embedQuery(question);
    const topChunks = findTopChunks(queryEmbedding, doc.chunks, 4);

    // Generate answer
    const answer = await generateAnswer(question, topChunks, history.messages);

    // Build sources
    const sources = topChunks.map((c) => ({
      chunkIndex: c.chunkIndex,
      pageNum: c.pageNum,
      excerpt: c.text.slice(0, 120) + '...',
    }));

    // Save to history
    history.messages.push({ role: 'user', content: question });
    history.messages.push({ role: 'assistant', content: answer, sources });
    await history.save();

    res.json({ answer, sources });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/chat/:docId — clear history
router.delete('/:docId', async (req, res) => {
  try {
    await ChatHistory.deleteOne({ document: req.params.docId });
    res.json({ message: 'Chat cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
