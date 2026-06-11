// /js/services/api.js
import { APPS_SCRIPT_URL, token } from "../core/config.js";

const CACHE_KEY = `dashboard_cache_${token}`;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getCachedData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch (error) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (error) {
    console.error("Failed to save cache:", error);
  }
}

export async function fetchDashboardData(forceRefresh = false) {
  if (!token) throw new Error("No token provided in URL.");

  // Check if browser navigation or explicit refresh tells us to fetch fresh data
  const isPageReload = window.performance && window.performance.navigation.type === 1;
  
  if (!forceRefresh && !isPageReload) {
    const cachedData = getCachedData();
    if (cachedData) {
      console.log("📦 Cache Active: Loading stored data snapshot.");
      return cachedData;
    }
  }

  console.log("🌐 Cache Bypassed: Fetching live data from Google Sheet...");
  const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}&nocache=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network error: ${response.status}`);
    const api = await response.json();

    if (!api || !api.ok) throw new Error(api?.message || "Invalid API payload response.");

    setCachedData(api);
    return api;
  } catch (error) {
    console.error("Dashboard fetch failed:", error);
    // Graceful fallback to cache if server fails
    const fallback = getCachedData();
    if (fallback) return fallback;
    throw error;
  }
}
