"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressKey = exports.inPolygon = void 0;
const inPolygon = (lat, lng, points) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i];
        const b = points[j];
        const intersects = a.lat > lat !== b.lat > lat &&
            lng < ((b.lng - a.lng) * (lat - a.lat)) / (b.lat - a.lat) + a.lng;
        if (intersects)
            inside = !inside;
    }
    return inside;
};
exports.inPolygon = inPolygon;
const addressKey = (address, city, state, zip) => [address, city, state, zip]
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, '');
exports.addressKey = addressKey;
