import { useMemo, useState } from "react";
import { BALLPARKS, type Ballpark, getBallparkById, getFenceDistanceAtAngle, getWallHeightAtAngle, wouldClearFenceAt } from "../data/ballparks";
import type { HomeRunFeedEntry } from "../services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Check, X } from "lucide-react";
// 3D view temporarily disabled — keeping the code for later. See ./stadium3d/Stadium3D.
// import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
// import { Stadium3D } from "./stadium3d/Stadium3D";
import { cn } from "./ui/utils";

interface StadiumTrajectoryProps {
  homeRun: HomeRunFeedEntry;
}

const VIEW_WIDTH = 520;
const VIEW_HEIGHT = 440;
const PLATE_X = VIEW_WIDTH / 2;
const PLATE_Y = 410;
const SCALE = 0.82; // pixels per foot

export function StadiumTrajectory({ homeRun }: StadiumTrajectoryProps) {
  const defaultParkId = homeRun.homeParkId ?? BALLPARKS[0].id;
  const [selectedParkId, setSelectedParkId] = useState(defaultParkId);

  const park = getBallparkById(selectedParkId) ?? BALLPARKS[0];
  const distance = homeRun.distance ?? 0;

  // The ball's landing point in feet (+x = right field, +y = center field).
  // Prefer the exact Gameday coordinates; fall back to reconstructing them
  // from spray angle + total distance when coordinates are unavailable.
  const landingX = homeRun.landingX ?? distance * Math.sin(((homeRun.sprayAngle ?? 0) * Math.PI) / 180);
  const landingY = homeRun.landingY ?? distance * Math.cos(((homeRun.sprayAngle ?? 0) * Math.PI) / 180);

  // Derive the drawn direction and length from the SAME landing point used
  // for the clears/doesn't-clear result and the dropdown icons. This keeps
  // the trajectory line, its color, the fence readout, and the per-park
  // icons perfectly consistent — the line can never point somewhere the
  // clearance logic disagrees with.
  const landingAngle =
    landingX === 0 && landingY === 0 ? 0 : Math.atan2(landingX, landingY) * (180 / Math.PI);
  const landingDistance = Math.hypot(landingX, landingY) || distance;

  const fenceDistanceAtAngle = getFenceDistanceAtAngle(park, landingAngle);
  const wallHeightAtAngle = getWallHeightAtAngle(park, landingAngle);
  const clearsFence = wouldClearFenceAt(park, landingX, landingY);

  const fencePath = useMemo(() => buildFencePath(park), [park]);
  const landingPoint = toPoint(landingAngle, Math.min(landingDistance, 480));
  const foulLineLeft = toPoint(-45, 480);
  const foulLineRight = toPoint(45, 480);

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Would it dong here?
          </p>
          <p className="text-sm font-bold text-white">
            {park.name} <span className="font-medium text-muted-foreground">• {park.city}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedParkId} onValueChange={setSelectedParkId}>
            <SelectTrigger className="w-full border-white/10 bg-white/5 text-white sm:w-56">
              <SelectValue placeholder="Choose a ballpark" />
            </SelectTrigger>
            <SelectContent>
              {BALLPARKS.map((option) => {
                const dongs = wouldClearFenceAt(option, landingX, landingY);
                return (
                  <SelectItem key={option.id} value={option.id}>
                    <span className="flex items-center gap-2">
                      {dongs ? (
                        <Check className="size-4 shrink-0 text-accent" aria-label="Would clear the fence" />
                      ) : (
                        <X className="size-4 shrink-0 text-red-400" aria-label="Would not clear the fence" />
                      )}
                      {option.name} ({option.team})
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="w-full rounded-xl bg-[#04140c]"
          role="img"
          aria-label={`Trajectory diagram of ${homeRun.playerName}'s home run at ${park.name}`}
        >
          <path
            d={`M ${PLATE_X} ${PLATE_Y} L ${foulLineLeft.x} ${foulLineLeft.y}`}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <path
            d={`M ${PLATE_X} ${PLATE_Y} L ${foulLineRight.x} ${foulLineRight.y}`}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          <path
            d={fencePath}
            fill="rgba(34,211,184,0.05)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={2.5}
          />

          <path
            d={`M ${PLATE_X} ${PLATE_Y - 10} L ${PLATE_X - 8} ${PLATE_Y} L ${PLATE_X} ${PLATE_Y + 6} L ${PLATE_X + 8} ${PLATE_Y} Z`}
            fill="white"
          />

          <line
            x1={PLATE_X}
            y1={PLATE_Y}
            x2={landingPoint.x}
            y2={landingPoint.y}
            stroke={clearsFence ? "var(--accent)" : "var(--primary)"}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle
            cx={landingPoint.x}
            cy={landingPoint.y}
            r={6}
            fill={clearsFence ? "var(--accent)" : "var(--primary)"}
            stroke="white"
            strokeWidth={1.5}
          />
        </svg>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
            clearsFence
              ? "border-accent/30 bg-accent/15 text-accent"
              : "border-primary/30 bg-primary/15 text-red-300",
          )}
        >
          {clearsFence ? "Clears the fence" : "Doesn't clear"}
        </span>
        <span className="text-muted-foreground">
          Fence at this angle: <span className="text-white">{Math.round(fenceDistanceAtAngle)} ft</span>
        </span>
        <span className="text-muted-foreground">
          Wall height: <span className="text-white">{Math.round(wallHeightAtAngle)} ft</span>
        </span>
        <span className="text-muted-foreground">
          Ball distance: <span className="text-white">{distance ? Math.round(distance) : "—"} ft</span>
        </span>
      </div>
      <p className="mt-2 text-[0.65rem] leading-snug text-muted-foreground">
        Wall distances/heights and the trajectory arc are estimated from Statcast exit velocity, launch
        angle, and distance combined with publicly listed ballpark dimensions. Results depend on wind,
        elevation, and wall shape.
      </p>
    </div>
  );
}


function toPoint(angleDeg: number, distanceFt: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: PLATE_X + Math.sin(angleRad) * distanceFt * SCALE,
    y: PLATE_Y - Math.cos(angleRad) * distanceFt * SCALE,
  };
}

function buildFencePath(park: Ballpark) {
  const step = 3;
  const points = [];

  for (let angle = -45; angle <= 45; angle += step) {
    const distance = getFenceDistanceAtAngle(park, angle);
    points.push(toPoint(angle, distance));
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}
