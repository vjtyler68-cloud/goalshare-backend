import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { LeadsServices } from './Leads.service';

const getMyLeads = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadsServices.getMyLeads(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved leads',
    data: result,
  });
});

const createLead = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadsServices.createLead(req.user.id, req.body);
  sendResponse(res, {
    statusCode: result ? httpStatus.CREATED : httpStatus.BAD_REQUEST,
    success: !!result,
    message: result ? 'Successfully created lead' : 'Lead name is required',
    data: result,
  });
});

const updateLead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeadsServices.updateLead(req.user.id, id, req.body);
  sendResponse(res, {
    statusCode: result ? httpStatus.OK : httpStatus.NOT_FOUND,
    success: !!result,
    message: result ? 'Successfully updated lead' : 'Lead not found',
    data: result,
  });
});

const deleteLead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LeadsServices.deleteLead(req.user.id, id);
  sendResponse(res, {
    statusCode: result ? httpStatus.OK : httpStatus.NOT_FOUND,
    success: !!result,
    message: result ? 'Successfully deleted lead' : 'Lead not found',
    data: result,
  });
});

const syncLeads = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadsServices.syncLeads(req.user.id, req.body);
  sendResponse(res, {
    statusCode: result ? httpStatus.OK : httpStatus.BAD_REQUEST,
    success: !!result,
    message: result
      ? 'Successfully synced leads'
      : 'Body must be an array of leads (or {"leads": [...]})',
    data: result,
  });
});

export const LeadsController = {
  getMyLeads,
  createLead,
  updateLead,
  deleteLead,
  syncLeads,
};
