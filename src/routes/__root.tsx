import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { PasswordGate } from "@/components/app/PasswordGate";
import { useEffect } from "react";
import { seedBuiltinKeys } from "@/lib/ai/client";

function NotFoundComponent() {
  return (
    <div className="dark min-h-screen grid place-items-center bg-background text-foreground p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Back to dashboard</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="dark min-h-screen grid place-items-center bg-background text-foreground p-8">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm">Try again</button>
          <a href="/" className="px-4 py-2 rounded border border-border text-sm">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
      { title: "DivergenceIQ" },
      { name: "description", content: "Forex divergence scanner & auto signals by Tsepang Mashigo" },
      { name: "theme-color", content: "#0b1020" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "DivergenceIQ" },
      { property: "og:title", content: "DivergenceIQ" },
      { name: "twitter:title", content: "DivergenceIQ" },
      { property: "og:description", content: "Forex divergence scanner & auto signals by Tsepang Mashigo" },
      { name: "twitter:description", content: "Forex divergence scanner & auto signals by Tsepang Mashigo" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/759c30b0-4d8a-4c48-8eed-413e731c94bc/id-preview-25d01455--cd2125b3-e3ec-4fc2-a7f2-25e144c8a534.lovable.app-1778502594091.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/759c30b0-4d8a-4c48-8eed-413e731c94bc/id-preview-25d01455--cd2125b3-e3ec-4fc2-a7f2-25e144c8a534.lovable.app-1778502594091.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/759c30b0-4d8a-4c48-8eed-413e731c94bc/id-preview-25d01455--cd2125b3-e3ec-4fc2-a7f2-25e144c8a534.lovable.app-1778502594091.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body className="dark"><div id="app">{children}</div><Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    // Seed Gemini + NVIDIA keys so AI works out of the box.
    seedBuiltinKeys();
    // Browser-side keepalive: ping our server every minute while the tab is open.
    const ping = () => { fetch("/api/public/hooks/keepalive?source=browser", { method: "POST" }).catch(() => {}); };
    ping();
    const id = setInterval(ping, 60_000);
    
    // Register PWA service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    
    return () => clearInterval(id);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <PasswordGate>
        <Outlet />
        <Toaster theme="dark" position="top-right" />
      </PasswordGate>
    </QueryClientProvider>
  );
}
