import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Truncate any user-supplied string so crash reports stay tiny. */
const clip = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.slice(0, max) : '';

/**
 * Everything we store server-side about one user, as a single JSON document.
 * Each section is fetched independently and failures degrade to an error
 * marker instead of failing the whole export.
 */
const exportMyData = async (userId: string) => {
  const section = async <T>(fn: () => Promise<T>): Promise<T | { error: string }> => {
    try {
      return await fn();
    } catch {
      return { error: 'section unavailable' };
    }
  };

  const [profile, leads, myWhy, affirmations, goals, visions, motivations, budgets] =
    await Promise.all([
      section(() =>
        prisma.user.findUnique({
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
        }),
      ),
      section(() => prisma.lead.findMany({ where: { userId } })),
      section(() => prisma.globalMyWhy.findMany({ where: { userId } })),
      section(() => prisma.globalAffirmation.findMany({ where: { userId } })),
      section(() =>
        prisma.goal.findMany({ where: { userId }, include: { clients: true } }),
      ),
      section(() => prisma.vision.findMany({ where: { userId } })),
      section(() => prisma.motivation.findMany({ where: { userId } })),
      section(() => prisma.budget.findMany({ where: { userId } })),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    note:
      'This is all data GoalShare stores on its servers for your account. ' +
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reportCrash = async (body: any, userId: string) => {
  const error = clip(body?.error, 1000);
  if (!error.trim()) return null;
  return prisma.crashReport.create({
    data: {
      error,
      stack: clip(body?.stack, 8000),
      appVersion: clip(body?.appVersion, 50),
      platform: clip(body?.platform, 50),
      userId: clip(userId, 50),
    },
    select: { id: true, createdAt: true },
  });
};

export const DataServices = {
  exportMyData,
  reportCrash,
};
