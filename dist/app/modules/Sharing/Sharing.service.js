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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharingServices = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const OID = /^[a-f0-9]{24}$/i;
/** Keep only well-formed ObjectId strings so a bad id can't blow up the write. */
const sanitizeIds = (arr) => Array.isArray(arr)
    ? arr.map(x => (x !== null && x !== void 0 ? x : '').toString()).filter(x => OID.test(x))
    : [];
const asString = (v) => v == null ? null : JSON.stringify(v);
/** Save my grant lists + latest summaries. A summary is only kept when at least
 *  one viewer is granted that category (extra privacy guard). */
const upsertSettings = (ownerId, body) => __awaiter(void 0, void 0, void 0, function* () {
    const nutritionViewerIds = sanitizeIds(body === null || body === void 0 ? void 0 : body.nutritionViewerIds);
    const workoutViewerIds = sanitizeIds(body === null || body === void 0 ? void 0 : body.workoutViewerIds);
    const data = {
        nutritionViewerIds,
        workoutViewerIds,
        nutritionSummary: nutritionViewerIds.length
            ? asString(body === null || body === void 0 ? void 0 : body.nutritionSummary)
            : null,
        workoutSummary: workoutViewerIds.length
            ? asString(body === null || body === void 0 ? void 0 : body.workoutSummary)
            : null,
    };
    yield prisma.sharingProfile.upsert({
        where: { ownerId },
        create: Object.assign({ ownerId }, data),
        update: data,
    });
    return { ok: true };
});
/** What [ownerId] shares with [viewerId] — only the granted sections. */
const getSummaryFor = (viewerId, ownerId) => __awaiter(void 0, void 0, void 0, function* () {
    const empty = { nutrition: null, workout: null };
    if (!ownerId || !OID.test(ownerId))
        return empty;
    const p = yield prisma.sharingProfile.findUnique({ where: { ownerId } });
    if (!p)
        return empty;
    const parse = (s) => {
        if (!s)
            return null;
        try {
            return JSON.parse(s);
        }
        catch (_a) {
            return null;
        }
    };
    return {
        nutrition: p.nutritionViewerIds.includes(viewerId)
            ? parse(p.nutritionSummary)
            : null,
        workout: p.workoutViewerIds.includes(viewerId)
            ? parse(p.workoutSummary)
            : null,
    };
});
exports.SharingServices = { upsertSettings, getSummaryFor };
