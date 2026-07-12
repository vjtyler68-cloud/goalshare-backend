"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataServices = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();

/** Truncate any user-supplied string so crash reports stay tiny. */
const clip = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Everything we store server-side about one user, as a single JSON document.
 * Each section is fetched independently and failures degrade to an error
 * marker instead of failing the whole export.
 */
const exportMyData = async (userId) => {
    const section = async (fn) => {
        try {
            return await fn();
        }
        catch (_a) {
            return { error: 'section unavailable' };
        }
    };
    const [profile, leads, myWhy, affirmations, goals, visions, motivations, budgets] = await Promise.all([
        section(() => prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                role: true,
                status: true,
                profile: true,
                subscriptionStart: true,
                subscriptionEnd: true,
                createdAt: true,
                updatedAt: true,
            },
        })),
        section(() => prisma.lead.findMany({ where: { userId } })),
        section(() => prisma.globalMyWhy.findMany({ where: { userId } })),
        section(() => prisma.globalAffirmation.findMany({ where: { userId } })),
        section(() => prisma.goal.findMany({ where: { userId }, include: { clients: true } })),
        section(() => prisma.vision.findMany({ where: { userId } })),
        section(() => prisma.motivation.findMany({ where: { userId } })),
        section(() => prisma.budget.findMany({ where: { userId } })),
    ]);
    return {
        exportedAt: new Date().toISOString(),
        note: 'This is all data GoalShare stores on its servers for your account. ' +
            'Budget, nutrition, daily tasks, journal, Bible highlights and lead ' +
            'photos live on your device and are not included.',
        profile,
        leads,
        myWhy,
        affirmations,
        goals,
        visions,
        motivations,
        budgets,
    };
};

/** Store a crash report (fields hard-capped; sender may be anonymous). */
const reportCrash = async (body, userId) => {
    const error = clip(body === null || body === void 0 ? void 0 : body.error, 1000);
    if (!error.trim())
        return null;
    return prisma.crashReport.create({
        data: {
            error,
            stack: clip(body === null || body === void 0 ? void 0 : body.stack, 8000),
            appVersion: clip(body === null || body === void 0 ? void 0 : body.appVersion, 50),
            platform: clip(body === null || body === void 0 ? void 0 : body.platform, 50),
            userId: clip(userId, 50),
        },
        select: { id: true, createdAt: true },
    });
};

exports.DataServices = {
    exportMyData,
    reportCrash,
};
