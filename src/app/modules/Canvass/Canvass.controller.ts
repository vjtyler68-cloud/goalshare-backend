import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CanvassServices } from './Canvass.service';

const createPin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.createPin(
    req.user.id,
    req.params.orgId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pin dropped',
    data: result,
  });
});

const listPins = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.listPins(req.user.id, req.params.orgId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pins',
    data: { pins: result },
  });
});

const updatePin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.updatePin(
    req.user.id,
    req.params.pinId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pin updated',
    data: result,
  });
});

const assignPin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.assignPin(
    req.user.id,
    req.params.pinId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Lead assigned',
    data: result,
  });
});

const deletePin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.deletePin(req.user.id, req.params.pinId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pin deleted',
    data: result,
  });
});

const createTerritory = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.createTerritory(
    req.user.id,
    req.params.orgId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Territory created',
    data: result,
  });
});

const listTerritories = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.listTerritories(
    req.user.id,
    req.params.orgId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Territories',
    data: { territories: result },
  });
});

const updateTerritory = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.updateTerritory(
    req.user.id,
    req.params.territoryId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Territory updated',
    data: result,
  });
});

const deleteTerritory = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.deleteTerritory(
    req.user.id,
    req.params.territoryId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Territory deleted',
    data: result,
  });
});

const populateTerritory = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.populateTerritory(
    req.user.id,
    req.params.territoryId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Territory populated',
    data: result,
  });
});

const cancelTerritoryPopulation = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CanvassServices.cancelTerritoryPopulation(
      req.user.id,
      req.params.territoryId,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Territory population cancelled',
      data: result,
    });
  },
);

const enrich = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.enrichAddress(
    req.user.id,
    req.params.orgId,
    (req.query.address as string) || '',
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Property detail',
    data: result,
  });
});

const enrichPin = catchAsync(async (req: Request, res: Response) => {
  const estimate = req.query.estimate === 'true' || req.query.estimate === '1';
  const result = await CanvassServices.enrichPin(
    req.user.id,
    req.params.pinId,
    estimate,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Property detail',
    data: result,
  });
});

const seedArea = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.seedArea(
    req.user.id,
    req.params.orgId,
    req.body ?? {},
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Homes loaded',
    data: result,
  });
});

const contactPin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.contactPin(
    req.user.id,
    req.params.pinId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Contact',
    data: result,
  });
});

const solarPin = catchAsync(async (req: Request, res: Response) => {
  const result = await CanvassServices.solarPin(req.user.id, req.params.pinId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Solar potential',
    data: result,
  });
});

export const CanvassControllers = {
  createPin,
  listPins,
  updatePin,
  assignPin,
  deletePin,
  createTerritory,
  listTerritories,
  updateTerritory,
  deleteTerritory,
  populateTerritory,
  cancelTerritoryPopulation,
  enrich,
  enrichPin,
  seedArea,
  contactPin,
  solarPin,
};
