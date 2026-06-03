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
  await prismaSingleton.member.deleteMany({
    where: { name: { startsWith: "TEST_MEMBER_" } },
  });
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("Proposals API", () => {
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

  // ─── GET /api/v1/proposals ──────────────────────────────────────────────────

  describe("GET /api/v1/proposals", () => {
    it("returns 200 with data array and meta object", async () => {
      const res = await request(app).get("/api/v1/proposals");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it("respects ?limit= — data.length does not exceed the limit", async () => {
      const { reservation } = await createTestSetup();
      await Promise.all([
        prismaSingleton.proposal.create({ data: { reservationId: reservation.id } }),
        prismaSingleton.proposal.create({ data: { reservationId: reservation.id } }),
        prismaSingleton.proposal.create({ data: { reservationId: reservation.id } }),
      ]);

      const res = await request(app).get("/api/v1/proposals?limit=2");

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.limit).toBe(2);
    });

    it("clamps page to 1 when page=0 is passed", async () => {
      const res = await request(app).get("/api/v1/proposals?page=0");

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
    });

    it("clamps limit to 100 when limit=999 is passed", async () => {
      const res = await request(app).get("/api/v1/proposals?limit=999");

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(100);
    });

    it("each proposal has id, status, reservationId and items array", async () => {
      const { reservation } = await createTestSetup();
      await prismaSingleton.proposal.create({ data: { reservationId: reservation.id } });

      const res = await request(app).get("/api/v1/proposals");

      const mine = res.body.data.find(
        (p: { reservationId: string }) => p.reservationId === reservation.id,
      );
      expect(mine).toBeDefined();
      expect(mine.id).toBeTruthy();
      expect(mine.status).toBe("DRAFT");
      expect(Array.isArray(mine.items)).toBe(true);
    });
  });

  // ─── GET /api/v1/proposals/:id ──────────────────────────────────────────────

  describe("GET /api/v1/proposals/:id", () => {
    it("returns 200 with proposal wrapped in data key", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app).get(`/api/v1/proposals/${proposal.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(proposal.id);
      expect(res.body.data.status).toBe("DRAFT");
      expect(res.body.data.reservation).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(Array.isArray(res.body.data.sentEmails)).toBe(true);
    });

    it("returns 404 for non-existent proposal", async () => {
      const res = await request(app).get(
        "/api/v1/proposals/00000000-0000-0000-0000-000000000000",
      );

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/proposals ─────────────────────────────────────────────────

  describe("POST /api/v1/proposals", () => {
    it("returns 201 with created DRAFT proposal", async () => {
      const { reservation } = await createTestSetup();

      const res = await request(app)
        .post("/api/v1/proposals")
        .send({ reservationId: reservation.id, notes: "VIP member" });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("DRAFT");
      expect(res.body.data.reservationId).toBe(reservation.id);
      expect(res.body.data.notes).toBe("VIP member");
    });

    it("returns 400 when reservationId is missing", async () => {
      const res = await request(app).post("/api/v1/proposals").send({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("returns 400 when reservationId is empty string", async () => {
      const res = await request(app)
        .post("/api/v1/proposals")
        .send({ reservationId: "" });

      expect(res.status).toBe(400);
    });

    it("returns 404 when reservation does not exist", async () => {
      const res = await request(app)
        .post("/api/v1/proposals")
        .send({ reservationId: "00000000-0000-0000-0000-000000000000" });

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /api/v1/proposals/:id ───────────────────────────────────────────

  describe("PATCH /api/v1/proposals/:id", () => {
    it("returns 200 with updated status", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}`)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("APPROVED");
    });

    it("returns 400 for invalid status value", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}`)
        .send({ status: "INVALID_STATUS" });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("returns 404 for non-existent proposal", async () => {
      const res = await request(app)
        .patch("/api/v1/proposals/00000000-0000-0000-0000-000000000000")
        .send({ status: "SENT" });

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/proposals/:id/items ──────────────────────────────────────

  describe("POST /api/v1/proposals/:id/items", () => {
    const validItem = {
      category: "DINING",
      title: "Private Beach Dinner",
      description: "Romantic dinner on the beach",
      scheduledAt: "2026-03-16T19:00:00.000Z",
      price: 450,
    };

    it("returns 201 with created item", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app)
        .post(`/api/v1/proposals/${proposal.id}/items`)
        .send(validItem);

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe("Private Beach Dinner");
      expect(res.body.data.price).toBe(450);
      expect(res.body.data.category).toBe("DINING");
    });

    it("returns 400 for invalid category", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app)
        .post(`/api/v1/proposals/${proposal.id}/items`)
        .send({ ...validItem, category: "INVALID" });

      expect(res.status).toBe(400);
    });

    it("returns 400 for negative price", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app)
        .post(`/api/v1/proposals/${proposal.id}/items`)
        .send({ ...validItem, price: -100 });

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid scheduledAt format", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app)
        .post(`/api/v1/proposals/${proposal.id}/items`)
        .send({ ...validItem, scheduledAt: "not-a-date" });

      expect(res.status).toBe(400);
    });

    it("returns 409 when adding to a non-DRAFT proposal", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id, status: "APPROVED" },
      });

      const res = await request(app)
        .post(`/api/v1/proposals/${proposal.id}/items`)
        .send(validItem);

      expect(res.status).toBe(409);
    });
  });

  // ─── DELETE /api/v1/proposals/:id/items/:itemId ─────────────────────────────

  describe("DELETE /api/v1/proposals/:id/items/:itemId", () => {
    it("returns 204 and removes the item from DB", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });
      const item = await prismaSingleton.proposalItem.create({
        data: {
          proposalId: proposal.id,
          category: "WELLNESS",
          title: "Spa",
          description: "Full body massage",
          scheduledAt: new Date("2026-03-17T10:00:00.000Z"),
          price: 200,
        },
      });

      const res = await request(app).delete(
        `/api/v1/proposals/${proposal.id}/items/${item.id}`,
      );

      expect(res.status).toBe(204);

      const deleted = await prismaSingleton.proposalItem.findUnique({
        where: { id: item.id },
      });
      expect(deleted).toBeNull();
    });

    it("returns 409 when proposal is not DRAFT", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id, status: "SENT" },
      });
      const item = await prismaSingleton.proposalItem.create({
        data: {
          proposalId: proposal.id,
          category: "DINING",
          title: "Dinner",
          description: "desc",
          scheduledAt: new Date(),
          price: 100,
        },
      });

      const res = await request(app).delete(
        `/api/v1/proposals/${proposal.id}/items/${item.id}`,
      );

      expect(res.status).toBe(409);
    });
  });

  // ─── PATCH /api/v1/proposals/:id/notes ─────────────────────────────────────

  describe("PATCH /api/v1/proposals/:id/notes", () => {
    it("returns 200 with updated notes", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}/notes`)
        .send({ notes: "Client is allergic to shellfish" });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBe("Client is allergic to shellfish");
    });

    it("returns 200 and clears notes when null is sent", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id, notes: "Old note" },
      });

      const res = await request(app)
        .patch(`/api/v1/proposals/${proposal.id}/notes`)
        .send({ notes: null });

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toBeNull();
    });
  });

  // ─── DELETE /api/v1/proposals/:id ──────────────────────────────────────────

  describe("DELETE /api/v1/proposals/:id", () => {
    it("returns 204 and removes proposal from DB", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app).delete(`/api/v1/proposals/${proposal.id}`);

      expect(res.status).toBe(204);

      const deleted = await prismaSingleton.proposal.findUnique({
        where: { id: proposal.id },
      });
      expect(deleted).toBeNull();
    });

    it("returns 409 when trying to delete an APPROVED proposal", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id, status: "APPROVED" },
      });

      const res = await request(app).delete(`/api/v1/proposals/${proposal.id}`);

      expect(res.status).toBe(409);
    });

    it("returns 404 for non-existent proposal", async () => {
      const res = await request(app).delete(
        "/api/v1/proposals/00000000-0000-0000-0000-000000000000",
      );

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/v1/proposals/:id/send ───────────────────────────────────────

  describe("POST /api/v1/proposals/:id/send", () => {
    it("returns 200, transitions to SENT, creates SentEmail", async () => {
      const { member, reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });
      await prismaSingleton.proposalItem.create({
        data: {
          proposalId: proposal.id,
          category: "DINING",
          title: "Sunset Dinner",
          description: "On the terrace",
          scheduledAt: new Date("2026-03-16T19:00:00.000Z"),
          price: 380,
        },
      });

      const res = await request(app).post(`/api/v1/proposals/${proposal.id}/send`);

      expect(res.status).toBe(200);
      expect(res.body.data.proposal.status).toBe("SENT");
      expect(res.body.data.email.toEmail).toBe(member.email);
    });

    it("returns 400 when proposal has no items", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id },
      });

      const res = await request(app).post(`/api/v1/proposals/${proposal.id}/send`);

      expect(res.status).toBe(400);
    });

    it("returns 409 when proposal is already SENT", async () => {
      const { reservation } = await createTestSetup();
      const proposal = await prismaSingleton.proposal.create({
        data: { reservationId: reservation.id, status: "SENT" },
      });

      const res = await request(app).post(`/api/v1/proposals/${proposal.id}/send`);

      expect(res.status).toBe(409);
    });
  });
});
