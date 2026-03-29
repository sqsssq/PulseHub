import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export async function register(payload) {
  const { data } = await client.post("/api/auth/register", payload);
  return data;
}

export async function login(payload) {
  const { data } = await client.post("/api/auth/login", payload);
  return data;
}

export async function logout() {
  const { data } = await client.post("/api/auth/logout");
  return data;
}

export async function getMe() {
  const { data } = await client.get("/api/me");
  return data;
}

export async function listDiscussions() {
  const { data } = await client.get("/api/discussions");
  return data;
}

export async function createDiscussion(payload) {
  const { data } = await client.post("/api/discussions", payload);
  return data;
}

export async function getDiscussion(id) {
  const { data } = await client.get(`/api/discussions/${id}`);
  return data;
}

export async function updateDiscussion(id, payload) {
  const { data } = await client.patch(`/api/discussions/${id}`, payload);
  return data;
}

export async function deleteDiscussion(id) {
  const { data } = await client.delete(`/api/discussions/${id}`);
  return data;
}

export async function updateDiscussionGroupSelection(id, payload) {
  const { data } = await client.post(`/api/discussions/${id}/groups/select`, payload);
  return data;
}

export async function getJoinDiscussion(token) {
  const { data } = await client.get(`/api/join/${token}`);
  return data;
}

export async function createJoinIdea(token, payload) {
  const { data } = await client.post(`/api/join/${token}/ideas`, payload);
  return data;
}

export async function updateIdea(id, payload) {
  const { data } = await client.patch(`/api/ideas/${id}`, payload);
  return data;
}

export { BASE_URL };
