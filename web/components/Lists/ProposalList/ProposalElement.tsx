"use client";

import { useState } from "react";
import { ExternalLink, ListChecks, Send, Plus, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { Proposal } from "@/types/itinerary";
import { ProposalStatusBadge } from "@/components/Badges/ProposalStatusBadge";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/types/itinerary";
import { PREVIEW_LIMIT } from "@/constants/preview-proposals-limit";
import { EditNotesModal } from "@/components/Modals/EditNotesModal";

interface Props {
  proposal: Proposal;
  onSend?: (proposalId: string) => void;
  onAddItem?: (proposalId: string) => void;
  onDelete?: (proposalId: string) => void;
  onNotesUpdate?: (proposalId: string, notes: string) => void;
  onItemDelete?: (proposalId: string, itemId: string) => void;
}

const iconBtnClass =
  "rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const ProposalElement = ({
  proposal,
  onSend,
  onAddItem,
  onDelete,
  onNotesUpdate,
  onItemDelete,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [editNotesOpen, setEditNotesOpen] = useState(false);

  const total = proposal.items?.reduce((sum, i) => sum + i.price, 0) ?? 0;
  const isDraft = proposal.status === "DRAFT";
  const isDeletable = proposal.status === "DRAFT" || proposal.status === "SENT";
  const hiddenCount = (proposal.items?.length ?? 0) - PREVIEW_LIMIT;
  const visibleItems = expanded
    ? proposal.items
    : proposal.items?.slice(0, PREVIEW_LIMIT);
  const itemsListId = `items-${proposal.id}`;

  const handleDelete = () => {
    if (!window.confirm("Delete this proposal? This action cannot be undone."))
      return;
    onDelete?.(proposal.id);
  };

  const handleItemDelete = (itemId: string, itemTitle: string) => {
    if (!window.confirm(`Remove "${itemTitle}" from this proposal?`)) return;
    onItemDelete?.(proposal.id, itemId);
  };

  return (
    <article
      aria-label={`Proposal — ${proposal.status.toLowerCase()}, ${proposal.items?.length ?? 0} items`}
      className="rounded-xl border bg-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ProposalStatusBadge status={proposal.status} />
            <time
              dateTime={proposal.createdAt}
              className="text-xs text-muted-foreground"
            >
              {new Date(proposal.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
          {proposal.notes && (
            <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
              {proposal.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDeletable && (
            <button
              onClick={handleDelete}
              aria-label="Delete proposal"
              className={`text-muted-foreground hover:text-destructive ${iconBtnClass}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {isDraft && (
            <button
              onClick={() => setEditNotesOpen(true)}
              aria-label="Edit notes"
              className={`text-muted-foreground hover:text-foreground ${iconBtnClass}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <Link
            href={`/proposal/${proposal.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Preview proposal in new tab"
            className={`text-muted-foreground hover:text-foreground ${iconBtnClass}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <EditNotesModal
        open={editNotesOpen}
        initialNotes={proposal.notes ?? ""}
        onClose={() => setEditNotesOpen(false)}
        onSave={async (notes) => {
          onNotesUpdate?.(proposal.id, notes);
        }}
      />

      {proposal.items && proposal.items.length > 0 ? (
        <ul
          id={itemsListId}
          role="list"
          aria-label="Proposal items"
          className="flex flex-col gap-1.5"
        >
          {visibleItems?.map((item) => (
            <li
              key={item.id}
              className="group flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-default"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0">
                  {CATEGORY_LABELS[item.category]}
                </span>
                <span className="text-foreground font-medium truncate">
                  {item.title}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {isDraft && (
                  <button
                    onClick={() => handleItemDelete(item.id, item.title)}
                    aria-label={`Remove ${item.title}`}
                    className={`opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ${iconBtnClass}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
                <span className="text-muted-foreground">
                  ${item.price.toLocaleString("en-US")}
                </span>
              </div>
            </li>
          ))}

          {hiddenCount > 0 && (
            <li>
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={itemsListId}
                aria-label={
                  expanded
                    ? "Show fewer items"
                    : `Show ${hiddenCount} more item${hiddenCount !== 1 ? "s" : ""}`
                }
                className={`text-xs pl-3 text-muted-foreground hover:text-foreground ${iconBtnClass}`}
              >
                {expanded ? "Show less" : `+${hiddenCount} more`}
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground pl-1">No items yet.</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t gap-3">
        <div
          className="flex items-center gap-1 text-xs text-muted-foreground"
          aria-label={`${proposal.items?.length ?? 0} items${total > 0 ? `, total $${total.toLocaleString("en-US")}` : ""}`}
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{proposal.items?.length ?? 0} items</span>
          {total > 0 && (
            <>
              <span className="mx-1" aria-hidden="true">
                ·
              </span>
              <span className="font-semibold text-foreground">
                ${total.toLocaleString("en-US")}
              </span>
            </>
          )}
        </div>

        {isDraft && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              aria-label="Add item to proposal"
              onClick={() => onAddItem?.(proposal.id)}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Add Item
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              aria-label={
                !proposal.items || proposal.items.length === 0
                  ? "Cannot send: no items added"
                  : "Send proposal to member"
              }
              onClick={() => onSend?.(proposal.id)}
              disabled={!proposal.items || proposal.items.length === 0}
            >
              <Send className="h-3 w-3" aria-hidden="true" />
              Send
            </Button>
          </div>
        )}
      </div>
    </article>
  );
};
