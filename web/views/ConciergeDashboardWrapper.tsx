"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import { CalendarDays, MapPin, User, Plus } from "lucide-react";
import { Proposal, Reservation } from "@/types/itinerary";
import { ProposalList } from "@/components/Lists/ProposalList/ProposalList";
import { AddItemModal } from "@/components/Modals/AddItemModal";
import { ActionButton } from "@/components/Buttons/ActionButton";
import { Spinner } from "@/components/Spinners/Spinner";
import {
  createProposalAction,
  addItemToProposalAction,
  sendProposalAction,
  deleteProposalAction,
  deleteProposalItemAction,
  updateProposalNotesAction,
  AddItemPayload,
} from "@/app/actions";

interface Props {
  initialProposals: Proposal[];
  reservation: Reservation;
}

export const ConciergeDashboardWrapper = ({
  initialProposals,
  reservation,
}: Props) => {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const arrival = new Date(reservation.arrivalDate);
  const departure = new Date(reservation.departureDate);

  const handleNewProposal = useCallback(async () => {
    setLoading(true);
    try {
      const proposal = await createProposalAction({
        reservationId: reservation.id,
        notes: "",
      });
      setProposals((prev) => [proposal, ...prev]);
      setActiveProposalId(proposal.id);
      setIsAddItemModalOpen(true);
      toast.success("New proposal created — add items to get started.");
    } catch {
      toast.error("Failed to create proposal.");
    } finally {
      setLoading(false);
    }
  }, [reservation.id]);

  const handleOpenAddItem = useCallback((proposalId: string) => {
    setActiveProposalId(proposalId);
    setIsAddItemModalOpen(true);
  }, []);

  const handleAddItem = useCallback(
    async (data: AddItemPayload) => {
      if (!activeProposalId) return;
      const item = await addItemToProposalAction(activeProposalId, data);
      setProposals((prev) =>
        prev.map((p) =>
          p.id === activeProposalId
            ? { ...p, items: [...(p.items ?? []), item] }
            : p,
        ),
      );
      toast.success(`"${item.title}" added to proposal.`);
    },
    [activeProposalId],
  );

  const handleDelete = useCallback(async (proposalId: string) => {
    try {
      await deleteProposalAction(proposalId);
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      toast.success("Proposal deleted.");
    } catch {
      toast.error("Failed to delete proposal.");
    }
  }, []);

  const handleItemDelete = useCallback(async (proposalId: string, itemId: string) => {
    try {
      await deleteProposalItemAction(proposalId, itemId);
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId
            ? { ...p, items: p.items?.filter((i) => i.id !== itemId) ?? [] }
            : p,
        ),
      );
      toast.success("Item removed.");
    } catch {
      toast.error("Failed to remove item.");
    }
  }, []);

  const handleNotesUpdate = useCallback(async (proposalId: string, notes: string) => {
    try {
      const updated = await updateProposalNotesAction(proposalId, notes || null);
      setProposals((prev) => prev.map((p) => (p.id === proposalId ? updated : p)));
      toast.success("Notes updated.");
    } catch {
      toast.error("Failed to update notes.");
    }
  }, []);

  const handleSend = useCallback(async (proposalId: string) => {
    setLoading(true);
    try {
      const { proposal, email } = await sendProposalAction(proposalId);
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? proposal : p)),
      );
      toast.success(
        `Proposal sent to ${email.toEmail} — awaiting member approval.`,
        { autoClose: 5000 },
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send proposal.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const draftCount = proposals.filter((p) => p.status === "DRAFT").length;
  const sentCount = proposals.filter((p) => p.status === "SENT").length;
  const approvedCount = proposals.filter((p) => p.status === "APPROVED").length;
  const paidCount = proposals.filter((p) => p.status === "PAID").length;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Reservation context banner */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-widest">
                <MapPin className="h-3.5 w-3.5" />
                <span>Active Reservation</span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">{reservation.villa}</h2>
                <p className="text-sm text-muted-foreground">
                  {reservation.destination}
                </p>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium text-foreground">
                    {reservation.member.name}
                  </span>
                  <span className="text-xs">({reservation.member.email})</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    {arrival.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    —{" "}
                    {departure.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <ActionButton
              title="Create new proposal"
              disabled={loading}
              onClickF={handleNewProposal}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Proposal
                </span>
              )}
            </ActionButton>
          </div>
        </div>

        {/* Stats row */}
        <dl
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          aria-label="Proposal status summary"
        >
          {[
            { label: "Draft", count: draftCount, color: "text-zinc-500" },
            { label: "Sent", count: sentCount, color: "text-blue-600" },
            {
              label: "Approved",
              count: approvedCount,
              color: "text-amber-600",
            },
            { label: "Paid", count: paidCount, color: "text-emerald-600" },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className="rounded-xl border bg-card px-4 py-3 flex flex-col gap-1"
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className={`text-2xl font-semibold ${color}`}>{count}</dd>
            </div>
          ))}
        </dl>

        {/* Proposals list */}
        <section aria-label="All proposals" className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            All Proposals
          </h2>
          <ProposalList
            proposals={proposals}
            onSend={handleSend}
            onAddItem={handleOpenAddItem}
            onDelete={handleDelete}
            onNotesUpdate={handleNotesUpdate}
            onItemDelete={handleItemDelete}
          />
        </section>
      </div>

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onOpenChange={setIsAddItemModalOpen}
        onItemAdd={handleAddItem}
      />
    </>
  );
};
