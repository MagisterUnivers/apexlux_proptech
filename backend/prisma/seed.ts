import { PrismaClient, ProposalStatus, ItemCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ApexLux database...");

  await prisma.sentEmail.deleteMany();
  await prisma.proposalItem.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.member.deleteMany();

  const member = await prisma.member.create({
    data: {
      name: "James Whitfield",
      email: "james.whitfield@exclusive-resorts.com",
    },
  });
  console.log("✓ Member: James Whitfield");

  const reservation = await prisma.reservation.create({
    data: {
      memberId: member.id,
      destination: "Punta Mita, Mexico",
      villa: "Villa Punta Mita",
      arrivalDate: new Date("2025-03-15T14:00:00.000Z"),
      departureDate: new Date("2025-03-22T11:00:00.000Z"),
    },
  });
  console.log("✓ Reservation: Villa Punta Mita, Mar 15–22");

  // 1. DRAFT — unfinished, no send yet
  await prisma.proposal.create({
    data: {
      reservationId: reservation.id,
      status: ProposalStatus.DRAFT,
      notes: "Work in progress — adding items for James.",
      items: {
        create: [
          {
            category: ItemCategory.ACTIVITIES,
            title: "Surf Lesson at La Lancha",
            description:
              "Private 2-hour surf lesson with certified instructor at La Lancha break — perfect for intermediate surfers.",
            scheduledAt: new Date("2025-03-16T09:00:00.000Z"),
            price: 150,
          },
          {
            category: ItemCategory.TRANSPORT,
            title: "Airport Transfer — PVR to Villa",
            description:
              "Private SUV transfer from Puerto Vallarta International Airport directly to Villa Punta Mita.",
            scheduledAt: new Date("2025-03-15T14:30:00.000Z"),
            price: 180,
          },
        ],
      },
    },
  });
  console.log("✓ Proposal 1: DRAFT");

  // 2. SENT — waiting for member approval
  const sentProposal = await prisma.proposal.create({
    data: {
      reservationId: reservation.id,
      status: ProposalStatus.SENT,
      sentAt: new Date("2025-03-01T10:00:00.000Z"),
      notes:
        "James, we've curated a selection of experiences tailored to your stay. Looking forward to your approval!",
      items: {
        create: [
          {
            category: ItemCategory.DINING,
            title: "Private Chef Dinner — Beachfront",
            description:
              "Exclusive 5-course dinner prepared by Chef Marco Reyes on the private beach terrace. Wine pairing included.",
            scheduledAt: new Date("2025-03-15T19:00:00.000Z"),
            price: 450,
          },
          {
            category: ItemCategory.WELLNESS,
            title: "Deep Tissue Massage — 90 min",
            description:
              "In-villa therapeutic massage by a certified therapist. Hot stone add-on available upon request.",
            scheduledAt: new Date("2025-03-18T10:00:00.000Z"),
            price: 280,
          },
          {
            category: ItemCategory.EXCURSIONS,
            title: "Whale Watching Charter",
            description:
              "4-hour private boat charter during peak humpback whale season. Naturalist guide included, snacks and drinks provided.",
            scheduledAt: new Date("2025-03-20T07:00:00.000Z"),
            price: 320,
          },
        ],
      },
    },
  });

  await prisma.sentEmail.create({
    data: {
      proposalId: sentProposal.id,
      toEmail: member.email,
      sentAt: new Date("2025-03-01T10:00:00.000Z"),
      bodyPreview:
        "Dear James, your personalized itinerary for Villa Punta Mita (Mar 15–22) is ready for review. Total: $1,050. Click to view and approve.",
    },
  });
  console.log("✓ Proposal 2: SENT");

  // 3. APPROVED — member approved, pending payment
  await prisma.proposal.create({
    data: {
      reservationId: reservation.id,
      status: ProposalStatus.APPROVED,
      sentAt: new Date("2025-02-20T09:00:00.000Z"),
      notes: "A wellness-focused retreat experience for your week in paradise.",
      items: {
        create: [
          {
            category: ItemCategory.WELLNESS,
            title: "Sunrise Yoga Session",
            description:
              "Private oceanfront yoga session at sunrise with certified instructor. Meditation and breathwork included.",
            scheduledAt: new Date("2025-03-16T06:30:00.000Z"),
            price: 120,
          },
          {
            category: ItemCategory.EXPERIENCES,
            title: "Sunset Cocktails — Rooftop Terrace",
            description:
              "Curated artisanal cocktail experience at golden hour. Mixologist on site, premium spirits, canapés included.",
            scheduledAt: new Date("2025-03-17T18:30:00.000Z"),
            price: 180,
          },
          {
            category: ItemCategory.DINING,
            title: "Restaurant Reservation — El Barco",
            description:
              "Table for 2 at El Barco, Punta Mita's premier seafood restaurant. Priority seating with ocean view.",
            scheduledAt: new Date("2025-03-19T20:00:00.000Z"),
            price: 300,
          },
        ],
      },
    },
  });
  console.log("✓ Proposal 3: APPROVED");

  // 4. PAID — fully confirmed
  await prisma.proposal.create({
    data: {
      reservationId: reservation.id,
      status: ProposalStatus.PAID,
      sentAt: new Date("2025-02-10T11:00:00.000Z"),
      notes:
        "Your adventure-packed week is confirmed and locked in. See you at the villa!",
      items: {
        create: [
          {
            category: ItemCategory.EXCURSIONS,
            title: "Private Sailing Charter — Full Day",
            description:
              "8-hour luxury sailing yacht charter around Banderas Bay. Crew of 3, gourmet lunch, snorkeling gear included.",
            scheduledAt: new Date("2025-03-18T09:00:00.000Z"),
            price: 800,
          },
          {
            category: ItemCategory.EXPERIENCES,
            title: "Bonfire on the Beach",
            description:
              "Private beachside bonfire with live acoustic guitarist, s'mores station, and premium mezcal selection.",
            scheduledAt: new Date("2025-03-21T20:00:00.000Z"),
            price: 350,
          },
          {
            category: ItemCategory.TRANSPORT,
            title: "Helicopter Transfer — Return to PVR",
            description:
              "Scenic 15-minute helicopter flight from Punta Mita to Puerto Vallarta International Airport. Luggage included.",
            scheduledAt: new Date("2025-03-22T09:00:00.000Z"),
            price: 1200,
          },
          {
            category: ItemCategory.ACTIVITIES,
            title: "ATV Mountain Tour",
            description:
              "3-hour guided ATV excursion through Sierra Madre foothills with panoramic Pacific views. Helmet and gear provided.",
            scheduledAt: new Date("2025-03-17T14:00:00.000Z"),
            price: 200,
          },
        ],
      },
    },
  });
  console.log("✓ Proposal 4: PAID");

  // 5. SENT — another sent proposal waiting approval
  const sentProposal2 = await prisma.proposal.create({
    data: {
      reservationId: reservation.id,
      status: ProposalStatus.SENT,
      sentAt: new Date("2025-03-03T14:00:00.000Z"),
      notes:
        "A cultural immersion and sensory experience curated especially for you.",
      items: {
        create: [
          {
            category: ItemCategory.EXPERIENCES,
            title: "Premium Tequila Tasting",
            description:
              "Private tasting of 8 premium and ultra-premium tequilas with a certified agave sommelier. Paired snacks included.",
            scheduledAt: new Date("2025-03-17T17:00:00.000Z"),
            price: 150,
          },
          {
            category: ItemCategory.EXCURSIONS,
            title: "Cultural Tour — Sayulita Village",
            description:
              "Half-day guided tour of Sayulita's art galleries, local markets, and street food scene. Private driver and guide.",
            scheduledAt: new Date("2025-03-19T10:00:00.000Z"),
            price: 250,
          },
          {
            category: ItemCategory.WELLNESS,
            title: "Hot Stone & Aromatherapy Massage",
            description:
              "90-minute luxury spa treatment combining heated basalt stones with aromatherapy oils. In-villa setting.",
            scheduledAt: new Date("2025-03-20T11:00:00.000Z"),
            price: 180,
          },
        ],
      },
    },
  });

  await prisma.sentEmail.create({
    data: {
      proposalId: sentProposal2.id,
      toEmail: member.email,
      sentAt: new Date("2025-03-03T14:00:00.000Z"),
      bodyPreview:
        "Dear James, a curated cultural experience itinerary for your stay at Villa Punta Mita is ready. Total: $580. Tap to review.",
    },
  });
  console.log("✓ Proposal 5: SENT");

  // 6. SENT — day-grouping test: 3 items on Mar 16, 1 item on Mar 18
  const sentProposal3 = await prisma.proposal.create({
    data: {
      reservationId: reservation.id,
      status: ProposalStatus.SENT,
      sentAt: new Date("2025-03-05T09:00:00.000Z"),
      notes: "Full-day Sunday plan + mid-week excursion for James.",
      items: {
        create: [
          {
            category: ItemCategory.ACTIVITIES,
            title: "Surf Lesson — La Lancha",
            description:
              "Two-hour private surf lesson at La Lancha beach break with a certified ISA instructor. Board and wetsuit provided.",
            scheduledAt: new Date("2025-03-16T08:00:00.000Z"),
            price: 150,
          },
          {
            category: ItemCategory.DINING,
            title: "Beachside Ceviche Lunch",
            description:
              "Casual open-air lunch at La Casita del Mar. Chef-prepared ceviche tasting menu, fresh agua fresca, and ocean views.",
            scheduledAt: new Date("2025-03-16T13:00:00.000Z"),
            price: 120,
          },
          {
            category: ItemCategory.EXPERIENCES,
            title: "Sunset Tequila Tasting — Ocean Terrace",
            description:
              "Private agave sommelier-led tasting of five premium tequilas as the sun sets over Banderas Bay. Paired bites included.",
            scheduledAt: new Date("2025-03-16T18:30:00.000Z"),
            price: 175,
          },
          {
            category: ItemCategory.EXCURSIONS,
            title: "Marietas Islands Snorkel Tour",
            description:
              "Full-morning guided snorkel excursion to the UNESCO-protected Marietas Islands. Private boat, gear, and guide included.",
            scheduledAt: new Date("2025-03-18T07:30:00.000Z"),
            price: 380,
          },
        ],
      },
    },
  });

  await prisma.sentEmail.create({
    data: {
      proposalId: sentProposal3.id,
      toEmail: member.email,
      sentAt: new Date("2025-03-05T09:00:00.000Z"),
      bodyPreview:
        "Dear James, a full Sunday itinerary plus a mid-week excursion for Villa Punta Mita is ready for your review. Total: $825.",
    },
  });
  console.log("✓ Proposal 6: SENT (grouping test — 3×Mar 16, 1×Mar 18)");

  console.log("\n✅ ApexLux seed complete.");
  console.log(`   Member: ${member.name} (${member.email})`);
  console.log(`   Reservation: ${reservation.villa}, ${reservation.destination}`);
  console.log(`   Proposals seeded: 6 (1 DRAFT, 3 SENT, 1 APPROVED, 1 PAID)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
