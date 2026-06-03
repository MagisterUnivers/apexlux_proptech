import type { Metadata } from "next";
import { Header } from "@/components/Layout/Header";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: {
    default: "ApexLux",
    template: "%s | ApexLux",
  },
  description:
    "ApexLux — Luxury Concierge Itinerary Platform. Craft and deliver personalized travel proposals for exclusive resort members.",
  keywords: [
    "ApexLux",
    "luxury travel",
    "concierge",
    "itinerary",
    "exclusive resorts",
    "villa",
    "proposal",
    "luxury concierge",
    "travel planning",
    "Punta Mita",
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
    title: "ApexLux — Luxury Concierge Itinerary Platform",
    description:
      "Craft personalized itinerary proposals for exclusive resort members.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <ToastContainer position="top-right" />
    </>
  );
}
