/**
 * API base URL resolution:
 * - EXPO_PUBLIC_API_URL is set at build time (Vercel env var) for production.
 * - Falls back to localhost for local dev.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
