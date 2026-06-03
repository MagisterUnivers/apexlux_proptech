import { z } from "zod";

const VALID_STATUSES = ["DRAFT", "SENT", "APPROVED", "PAID"] as const;
const VALID_CATEGORIES = [
  "DINING",
  "ACTIVITIES",
  "WELLNESS",
  "EXCURSIONS",
  "TRANSPORT",
  "EXPERIENCES",
] as const;

export const CreateProposalSchema = z.object({
  reservationId: z.string().min(1),
  notes: z.string().optional(),
});

export const CreateProposalItemSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  title: z.string().min(1).max(150),
  description: z.string().min(1),
  scheduledAt: z.string().datetime(),
  price: z.number().positive(),
});

export const UpdateProposalStatusSchema = z.object({
  status: z.enum(VALID_STATUSES),
});

export const UpdateProposalNotesSchema = z.object({
  notes: z.string().max(1000).nullable(),
});
