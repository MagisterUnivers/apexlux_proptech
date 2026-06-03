import "dotenv/config";
import request from "supertest";
import app from "@/app";
import { prismaSingleton } from "@/client/prisma";

const randomSuffix = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Test data helpers ────────────────────────────────────────────────────────

const createTestMember = () =>
  prismaSingleton.member.create({
    data: {
      name: `TEST_MEMBER_${randomSuffix()}`,
      email: `test.${randomSuffix()}@apexlux-test.com`,
    },
  });

const createTestReservation = (memberId: string, arrivalDate = new Date("2026-03-15")) =>
  prismaSingleton.reservation.create({
    data: {
      memberId,
      destination: "Test Destination",
      villa: "Test Villa",
      arrivalDate,
      departureDate: new Date("2026-03-22"),
    },
  });

const cleanupTestData = async () => {
  await prismaSingleton.member.deleteMany({
    where: { name: { startsWith: "TEST_MEMBER_" } },
  });
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("Reservations API", () => {
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

  // ─── GET /api/v1/reservations ───────────────────────────────────────────────

  describe("GET /api/v1/reservations", () => {
    it("returns 200 with reservation wrapped in data key", async () => {
      // Seed always has one reservation (James Whitfield)
      const res = await request(app).get("/api/v1/reservations");

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeTruthy();
    });

    it("response includes member nested inside reservation", async () => {
      const res = await request(app).get("/api/v1/reservations");

      expect(res.body.data.member).toBeDefined();
      expect(res.body.data.member.name).toBeTruthy();
      expect(res.body.data.member.email).toBeTruthy();
    });

    it("response has villa, destination, arrivalDate, departureDate", async () => {
      const res = await request(app).get("/api/v1/reservations");

      expect(typeof res.body.data.villa).toBe("string");
      expect(typeof res.body.data.destination).toBe("string");
      expect(res.body.data.arrivalDate).toBeTruthy();
      expect(res.body.data.departureDate).toBeTruthy();
    });

    it("returns the reservation with earliest arrivalDate when multiple exist", async () => {
      const member = await createTestMember();
      // Create a reservation far in the past — should become the active one
      await createTestReservation(member.id, new Date("2020-01-01"));

      const res = await request(app).get("/api/v1/reservations");

      expect(res.status).toBe(200);
      expect(res.body.data.memberId).toBe(member.id);
    });
  });

  // ─── GET /api/v1/reservations/:id ──────────────────────────────────────────

  describe("GET /api/v1/reservations/:id", () => {
    it("returns 200 with reservation, member and proposals", async () => {
      const member = await createTestMember();
      const reservation = await createTestReservation(member.id);

      const res = await request(app).get(`/api/v1/reservations/${reservation.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(reservation.id);
      expect(res.body.data.member).toBeDefined();
      expect(Array.isArray(res.body.data.proposals)).toBe(true);
    });

    it("includes items nested inside proposals", async () => {
      const member = await createTestMember();
      const reservation = await createTestReservation(member.id);
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });
      await prismaSingleton.proposalItem.create({
        data: {
          proposalId: proposal.id,
          category: "ACTIVITIES",
          title: "Surf Lesson",
          description: "2h surf lesson",
          scheduledAt: new Date("2026-03-17T09:00:00.000Z"),
          price: 150,
        },
      });

      const res = await request(app).get(`/api/v1/reservations/${reservation.id}`);

      expect(res.body.data.proposals[0].items).toHaveLength(1);
      expect(res.body.data.proposals[0].items[0].title).toBe("Surf Lesson");
    });

    it("returns 404 for non-existent reservation", async () => {
      const res = await request(app).get(
        "/api/v1/reservations/00000000-0000-0000-0000-000000000000",
      );

      expect(res.status).toBe(404);
    });

    it("returns empty proposals array when reservation has no proposals", async () => {
      const member = await createTestMember();
      const reservation = await createTestReservation(member.id);

      const res = await request(app).get(`/api/v1/reservations/${reservation.id}`);

      expect(res.body.data.proposals).toEqual([]);
    });
  });
});
