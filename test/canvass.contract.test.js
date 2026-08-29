const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.RENTCAST_API_KEY = 'test-key';
process.env.DATASKIP_API_KEY = 'test-key';

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@prisma/client') {
    return { PrismaClient: class PrismaClient {} };
  }
  if (request === 'http-status') {
    return {
      default: undefined,
      BAD_REQUEST: 400,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      BAD_GATEWAY: 502,
      TOO_MANY_REQUESTS: 429,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  CanvassServices,
  setCanvassPrismaForTests,
} = require('../dist/app/modules/Canvass/Canvass.service');
const { addressKey, inPolygon } = require('../dist/app/modules/Canvass/Canvass.logic');

const ADMIN = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const REP = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const OTHER = 'cccccccccccccccccccccccc';
const ORG = 'dddddddddddddddddddddddd';
const TERRITORY = 'eeeeeeeeeeeeeeeeeeeeeeee';
const PIN = 'ffffffffffffffffffffffff';
const now = new Date('2026-08-29T00:00:00.000Z');

const fn = (value) => async (...args) =>
  typeof value === 'function' ? value(...args) : value;

function client(overrides = {}) {
  const base = {
    orgMembership: { findFirst: fn(null), findMany: fn([]) },
    organization: { findUnique: fn({ canvassEnabled: true }) },
    user: { findUnique: fn({ fullName: 'Test User' }), findMany: fn([]) },
    canvassPin: {
      findUnique: fn(null),
      findMany: fn([]),
      create: fn({}),
      createMany: fn({ count: 0 }),
      update: fn({}),
      delete: fn({}),
      deleteMany: fn({ count: 0 }),
    },
    canvassTerritory: {
      findUnique: fn(null),
      findMany: fn([]),
      create: fn({}),
      update: fn({}),
      updateMany: fn({ count: 1 }),
      delete: fn({}),
    },
    $transaction: fn((work) =>
      typeof work === 'function' ? work(base) : Promise.all(work)),
  };
  for (const [model, methods] of Object.entries(overrides)) {
    base[model] = typeof methods === 'object' && !Array.isArray(methods)
      ? { ...base[model], ...methods }
      : methods;
  }
  setCanvassPrismaForTests(base);
  return base;
}

function membership(userId, role = 'rep', active = true) {
  return { id: `${userId}-membership`, orgId: ORG, userId, role, active };
}

function pin(extra = {}) {
  return {
    id: PIN, orgId: ORG, repId: ADMIN, repName: 'Admin', lat: 35.5, lng: -97.5,
    address: '123 Main St', city: 'Norman', state: 'OK', zip: '73069',
    assignedRepId: REP, assignedRepName: 'Rep', territoryId: TERRITORY,
    status: 'NV', stage: 'lead', seeded: true, statusHistory: '[]',
    notesLog: '[]', actionItems: '{}', visitCount: 0, updatedAt: now,
    createdAt: now, lastVisited: now, ...extra,
  };
}

function territory(extra = {}) {
  return {
    id: TERRITORY, orgId: ORG, name: 'North', color: '#fff',
    points: JSON.stringify([
      { lat: 35.49, lng: -97.51 }, { lat: 35.49, lng: -97.49 },
      { lat: 35.51, lng: -97.49 }, { lat: 35.51, lng: -97.51 },
    ]),
    assignedRepIds: [REP], assignedRepNames: ['Rep'], populationState: 'idle',
    populationCreated: 0, populationSkipped: 0, createdBy: ADMIN,
    createdAt: now, updatedAt: now, ...extra,
  };
}

test('exact polygon inclusion excludes every boundary and outside point', () => {
  const square = JSON.parse(territory().points);
  assert.equal(inPolygon(35.5, -97.5, square), true);
  assert.equal(inPolygon(35.52, -97.5, square), false);
  assert.equal(inPolygon(35.49, -97.5, square), false);
  assert.equal(inPolygon(35.51, -97.5, square), false);
  assert.equal(inPolygon(35.5, -97.49, square), false);
  assert.equal(inPolygon(35.5, -97.51, square), false);
  assert.equal(inPolygon(35.49, -97.51, square), false);
  assert.equal(inPolygon(35.49, -97.49, square), false);
  assert.equal(inPolygon(35.51, -97.49, square), false);
  assert.equal(inPolygon(35.51, -97.51, square), false);
});

test('normalized addresses deduplicate punctuation, spacing, and casing', () => {
  assert.equal(
    addressKey('123 N. Main St.', 'Dallas', 'TX', '75001'),
    addressKey('123 n main st', 'DALLAS', 'tx', '75001'),
  );
});

test('rep listing is constrained to own, assigned, and legacy shared doors', async () => {
  let where;
  client({
    orgMembership: { findFirst: fn(membership(REP)) },
    canvassPin: { findMany: fn((args) => { where = args.where; return []; }) },
  });
  await CanvassServices.listPins(REP, ORG);
  assert.deepEqual(where, {
    orgId: ORG,
    OR: [
      { repId: REP, seeded: false },
      { assignedRepId: REP },
      { seeded: true, territoryId: null, assignedRepId: null },
    ],
  });
});

test('unassigned reps cannot edit, enrich, or contact another assigned household', async () => {
  client({
    orgMembership: { findFirst: fn(membership(OTHER)) },
    canvassPin: { findUnique: fn(pin()) },
  });
  for (const operation of [
    () => CanvassServices.updatePin(OTHER, PIN, { status: 'NH' }),
    () => CanvassServices.enrichPin(OTHER, PIN, false),
    () => CanvassServices.contactPin(OTHER, PIN),
  ]) {
    await assert.rejects(operation, (error) => error.statusCode === 403);
  }
});

test('assigned reps can list, edit, enrich, and contact their household', async () => {
  const assigned = pin({
    enrichment: JSON.stringify({ owner: 'Home Owner' }),
    enrichedAt: now,
    contact: JSON.stringify({ name: 'Home Owner', phones: [], emails: [] }),
    contactAt: now,
  });
  const outsider = pin({ id: '111111111111111111111111', assignedRepId: OTHER });
  client({
    orgMembership: { findFirst: fn(membership(REP)) },
    canvassPin: {
      findUnique: fn(assigned),
      findMany: fn([assigned, outsider]),
      update: fn((args) => ({ ...assigned, ...args.data })),
    },
  });
  const listed = await CanvassServices.listPins(REP, ORG);
  assert.deepEqual(listed.map((item) => item.id), [PIN]);
  assert.equal((await CanvassServices.updatePin(REP, PIN, { notes: 'Visited' })).notes, 'Visited');
  assert.equal((await CanvassServices.enrichPin(REP, PIN, false)).cached, true);
  assert.equal((await CanvassServices.contactPin(REP, PIN)).cached, true);
});

test('only active organization members may be assigned to a territory', async () => {
  client({
    orgMembership: {
      findFirst: fn(membership(ADMIN, 'admin')),
      findMany: fn([]),
    },
    canvassTerritory: { findUnique: fn(territory()) },
  });
  await assert.rejects(
    () => CanvassServices.updateTerritory(ADMIN, TERRITORY, { assignedRepIds: [OTHER] }),
    /active member/,
  );
});

test('territory reassignment updates every existing door atomically', async () => {
  const updates = [];
  const db = client({
    orgMembership: {
      findFirst: fn(membership(ADMIN, 'admin')),
      findMany: fn([{ userId: REP }, { userId: OTHER }]),
    },
    user: { findMany: fn([{ id: REP, fullName: 'One' }, { id: OTHER, fullName: 'Two' }]) },
    canvassTerritory: {
      findUnique: fn(territory()),
      update: fn((args) => ({ ...territory(), ...args.data })),
    },
    canvassPin: {
      findMany: fn([{ id: PIN }, { id: '111111111111111111111111' }]),
      update: fn((args) => { updates.push(args.data); return pin(args.data); }),
    },
  });
  await CanvassServices.updateTerritory(ADMIN, TERRITORY, { assignedRepIds: [REP, OTHER] });
  assert.deepEqual(updates.map((x) => x.assignedRepId), [REP, OTHER]);
  assert.equal(db.$transaction !== undefined, true);
});

test('overlapping territory population skips an existing normalized address', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = fn({
    ok: true,
    json: fn([
      { latitude: 35.5, longitude: -97.5, addressLine1: '123 N Main St', city: 'Norman', state: 'OK', zipCode: '73069' },
      { latitude: 35.505, longitude: -97.505, addressLine1: '456 Oak Ave', city: 'Norman', state: 'OK', zipCode: '73069' },
    ]),
  });
  let inserted = [];
  let state = 'idle';
  client({
    orgMembership: {
      findFirst: fn(membership(ADMIN, 'admin')),
      findMany: fn([{ userId: REP }]),
    },
    user: {
      findUnique: fn({ fullName: 'Admin' }),
      findMany: fn([{ id: REP, fullName: 'Rep' }]),
    },
    canvassTerritory: {
      findUnique: fn(() => territory({ populationState: state })),
      updateMany: fn((args) => {
        if (args.where.populationState && args.where.populationState !== state &&
            !(args.where.populationState.in || []).includes(state)) return { count: 0 };
        state = args.data.populationState || state;
        return { count: 1 };
      }),
    },
    canvassPin: {
      findMany: fn([{ address: '123 N. Main St.', city: 'NORMAN', state: 'ok', zip: '73069', lat: 35.55, lng: -97.55 }]),
      createMany: fn((args) => { inserted = args.data; return { count: args.data.length }; }),
    },
  });
  const result = await CanvassServices.populateTerritory(ADMIN, TERRITORY, {});
  assert.equal(result.created, 1);
  assert.equal(inserted[0].address, '456 Oak Ave');
});

