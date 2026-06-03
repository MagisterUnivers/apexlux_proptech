import "dotenv/config";
import { proposalService } from "@/modules/proposals/services/proposal.service";
import { prismaSingleton } from "@/client/prisma";
import { AppError } from "@/errors/app-error";

const randomSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Test data helpers ────────────────────────────────────────────────────────

const createTestMember = () =>
  prismaSingleton.member.create({
    data: {
      name: `TEST_MEMBER_${randomSuffix()}`,
      email: `test.${randomSuffix()}@apexlux-test.com`,
    },
  });

const createTestReservation = (memberId: string) =>
  prismaSingleton.reservation.create({
    data: {
      memberId,
      destination: "Test Destination",
      villa: "Test Villa",
      arrivalDate: new Date("2026-03-15"),
      departureDate: new Date("2026-03-22"),
    },
  });

const createTestSetup = async () => {
  const member = await createTestMember();
  const reservation = await createTestReservation(member.id);
  return { member, reservation };
};

const cleanupTestData = async () => {
  // Cascade: member → reservation → proposal → items + sentEmails
  await prismaSingleton.member.deleteMany({
    where: { name: { startsWith: "TEST_MEMBER_" } },
  });
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("ProposalService", () => {
  beforeAll(async () => {
    await prismaSingleton.$connect();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prismaSingleton.$disconnect();
  });

  // ─── getAllProposals ────────────────────────────────────────────────────────

  describe("getAllProposals", () => {
    it("returns data array and meta object with correct shape", async () => {
      const result = await proposalService.getAllProposals(1, 20);

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("meta");
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it("respects limit — data.length never exceeds limit", async () => {
      const { reservation } = await createTestSetup();

      // Create 3 proposals so there's enough data to paginate
      await Promise.all([
        proposalService.createProposal({ reservationId: reservation.id }),
        proposalService.createProposal({ reservationId: reservation.id }),
        proposalService.createProposal({ reservationId: reservation.id }),
      ]);

      const result = await proposalService.getAllProposals(1, 2);

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.meta.limit).toBe(2);
    });

    it("totalPages equals ceil(total / limit)", async () => {
      const result = await proposalService.getAllProposals(1, 3);

      const expected = Math.ceil(result.meta.total / 3);
      expect(result.meta.totalPages).toBe(expected);
    });

    it("page 2 returns different items than page 1", async () => {
      const { reservation } = await createTestSetup();

      await Promise.all([
        proposalService.createProposal({ reservationId: reservation.id }),
        proposalService.createProposal({ reservationId: reservation.id }),
        proposalService.createProposal({ reservationId: reservation.id }),
      ]);

      const page1 = await proposalService.getAllProposals(1, 2);
      const page2 = await proposalService.getAllProposals(2, 2);

      const ids1 = page1.data.map((p) => p.id);
      const ids2 = page2.data.map((p) => p.id);
      const overlap = ids1.filter((id) => ids2.includes(id));

      expect(overlap).toHaveLength(0);
    });

    it("each proposal in data includes items and reservation", async () => {
      const { reservation } = await createTestSetup();
      await proposalService.createProposal({ reservationId: reservation.id });

      const result = await proposalService.getAllProposals(1, 20);

      const mine = result.data.find((p) => p.reservationId === reservation.id);
      expect(mine).toBeDefined();
      expect(Array.isArray(mine?.items)).toBe(true);
      expect(mine?.reservation).toBeDefined();
    });
  });

  // ─── getProposalById ────────────────────────────────────────────────────────

  describe("getProposalById", () => {
    it("returns proposal with items, reservation and sentEmails", async () => {
      const { reservation } = await createTestSetup();
      const created = await proposalService.createProposal({
        reservationId: reservation.id,
        notes: "VIP",
      });

      const result = await proposalService.getProposalById(created.id);

      expect(result.id).toBe(created.id);
      expect(result.status).toBe("DRAFT");
      expect(result.notes).toBe("VIP");
      expect(Array.isArray(result.items)).toBe(true);
      expect(Array.isArray(result.sentEmails)).toBe(true);
      expect(result.reservation).toBeDefined();
    });

    it("throws AppError 404 for a non-existent id", async () => {
      await expect(
        proposalService.getProposalById("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(AppError);

      await expect(
        proposalService.getProposalById("00000000-0000-0000-0000-000000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── createProposal ─────────────────────────────────────────────────────────

  describe("createProposal", () => {
    it("creates a DRAFT proposal linked to the reservation", async () => {
      const { reservation } = await createTestSetup();

      const result = await proposalService.createProposal({
        reservationId: reservation.id,
        notes: "Special request",
      });

      expect(result.status).toBe("DRAFT");
      expect(result.reservationId).toBe(reservation.id);
      expect(result.notes).toBe("Special request");

      const persisted = await prismaSingleton.proposal.findUnique({
        where: { id: result.id },
      });
      expect(persisted).not.toBeNull();
    });

    it("persists proposal with null notes when not provided", async () => {
      const { reservation } = await createTestSetup();

      const result = await proposalService.createProposal({
        reservationId: reservation.id,
      });

      expect(result.notes).toBeNull();
    });

    it("throws AppError 404 when reservation does not exist", async () => {
      await expect(
        proposalService.createProposal({
          reservationId: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("returns empty items array on creation", async () => {
      const { reservation } = await createTestSetup();

      const result = await proposalService.createProposal({
        reservationId: reservation.id,
      });

      expect(result.items).toEqual([]);
    });
  });

  // ─── addItemToProposal ──────────────────────────────────────────────────────

  describe("addItemToProposal", () => {
    const itemData = {
      category: "DINING" as const,
      title: "Private Beach Dinner",
      description: "Romantic dinner on the beach",
      scheduledAt: "2026-03-16T19:00:00.000Z",
      price: 450,
    };

    it("adds an item to a DRAFT proposal and persists it", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });

      const item = await proposalService.addItemToProposal(proposal.id, itemData);

      expect(item.title).toBe(itemData.title);
      expect(item.price).toBe(itemData.price);
      expect(item.category).toBe("DINING");
      expect(item.proposalId).toBe(proposal.id);

      const persisted = await prismaSingleton.proposalItem.findUnique({
        where: { id: item.id },
      });
      expect(persisted).not.toBeNull();
    });

    it("throws 404 when proposal does not exist", async () => {
      await expect(
        proposalService.addItemToProposal(
          "00000000-0000-0000-0000-000000000000",
          itemData,
        ),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("throws 409 when proposal status is SENT", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      // Force status to SENT directly (bypasses service send validation)
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "SENT" },
      });

      await expect(
        proposalService.addItemToProposal(proposal.id, itemData),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("throws 409 when proposal status is APPROVED", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "APPROVED" },
      });

      await expect(
        proposalService.addItemToProposal(proposal.id, itemData),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  // ─── updateProposalStatus ───────────────────────────────────────────────────

  describe("updateProposalStatus", () => {
    it("updates status and persists the change", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });

      const updated = await proposalService.updateProposalStatus(proposal.id, {
        status: "APPROVED",
      });

      expect(updated.status).toBe("APPROVED");

      const persisted = await prismaSingleton.proposal.findUnique({
        where: { id: proposal.id },
      });
      expect(persisted?.status).toBe("APPROVED");
    });

    it("throws 404 when proposal does not exist", async () => {
      await expect(
        proposalService.updateProposalStatus(
          "00000000-0000-0000-0000-000000000000",
          { status: "SENT" },
        ),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── removeItemFromProposal ─────────────────────────────────────────────────

  describe("removeItemFromProposal", () => {
    it("removes an item from a DRAFT proposal", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      const item = await proposalService.addItemToProposal(proposal.id, {
        category: "WELLNESS",
        title: "Spa Session",
        description: "Full body massage",
        scheduledAt: "2026-03-17T10:00:00.000Z",
        price: 200,
      });

      await proposalService.removeItemFromProposal(proposal.id, item.id);

      const deleted = await prismaSingleton.proposalItem.findUnique({
        where: { id: item.id },
      });
      expect(deleted).toBeNull();
    });

    it("throws 404 when proposal does not exist", async () => {
      await expect(
        proposalService.removeItemFromProposal(
          "00000000-0000-0000-0000-000000000000",
          "00000000-0000-0000-0000-000000000001",
        ),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("throws 409 when proposal is not DRAFT", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      const item = await proposalService.addItemToProposal(proposal.id, {
        category: "ACTIVITIES",
        title: "Surf Lesson",
        description: "2h lesson",
        scheduledAt: "2026-03-18T08:00:00.000Z",
        price: 150,
      });
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "SENT" },
      });

      await expect(
        proposalService.removeItemFromProposal(proposal.id, item.id),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("throws 404 when item belongs to a different proposal", async () => {
      const { reservation } = await createTestSetup();
      const proposalA = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      const proposalB = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      const itemOnB = await proposalService.addItemToProposal(proposalB.id, {
        category: "TRANSPORT",
        title: "Airport Transfer",
        description: "Private car",
        scheduledAt: "2026-03-15T14:00:00.000Z",
        price: 120,
      });

      await expect(
        proposalService.removeItemFromProposal(proposalA.id, itemOnB.id),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── updateProposalNotes ────────────────────────────────────────────────────

  describe("updateProposalNotes", () => {
    it("updates notes and persists the change", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });

      const updated = await proposalService.updateProposalNotes(proposal.id, {
        notes: "Client prefers gluten-free menu",
      });

      expect(updated.notes).toBe("Client prefers gluten-free menu");

      const persisted = await prismaSingleton.proposal.findUnique({
        where: { id: proposal.id },
      });
      expect(persisted?.notes).toBe("Client prefers gluten-free menu");
    });

    it("clears notes when null is passed", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
        notes: "Initial note",
      });

      const updated = await proposalService.updateProposalNotes(proposal.id, {
        notes: null,
      });

      expect(updated.notes).toBeNull();
    });

    it("throws 404 when proposal does not exist", async () => {
      await expect(
        proposalService.updateProposalNotes(
          "00000000-0000-0000-0000-000000000000",
          { notes: "Test" },
        ),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── deleteProposal ─────────────────────────────────────────────────────────

  describe("deleteProposal", () => {
    it("deletes a DRAFT proposal and removes it from DB", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });

      await proposalService.deleteProposal(proposal.id);

      const deleted = await prismaSingleton.proposal.findUnique({
        where: { id: proposal.id },
      });
      expect(deleted).toBeNull();
    });

    it("deletes a SENT proposal successfully", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "SENT" },
      });

      await proposalService.deleteProposal(proposal.id);

      const deleted = await prismaSingleton.proposal.findUnique({
        where: { id: proposal.id },
      });
      expect(deleted).toBeNull();
    });

    it("throws 409 when proposal is APPROVED (immutable)", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "APPROVED" },
      });

      await expect(
        proposalService.deleteProposal(proposal.id),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("throws 409 when proposal is PAID (immutable)", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "PAID" },
      });

      await expect(
        proposalService.deleteProposal(proposal.id),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("throws 404 when proposal does not exist", async () => {
      await expect(
        proposalService.deleteProposal("00000000-0000-0000-0000-000000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ─── sendProposal ───────────────────────────────────────────────────────────

  describe("sendProposal", () => {
    it("transitions proposal to SENT and creates a SentEmail record", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await proposalService.addItemToProposal(proposal.id, {
        category: "DINING",
        title: "Sunset Dinner",
        description: "On the terrace",
        scheduledAt: "2026-03-16T19:00:00.000Z",
        price: 380,
      });

      const result = await proposalService.sendProposal(proposal.id);

      expect(result.proposal.status).toBe("SENT");
      expect(result.proposal.sentAt).not.toBeNull();
      expect(result.email.proposalId).toBe(proposal.id);

      const persisted = await prismaSingleton.proposal.findUnique({
        where: { id: proposal.id },
      });
      expect(persisted?.status).toBe("SENT");

      const emails = await prismaSingleton.sentEmail.findMany({
        where: { proposalId: proposal.id },
      });
      expect(emails).toHaveLength(1);
    });

    it("sends to the member's email address", async () => {
      const { member, reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await proposalService.addItemToProposal(proposal.id, {
        category: "EXCURSIONS",
        title: "City Tour",
        description: "Old town walk",
        scheduledAt: "2026-03-17T09:00:00.000Z",
        price: 90,
      });

      const result = await proposalService.sendProposal(proposal.id);

      expect(result.email.toEmail).toBe(member.email);
    });

    it("throws 400 when proposal has no items", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });

      await expect(proposalService.sendProposal(proposal.id)).rejects.toMatchObject({
        status: 400,
      });
    });

    it("throws 409 when proposal is already SENT", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "SENT" },
      });

      await expect(proposalService.sendProposal(proposal.id)).rejects.toMatchObject({
        status: 409,
      });
    });

    it("throws 409 when proposal is APPROVED", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await proposalService.createProposal({
        reservationId: reservation.id,
      });
      await prismaSingleton.proposal.update({
        where: { id: proposal.id },
        data: { status: "APPROVED" },
      });

      await expect(proposalService.sendProposal(proposal.id)).rejects.toMatchObject({
        status: 409,
      });
    });

    it("throws 404 when proposal does not exist", async () => {
      await expect(
        proposalService.sendProposal("00000000-0000-0000-0000-000000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
