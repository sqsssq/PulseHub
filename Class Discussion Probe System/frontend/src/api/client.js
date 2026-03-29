import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5050";

const client = axios.create({
  baseURL: BASE_URL,
});

export async function createSession(payload) {
  const { data } = await client.post("/api/sessions", payload);
  return data;
}

export async function getCurrentSession() {
  const { data } = await client.get("/api/session/current");
  return data;
}

export async function updateCurrentSession(payload) {
  const { data } = await client.patch("/api/session/current", payload);
  return data;
}

export async function getSession(code) {
  const { data } = await client.get(`/api/sessions/${code}`);
  return data;
}

export async function updateSession(code, payload) {
  const { data } = await client.patch(`/api/sessions/${code}`, payload);
  return data;
}

export async function createIdea(code, payload) {
  const { data } = await client.post(`/api/sessions/${code}/ideas`, payload);
  return data;
}

export async function createCurrentIdea(payload) {
  const { data } = await client.post("/api/session/current/ideas", payload);
  return data;
}

export async function updateIdea(id, payload) {
  const { data } = await client.patch(`/api/ideas/${id}`, payload);
  return data;
}

export { BASE_URL };