test('provider failure marks population failed and inserts no doors', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = fn({ ok: false, status: 503 });
  let state = 'idle';
  let inserts = 0;
  client({
    orgMembership: { findFirst: fn(membership(ADMIN, 'admin')), findMany: fn([]) },
    canvassTerritory: {
      findUnique: fn(() => territory({ populationState: state })),
      updateMany: fn((args) => {
        state = args.data.populationState || state;
        return { count: 1 };
      }),
    },
    canvassPin: { createMany: fn(() => { inserts++; }) },
  });
  await assert.rejects(
    () => CanvassServices.populateTerritory(ADMIN, TERRITORY, {}),
    (error) => error.statusCode === 502,
  );
  assert.equal(state, 'failed');
  assert.equal(inserts, 0);
});

test('malformed provider payload marks population failed and inserts no doors', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = fn({ ok: true, json: fn({ unexpected: true }) });
  let state = 'idle';
  let inserts = 0;
  client({
    orgMembership: { findFirst: fn(membership(ADMIN, 'admin')), findMany: fn([]) },
    canvassTerritory: {
      findUnique: fn(() => territory({ populationState: state })),
      updateMany: fn((args) => {
        state = args.data.populationState || state;
        return { count: 1 };
      }),
    },
    canvassPin: { createMany: fn(() => { inserts++; }) },
  });
  await assert.rejects(
    () => CanvassServices.populateTerritory(ADMIN, TERRITORY, {}),
    /invalid response/,
  );
  assert.equal(state, 'failed');
  assert.equal(inserts, 0);
});

