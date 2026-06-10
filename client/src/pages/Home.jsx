import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDocuments, uploadDocument, deleteDocument } from '../api'

export default function Home() {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const navigate = useNavigate()
  const pollRef = useRef(null)

  useEffect(() => {
    fetchDocs()
    return () => clearInterval(pollRef.current)
  }, [])

  const fetchDocs = async () => {
    try {
      const { data } = await getDocuments()
      setDocs(data)
      // Poll if any docs are processing
      if (data.some((d) => d.status === 'processing')) {
        clearInterval(pollRef.current)
        pollRef.current = setInterval(async () => {
          const { data: fresh } = await getDocuments()
          setDocs(fresh)
          if (!fresh.some((d) => d.status === 'processing')) clearInterval(pollRef.current)
        }, 3000)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpload = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Only PDF files are supported'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB)'); return }
    setError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await uploadDocument(formData, setUploadProgress)
      await fetchDocs()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this document and its chat history?')) return
    await deleteDocument(id)
    setDocs((prev) => prev.filter((d) => d._id !== id))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const formatSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const statusColor = { processing: '#f59e0b', ready: '#10b981', error: '#ef4444' }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <span style={s.logoIcon}>🧠</span>
          <span style={s.logoText}>DocMind</span>
        </div>
        <p style={s.tagline}>Upload PDFs and chat with them using AI</p>
      </div>

      {/* Upload Zone */}
      <div
        style={{ ...s.dropZone, borderColor: dragOver ? '#6366f1' : '#2d2d4e', background: dragOver ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files[0])} />
        {uploading ? (
          <div style={s.uploadingState}>
            <div style={s.spinnerWrap}>
              <div style={s.spinner} />
            </div>
            <p style={s.uploadingText}>Processing PDF... {uploadProgress}%</p>
            <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${uploadProgress}%` }} /></div>
          </div>
        ) : (
          <>
            <div style={s.uploadIcon}>📄</div>
            <p style={s.uploadText}>Drop a PDF here or <span style={s.browseLink}>browse</span></p>
            <p style={s.uploadSub}>Up to 10MB · PDF only</p>
          </>
        )}
      </div>

      {error && <p style={s.error}>{error}</p>}

      {/* Documents List */}
      {docs.length > 0 && (
        <div style={s.docsSection}>
          <h2 style={s.docsTitle}>Your Documents ({docs.length})</h2>
          <div style={s.docGrid}>
            {docs.map((doc) => (
              <div key={doc._id} style={s.docCard} onClick={() => doc.status === 'ready' && navigate(`/chat/${doc._id}`)}>
                <div style={s.docHeader}>
                  <span style={s.docIcon}>📋</span>
                  <div style={s.docMeta}>
                    <p style={s.docName}>{doc.name}</p>
                    <p style={s.docInfo}>{formatSize(doc.size)} {doc.pageCount > 1 ? `· ${doc.pageCount} pages` : ''}</p>
                  </div>
                  <button style={s.deleteBtn} onClick={(e) => handleDelete(doc._id, e)}>×</button>
                </div>
                {doc.summary && <p style={s.docSummary}>{doc.summary}</p>}
                <div style={s.docFooter}>
                  <span style={{ ...s.statusDot, color: statusColor[doc.status] }}>
                    {doc.status === 'processing' ? '⏳ Processing...' : doc.status === 'ready' ? '✅ Ready · Chat now →' : '❌ Error'}
                  </span>
                  <span style={s.docDate}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
                {doc.status === 'error' && doc.errorMessage && <p style={s.errorMsg}>{doc.errorMessage}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.length === 0 && !uploading && (
        <div style={s.emptyState}>
          <p style={s.emptyIcon}>📚</p>
          <p style={s.emptyText}>No documents yet</p>
          <p style={s.emptySub}>Upload a PDF to get started</p>
        </div>
      )}
    </div>
  )
}

const s = {
  container: { maxWidth: '860px', margin: '0 auto', padding: '48px 24px', minHeight: '100vh' },
  header: { textAlign: 'center', marginBottom: '40px' },
  logo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '10px' },
  logoIcon: { fontSize: '2.5rem' },
  logoText: { fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  tagline: { color: '#94a3b8', fontSize: '1.05rem' },
  dropZone: { border: '2px dashed', borderRadius: '16px', padding: '48px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '16px' },
  uploadIcon: { fontSize: '3rem', marginBottom: '12px' },
  uploadText: { fontSize: '1.05rem', color: '#cbd5e1', marginBottom: '6px' },
  browseLink: { color: '#6366f1', fontWeight: 600 },
  uploadSub: { color: '#64748b', fontSize: '0.85rem' },
  uploadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  spinnerWrap: { width: '40px', height: '40px' },
  spinner: { width: '40px', height: '40px', border: '3px solid #2d2d4e', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  uploadingText: { color: '#94a3b8', fontSize: '0.95rem' },
  progressBar: { width: '200px', height: '4px', background: '#2d2d4e', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #6366f1, #a78bfa)', transition: 'width 0.3s', borderRadius: '4px' },
  error: { color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', marginBottom: '16px' },
  docsSection: { marginTop: '40px' },
  docsTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8', marginBottom: '16px' },
  docGrid: { display: 'flex', flexDirection: 'column', gap: '12px' },
  docCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s' },
  docHeader: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' },
  docIcon: { fontSize: '1.4rem', flexShrink: 0 },
  docMeta: { flex: 1 },
  docName: { fontWeight: 600, fontSize: '1rem', marginBottom: '2px', color: '#e2e8f0' },
  docInfo: { color: '#64748b', fontSize: '0.8rem' },
  deleteBtn: { background: 'none', border: 'none', color: '#475569', fontSize: '1.3rem', padding: 0, lineHeight: 1, flexShrink: 0 },
  docSummary: { color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '10px', padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', borderLeft: '2px solid #6366f1' },
  docFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusDot: { fontSize: '0.82rem', fontWeight: 500 },
  docDate: { color: '#475569', fontSize: '0.78rem' },
  errorMsg: { color: '#ef4444', fontSize: '0.78rem', marginTop: '6px' },
  emptyState: { textAlign: 'center', paddingTop: '60px' },
  emptyIcon: { fontSize: '3rem', marginBottom: '12px' },
  emptyText: { color: '#94a3b8', fontSize: '1.1rem', fontWeight: 500, marginBottom: '6px' },
  emptySub: { color: '#475569', fontSize: '0.9rem' },
}
