"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { CheckCircle2, Lock, CalendarDays, MapPin } from "lucide-react";
import { Proposal, CATEGORY_LABELS, ItemCategory } from "@/types/itinerary";
import { ProposalStatusBadge } from "@/components/Badges/ProposalStatusBadge";
import { Button } from "@/components/ui/button";
import { updateProposalStatusAction } from "@/app/actions";
import { CATEGORY_ICONS } from "@/constants/categories-icons";

interface Props {
  proposal: Proposal;
}

export const ProposalView = ({ proposal: initial }: Props) => {
  const [proposal, setProposal] = useState<Proposal>(initial);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(initial.status === "PAID");

  const reservation = proposal.reservation;
  const arrival = new Date(reservation.arrivalDate);
  const departure = new Date(reservation.departureDate);
  const nights = Math.round(
    (departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24),
  );

  const total = proposal.items.reduce((sum, item) => sum + item.price, 0);
  const canApprove = proposal.status === "SENT";
  const canPay = proposal.status === "APPROVED";

  const handleApprove = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await updateProposalStatusAction(proposal.id, "APPROVED");
      setProposal(updated);
      toast.success("Proposal approved — your concierge has been notified.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve.");
    } finally {
      setLoading(false);
    }
  }, [proposal.id]);

  const handlePay = useCallback(async () => {
    setLoading(true);
    try {
      const updated = await updateProposalStatusAction(proposal.id, "PAID");
      setProposal(updated);
      setPaid(true);
      toast.success("Your itinerary is locked in! See you at the villa.", {
        autoClose: 6000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process.");
    } finally {
      setLoading(false);
    }
  }, [proposal.id]);

  if (paid && proposal.status === "PAID") {
    return (
      <section
        aria-label="Itinerary confirmed"
        className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6 py-16 text-center gap-6"
      >
        <div
          aria-hidden="true"
          className="animate-scale-in flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600"
        >
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div
          className="animate-fade-up flex flex-col gap-2"
          style={{ animationDelay: "0.25s" }}
        >
          <h2 className="text-2xl font-semibold">
            You're all set, {reservation.member.name.split(" ")[0]}.
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Your itinerary for{" "}
            <strong className="font-medium">{reservation.villa}</strong> is
            confirmed and locked in. We look forward to welcoming you.
          </p>
        </div>
        <address
          className="animate-fade-up not-italic flex flex-col items-center gap-1 text-sm text-muted-foreground"
          style={{ animationDelay: "0.45s" }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{reservation.destination}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <time dateTime={reservation.arrivalDate}>
              {arrival.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden="true">–</span>
            <time dateTime={reservation.departureDate}>
              {departure.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
        </address>
        <p
          className="animate-fade-up text-xs text-muted-foreground font-mono mt-2 opacity-50"
          aria-hidden="true"
          style={{ animationDelay: "0.6s" }}
        >
          ApexLux · Exclusive Resorts
        </p>
      </section>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero / proposal header */}
      <section className="relative overflow-hidden border-b">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image
          src={`https://picsum.photos/seed/${proposal.id}/1200/600`}
          alt=""
          aria-hidden="true"
          width={1200}
          height={600}
          priority
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70"
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-14 md:px-10 md:py-20 flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <ProposalStatusBadge status={proposal.status} />
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
              Ref #{proposal.id.slice(-8).toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-white">
            {reservation.villa}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{reservation.destination}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              <time dateTime={reservation.arrivalDate}>
                {arrival.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <span aria-hidden="true">–</span>
              <time dateTime={reservation.departureDate}>
                {departure.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span className="text-white/50" aria-label={`${nights} nights`}>
                · {nights} nights
              </span>
            </div>
          </div>
          <p className="text-sm text-white/70">
            Curated for{" "}
            <strong className="font-medium text-white">
              {reservation.member.name}
            </strong>
          </p>
          {proposal.notes && (
            <blockquote className="text-sm text-white/60 italic border-l-2 border-white/30 pl-4 mt-1">
              {proposal.notes}
            </blockquote>
          )}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-10 md:px-10">
        {/* Itinerary items */}
        <div aria-label="Your itinerary" className="flex flex-col gap-3 mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Your Itinerary
          </h2>
          {proposal.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items have been added yet.
            </p>
          ) : (
            <div className="flex flex-col gap-6" aria-label="Itinerary items grouped by day">
              {Object.entries(
                proposal.items.reduce<Record<string, typeof proposal.items>>(
                  (acc, item) => {
                    const key = new Date(item.scheduledAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    });
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(item);
                    return acc;
                  },
                  {}
                )
              ).map(([day, dayItems]) => (
                <section key={day} aria-label={day}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-1.5 border-b">
                    {day}
                  </h3>
                  <ol className="flex flex-col gap-3">
                    {dayItems.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border bg-card p-5 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl leading-none" aria-hidden="true">
                              {CATEGORY_ICONS[item.category as ItemCategory]}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <p className="text-xs text-muted-foreground">
                                <span>
                                  {CATEGORY_LABELS[item.category as ItemCategory]}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <time dateTime={item.scheduledAt}>
                                  {new Date(item.scheduledAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </time>
                              </p>
                              <h3 className="font-medium text-base">{item.title}</h3>
                            </div>
                          </div>
                          <span
                            className="text-sm font-semibold shrink-0"
                            aria-label={`Price: $${item.price.toLocaleString("en-US")}`}
                          >
                            ${item.price.toLocaleString("en-US")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                          {item.description}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Total + CTA */}
        <div
          aria-label="Proposal summary and actions"
          className="rounded-xl border bg-card p-6 flex flex-col gap-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {proposal.items.length} experience
              {proposal.items.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total</span>
              <strong
                className="text-2xl font-semibold"
                aria-label={`Total: $${total.toLocaleString("en-US")}`}
              >
                ${total.toLocaleString("en-US")}
              </strong>
            </div>
          </div>

          {(canApprove || canPay) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {canApprove && (
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleApprove}
                  disabled={loading}
                  aria-busy={loading}
                  aria-label={
                    loading ? "Processing approval…" : "Approve this proposal"
                  }
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {loading ? "Processing..." : "Approve Proposal"}
                </Button>
              )}
              {canPay && (
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handlePay}
                  disabled={loading}
                  aria-busy={loading}
                  aria-label={
                    loading
                      ? "Processing payment…"
                      : "Pay and lock in this itinerary"
                  }
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  {loading ? "Processing..." : "Pay & Lock In"}
                </Button>
              )}
            </div>
          )}

          {proposal.status === "PAID" && (
            <div
              className="flex items-center gap-2 text-emerald-600 text-sm font-medium"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Itinerary confirmed and locked in.</span>
            </div>
          )}

          {proposal.status === "DRAFT" && (
            <p className="text-xs text-muted-foreground text-center font-semibold">
              This proposal is still being prepared by your concierge.
            </p>
          )}
        </div>

        <p
          className="text-center text-xs text-muted-foreground mt-10 mb-6 opacity-50 font-mono"
          aria-hidden="true"
        >
          ApexLux · Exclusive Resorts · Luxury Concierge
        </p>
      </section>
    </div>
  );
};
