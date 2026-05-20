import axios from "axios";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.80.11:4000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});