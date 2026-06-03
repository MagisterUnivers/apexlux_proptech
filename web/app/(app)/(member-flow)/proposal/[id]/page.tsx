import { Metadata } from "next";
import { fetchProposalByIdAction } from "@/app/actions";
import { ProposalView } from "@/views/ProposalView";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const proposal = await fetchProposalByIdAction(params.id);
    const villa = proposal.reservation?.villa ?? "Your Proposal";
    const destination = proposal.reservation?.destination ?? "";
    const description = `Your personalized luxury itinerary for ${villa}${destination ? `, ${destination}` : ""}. Curated by ApexLux Concierge.`;
    return {
      title: `Itinerary — ${villa}`,
      description,
      keywords: [
        "ApexLux",
        "luxury itinerary",
        "exclusive resorts",
        villa,
        destination,
        "concierge proposal",
        "luxury travel",
      ].filter(Boolean),
      openGraph: {
        title: `${villa} Itinerary | ApexLux`,
        description,
        type: "website",
        locale: "en_US",
        siteName: "ApexLux",
      },
    };
  } catch {
    return { title: "Itinerary Proposal | ApexLux" };
  }
}

export default async function ProposalPage({ params }: Props) {
  const proposal = await fetchProposalByIdAction(params.id);
  return <ProposalView proposal={proposal} />;
}
