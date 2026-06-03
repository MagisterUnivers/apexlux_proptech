import type { Metadata } from "next";
import Link from "next/link";
import { Gem } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: {
    default: "ApexLux",
    template: "%s | ApexLux",
  },
  description:
    "ApexLux — Bespoke luxury travel itineraries for exclusive resort members.",
  keywords: [
    "ApexLux",
    "luxury travel",
    "exclusive resorts",
    "itinerary",
    "concierge",
    "villa",
    "Punta Mita",
    "luxury proposal",
    "travel experience",
    "bespoke travel",
  ],
  authors: [{ name: "Andrii Shaposhnikov" }],
  creator: "Andrii Shaposhnikov",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ApexLux",
    title: "ApexLux — Bespoke Luxury Travel Itineraries",
    description:
      "Personalized itinerary proposals for exclusive resort members.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>{children}</main>
      <ToastContainer position="top-right" />
    </>
  );
}
