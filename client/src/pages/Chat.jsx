import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument, getChatHistory, sendMessage, clearChat } from '../api'

const SUGGESTIONS = [
  'What is this document about?',
  'Summarize the key points',
  'What are the main conclusions?',
  'List any important dates or numbers',
]

export default function Chat() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef()
  const inputRef = useRef()

  useEffect(() => {
    loadAll()
  }, [docId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const loadAll = async () => {
    try {
      const [{ data: docData }, { data: history }] = await Promise.all([
        getDocument(docId),
        getChatHistory(docId),
      ])
      setDoc(docData)
      setMessages(history)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSend = async (question = input.trim()) => {
    if (!question || loading) return
    setInput('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)
    try {
      const { data } = await sendMessage(docId, question)
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, sources: data.sources }])
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Check your OpenAI API key.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear chat history?')) return
    await clearChat(docId)
    setMessages([])
  }

  return (
    <div style={s.layout}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <button style={s.backBtn} onClick={() => navigate('/')}>← Back</button>
        <div style={s.docInfo}>
          <span style={s.docIcon}>📋</span>
          <div>
            <p style={s.docName}>{doc?.name || '...'}</p>
            <p style={s.docMeta}>{doc?.pageCount} pages · Ready</p>
          </div>
        </div>
        {doc?.summary && (
          <div style={s.summaryBox}>
            <p style={s.summaryLabel}>Summary</p>
            <p style={s.summaryText}>{doc.summary}</p>
          </div>
        )}
        <div style={s.suggestionsBox}>
          <p style={s.suggestionsLabel}>Try asking:</p>
          {SUGGESTIONS.map((q) => (
            <button key={q} style={s.suggestionBtn} onClick={() => handleSend(q)}>{q}</button>
          ))}
        </div>
        {messages.length > 0 && (
          <button style={s.clearBtn} onClick={handleClear}>🗑 Clear Chat</button>
        )}
      </div>

      {/* Chat Area */}
      <div style={s.chatArea}>
        <div style={s.chatHeader}>
          <h1 style={s.chatTitle}>🧠 DocMind</h1>
          <p style={s.chatSub}>Ask anything about <strong>{doc?.name}</strong></p>
        </div>

        <div style={s.messages}>
          {messages.length === 0 && !loading && (
            <div style={s.welcomeMsg}>
              <p style={s.welcomeIcon}>💬</p>
              <p style={s.welcomeText}>Start by asking a question about your document</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ ...s.message, ...(msg.role === 'user' ? s.userMsg : s.aiMsg) }}>
              <div style={s.msgBubble}>
                <p style={s.msgRole}>{msg.role === 'user' ? '👤 You' : '🧠 DocMind'}</p>
                <p style={s.msgContent}>{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div style={s.sources}>
                    <p style={s.sourcesLabel}>Sources:</p>
                    {msg.sources.map((src, j) => (
                      <div key={j} style={s.source}>
                        <span style={s.sourceTag}>Page {src.pageNum}</span>
                        <span style={s.sourceExcerpt}>"{src.excerpt}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...s.message, ...s.aiMsg }}>
              <div style={s.msgBubble}>
                <p style={s.msgRole}>🧠 DocMind</p>
                <div style={s.thinking}>
                  <span style={s.dot} />
                  <span style={{ ...s.dot, animationDelay: '0.2s' }} />
                  <span style={{ ...s.dot, animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p style={s.error}>{error}</p>}

        <div style={s.inputArea}>
          <input
            ref={inputRef}
            style={s.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask a question about your document..."
            disabled={loading}
          />
          <button style={{ ...s.sendBtn, opacity: (!input.trim() || loading) ? 0.5 : 1 }}
            onClick={() => handleSend()} disabled={!input.trim() || loading}>
            Send ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,80%,100% { transform:scale(0); } 40% { transform:scale(1); } }
      `}</style>
    </div>
  )
}

const s = {
  layout: { display: 'flex', height: '100vh', background: '#0f0f1a', overflow: 'hidden' },
  sidebar: { width: '280px', flexShrink: 0, background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.07)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' },
  backBtn: { background: 'none', border: 'none', color: '#6366f1', fontWeight: 500, fontSize: '0.9rem', textAlign: 'left', padding: 0 },
  docInfo: { display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(99,102,241,0.1)', padding: '12px', borderRadius: '10px' },
  docIcon: { fontSize: '1.6rem', flexShrink: 0 },
  docName: { fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0', marginBottom: '2px' },
  docMeta: { color: '#64748b', fontSize: '0.75rem' },
  summaryBox: { background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px' },
  summaryLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', marginBottom: '6px' },
  summaryText: { color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6 },
  suggestionsBox: { display: 'flex', flexDirection: 'column', gap: '6px' },
  suggestionsLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', marginBottom: '2px' },
  suggestionBtn: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', padding: '8px 10px', borderRadius: '8px', fontSize: '0.8rem', textAlign: 'left' },
  clearBtn: { background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '8px', borderRadius: '8px', fontSize: '0.8rem', marginTop: 'auto' },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatHeader: { padding: '20px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  chatTitle: { fontSize: '1.3rem', fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '2px' },
  chatSub: { color: '#64748b', fontSize: '0.85rem' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px' },
  welcomeMsg: { textAlign: 'center', padding: '60px 0' },
  welcomeIcon: { fontSize: '2.5rem', marginBottom: '12px' },
  welcomeText: { color: '#64748b', fontSize: '0.95rem' },
  message: { display: 'flex' },
  userMsg: { justifyContent: 'flex-end' },
  aiMsg: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '72%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px' },
  msgRole: { fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', marginBottom: '6px', textTransform: 'uppercase' },
  msgContent: { color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  sources: { marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' },
  sourcesLabel: { fontSize: '0.72rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' },
  source: { display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '4px' },
  sourceTag: { flexShrink: 0, background: 'rgba(99,102,241,0.15)', color: '#a78bfa', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 },
  sourceExcerpt: { color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5, fontStyle: 'italic' },
  thinking: { display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' },
  dot: { width: '7px', height: '7px', background: '#6366f1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out' },
  error: { margin: '0 28px 8px', color: '#ef4444', fontSize: '0.82rem', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '6px' },
  inputArea: { padding: '16px 28px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px' },
  input: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '13px 16px', color: '#e2e8f0', fontSize: '0.95rem', outline: 'none' },
  sendBtn: { background: 'linear-gradient(135deg, #6366f1, #a78bfa)', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem' },
}
