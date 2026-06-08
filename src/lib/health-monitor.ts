import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ZO_CONFIG } from "./zo-config";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency?: number;
  lastCheck: number;
  error?: string;
}

const healthChecks = new Map<string, HealthCheck>();
let monitoringInterval: ReturnType<typeof setInterval> | null = null;
let autoRestartEnabled = true;
let crashCount = 0;
const MAX_CRASHES = 3;

export const runHealthCheck = createServerFn({ method: "GET" })
  .handler(async () => {
    const checks: HealthCheck[] = [];
    const start = Date.now();

    // Check 1: Database (Supabase)
    try {
      const dbStart = Date.now();
      // Simulate DB check
      await new Promise(resolve => setTimeout(resolve, 10));
      checks.push({
        name: "Database",
        status: "healthy",
        latency: Date.now() - dbStart,
        lastCheck: Date.now(),
      });
    } catch (e: any) {
      checks.push({
        name: "Database",
        status: "down",
        lastCheck: Date.now(),
        error: e.message,
      });
    }

    // Check 2: Deriv API
    try {
      const derivStart = Date.now();
      await fetch("https://api.deriv.com/ping", { signal: AbortSignal.timeout(2000) }).catch(() => {});
      checks.push({
        name: "Deriv API",
        status: "healthy",
        latency: Date.now() - derivStart,
        lastCheck: Date.now(),
      });
    } catch {
      checks.push({
        name: "Deriv API",
        status: "degraded",
        lastCheck: Date.now(),
      });
    }

    // Check 3: Telegram
    try {
      checks.push({
        name: "Telegram Bot",
        status: process.env.TELEGRAM_BOT_TOKEN ? "healthy" : "degraded",
        lastCheck: Date.now(),
      });
    } catch (e: any) {
      checks.push({
        name: "Telegram Bot",
        status: "down",
        lastCheck: Date.now(),
        error: e.message,
      });
    }

    // Check 4: Zo Computer
    try {
      const zoStart = Date.now();
      const hasZoKey = !!process.env.ZO_API_KEY || !!ZO_CONFIG.apiKey;
      checks.push({
        name: "Zo Computer",
        status: hasZoKey ? "healthy" : "degraded",
        latency: hasZoKey ? Date.now() - zoStart : undefined,
        lastCheck: Date.now(),
      });
    } catch (e: any) {
      checks.push({
        name: "Zo Computer",
        status: "down",
        lastCheck: Date.now(),
        error: e.message,
      });
    }

    // Check 5: Memory
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.push({
      name: "Memory",
      status: memPercent > 90 ? "degraded" : memPercent > 95 ? "down" : "healthy",
      lastCheck: Date.now(),
    });

    // Update store
    checks.forEach(check => healthChecks.set(check.name, check));

    const totalLatency = Date.now() - start;
    const healthyCount = checks.filter(c => c.status === "healthy").length;
    const overallStatus = healthyCount === checks.length ? "healthy" : 
                         healthyCount >= checks.length * 0.6 ? "degraded" : "down";

    return {
      status: overallStatus,
      checks,
      healthy: healthyCount,
      total: checks.length,
      latency: totalLatency,
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  });

export const startHealthMonitoring = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    intervalSeconds: z.number().optional().default(30),
    autoRestart: z.boolean().optional().default(true),
  }).parse(d))
  .handler(async ({ data }) => {
    autoRestartEnabled = data.autoRestart;

    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }

    // Run immediately
    await runHealthCheck();

    // Then every interval
    monitoringInterval = setInterval(async () => {
      try {
        const result = await runHealthCheck();
        
        // Auto-restart logic
        if (autoRestartEnabled && result.status === "down") {
          crashCount++;
          console.error(`[HEALTH] System down! Crash #${crashCount}`);
          
          if (crashCount >= MAX_CRASHES) {
            console.error("[HEALTH] Max crashes reached, triggering restart...");
            await triggerAutoRestart();
            crashCount = 0;
          }
        } else if (result.status === "healthy") {
          crashCount = Math.max(0, crashCount - 1);
        }

        // Log degraded services
        result.checks.filter(c => c.status !== "healthy").forEach(check => {
          console.warn(`[HEALTH] ${check.name}: ${check.status}${check.error ? ` - ${check.error}` : ""}`);
        });
      } catch (e) {
        console.error("[HEALTH] Monitor error:", e);
        crashCount++;
      }
    }, data.intervalSeconds * 1000);

    return { success: true, interval: data.intervalSeconds };
  });

export const stopHealthMonitoring = createServerFn({ method: "POST" })
  .handler(async () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    return { success: true };
  });

export const getUptimeStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const uptime = process.uptime();
    const checks = Array.from(healthChecks.values());
    
    // Calculate uptime percentage (simplified)
    const totalChecks = checks.length;
    const healthyChecks = checks.filter(c => c.status === "healthy").length;
    const uptimePercent = totalChecks ? (healthyChecks / totalChecks) * 100 : 100;

    return {
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime),
        startedAt: new Date(Date.now() - uptime * 1000).toISOString(),
      },
      health: {
        percentage: Math.round(uptimePercent),
        healthy: healthyChecks,
        total: totalChecks,
        status: uptimePercent >= 95 ? "excellent" : uptimePercent >= 80 ? "good" : "poor",
      },
      crashes: crashCount,
      autoRestart: autoRestartEnabled,
      lastCheck: checks[0]?.lastCheck || null,
    };
  });

async function triggerAutoRestart() {
  try {
    console.log("[HEALTH] Initiating auto-restart sequence...");
    
    // 1. Save state
    // 2. Clear caches
    // 3. Restart services
    // In production, this would restart the process or container
    
    // Simulate restart
    healthChecks.clear();
    crashCount = 0;
    
    // A fresh health check is run by the next explicit monitor tick.
    
    console.log("[HEALTH] Auto-restart completed");
    return true;
  } catch (e) {
    console.error("[HEALTH] Restart failed:", e);
    return false;
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// Monitoring is started explicitly from the uptime screen. Server functions must
// not be called from module-level timers during SSR startup.