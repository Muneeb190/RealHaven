import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteNav, SiteFooter } from "@/components/site-chrome";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="eyebrow">Error 404</div>
          <h1 className="mt-3 font-display text-6xl font-semibold text-ink">Nothing here.</h1>
          <p className="mt-3 text-muted-foreground">
            The page you're looking for has moved on — or was never listed.
          </p>
          <a href="/" className="press mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm text-background">
            Back home
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="eyebrow">Something broke</div>
        <h1 className="mt-3 font-display text-3xl text-ink">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="press rounded-full bg-ink px-4 py-2 text-sm text-background"
          >Try again</button>
          <a href="/" className="press rounded-full border border-border px-4 py-2 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RealHaven — Real Estate that feels like yours" },
      { name: "description", content: "A boutique index of homes for sale and rent, posted by real agents. Warm, honest, human." },
      { name: "author", content: "RealHaven" },
      { property: "og:title", content: "RealHaven — Real Estate that feels like yours" },
      { property: "og:description", content: "A boutique index of homes for sale and rent, posted by real agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "var(--font-sans)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
