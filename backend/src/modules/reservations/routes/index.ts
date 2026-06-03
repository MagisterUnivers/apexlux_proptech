import { Router } from "express";
import { reservationController } from "@/modules/reservations/controllers/reservation.controller";

const reservationRouter = Router();

reservationRouter.get("/", reservationController.getActiveReservation);
reservationRouter.get("/:id", reservationController.getReservationById);

export default reservationRouter;
