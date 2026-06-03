import { ClipboardPlus } from "lucide-react";
import { Proposal } from "@/types/itinerary";
import { ProposalElement } from "@/components/Lists/ProposalList/ProposalElement";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface Props {
  proposals: Proposal[];
  onSend?: (proposalId: string) => void;
  onAddItem?: (proposalId: string) => void;
  onDelete?: (proposalId: string) => void;
  onNotesUpdate?: (proposalId: string, notes: string) => void;
  onItemDelete?: (proposalId: string, itemId: string) => void;
}

export const ProposalList = ({
  proposals,
  onSend,
  onAddItem,
  onDelete,
  onNotesUpdate,
  onItemDelete,
}: Props) => {
  if (proposals.length === 0) {
    return (
      <Empty aria-label="No proposals yet">
        <EmptyHeader>
          <EmptyMedia>
            <ClipboardPlus className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No proposals yet</EmptyTitle>
          <EmptyDescription>
            Create a new proposal to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul
      role="list"
      aria-label="Itinerary proposals"
      className="flex flex-col gap-3"
    >
      {proposals.map((proposal) => (
        <li key={proposal.id}>
          <ProposalElement
            proposal={proposal}
            onSend={onSend}
            onAddItem={onAddItem}
            onDelete={onDelete}
            onNotesUpdate={onNotesUpdate}
            onItemDelete={onItemDelete}
          />
        </li>
      ))}
    </ul>
  );
};
