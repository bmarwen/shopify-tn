// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ShopProvider } from "@/components/providers/shop-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalErrorHandler } from "@/components/global-error-handler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Para Shop",
  description: "Your online store",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-white font-sans antialiased",
          inter.className
        )}
      >
        <ErrorBoundary>
          <GlobalErrorHandler />
          <SessionProvider>
            <ShopProvider>{children}</ShopProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
