export const inPolygon = (
  lat: number,
  lng: number,
  points: { lat: number; lng: number }[],
) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const intersects =
      a.lat > lat !== b.lat > lat &&
      lng < ((b.lng - a.lng) * (lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (intersects) inside = !inside;
  }
  return inside;
};

export const addressKey = (
  address: string,
  city: string,
  state: string,
  zip: string,
) =>
  [address, city, state, zip]
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]/g, '');