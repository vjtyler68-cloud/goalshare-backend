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
exports.ensureApproved = void 0;
const prisma_1 = require("../utils/prisma");
const AppError_1 = __importDefault(require("../errors/AppError"));
const ensureApproved = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // assume req.user.id is set by earlier auth middleware after JWT verification
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId)
        return next(new AppError_1.default(401, 'Unauthorized'));
    const user = yield prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { isApproved: true, role: true },
    });
    if (!user)
        return next(new AppError_1.default(401, 'User not found'));
    // allow admin always
    if (user.role === 'ADMIN')
        return next();
    if (!user.isApproved) {
        return next(new AppError_1.default(403, 'Account not approved by admin yet'));
    }
    return next();
});
exports.ensureApproved = ensureApproved;
