import { Response } from "express";
import { asyncHandler } from "@/middlewares/async-handler";
import {
  CreateProposalDto,
  CreateProposalItemDto,
  UpdateProposalStatusDto,
  UpdateProposalNotesDto,
} from "@/dto/proposal.dto";
import { proposalService } from "@/modules/proposals/services/proposal.service";
import { AuthenticatedRequest } from "@/types/itinerary";

class ProposalController {
  public createProposal = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const data: CreateProposalDto = req.body;
      const proposal = await proposalService.createProposal(data);
      res.status(201).json({ data: proposal });
    },
  );

  public getAllProposals = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const result = await proposalService.getAllProposals(page, limit);
      res.status(200).json(result);
    },
  );

  public getProposalById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const proposal = await proposalService.getProposalById(id);
      res.status(200).json({ data: proposal });
    },
  );

  public addItemToProposal = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const data: CreateProposalItemDto = req.body;
      const item = await proposalService.addItemToProposal(id, data);
      res.status(201).json({ data: item });
    },
  );

  public updateProposalStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const data: UpdateProposalStatusDto = req.body;
      const proposal = await proposalService.updateProposalStatus(id, data);
      res.status(200).json({ data: proposal });
    },
  );

  public removeItemFromProposal = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id, itemId } = req.params;
      await proposalService.removeItemFromProposal(id, itemId);
      res.status(204).send();
    },
  );

  public updateProposalNotes = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const data: UpdateProposalNotesDto = req.body;
      const proposal = await proposalService.updateProposalNotes(id, data);
      res.status(200).json({ data: proposal });
    },
  );

  public deleteProposal = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      await proposalService.deleteProposal(id);
      res.status(204).send();
    },
  );

  public sendProposal = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const result = await proposalService.sendProposal(id);
      res.status(200).json({ data: result });
    },
  );
}

export const proposalController = new ProposalController();
