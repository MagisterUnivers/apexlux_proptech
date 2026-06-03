import { prismaSingleton } from "@/client/prisma";
import {
  CreateProposalDto,
  CreateProposalItemDto,
  UpdateProposalStatusDto,
  UpdateProposalNotesDto,
} from "@/dto/proposal.dto";
import { AppError } from "@/errors/app-error";
import { logger } from "@/utils/logger";

const SERVICE_NAME = "ProposalService";

class ProposalService {
  public async createProposal(data: CreateProposalDto) {
    logger.info(SERVICE_NAME, "🔄 Creating proposal", {
      reservationId: data.reservationId,
    });

    const reservation = await prismaSingleton.reservation.findUnique({
      where: { id: data.reservationId },
    });

    if (!reservation) {
      throw new AppError(404, "404", "Reservation not found");
    }

    const proposal = await prismaSingleton.proposal.create({
      data: {
        reservationId: data.reservationId,
        notes: data.notes ?? null,
      },
      include: { items: true, reservation: { include: { member: true } } },
    });

    logger.info(SERVICE_NAME, "✅ Proposal created", { id: proposal.id });
    return proposal;
  }

  public async getAllProposals(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    logger.info(SERVICE_NAME, "🔄 Fetching all proposals", { page, limit });

    const [proposals, total] = await prismaSingleton.$transaction([
      prismaSingleton.proposal.findMany({
        skip,
        take: limit,
        include: {
          items: true,
          reservation: { include: { member: true } },
          sentEmails: { orderBy: { sentAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      }),
      prismaSingleton.proposal.count(),
    ]);

    logger.info(SERVICE_NAME, "✅ Proposals fetched", { count: proposals.length, total });
    return {
      data: proposals,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  public async getProposalById(id: string) {
    logger.info(SERVICE_NAME, "🔄 Fetching proposal", { id });

    const proposal = await prismaSingleton.proposal.findUnique({
      where: { id },
      include: {
        items: { orderBy: { scheduledAt: "asc" } },
        reservation: { include: { member: true } },
        sentEmails: { orderBy: { sentAt: "desc" } },
      },
    });

    if (!proposal) {
      throw new AppError(404, "404", "Proposal not found");
    }

    logger.info(SERVICE_NAME, "✅ Proposal fetched", { id });
    return proposal;
  }

  public async addItemToProposal(
    proposalId: string,
    data: CreateProposalItemDto,
  ) {
    logger.info(SERVICE_NAME, "🔄 Adding item to proposal", { proposalId });

    const proposal = await prismaSingleton.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new AppError(404, "404", "Proposal not found");
    }

    if (proposal.status !== "DRAFT") {
      throw new AppError(409, "409", "Can only add items to DRAFT proposals");
    }

    const item = await prismaSingleton.proposalItem.create({
      data: {
        proposalId,
        category: data.category,
        title: data.title,
        description: data.description,
        scheduledAt: new Date(data.scheduledAt),
        price: data.price,
      },
    });

    logger.info(SERVICE_NAME, "✅ Item added", { itemId: item.id });
    return item;
  }

  public async updateProposalStatus(
    id: string,
    data: UpdateProposalStatusDto,
  ) {
    logger.info(SERVICE_NAME, "🔄 Updating proposal status", {
      id,
      status: data.status,
    });

    const existing = await prismaSingleton.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, "404", "Proposal not found");
    }

    const updated = await prismaSingleton.proposal.update({
      where: { id },
      data: { status: data.status },
      include: {
        items: { orderBy: { scheduledAt: "asc" } },
        reservation: { include: { member: true } },
      },
    });

    logger.info(SERVICE_NAME, "✅ Status updated", {
      id,
      status: data.status,
    });
    return updated;
  }

  public async removeItemFromProposal(proposalId: string, itemId: string) {
    logger.info(SERVICE_NAME, "🔄 Removing item from proposal", { proposalId, itemId });

    const proposal = await prismaSingleton.proposal.findUnique({ where: { id: proposalId } });

    if (!proposal) {
      throw new AppError(404, "404", "Proposal not found");
    }

    if (proposal.status !== "DRAFT") {
      throw new AppError(409, "CANNOT_MODIFY", "Can only remove items from DRAFT proposals");
    }

    const item = await prismaSingleton.proposalItem.findUnique({ where: { id: itemId } });

    if (!item || item.proposalId !== proposalId) {
      throw new AppError(404, "404", "Item not found");
    }

    await prismaSingleton.proposalItem.delete({ where: { id: itemId } });

    logger.info(SERVICE_NAME, "✅ Item removed", { itemId });
  }

  public async updateProposalNotes(id: string, data: UpdateProposalNotesDto) {
    logger.info(SERVICE_NAME, "🔄 Updating proposal notes", { id });

    const existing = await prismaSingleton.proposal.findUnique({ where: { id } });

    if (!existing) {
      throw new AppError(404, "404", "Proposal not found");
    }

    const updated = await prismaSingleton.proposal.update({
      where: { id },
      data: { notes: data.notes },
      include: {
        items: { orderBy: { scheduledAt: "asc" } },
        reservation: { include: { member: true } },
      },
    });

    logger.info(SERVICE_NAME, "✅ Notes updated", { id });
    return updated;
  }

  public async deleteProposal(id: string) {
    logger.info(SERVICE_NAME, "🔄 Deleting proposal", { id });

    const proposal = await prismaSingleton.proposal.findUnique({ where: { id } });

    if (!proposal) {
      throw new AppError(404, "404", "Proposal not found");
    }

    if (proposal.status === "APPROVED" || proposal.status === "PAID") {
      throw new AppError(409, "CANNOT_DELETE", "Cannot delete an approved or paid proposal");
    }

    await prismaSingleton.proposal.delete({ where: { id } });

    logger.info(SERVICE_NAME, "✅ Proposal deleted", { id });
  }

  public async sendProposal(id: string) {
    logger.info(SERVICE_NAME, "🔄 Sending proposal", { id });

    const proposal = await prismaSingleton.proposal.findUnique({
      where: { id },
      include: {
        items: { orderBy: { scheduledAt: "asc" } },
        reservation: { include: { member: true } },
      },
    });

    if (!proposal) {
      throw new AppError(404, "404", "Proposal not found");
    }

    if (proposal.status !== "DRAFT") {
      throw new AppError(409, "409", "Only DRAFT proposals can be sent");
    }

    if (proposal.items.length === 0) {
      throw new AppError(400, "400", "Cannot send a proposal with no items");
    }

    const total = proposal.items.reduce((sum, item) => sum + item.price, 0);
    const itemSummary = proposal.items
      .map((i) => `- ${i.title} ($${i.price})`)
      .join("\n");

    const bodyPreview = `Dear ${proposal.reservation.member.name}, your personalized itinerary for ${proposal.reservation.villa} (${new Date(proposal.reservation.arrivalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}–${new Date(proposal.reservation.departureDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}) is ready for review.\n\n${itemSummary}\n\nTotal: $${total.toFixed(2)}`;

    const [updatedProposal, email] = await prismaSingleton.$transaction([
      prismaSingleton.proposal.update({
        where: { id },
        data: { status: "SENT", sentAt: new Date() },
        include: {
          items: { orderBy: { scheduledAt: "asc" } },
          reservation: { include: { member: true } },
        },
      }),
      prismaSingleton.sentEmail.create({
        data: {
          proposalId: id,
          toEmail: proposal.reservation.member.email,
          bodyPreview,
        },
      }),
    ]);

    logger.info(SERVICE_NAME, "✅ Proposal sent", {
      id,
      toEmail: proposal.reservation.member.email,
    });

    return { proposal: updatedProposal, email };
  }
}

export const proposalService = new ProposalService();
