import { ChevronRight, CalendarDays, ListChecks } from "lucide-react";
import Link from "next/link";
import { Proposal } from "@/types/itinerary";
import { ProposalStatusBadge } from "@/components/Badges/ProposalStatusBadge";
import Image from "next/image";

interface Props {
  proposal: Proposal;
}

export const ProposalCardElement = ({ proposal }: Props) => {
  const itemsCount = proposal.items?.length ?? 0;
  const total = proposal.items?.reduce((sum, item) => sum + item.price, 0) ?? 0;

  const scheduledDates = proposal.items
    ?.map((i) => new Date(i.scheduledAt))
    .sort((a, b) => a.getTime() - b.getTime());

  const dateRange =
    scheduledDates && scheduledDates.length > 0
      ? scheduledDates.length === 1
        ? scheduledDates[0].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : `${scheduledDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${scheduledDates[scheduledDates.length - 1].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : null;

  const villa = proposal.reservation?.villa ?? "Itinerary Proposal";
  const destination = proposal.reservation?.destination ?? "";

  return (
    <li>
      <Link
        href={`/proposal/${proposal.id}`}
        aria-label={`View proposal: ${villa} — ${proposal.status.toLowerCase()}`}
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <article className="relative rounded-xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
          <div className="relative h-40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Image
              src={`https://picsum.photos/seed/${proposal.id}/600/300`}
              alt=""
              aria-hidden="true"
              width={600}
              height={300}
              quality={80}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              className="absolute inset-0 from-black/40 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-3 left-3">
              <ProposalStatusBadge status={proposal.status} />
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-base leading-tight">
                  {villa}
                </h3>
                {destination && (
                  <p className="text-xs text-muted-foreground">{destination}</p>
                )}
              </div>
              <ChevronRight
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </div>

            <div
              className="grid grid-cols-2 gap-3"
              aria-label="Proposal summary"
            >
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                <ListChecks
                  className="h-4 w-4 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Items</span>
                  <span className="text-sm font-semibold">{itemsCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                <span
                  className="text-muted-foreground shrink-0 text-sm font-medium"
                  aria-hidden="true"
                >
                  $
                </span>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-sm font-semibold">
                    {total > 0
                      ? total.toLocaleString("en-US", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {dateRange && (
              <div className="flex items-center gap-2 pt-1 border-t">
                <CalendarDays
                  className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <time className="text-xs text-muted-foreground">
                  {dateRange}
                </time>
              </div>
            )}
          </div>
        </article>
      </Link>
    </li>
  );
};
