import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PwaInstall } from "@/components/pwa-install";
import { getSessionUser } from "@/lib/session";
import { getBranding } from "@/modules/admin/branding";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: { default: branding.name, template: `%s — ${branding.name}` },
    description: branding.tagline,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: branding.name },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, branding] = await Promise.all([getSessionUser(), getBranding()]);

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
        <ThemeProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-[var(--color-accent)] focus:p-3 focus:text-black">
            Skip to content
          </a>
          <SiteHeader user={user} branding={branding} />
          <main id="main" className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
          <MobileBottomNav />
          <PwaInstall />
        </ThemeProvider>
      </body>
    </html>
  );
}
