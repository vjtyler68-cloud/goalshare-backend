import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Allowed pipeline stages. Anything else is coerced to 'New'. */
const LEAD_STATUSES = ['New', 'Contacted', 'Appointment', 'Won', 'Lost'];

const normalizeStatus = (status: unknown): string => {
  if (typeof status !== 'string') return 'New';
  const match = LEAD_STATUSES.find(
    s => s.toLowerCase() === status.trim().toLowerCase(),
  );
  return match ?? 'New';
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/** ISO-8601 string -> Date, else null (invalid/missing/explicit null). */
const asDateOrNull = (v: unknown): Date | null => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/** Fields the app may set. Ownership fields (id, userId) are never accepted. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pickLeadData = (body: any) => ({
  name: asString(body?.name).trim(),
  phone: asString(body?.phone).trim(),
  email: asString(body?.email).trim(),
  address: asString(body?.address).trim(),
  company: asString(body?.company).trim(),
  status: normalizeStatus(body?.status),
  notes: asString(body?.notes),
  reminderAt: asDateOrNull(body?.reminderAt),
});

const leadSelect = {
  id: true,
  clientId: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  company: true,
  status: true,
  notes: true,
  reminderAt: true,
  createdAt: true,
  updatedAt: true,
};

/** All leads owned by [userId], most recently updated first. */
const getMyLeads = async (userId: string) => {
  return prisma.lead.findMany({
    where: { userId },
    select: leadSelect,
    orderBy: { updatedAt: 'desc' },
  });
};

/**
 * Create one lead. Idempotent on (userId, clientId): if the phone retries a
 * create with the same clientId, the existing lead is returned instead of a
 * duplicate being made. The server always generates the real id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createLead = async (userId: string, body: any) => {
  const data = pickLeadData(body);
  if (!data.name) return null;

  const clientId = asString(body?.clientId).trim();
  if (clientId) {
    const existing = await prisma.lead.findFirst({
      where: { userId, clientId },
      select: leadSelect,
    });
    if (existing) return existing;
  }

  return prisma.lead.create({
    data: { ...data, clientId, userId },
    select: leadSelect,
  });
};

/** Update one lead. Only the owner's lead is ever touched (scoped lookup). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateLead = async (userId: string, id: string, body: any) => {
  const existing = await prisma.lead.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;

  // Partial update: only overwrite fields the app actually sent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (body?.name !== undefined) {
    const name = asString(body.name).trim();
    if (!name) return null; // a lead can never lose its name
    data.name = name;
  }
  if (body?.phone !== undefined) data.phone = asString(body.phone).trim();
  if (body?.email !== undefined) data.email = asString(body.email).trim();
  if (body?.address !== undefined) data.address = asString(body.address).trim();
  if (body?.company !== undefined) data.company = asString(body.company).trim();
  if (body?.status !== undefined) data.status = normalizeStatus(body.status);
  if (body?.notes !== undefined) data.notes = asString(body.notes);
  // reminderAt: explicit null clears the reminder; a string sets it.
  if ('reminderAt' in (body ?? {})) data.reminderAt = asDateOrNull(body.reminderAt);

  return prisma.lead.update({
    where: { id },
    data,
    select: leadSelect,
  });
};

/** Delete one lead (owner-scoped). */
const deleteLead = async (userId: string, id: string) => {
  const existing = await prisma.lead.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return null;
  await prisma.lead.delete({ where: { id } });
  return { deleted: true as const };
};

/**
 * Bulk upsert used once per device to push the phone's existing Hive leads to
 * the server. Match key is (userId, clientId); matches are updated, everything
 * else is created. The phone's original createdAt is honoured on create so
 * lead history isn't flattened to the sync date. Returns all saved leads.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncLeads = async (userId: string, rawLeads: any) => {
  const list = Array.isArray(rawLeads) ? rawLeads : rawLeads?.leads;
  if (!Array.isArray(list)) return null;

  // Safety cap — a single phone sync should never be anywhere near this.
  const capped = list.slice(0, 1000);

  const saved = [];
  for (const item of capped) {
    const data = pickLeadData(item);
    if (!data.name) continue; // skip unusable rows rather than failing the batch

    const clientId = asString(item?.clientId).trim();
    const existing = clientId
      ? await prisma.lead.findFirst({
          where: { userId, clientId },
          select: { id: true },
        })
      : null;

    if (existing) {
      saved.push(
        await prisma.lead.update({
          where: { id: existing.id },
          data,
          select: leadSelect,
        }),
      );
    } else {
      const createdAt = asDateOrNull(item?.createdAt);
      saved.push(
        await prisma.lead.create({
          data: {
            ...data,
            clientId,
            userId,
            ...(createdAt ? { createdAt } : {}),
          },
          select: leadSelect,
        }),
      );
    }
  }
  return saved;
};

export const LeadsServices = {
  getMyLeads,
  createLead,
  updateLead,
  deleteLead,
  syncLeads,
};
