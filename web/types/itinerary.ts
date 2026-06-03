export type ProposalStatus = "DRAFT" | "SENT" | "APPROVED" | "PAID";

export type ItemCategory =
  | "DINING"
  | "ACTIVITIES"
  | "WELLNESS"
  | "EXCURSIONS"
  | "TRANSPORT"
  | "EXPERIENCES";

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Reservation {
  id: string;
  memberId: string;
  member: Member;
  destination: string;
  villa: string;
  arrivalDate: string;
  departureDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  category: ItemCategory;
  title: string;
  description: string;
  scheduledAt: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface SentEmail {
  id: string;
  proposalId: string;
  toEmail: string;
  sentAt: string;
  bodyPreview: string;
}

export interface Proposal {
  id: string;
  reservationId: string;
  reservation: Reservation;
  status: ProposalStatus;
  notes?: string | null;
  items: ProposalItem[];
  sentEmails?: SentEmail[];
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  DINING: "Dining",
  ACTIVITIES: "Activities",
  WELLNESS: "Wellness",
  EXCURSIONS: "Excursions",
  TRANSPORT: "Transport",
  EXPERIENCES: "Experiences",
};

export const CATEGORY_EXAMPLES: Record<ItemCategory, string> = {
  DINING: "Private chef dinner, restaurant reservation",
  ACTIVITIES: "Surf lesson, snorkeling, ATV tour",
  WELLNESS: "Spa treatment, yoga session, massage",
  EXCURSIONS: "Whale watching, sailing charter, cultural tour",
  TRANSPORT: "Airport transfer, private car, helicopter",
  EXPERIENCES: "Sunset cocktails, bonfire on the beach, tequila tasting",
};
