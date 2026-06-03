import { Response } from "express";
import { asyncHandler } from "@/middlewares/async-handler";
import { reservationService } from "@/modules/reservations/services/reservation.service";
import { AuthenticatedRequest } from "@/types/itinerary";

class ReservationController {
  public getActiveReservation = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const reservation = await reservationService.getActiveReservation();
      res.status(200).json({ data: reservation });
    },
  );

  public getReservationById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const reservation = await reservationService.getReservationById(id);
      res.status(200).json({ data: reservation });
    },
  );
}

export const reservationController = new ReservationController();
