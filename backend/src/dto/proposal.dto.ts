import { ItemCategory, ProposalStatus } from "@/types/itinerary";

export interface CreateProposalDto {
  reservationId: string;
  notes?: string;
}

export interface CreateProposalItemDto {
  category: ItemCategory;
  title: string;
  description: string;
  scheduledAt: string;
  price: number;
}

export interface UpdateProposalStatusDto {
  status: ProposalStatus;
}

export interface UpdateProposalNotesDto {
  notes: string | null;
}
