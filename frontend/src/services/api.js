// src/api.js
import axios from "axios";
import { getBackendOrigin } from "../utils/backendOrigin.js";
import {
  getStoredToken,
  isTokenExpired,
  handleSessionExpired,
} from "../utils/authSession.js";

const api = axios.create({
  timeout: 15000,
});

function isPublicAuthRequest(url = "") {
  return /\/auth\/(login|signup|forgot-password|reset-password)(\/|$|\?)/.test(url);
}

api.interceptors.request.use(
  (config) => {
    const origin = getBackendOrigin().replace(/\/$/, "");
    config.baseURL = `${origin}/api`;
    const token = getStoredToken();
    const url = config.url || "";

    if (token && !isPublicAuthRequest(url)) {
      if (isTokenExpired(token)) {
        handleSessionExpired("expired");
        return Promise.reject(new axios.CanceledError("Session expired"));
      }
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 && !isPublicAuthRequest(url)) {
      handleSessionExpired("unauthorized");
    }

    return Promise.reject(error);
  }
);

export default api;

// Site Management APIs
export const fetchSites = async (search = "") => {
  const response = await api.get(`/sites?search=${encodeURIComponent(search)}`);
  return response.data;
};

export const createSite = async (siteData) => {
  const response = await api.post("/sites", siteData);
  return response.data;
};

export const updateSite = async (id, siteData) => {
  const response = await api.put(`/sites/${id}`, siteData);
  return response.data;
};

export const deleteSite = async (id) => {
  const response = await api.delete(`/sites/${id}`);
  return response.data;
};

export const fetchSiteManagers = async () => {
  const response = await api.get("/sites/managers");
  return response.data;
};

// Sitepack Document APIs
export const uploadDocument = async (formData) => {
  const response = await api.post("/documents/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const fetchDocuments = async (siteId, category) => {
  const response = await api.get(`/documents`, {
    params: { siteId, category }
  });
  return response.data;
};

export const fetchDocumentCounts = async (siteId) => {
  const response = await api.get(`/documents/counts`, {
    params: { siteId }
  });
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};
