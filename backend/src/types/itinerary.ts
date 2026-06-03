import { Request } from "express";

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
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  memberId: string;
  member?: Member;
  destination: string;
  villa: string;
  arrivalDate: Date;
  departureDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalItem {
  id: string;
  proposalId: string;
  category: ItemCategory;
  title: string;
  description: string;
  scheduledAt: Date;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SentEmail {
  id: string;
  proposalId: string;
  toEmail: string;
  sentAt: Date;
  bodyPreview: string;
}

export interface Proposal {
  id: string;
  reservationId: string;
  reservation?: Reservation;
  status: ProposalStatus;
  notes?: string | null;
  items?: ProposalItem[];
  sentEmails?: SentEmail[];
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {}
