import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";

import { setupSwagger } from "@/ui/swagger";
import proposalRouter from "@/modules/proposals/routes";
import reservationRouter from "@/modules/reservations/routes";
import { rateLimiter } from "@/middlewares/rate-limiter";
import { errorHandler } from "@/middlewares/error-handler";

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:8000",
    "http://localhost:5000",
  ],
  methods: ["GET", "PATCH", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(rateLimiter);
setupSwagger(app);

app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", server: "ApexLux API" });
});

app.use("/api/v1/reservations", reservationRouter);
app.use("/api/v1/proposals", proposalRouter);

app.use(errorHandler);

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

export default app;
