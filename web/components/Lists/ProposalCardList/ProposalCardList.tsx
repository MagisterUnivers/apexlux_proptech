import { MailOpen } from "lucide-react";
import { Proposal } from "@/types/itinerary";
import { ProposalCardElement } from "@/components/Lists/ProposalCardList/ProposalCardElement";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface Props {
  proposals: Proposal[];
}

export const ProposalCardList = ({ proposals }: Props) => {
  if (proposals.length === 0) {
    return (
      <Empty aria-label="No proposals yet">
        <EmptyHeader>
          <EmptyMedia>
            <MailOpen className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No proposals yet</EmptyTitle>
          <EmptyDescription>
            Your concierge will send you a personalized itinerary soon.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul
      role="list"
      aria-label="Itinerary proposals"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {proposals.map((proposal) => (
        <ProposalCardElement key={proposal.id} proposal={proposal} />
      ))}
    </ul>
  );
};
