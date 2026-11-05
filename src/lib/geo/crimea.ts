type Ring = number[][];
type Poly = Ring[];
interface Geo { properties?: { name?: string }; geometry?: { type: string; coordinates: unknown } }

const inCrimea = (poly: Poly) =>
  poly[0].every(([lon, lat]) => lon >= 32 && lon <= 37 && lat >= 44 && lat <= 46.6);

/**
 * Natural Earth draws Crimea inside Russia. Move the Crimea polygon to Ukraine
 * so the map shows, colours and highlights it as part of Ukraine.
 */
export function crimeaToUkraine<T>(geos: T[]): T[] {
  const list = geos as unknown as Geo[];
  const ru = list.find((g) => g.properties?.name === "Russia");
  const ua = list.find((g) => g.properties?.name === "Ukraine");
  if (ru?.geometry?.type !== "MultiPolygon" || ua?.geometry === undefined) return geos;
  const ruPolys = ru.geometry.coordinates as Poly[];
  const crimea = ruPolys.filter(inCrimea);
  if (crimea.length === 0) return geos;
  ru.geometry = { type: "MultiPolygon", coordinates: ruPolys.filter((p) => inCrimea(p) === false) };
  const uaPolys = ua.geometry.type === "Polygon" ? [ua.geometry.coordinates as Poly] : (ua.geometry.coordinates as Poly[]);
  ua.geometry = { type: "MultiPolygon", coordinates: [...uaPolys, ...crimea] };
  return geos;
}
