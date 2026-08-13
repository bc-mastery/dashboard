// /js/services/api.js

import {
  APPS_SCRIPT_URL,
  token
} from "../core/config.js";


const CACHE_KEY =
  `dashboard_cache_${token}`;

const CACHE_DURATION_MS =
  60 * 60 * 1000; // 1 hour


// ============================================================
// SESSION / MEMORY CACHE
//
// Fastest cache layer.
//
// Once the Dashboard data has been loaded during this page
// session, every module receives the SAME object directly
// from memory.
//
// A hard browser refresh naturally clears this cache.
// ============================================================

let memoryCache = null;


// ============================================================
// IN-FLIGHT REQUEST
//
// Prevents two modules from accidentally firing two identical
// API requests at the same time.
// ============================================================

let inFlightRequest = null;


// ============================================================
// LOCALSTORAGE CACHE
// ============================================================

function getCachedData() {

  const cached =
    localStorage.getItem(
      CACHE_KEY
    );


  if (!cached) {
    return null;
  }


  try {

    const {
      timestamp,
      data
    } =
      JSON.parse(cached);


    if (
      Date.now() - timestamp >
      CACHE_DURATION_MS
    ) {

      localStorage.removeItem(
        CACHE_KEY
      );

      return null;
    }


    return data;


  } catch (error) {

    localStorage.removeItem(
      CACHE_KEY
    );

    return null;
  }
}


function setCachedData(data) {

  try {

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp:
          Date.now(),

        data:
          data
      })
    );


  } catch (error) {

    console.error(
      "Failed to save Dashboard cache:",
      error
    );
  }
}


// ============================================================
// DASHBOARD FETCH
// ============================================================

export async function fetchDashboardData(
  forceRefresh = false
) {

  if (!token) {

    throw new Error(
      "No token provided in URL."
    );
  }


  // Detect actual browser reload.
  const isPageReload =
    window.performance &&
    window.performance.navigation &&
    window.performance.navigation.type === 1;


  // ==========================================================
  // 1. MEMORY CACHE
  //
  // Fastest possible path.
  //
  // Normal module switching should always stop here after
  // the first successful Dashboard load.
  // ==========================================================

  if (
    !forceRefresh &&
    !isPageReload &&
    memoryCache
  ) {

    console.log(
      "⚡ Memory Cache Active: Using live Dashboard session data."
    );

    return memoryCache;
  }


  // ==========================================================
  // 2. LOCALSTORAGE CACHE
  //
  // Used if this is not a hard reload and the browser already
  // has a recent Dashboard snapshot.
  // ==========================================================

  if (
    !forceRefresh &&
    !isPageReload
  ) {

    const cachedData =
      getCachedData();


    if (cachedData) {

      console.log(
        "📦 Browser Cache Active: Loading stored Dashboard snapshot."
      );


      // Promote localStorage result into RAM.
      memoryCache =
        cachedData;


      return memoryCache;
    }
  }


  // ==========================================================
  // 3. EXISTING NETWORK REQUEST
  //
  // If another module already started the same request,
  // reuse it instead of calling Apps Script twice.
  // ==========================================================

  if (
    !forceRefresh &&
    inFlightRequest
  ) {

    console.log(
      "⏳ Dashboard request already running — reusing it."
    );

    return inFlightRequest;
  }


  console.log(
    "🌐 Fetching live Dashboard data from Google Sheet..."
  );


  const url =
    `${APPS_SCRIPT_URL}` +
    `?token=${encodeURIComponent(token)}` +
    `&nocache=1`;


  const requestPromise =
    (async () => {

      try {

        const response =
          await fetch(url);


        if (!response.ok) {

          throw new Error(
            `Network error: ${response.status}`
          );
        }


        const api =
          await response.json();


        if (
          !api ||
          !api.ok
        ) {

          throw new Error(
            api?.message ||
            "Invalid API payload response."
          );
        }


        // --------------------------------------------
        // Store fresh response in RAM.
        // --------------------------------------------

        memoryCache =
          api;


        // --------------------------------------------
        // Keep existing browser cache as fallback.
        // --------------------------------------------

        setCachedData(
          api
        );


        console.log(
          "✅ Dashboard data loaded and stored in memory."
        );


        return api;


      } catch (error) {

        console.error(
          "Dashboard fetch failed:",
          error
        );


        // --------------------------------------------
        // Graceful fallback to browser cache.
        // --------------------------------------------

        const fallback =
          getCachedData();


        if (fallback) {

          console.warn(
            "⚠️ Live request failed. Falling back to stored Dashboard data."
          );


          memoryCache =
            fallback;


          return memoryCache;
        }


        throw error;


      } finally {

        inFlightRequest =
          null;
      }
    })();


  inFlightRequest =
    requestPromise;


  return requestPromise;
}
