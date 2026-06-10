const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json());

app.use('/api/documents', require('./routes/documents'));
app.use('/api/chat', require('./routes/chat'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'DocMind' }));

const PORT = process.env.PORT || 8080;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`DocMind server running on port ${PORT}`));
  })
  .catch((err) => { console.error('MongoDB error:', err.message); process.exit(1); });