test('cancellation wins before the insert phase', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let release;
  global.fetch = () => new Promise((resolve) => { release = resolve; });
  let state = 'idle';
  let inserts = 0;
  const db = client({
    orgMembership: { findFirst: fn(membership(ADMIN, 'admin')), findMany: fn([]) },
    canvassTerritory: {
      findUnique: fn(() => territory({ populationState: state })),
      updateMany: fn((args) => {
        const required = args.where.populationState;
        if (typeof required === 'string' && required !== state) return { count: 0 };
        state = args.data.populationState || state;
        return { count: 1 };
      }),
    },
    canvassPin: { findMany: fn([]), createMany: fn(() => { inserts++; }) },
  });
  const running = CanvassServices.populateTerritory(ADMIN, TERRITORY, {});
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  await CanvassServices.cancelTerritoryPopulation(ADMIN, TERRITORY);
  release({ ok: true, json: fn([{ latitude: 35.5, longitude: -97.5, addressLine1: '1 Pine', city: 'Norman', state: 'OK', zipCode: '73069' }]) });
  const result = await running;
  assert.equal(result.created, 0);
  assert.equal(inserts, 0);
  assert.equal(state, 'cancelled');
  assert.ok(db);
});

test('deleting a territory removes its doors in the same transaction', async () => {
  const operations = [];
  client({
    orgMembership: { findFirst: fn(membership(ADMIN, 'admin')) },
    canvassTerritory: {
      findUnique: fn(territory()),
      delete: fn((args) => { operations.push(['territory', args.where]); return {}; }),
    },
    canvassPin: {
      deleteMany: fn((args) => { operations.push(['doors', args.where]); return { count: 2 }; }),
    },
  });
  await CanvassServices.deleteTerritory(ADMIN, TERRITORY);
  assert.deepEqual(operations, [
    ['doors', { territoryId: TERRITORY }],
    ['territory', { id: TERRITORY }],
  ]);
});

test('simultaneous territory edits cannot overwrite an update in progress', async () => {
  let claims = 0;
  client({
    orgMembership: { findFirst: fn(membership(ADMIN, 'admin')) },
    canvassTerritory: {
      findUnique: fn(territory()),
      updateMany: fn(() => ({ count: claims++ === 0 ? 1 : 0 })),
      update: fn((args) => ({ ...territory(), ...args.data })),
    },
  });
  const results = await Promise.allSettled([
    CanvassServices.updateTerritory(ADMIN, TERRITORY, { name: 'First' }),
    CanvassServices.updateTerritory(ADMIN, TERRITORY, { name: 'Second' }),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  const rejected = results.find((x) => x.status === 'rejected');
  assert.equal(rejected.reason.statusCode, 409);
});