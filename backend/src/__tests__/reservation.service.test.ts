import "dotenv/config";
import { reservationService } from "@/modules/reservations/services/reservation.service";
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
      destination: "Test Punta Mita",
      villa: "Test Villa",
      arrivalDate: new Date("2026-03-15"),
      departureDate: new Date("2026-03-22"),
    },
  });

const cleanupTestData = async () => {
  await prismaSingleton.member.deleteMany({
    where: { name: { startsWith: "TEST_MEMBER_" } },
  });
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("ReservationService", () => {
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

  // ─── getActiveReservation ───────────────────────────────────────────────────

  describe("getActiveReservation", () => {
    it("returns a reservation with member included (seed data present)", async () => {
      // Seed always has at least one reservation (James Whitfield / Villa Punta Mita)
      const result = await reservationService.getActiveReservation();

      expect(result).toBeDefined();
      expect(result.id).toBeTruthy();
      expect(result.villa).toBeTruthy();
      expect(result.member).toBeDefined();
      expect(result.member?.name).toBeTruthy();
    });

    it("returns the reservation ordered earliest first", async () => {
      const member = await createTestMember();

      // Create a reservation in the past (should sort before seed reservation)
      await createTestReservation(member.id);
      await prismaSingleton.reservation.updateMany({
        where: { memberId: member.id },
        data: { arrivalDate: new Date("2020-01-01") },
      });

      const result = await reservationService.getActiveReservation();

      // Our 2020 reservation should now be first
      expect(result.memberId).toBe(member.id);
    });

    it("returns a reservation with all date fields as Date objects", async () => {
      const result = await reservationService.getActiveReservation();

      expect(result.arrivalDate).toBeInstanceOf(Date);
      expect(result.departureDate).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  // ─── getReservationById ─────────────────────────────────────────────────────

  describe("getReservationById", () => {
    it("returns reservation with member and proposals included", async () => {
      const member = await createTestMember();
      const reservation = await createTestReservation(member.id);

      const result = await reservationService.getReservationById(reservation.id);

      expect(result.id).toBe(reservation.id);
      expect(result.villa).toBe("Test Villa");
      expect(result.member).toBeDefined();
      expect(result.member?.name).toBe(member.name);
      expect(Array.isArray(result.proposals)).toBe(true);
    });

    it("includes proposals ordered by createdAt descending", async () => {
      const member = await createTestMember();
      const reservation = await createTestReservation(member.id);

      // Create two proposals manually
      const p1 = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });
      const p2 = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const result = await reservationService.getReservationById(reservation.id);

      expect(result.proposals).toHaveLength(2);
      // Most recent first (p2 created after p1)
      expect(result.proposals[0].id).toBe(p2.id);
      expect(result.proposals[1].id).toBe(p1.id);
    });

    it("returns proposals with items nested inside", async () => {
      const member = await createTestMember();
      const reservation = await createTestReservation(member.id);
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });
      await prismaSingleton.proposalItem.create({
        data: {
          proposalId: proposal.id,
          category: "DINING",
          title: "Beach Dinner",
          description: "Romantic dinner",
          scheduledAt: new Date("2026-03-16T19:00:00.000Z"),
          price: 450,
        },
      });

      const result = await reservationService.getReservationById(reservation.id);

      expect(result.proposals[0].items).toHaveLength(1);
      expect(result.proposals[0].items[0].title).toBe("Beach Dinner");
    });

    it("throws AppError 404 when reservation does not exist", async () => {
      await expect(
        reservationService.getReservationById("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(AppError);

      await expect(
        reservationService.getReservationById("00000000-0000-0000-0000-000000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("returns reservation destination and villa as strings", async () => {
      const member = await createTestMember();
      const reservation = await createTestReservation(member.id);

      const result = await reservationService.getReservationById(reservation.id);

      expect(typeof result.destination).toBe("string");
      expect(typeof result.villa).toBe("string");
    });
  });
});
