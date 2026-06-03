import { Metadata } from "next";
import { fetchProposalsAction } from "@/app/actions";
import { ProposalCardList } from "@/components/Lists/ProposalCardList/ProposalCardList";

export const metadata: Metadata = {
  title: "My Itinerary Proposals",
  description:
    "Review your personalized luxury travel proposals from ApexLux Exclusive Resorts.",
  keywords: [
    "ApexLux",
    "luxury itinerary",
    "exclusive resorts",
    "travel proposal",
    "concierge",
    "Villa Punta Mita",
  ],
  openGraph: {
    title: "My Itinerary Proposals | ApexLux",
    description:
      "Review your personalized luxury travel proposals from ApexLux Exclusive Resorts.",
    type: "website",
    locale: "en_US",
    siteName: "ApexLux",
  },
};

export default async function ProposalsPage() {
  const proposals = await fetchProposalsAction();

  // DRAFT proposals are excluded from the member view — concierge is still preparing them.
  // Backend already returns proposals sorted by createdAt desc.
  const visible = proposals.filter((p) => p.status !== "DRAFT");

  return (
    <section className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-12 md:px-10">
        <header className="flex flex-col gap-2 mb-10">
          <p
            className="text-xs text-muted-foreground font-mono uppercase tracking-widest"
            aria-hidden="true"
          >
            Exclusive Resorts · Member Portal
          </p>
          <h1 className="text-3xl font-semibold">Your Itinerary Proposals</h1>
          <p className="text-muted-foreground">
            Curated experiences crafted personally for your upcoming stay.
          </p>
        </header>

        <ProposalCardList proposals={visible} />
      </div>
    </section>
  );
}
