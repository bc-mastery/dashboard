// /js/services/api.js
import { APPS_SCRIPT_URL, token, nocacheFlag } from "../core/config.js";

const CACHE_KEY = `dashboard_cache_${token}`;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Retrieves cached data from localStorage if it's valid and not expired.
 * @returns {object|null} The parsed API data or null if not found/expired.
 */
function getCachedData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) {
    return null;
  }

  try {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      console.log("Cache expired. Fetching fresh data.");
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    console.log("Loading data from cache.");
    return data;
  } catch (error) {
    console.error("Failed to parse cached data:", error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Stores fresh API data in localStorage with a timestamp.
 * @param {object} data The API data to store.
 */
function setCachedData(data) {
  try {
    const cachePayload = {
      timestamp: Date.now(),
      data: data,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
    console.log("Data saved to cache.");
  } catch (error) {
    console.error("Failed to save data to cache:", error);
  }
}

/**
 * Fetches data for the dashboard, using a cache-first strategy.
 * @param {boolean} forceRefresh - If true, bypasses the cache to fetch fresh data.
 * @returns {Promise<object>} The full API response object.
 */
export async function fetchDashboardData(forceRefresh = false) {
  if (!token) {
    throw new Error("No token provided in URL.");
  }

  if (!forceRefresh) {
    const cachedData = getCachedData();
    if (cachedData) {
      return cachedData;
    }
  }

  console.log("Fetching fresh data from server...");
  const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}&nocache=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok (status: ${response.status})`);
    }
    const api = await response.json();

    if (!api || !api.ok) {
      throw new Error(api?.message || "API returned an error or no data.");
    }

    setCachedData(api); // Cache the new data
    return api;
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    throw error;
  }
}
