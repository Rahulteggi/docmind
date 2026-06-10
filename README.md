# 🧠 DocMind — AI Document Chat with RAG

Chat with your PDF documents using AI. Upload any PDF and ask questions — DocMind finds the relevant sections and answers using GPT.

## ✨ Features

- **PDF Upload** — Drag & drop PDF files up to 10MB
- **RAG Pipeline** — Chunks text, creates OpenAI embeddings, stores in MongoDB
- **Semantic Search** — Cosine similarity finds the most relevant passages for each question
- **AI Chat** — GPT-4o-mini answers questions with source citations (page numbers + excerpts)
- **Auto Summary** — Generates a document summary on upload
- **Chat History** — Conversation context kept across questions
- **Dark UI** — Clean dark-themed interface

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (stores chunks + embeddings) |
| AI | OpenAI GPT-4o-mini + text-embedding-3-small |
| PDF Parsing | pdf-parse |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- OpenAI API key (with credits)

### 1. Clone & setup backend
```bash
git clone https://github.com/Rahulteggi/docmind.git
cd docmind/server
cp .env.example .env
# Add your MONGO_URI and OPENAI_API_KEY to .env
npm install
npm run dev
```

### 2. Setup frontend
```bash
cd ../client
npm install
npm run dev
```

Open **http://localhost:5173**

## 🔑 Environment Variables

```env
MONGO_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
PORT=8080
```

## 🧠 How RAG Works

1. **Upload** — PDF is parsed and split into 400-word overlapping chunks
2. **Embed** — Each chunk is embedded using `text-embedding-3-small`
3. **Store** — Chunks + embeddings saved to MongoDB
4. **Query** — User question is embedded, top-4 chunks found by cosine similarity
5. **Answer** — Relevant chunks sent as context to GPT-4o-mini with citation instructions

## 📁 Structure

```
docmind/
├── client/src/
│   ├── api/       # Axios client
│   └── pages/     # Home (upload), Chat (Q&A)
└── server/src/
    ├── models/    # Document, ChatHistory
    ├── routes/    # documents, chat
    └── utils/     # rag.js (embed, search, generate)
```

## 👤 Author

**Rahul Teggi** — [github.com/Rahulteggi](https://github.com/Rahulteggi)
