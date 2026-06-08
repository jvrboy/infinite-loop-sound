import { createFileRoute } from "@tanstack/react-router";
import { receiveZoPing } from "@/lib/keepalive.functions";

export const Route = createFileRoute("/api/keepalive/zo")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const result = await receiveZoPing({ data: body });
          return new Response(JSON.stringify(result), {
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
