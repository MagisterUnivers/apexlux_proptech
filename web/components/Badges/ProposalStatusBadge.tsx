import { ProposalStatus } from "@/types/itinerary";

interface Props {
  status: ProposalStatus;
}

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; classes: string }
> = {
  DRAFT: {
    label: "Draft",
    classes:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
  SENT: {
    label: "Sent",
    classes:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  APPROVED: {
    label: "Approved",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  PAID: {
    label: "Paid & Locked",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
};

export const ProposalStatusBadge = ({ status }: Props) => {
  const { label, classes } = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;

  return (
    <span
      role="status"
      aria-label={`Proposal status: ${label}`}
      className={`text-xs font-semibold w-fit px-2.5 py-0.5 rounded-full ${classes}`}
    >
      {label}
    </span>
  );
};
