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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalServices = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// MyWhy Services
const createMyWhy = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { text } = req.body;
    const userId = req.user.id;
    if (!text) {
        return null;
    }
    const result = yield prisma.globalMyWhy.create({
        data: {
            text,
            userId,
        },
        select: {
            id: true,
            text: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return result;
});
const getAllMyWhy = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma.globalMyWhy.findMany({
        where: {
            userId,
        },
        select: {
            id: true,
            text: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    return result;
});
const getMyWhyById = (userId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma.globalMyWhy.findUnique({
        where: { id },
        select: {
            id: true,
            text: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
        },
    });
    if (result && result.userId === userId) {
        // Remove userId from response
        const { userId: _ } = result, cleanResult = __rest(result, ["userId"]);
        return cleanResult;
    }
    return null;
});
const deleteMyWhy = (userId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma.globalMyWhy.findUnique({
        where: { id },
        select: {
            userId: true,
        },
    });
    if (existing && existing.userId === userId) {
        yield prisma.globalMyWhy.delete({
            where: { id },
        });
        return { deleted: true };
    }
    return null;
});
// Affirmation Services
const createAffirmation = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { text } = req.body;
    const userId = req.user.id;
    if (!text) {
        return null;
    }
    const result = yield prisma.globalAffirmation.create({
        data: {
            text,
            userId,
        },
        select: {
            id: true,
            text: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return result;
});
const getAllAffirmation = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma.globalAffirmation.findMany({
        where: {
            userId,
        },
        select: {
            id: true,
            text: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    return result;
});
const getAffirmationById = (userId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma.globalAffirmation.findUnique({
        where: { id },
        select: {
            id: true,
            text: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
        },
    });
    if (result && result.userId === userId) {
        // Remove userId from response
        const { userId: _ } = result, cleanResult = __rest(result, ["userId"]);
        return cleanResult;
    }
    return null;
});
const deleteAffirmation = (userId, id) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield prisma.globalAffirmation.findUnique({
        where: { id },
        select: {
            userId: true,
        },
    });
    if (existing && existing.userId === userId) {
        yield prisma.globalAffirmation.delete({
            where: { id },
        });
        return { deleted: true };
    }
    return null;
});
exports.GlobalServices = {
    // MyWhy
    createMyWhy,
    getAllMyWhy,
    getMyWhyById,
    deleteMyWhy,
    // Affirmation
    createAffirmation,
    getAllAffirmation,
    getAffirmationById,
    deleteAffirmation,
};
