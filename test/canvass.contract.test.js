const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const CanvassLogic = require('../dist/app/modules/Canvass/Canvass.logic');

test('exact polygon filtering excludes points beyond a drawn edge', () => {
  const polygon = [
    { lat: 35, lng: -98 },
    { lat: 35, lng: -97 },
    { lat: 36, lng: -97 },
    { lat: 36, lng: -98 },
  ];
  assert.equal(CanvassLogic.inPolygon(35.5, -97.5, polygon), true);
  assert.equal(CanvassLogic.inPolygon(36.01, -97.5, polygon), false);
});

test('address deduplication ignores punctuation and casing', () => {
  const first = CanvassLogic.addressKey(
    '123 N. Main St.',
    'Dallas',
    'TX',
    '75001',
  );
  const duplicate = CanvassLogic.addressKey(
    '123 n main st',
    'DALLAS',
    'tx',
    '75001',
  );
  assert.equal(first, duplicate);
});

test('sensitive territory operations retain authentication and admin checks', () => {
  const routes = fs.readFileSync(
    path.join(root, 'src/app/modules/Canvass/Canvass.routes.ts'),
    'utf8',
  );
  const service = fs.readFileSync(
    path.join(root, 'src/app/modules/Canvass/Canvass.service.ts'),
    'utf8',
  );

  assert.match(
    routes,
    /territory\/:territoryId\/populate[\s\S]*auth\('ANY'\)/,
  );
  assert.match(
    routes,
    /territory\/:territoryId\/populate\/cancel[\s\S]*auth\('ANY'\)/,
  );
  assert.match(
    service,
    /const populateTerritory[\s\S]*await assertAdmin\(userId, territory\.orgId\)/,
  );
  assert.match(
    service,
    /const cancelTerritoryPopulation[\s\S]*await assertAdmin\(userId, territory\.orgId\)/,
  );
});

test('rep visibility and reassignment stay organization-scoped', () => {
  const service = fs.readFileSync(
    path.join(root, 'src/app/modules/Canvass/Canvass.service.ts'),
    'utf8',
  );
  assert.match(service, /where: \{ orgId, userId: \{ in: ids \}, active: true \}/);
  assert.match(
    service,
    /where\.OR = \[[\s\S]*\{ repId: userId \}[\s\S]*\{ assignedRepId: userId \}[\s\S]*\]/,
  );
  assert.match(service, /where: \{ territoryId \}[\s\S]*assignedRepId:/);
});