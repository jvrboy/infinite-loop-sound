import { createFileRoute } from "@tanstack/react-router";

let lastZoPing = 0;

export const Route = createFileRoute("/api/keepalive/zo")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const source = typeof body?.source === "string" ? body.source : "zo-computer";
          lastZoPing = Date.now();
          return new Response(JSON.stringify({
            success: true,
            appStatus: "alive",
            source,
            timestamp: lastZoPing,
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      GET: async () => {
        return new Response(JSON.stringify({ status: "alive", service: "divergenceiq-keepalive" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
