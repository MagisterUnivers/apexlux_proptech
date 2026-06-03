import { prismaSingleton } from "@/client/prisma";
import { AppError } from "@/errors/app-error";
import { logger } from "@/utils/logger";

const SERVICE_NAME = "ReservationService";

class ReservationService {
  public async getActiveReservation() {
    logger.info(SERVICE_NAME, "🔄 Fetching active reservation");

    const reservation = await prismaSingleton.reservation.findFirst({
      include: { member: true },
      orderBy: { arrivalDate: "asc" },
    });

    if (!reservation) {
      throw new AppError(404, "404", "No reservation found");
    }

    logger.info(SERVICE_NAME, "✅ Reservation fetched", {
      id: reservation.id,
      villa: reservation.villa,
    });

    return reservation;
  }

  public async getReservationById(id: string) {
    logger.info(SERVICE_NAME, "🔄 Fetching reservation by id", { id });

    const reservation = await prismaSingleton.reservation.findUnique({
      where: { id },
      include: {
        member: true,
        proposals: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!reservation) {
      throw new AppError(404, "404", "Reservation not found");
    }

    logger.info(SERVICE_NAME, "✅ Reservation fetched", { id });
    return reservation;
  }
}

export const reservationService = new ReservationService();
