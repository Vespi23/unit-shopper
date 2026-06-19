export function register() {
  // FIXED: Executes on server boot before any chunks or node modules load
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined') {
    process.env.UPSTASH_DISABLE_TELEMETRY = "1";
    
    // Explicitly seed a valid absolute URL layout structure to eliminate the /pipeline crash
    if (!process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL.startsWith("/")) {
      process.env.UPSTASH_REDIS_REST_URL = "https://disabled-telemetry.localhost";
    }
    if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock_boot_token_bypass";
    }
    
    console.log("[BUDGETLYNX_SHIM]: Root server environment initialization sanitized successfully.");
  }
}