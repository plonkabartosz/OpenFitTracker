export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const \u03c61 = lat1 * Math.PI/180; // \u03c6, \u03bb in radians
  const \u03c62 = lat2 * Math.PI/180;
  const \u0394\u03c6 = (lat2-lat1) * Math.PI/180;
  const \u0394\u03bb = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(\u0394\u03c6/2) * Math.sin(\u0394\u03c6/2) +
            Math.cos(\u03c61) * Math.cos(\u03c62) *
            Math.sin(\u0394\u03bb/2) * Math.sin(\u0394\u03bb/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
}
