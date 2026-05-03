import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Infinite Sound" },
      { name: "description", content: "Infinite Loop Studio is a touch-first sound design lab for creating and exporting infinitely looping audio samples." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Infinite Sound" },
      { property: "og:description", content: "Infinite Loop Studio is a touch-first sound design lab for creating and exporting infinitely looping audio samples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Infinite Sound" },
      { name: "twitter:description", content: "Infinite Loop Studio is a touch-first sound design lab for creating and exporting infinitely looping audio samples." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8a7ca160-ac0d-4ab1-971c-d6236f2125d7/id-preview-20576fe2--314fee07-75a3-477a-8568-6ddbc44a035f.lovable.app-1777776966709.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8a7ca160-ac0d-4ab1-971c-d6236f2125d7/id-preview-20576fe2--314fee07-75a3-477a-8568-6ddbc44a035f.lovable.app-1777776966709.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
