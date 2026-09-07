import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local topology planner",
  description: "Plan local AI inference across Macs, NVIDIA hosts, and agent workers.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://local-topology-planner.vercel.app"),
  openGraph: {
    title: "Local topology planner",
    description: "Plan the system, not just the VRAM.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Local topology planner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Local topology planner",
    description: "Plan the system, not just the VRAM.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
