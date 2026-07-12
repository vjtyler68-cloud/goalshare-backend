"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRoutes = void 0;
const express_1 = __importDefault(require("express"));
const Data_controller_1 = require("./Data.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = express_1.default.Router();

// Everything GoalShare stores server-side about the calling user, as one JSON
// document (GDPR/CCPA-style export; also linked from the privacy policy).
router.get('/export', (0, auth_1.default)('ANY'), Data_controller_1.DataController.exportMyData);

// Crash telemetry. Deliberately unauthenticated: crashes can happen before
// login. The service hard-caps field sizes so it can't be used to store junk.
router.post('/crash', Data_controller_1.DataController.reportCrash);

exports.DataRoutes = router;
