import axios from 'axios';

// Use relative URL in development to leverage Vite proxy, absolute URL in production
export const API_URL = import.meta.env.DEV ? "/api" : "http://127.0.0.1:8000/api";

export const uploadResumes = async (files) => {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });
  return axios.post(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadFolder = async (files) => {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });
  return axios.post(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const analyzeResumes = async (jobDescription) => {
  return axios.post(`${API_URL}/analyze`, { description: jobDescription });
};

export const ingestResumes = async () => {
    return axios.post(`${API_URL}/ingest`);
};

export const getResumes = async () => {
    return axios.get(`${API_URL}/resumes`);
};

export const getResumeContent = async (resumeId) => {
    return axios.get(`${API_URL}/resumes/${resumeId}`);
};

export const getResumePdfUrl = (resumeId) => {
    return `${API_URL}/resumes/${resumeId}/pdf`;
};


