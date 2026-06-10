const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  pageNum: { type: Number, default: 1 },
  chunkIndex: { type: Number, default: 0 },
});

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number },
  pageCount: { type: Number, default: 1 },
  chunks: [chunkSchema],
  summary: { type: String, default: '' },
  status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' },
  errorMessage: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
