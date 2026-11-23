import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CompletionToast } from "@/components/CompletionToast";
import { GuestImportBanner } from "@/components/GuestImportBanner";
import { ProgressProvider } from "@/modules/progress/ProgressProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Python Path — zero to AI engineer",
    template: "%s · Python Path",
  },
  description:
    "Learn Python from zero to Forward Deployed / AI Orchestration Engineer: fundamentals, backend, RAG, agents and evals — in your browser.",
};

export const viewport: Viewport = { themeColor: "#0b1020" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ProgressProvider>
          <AppHeader />
          <GuestImportBanner />
          <main id="main" className="flex-1">
            {children}
          </main>
          <CompletionToast />
          <footer className="border-line text-muted border-t py-6 text-center text-xs">
            Python Path · v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"} · Code
            runs locally in your browser via Pyodide ·{" "}
            <Link className="hover:text-fg underline" href="/privacy">
              Privacy
            </Link>
          </footer>
        </ProgressProvider>
      </body>
    </html>
  );
}
