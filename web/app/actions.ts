"use server";

import { revalidateTag } from "next/cache";
import {
  Proposal,
  ProposalItem,
  ProposalStatus,
  ItemCategory,
  Reservation,
} from "@/types/itinerary";

// ─── Reservation ────────────────────────────────────────────────────────────

export async function fetchReservationAction(): Promise<Reservation> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reservations`, {
    next: { revalidate: 300, tags: ["reservation"] },
  });

  if (!res.ok) throw new Error(`Failed to fetch reservation: ${res.status}`);

  const json = await res.json();
  return json.data;
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export async function fetchProposalsAction(): Promise<Proposal[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/proposals`, {
    next: { revalidate: 0, tags: ["proposals"] },
  });

  if (!res.ok) throw new Error(`Failed to fetch proposals: ${res.status}`);

  const json = await res.json();
  return json.data;
}

export async function fetchProposalByIdAction(id: string): Promise<Proposal> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/proposals/${id}`,
    { cache: "no-store" },
  );

  if (!res.ok) throw new Error(`Failed to fetch proposal: ${res.status}`);

  const json = await res.json();
  return json.data;
}

export interface CreateProposalPayload {
  reservationId: string;
  notes?: string;
}

export async function createProposalAction(
  data: CreateProposalPayload,
): Promise<Proposal> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  revalidateTag("proposals");
  const json = await res.json();
  return json.data;
}

export interface AddItemPayload {
  category: ItemCategory;
  title: string;
  description: string;
  scheduledAt: string;
  price: number;
}

export async function addItemToProposalAction(
  proposalId: string,
  data: AddItemPayload,
): Promise<ProposalItem> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/proposals/${proposalId}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  revalidateTag("proposals");
  const json = await res.json();
  return json.data;
}

export async function updateProposalStatusAction(
  id: string,
  status: ProposalStatus,
): Promise<Proposal> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/proposals/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  revalidateTag("proposals");
  const json = await res.json();
  return json.data;
}

export interface SendProposalResult {
  proposal: Proposal;
  email: {
    id: string;
    toEmail: string;
    sentAt: string;
    bodyPreview: string;
  };
}

export async function deleteProposalItemAction(
  proposalId: string,
  itemId: string,
): Promise<void> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/proposals/${proposalId}/items/${itemId}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  revalidateTag("proposals");
}

export async function updateProposalNotesAction(
  id: string,
  notes: string | null,
): Promise<Proposal> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/proposals/${id}/notes`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    },
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  revalidateTag("proposals");
  const json = await res.json();
  return json.data;
}

export async function deleteProposalAction(id: string): Promise<void> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/proposals/${id}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  revalidateTag("proposals");
}

export async function sendProposalAction(
  id: string,
): Promise<SendProposalResult> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/proposals/${id}/send`,
    { method: "POST" },
  );

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }

  revalidateTag("proposals");
  const json = await res.json();
  return json.data;
}
