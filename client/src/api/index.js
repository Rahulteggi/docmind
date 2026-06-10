import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });

// Documents
export const getDocuments = () => api.get('/documents');
export const getDocument = (id) => api.get(`/documents/${id}`);
export const uploadDocument = (formData, onProgress) =>
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  });
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// Chat
export const getChatHistory = (docId) => api.get(`/chat/${docId}`);
export const sendMessage = (docId, question) => api.post(`/chat/${docId}`, { question });
export const clearChat = (docId) => api.delete(`/chat/${docId}`);
