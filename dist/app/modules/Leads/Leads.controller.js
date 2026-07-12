"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsController = void 0;
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Leads_service_1 = require("./Leads.service");

const getMyLeads = (0, catchAsync_1.default)(async (req, res) => {
    const result = await Leads_service_1.LeadsServices.getMyLeads(req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Successfully retrieved leads',
        data: result,
    });
});

const createLead = (0, catchAsync_1.default)(async (req, res) => {
    const result = await Leads_service_1.LeadsServices.createLead(req.user.id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: result ? http_status_1.default.CREATED : http_status_1.default.BAD_REQUEST,
        success: !!result,
        message: result ? 'Successfully created lead' : 'Lead name is required',
        data: result,
    });
});

const updateLead = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await Leads_service_1.LeadsServices.updateLead(req.user.id, id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: result ? http_status_1.default.OK : http_status_1.default.NOT_FOUND,
        success: !!result,
        message: result ? 'Successfully updated lead' : 'Lead not found',
        data: result,
    });
});

const deleteLead = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await Leads_service_1.LeadsServices.deleteLead(req.user.id, id);
    (0, sendResponse_1.default)(res, {
        statusCode: result ? http_status_1.default.OK : http_status_1.default.NOT_FOUND,
        success: !!result,
        message: result ? 'Successfully deleted lead' : 'Lead not found',
        data: result,
    });
});

const syncLeads = (0, catchAsync_1.default)(async (req, res) => {
    const result = await Leads_service_1.LeadsServices.syncLeads(req.user.id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: result ? http_status_1.default.OK : http_status_1.default.BAD_REQUEST,
        success: !!result,
        message: result
            ? 'Successfully synced leads'
            : 'Body must be an array of leads (or {"leads": [...]})',
        data: result,
    });
});

exports.LeadsController = {
    getMyLeads,
    createLead,
    updateLead,
    deleteLead,
    syncLeads,
};
