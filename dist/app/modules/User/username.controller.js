"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsernameControllers = void 0;
const client_1 = require("@prisma/client");
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const prisma = new client_1.PrismaClient();

/** lowercase, 3-20 chars, letters/digits/underscore/dot */
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

const normalize = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

/**
 * PUT /user/username — claim or change the caller's public handle.
 * Uniqueness is checked case-insensitively (handles are stored lowercase).
 */
const setUsername = (0, catchAsync_1.default)(async (req, res) => {
    var _a;
    const username = normalize((_a = req.body) === null || _a === void 0 ? void 0 : _a.username);
    if (!USERNAME_RE.test(username)) {
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.BAD_REQUEST,
            success: false,
            message: 'Username must be 3-20 characters: lowercase letters, numbers, _ or .',
            data: null,
        });
        return;
    }
    const taken = await prisma.user.findFirst({
        where: { username, id: { not: req.user.id } },
        select: { id: true },
    });
    if (taken) {
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.CONFLICT,
            success: false,
            message: 'That username is taken — try another.',
            data: null,
        });
        return;
    }
    const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: { username },
        select: { id: true, fullName: true, username: true, profile: true },
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Username saved',
        data: updated,
    });
});

/**
 * GET /user/search-users?q= — find people by username or name so reps can
 * follow teammates. Excludes deleted users; caps at 20 results.
 */
const searchUsers = (0, catchAsync_1.default)(async (req, res) => {
    var _a;
    const q = ((_a = req.query.q) !== null && _a !== undefined ? _a : '').toString().trim();
    if (q.length < 2) {
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: 'Type at least 2 characters to search',
            data: [],
        });
        return;
    }
    const users = await prisma.user.findMany({
        where: {
            isDeleted: false,
            OR: [
                { username: { contains: q.toLowerCase() } },
                { fullName: { contains: q, mode: 'insensitive' } },
            ],
        },
        select: { id: true, fullName: true, username: true, profile: true },
        take: 20,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Search results',
        data: users,
    });
});

exports.UsernameControllers = { setUsername, searchUsers };
