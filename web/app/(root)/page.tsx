import { Metadata } from "next";
import Image from "next/image";

export const dynamic = "force-static";
import { Gem, LayoutDashboard, ClipboardList } from "lucide-react";
import { Section } from "@/components/Sections/Section";
import { WelcomeCard } from "@/components/Cards/WelcomeCard";

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: "Home | ApexLux",
    description:
      "ApexLux — Bespoke luxury concierge itinerary platform for exclusive resort members. Personalized travel proposals crafted with care.",
    keywords: [
      "ApexLux",
      "luxury travel",
      "concierge",
      "itinerary",
      "exclusive resorts",
      "Villa Punta Mita",
      "bespoke travel",
      "travel proposal",
      "luxury concierge",
    ],
    openGraph: {
      title: "ApexLux — Luxury Concierge Itinerary Platform",
      description:
        "Bespoke travel itinerary proposals for exclusive resort members.",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: "ApexLux",
      description: "Bespoke luxury travel itineraries for exclusive members.",
    },
  };
};

export default function Home() {
  return (
    <Section bare classNames="relative min-h-screen flex flex-col">
      <div className="relative h-[60vh] w-full overflow-hidden">
        <Image
          src="/resort-hero.jpg"
          alt="Luxury villa overlooking the ocean at Punta Mita"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="flex items-center gap-2 text-white/80 text-sm font-mono uppercase tracking-widest">
            <Gem className="h-4 w-4" />
            <span>ApexLux · Exclusive Resorts</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold text-white leading-tight">
            Every stay,
            <br />
            <span className="text-white">perfectly curated.</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 -mt-8 pb-16 z-10">
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          <WelcomeCard
            href="/concierge"
            title="Concierge Dashboard"
            description="Build and send personalized itinerary proposals for resort members."
          >
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </WelcomeCard>

          <WelcomeCard
            href="/proposals"
            title="My Proposals"
            description="Review your curated itinerary proposals and confirm your experiences."
          >
            <ClipboardList className="h-5 w-5 text-primary" />
          </WelcomeCard>
        </ul>
      </div>
    </Section>
  );
}
