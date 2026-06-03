import { Router } from "express";
import { proposalController } from "@/modules/proposals/controllers/proposal.controller";
import { validationMiddleware } from "@/middlewares/validation-handler";
import {
  CreateProposalSchema,
  CreateProposalItemSchema,
  UpdateProposalStatusSchema,
  UpdateProposalNotesSchema,
} from "@/modules/proposals/schemas/proposal-schema";

const proposalRouter = Router();

proposalRouter.get("/", proposalController.getAllProposals);
proposalRouter.get("/:id", proposalController.getProposalById);
proposalRouter.post(
  "/",
  validationMiddleware(CreateProposalSchema),
  proposalController.createProposal,
);
proposalRouter.patch(
  "/:id",
  validationMiddleware(UpdateProposalStatusSchema),
  proposalController.updateProposalStatus,
);
proposalRouter.post(
  "/:id/items",
  validationMiddleware(CreateProposalItemSchema),
  proposalController.addItemToProposal,
);
proposalRouter.delete("/:id/items/:itemId", proposalController.removeItemFromProposal);
proposalRouter.patch(
  "/:id/notes",
  validationMiddleware(UpdateProposalNotesSchema),
  proposalController.updateProposalNotes,
);
proposalRouter.delete("/:id", proposalController.deleteProposal);
proposalRouter.post("/:id/send", proposalController.sendProposal);

export default proposalRouter;
