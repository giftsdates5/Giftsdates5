import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("gd_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export function fileUrl(path) {
  if (!path) return null;
  const t = localStorage.getItem("gd_token");
  return `${API}/files/${path}?auth=${encodeURIComponent(t || "")}`;
}
