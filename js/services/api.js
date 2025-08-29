// /js/services/api.js
import { APPS_SCRIPT_URL, token, nocacheFlag } from "../core/config.js";

/**
 * Fetches data for the dashboard from the Apps Script backend.
 * Centralizes the fetch logic, error handling, and URL construction.
 * @returns {Promise<object>} The full API response object if successful.
 * @throws {Error} If the network request fails or the API returns a non-ok status.
 */
export async function fetchDashboardData() {
  if (!token) {
    throw new Error("No token provided in URL.");
  }

  const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(token)}${
    nocacheFlag ? "&nocache=1" : ""
  }`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Network response was not ok (status: ${response.status})`);
    }

    const api = await response.json();

    if (!api || !api.ok) {
      throw new Error(api?.message || "API returned an error or no data.");
    }

    return api;
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Re-throw to let the caller handle UI updates
    throw error;
  }
}
