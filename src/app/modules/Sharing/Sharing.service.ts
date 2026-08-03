import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OID = /^[a-f0-9]{24}$/i;

/** Keep only well-formed ObjectId strings so a bad id can't blow up the write. */
const sanitizeIds = (arr: unknown): string[] =>
  Array.isArray(arr)
    ? arr.map(x => (x ?? '').toString()).filter(x => OID.test(x))
    : [];

const asString = (v: unknown): string | null =>
  v == null ? null : JSON.stringify(v);

/** Save my grant lists + latest summaries. A summary is only kept when at least
 *  one viewer is granted that category (extra privacy guard). */
const upsertSettings = async (ownerId: string, body: any) => {
  const nutritionViewerIds = sanitizeIds(body?.nutritionViewerIds);
  const workoutViewerIds = sanitizeIds(body?.workoutViewerIds);
  const data = {
    nutritionViewerIds,
    workoutViewerIds,
    nutritionSummary: nutritionViewerIds.length
      ? asString(body?.nutritionSummary)
      : null,
    workoutSummary: workoutViewerIds.length
      ? asString(body?.workoutSummary)
      : null,
  };
  await prisma.sharingProfile.upsert({
    where: { ownerId },
    create: { ownerId, ...data },
    update: data,
  });
  return { ok: true };
};

/** What [ownerId] shares with [viewerId] — only the granted sections. */
const getSummaryFor = async (viewerId: string, ownerId: string) => {
  const empty = { nutrition: null as unknown, workout: null as unknown };
  if (!ownerId || !OID.test(ownerId)) return empty;
  const p = await prisma.sharingProfile.findUnique({ where: { ownerId } });
  if (!p) return empty;
  const parse = (s: string | null) => {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
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
};

export const SharingServices = { upsertSettings, getSummaryFor };
