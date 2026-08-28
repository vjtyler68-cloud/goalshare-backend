"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvassControllers = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const Canvass_service_1 = require("./Canvass.service");
const createPin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Canvass_service_1.CanvassServices.createPin(req.user.id, req.params.orgId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Pin dropped',
        data: result,
    });
}));
const listPins = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Canvass_service_1.CanvassServices.listPins(req.user.id, req.params.orgId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Pins',
        data: { pins: result },
    });
}));
const updatePin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Canvass_service_1.CanvassServices.updatePin(req.user.id, req.params.pinId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Pin updated',
        data: result,
    });
}));
const assignPin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Canvass_service_1.CanvassServices.assignPin(req.user.id, req.params.pinId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Lead assigned',
        data: result,
    });
}));
const deletePin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Canvass_service_1.CanvassServices.deletePin(req.user.id, req.params.pinId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Pin deleted',
        data: result,
    });
}));
const createTerritory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Canvass_service_1.CanvassServices.createTerritory(req.user.id, req.params.orgId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Territory created',
        data: result,
    });
}));
const listTerritories = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Canvass_service_1.CanvassServices.listTerritories(req.user.id, req.params.orgId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Territories',
        data: { territories: result },
    });
}));
const updateTerritory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Canvass_service_1.CanvassServices.updateTerritory(req.user.id, req.params.territoryId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Territory updated',
        data: result,
    });
}));
const deleteTerritory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Canvass_service_1.CanvassServices.deleteTerritory(req.user.id, req.params.territoryId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Territory deleted',
        data: result,
    });
}));
const populateTerritory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Canvass_service_1.CanvassServices.populateTerritory(req.user.id, req.params.territoryId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Territory populated',
        data: result,
    });
}));
const cancelTerritoryPopulation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Canvass_service_1.CanvassServices.cancelTerritoryPopulation(req.user.id, req.params.territoryId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Territory population cancelled',
        data: result,
    });
}));
const enrich = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Canvass_service_1.CanvassServices.enrichAddress(req.user.id, req.params.orgId, req.query.address || '');
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Property detail',
        data: result,
    });
}));
const enrichPin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const estimate = req.query.estimate === 'true' || req.query.estimate === '1';
    const result = yield Canvass_service_1.CanvassServices.enrichPin(req.user.id, req.params.pinId, estimate);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Property detail',
        data: result,
    });
}));
const seedArea = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const result = yield Canvass_service_1.CanvassServices.seedArea(req.user.id, req.params.orgId, (_a = req.body) !== null && _a !== void 0 ? _a : {});
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Homes loaded',
        data: result,
    });
}));
const contactPin = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Canvass_service_1.CanvassServices.contactPin(req.user.id, req.params.pinId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Contact',
        data: result,
    });
}));
exports.CanvassControllers = {
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
};
