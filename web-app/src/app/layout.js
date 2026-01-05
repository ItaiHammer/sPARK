import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

// Contexts
import ContextProvider from "@/contexts/Context.provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : process.env.NEXT_PUBLIC_WEB_APP_URL ?? "https://sparkparking.vercel.app"
  ),
  title: "sPARK",
  description:
    "Real-time parking availability, forecasting, and smart navigation",
  manifest: "/manifest.json",
  openGraph: {
    title: "sPARK - Parking Made Simple",
    description:
      "Real-time parking availability, forecasting, and smart navigation",
    images: [
      {
        url: "/icons/logos/spark-logo-1200x630.png",
        width: 1200,
        height: 630,
        alt: "sPARK",
      },
    ],
  },
  icons: {
    icon: [
      {
        url: "/icons/logos/spark-logo-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/logos/spark-logo-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/icons/logos/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "sPARK",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ContextProvider>
          {children}
          <Toaster position="top-center" />
        </ContextProvider>
      </body>
    </html>
  );
}
