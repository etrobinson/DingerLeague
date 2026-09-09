/**
 * MLB ballpark outfield dimensions, used to build a to-scale top-down
 * wireframe of each park and to estimate whether a batted ball would have
 * cleared the fence.
 *
 * The raw data lives in ./ballparks.json, which is the single source of
 * truth shared with the offline Blender model generator (see
 * starter_ballpark.py). Distances are the publicly listed fence distances
 * (in feet); wall heights are approximate (in feet). Values between the
 * listed angle points are linearly interpolated, so this is an estimate
 * rather than an exact laser survey.
 *
 * Angle convention: 0deg = straightaway center field, -45deg = left field
 * line, +45deg = right field line (matches the standard Statcast spray
 * angle convention).
 */
import ballparksData from "./ballparks.json";

export interface BallparkFencePoint {
  /** Degrees from dead center. -45 = LF line, 45 = RF line. */
  angle: number;
  /** Distance from home plate to the fence at this angle, in feet. */
  distance: number;
  /** Wall height at this angle, in feet. */
  wallHeight: number;
}

export interface Ballpark {
  id: string;
  team: string;
  name: string;
  city: string;
  fence: BallparkFencePoint[];
}

export const BALLPARKS: Ballpark[] = ballparksData as Ballpark[];

/**
 * Fence geometry model
 * ------------------------------------------------------------------
 * An outfield wall is a chain of straight segments, not a smooth arc. Each
 * fence point is a polar coordinate (spray angle + radial distance) which we
 * convert to a Cartesian point on the field:
 *
 *   x = distance * sin(angle)   (x grows toward right field)
 *   y = distance * cos(angle)   (y grows toward center field)
 *
 * A batted ball travels outward from home plate (the origin) along a ray at
 * its spray angle. Because the fence points are listed in increasing angle
 * order and an MLB outfield is fully visible from home plate (star-convex),
 * the query angle falls between exactly one pair of adjacent fence points.
 * We intersect the ball's ray with just that straight wall segment, which is
 * geometrically exact and — unlike scanning every segment — has no ambiguity
 * or floating-point gaps at the shared vertices.
 */

interface CartesianPoint {
  x: number;
  y: number;
}

/** Converts a polar fence point (angle in deg, radius in ft) to Cartesian. */
function polarToCartesian(angleDeg: number, radiusFt: number): CartesianPoint {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radiusFt * Math.sin(rad), y: radiusFt * Math.cos(rad) };
}

/**
 * Distance from home plate to where the ray at `angleDeg` crosses the
 * straight segment between two fence points `a` and `b`. Returns null only
 * when the segment is degenerate/parallel to the ray, in which case the
 * caller uses a radial-interpolation fallback.
 */
function rayStraightWallDistance(
  angleDeg: number,
  a: BallparkFencePoint,
  b: BallparkFencePoint,
): number | null {
  const pa = polarToCartesian(a.angle, a.distance);
  const pb = polarToCartesian(b.angle, b.distance);

  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = Math.cos(rad);

  const ex = pb.x - pa.x;
  const ey = pb.y - pa.y;

  // Solve  pa + t*e = s*d.
  const denom = dx * ey - dy * ex;
  if (Math.abs(denom) < 1e-9) return null; // Parallel/degenerate.

  const s = (pa.x * ey - pa.y * ex) / denom;
  if (s <= 0) return null;

  return s;
}

/**
 * Returns the true fence distance (ft) in the direction of `angle`, computed
 * by intersecting the ball's ray with the correct straight wall segment.
 * Angles beyond the listed fence span clamp to the nearest foul-line point.
 */
export function getFenceDistanceAtAngle(park: Ballpark, angle: number): number {
  const points = [...park.fence].sort((a, b) => a.angle - b.angle);
  const first = points[0];
  const last = points[points.length - 1];

  if (angle <= first.angle) return first.distance;
  if (angle >= last.angle) return last.distance;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (angle >= a.angle && angle <= b.angle) {
      const intersection = rayStraightWallDistance(angle, a, b);
      if (intersection !== null) return intersection;
      // Degenerate fallback: linear radial interpolation within this segment.
      const t = (angle - a.angle) / (b.angle - a.angle);
      return a.distance + (b.distance - a.distance) * t;
    }
  }

  return last.distance;
}

/** Linearly interpolates the wall height (ft) at an arbitrary spray angle. */
export function getWallHeightAtAngle(park: Ballpark, angle: number): number {
  const clamped = Math.max(-45, Math.min(45, angle));
  const points = park.fence;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (clamped >= a.angle && clamped <= b.angle) {
      const t = (clamped - a.angle) / (b.angle - a.angle);
      return a.wallHeight + (b.wallHeight - a.wallHeight) * t;
    }
  }

  return points[points.length - 1].wallHeight;
}

/**
 * Determines whether a batted ball that landed at the given field
 * coordinates (relative to home plate, in feet; +x = right field, +y =
 * center field) would have cleared this park's fence.
 *
 * This is the accurate path: it uses the ball's real landing point to find
 * both its spray angle and its landing distance, then compares against the
 * fence distance in that exact direction (via ray/polyline intersection).
 * A ball hit down the line no longer gets mis-scored against a deeper
 * power-alley distance.
 */
export function wouldClearFenceAt(park: Ballpark, landingX: number, landingY: number): boolean {
  const landingDistance = Math.hypot(landingX, landingY);
  if (landingDistance <= 0) return false;

  const angle = Math.atan2(landingX, landingY) * (180 / Math.PI);
  return landingDistance >= getFenceDistanceAtAngle(park, angle);
}

/**
 * Estimates whether a batted ball with the given total distance (ft) and
 * spray angle (deg) would have cleared the fence at this park. Uses the same
 * ray/polyline fence model as {@link wouldClearFenceAt}; prefer that overload
 * when the ball's landing coordinates are available.
 */
export function wouldClearFence(park: Ballpark, angle: number, distanceFt: number): boolean {
  return distanceFt >= getFenceDistanceAtAngle(park, angle);
}

export function getBallparkById(id: string): Ballpark | undefined {
  return BALLPARKS.find((park) => park.id === id);
}

