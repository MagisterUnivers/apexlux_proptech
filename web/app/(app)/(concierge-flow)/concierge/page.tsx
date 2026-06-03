import { Metadata } from "next";
import { Section } from "@/components/Sections/Section";
import { ConciergeDashboardWrapper } from "@/views/ConciergeDashboardWrapper";
import {
  fetchReservationAction,
  fetchProposalsAction,
} from "@/app/actions";

export const metadata: Metadata = {
  title: "Concierge Dashboard",
  description:
    "ApexLux Concierge Portal — build and send personalized itinerary proposals for exclusive resort members.",
  keywords: [
    "ApexLux",
    "concierge dashboard",
    "itinerary builder",
    "luxury travel concierge",
    "proposal management",
  ],
  openGraph: {
    title: "Concierge Dashboard | ApexLux",
    description:
      "Build and send personalized itinerary proposals for exclusive resort members.",
    type: "website",
    locale: "en_US",
    siteName: "ApexLux",
  },
};

export default async function ConciergePage() {
  const [reservation, proposals] = await Promise.all([
    fetchReservationAction(),
    fetchProposalsAction(),
  ]);

  return (
    <Section bare classNames="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-semibold">Concierge Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Build and send personalized itinerary proposals for your members.
        </p>
      </div>
      <ConciergeDashboardWrapper
        reservation={reservation}
        initialProposals={proposals}
      />
    </Section>
  );
}
