const router = require('express').Router();
const multer = require('multer');
const Document = require('../models/Document');
const ChatHistory = require('../models/ChatHistory');
const { chunkText, embedTexts, summarizeDocument } = require('../utils/rag');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const docs = await Document.find({}, '-chunks').sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id, '-chunks');
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/documents/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  // Create document record immediately (processing status)
  const doc = await Document.create({
    name: req.file.originalname.replace(/\.[^/.]+$/, ''),
    originalName: req.file.originalname,
    size: req.file.size,
    status: 'processing',
  });

  // Respond immediately, process in background
  res.status(201).json({ _id: doc._id, name: doc.name, status: 'processing' });

  // Background processing
  try {
    // Lazy require to avoid startup crash
    const pdfParse = require('pdf-parse/lib/pdf-parse');
    const parsed = await pdfParse(req.file.buffer);
    const fullText = parsed.text;
    const pageCount = parsed.numpages;

    // Chunk the text
    const rawChunks = chunkText(fullText, 400, 60);
    if (rawChunks.length === 0) throw new Error('No text found in PDF');

    // Embed all chunks (batch in groups of 20)
    const BATCH = 20;
    const allEmbeddings = [];
    for (let i = 0; i < rawChunks.length; i += BATCH) {
      const batch = rawChunks.slice(i, i + BATCH);
      const embeddings = await embedTexts(batch);
      allEmbeddings.push(...embeddings);
    }

    // Build chunk objects
    const chunks = rawChunks.map((text, i) => ({
      text,
      embedding: allEmbeddings[i],
      pageNum: Math.ceil(((i + 1) / rawChunks.length) * pageCount),
      chunkIndex: i,
    }));

    // Generate summary
    const summary = await summarizeDocument(fullText);

    await Document.findByIdAndUpdate(doc._id, { chunks, pageCount, summary, status: 'ready' });
    console.log(`✅ Processed: ${doc.name} (${chunks.length} chunks)`);
  } catch (err) {
    console.error('Processing error:', err.message);
    await Document.findByIdAndUpdate(doc._id, { status: 'error', errorMessage: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    await ChatHistory.deleteMany({ document: req.params.id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
