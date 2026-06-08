// Zo Computer Configuration
// API Key: zo_sk_zHUFWqvRqwhRu2vmzLUvzKlyTVpkOD5hU5_x804VZj4
// Configured: 2024

export const ZO_CONFIG = {
  apiKey: "zo_sk_zHUFWqvRqwhRu2vmzLUvzKlyTVpkOD5hU5_x804VZj4",
  baseUrl: "https://api.zo.computer/v1",
  automations: {
    keepalive: {
      name: "divergenceiq-keepalive",
      schedule: "*/1 * * * *", // Every minute
      enabled: true,
    },
    scanner: {
      name: "divergenceiq-scanner",
      schedule: "*/5 * * * *", // Every 5 minutes
      enabled: true,
    },
  },
  endpoints: {
    ping: "/ping",
    automations: "/automations",
    files: "/files",
    user: "/user",
  }
};

// Auto-configure on import
if (typeof process !== "undefined") {
  process.env.ZO_API_KEY = ZO_CONFIG.apiKey;
}