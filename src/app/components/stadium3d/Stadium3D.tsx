import { useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import type { Ballpark } from "../../data/ballparks";
import { getFenceDistanceAtAngle, getWallHeightAtAngle } from "../../data/ballparks";

interface Stadium3DProps {
  park: Ballpark;
  sprayAngle: number;
  distance: number;
  launchAngle: number | null;
  clearsFence: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const FIELD_STEP_DEG = 2;
const STANDS_STEP_DEG = 4;
const DEFAULT_LAUNCH_ANGLE = 27;

/** Converts a spray angle (deg, -45..45) + radius (ft) into a world-space point. */
function polarToPoint(angleDeg: number, radiusFt: number, y = 0) {
  const rad = angleDeg * DEG_TO_RAD;
  return new THREE.Vector3(Math.sin(rad) * radiusFt, y, Math.cos(rad) * radiusFt);
}

/** Builds a flat triangle-fan mesh (ground / grass / dirt) spanning foul line to foul line. */
function buildFanGeometry(radiusFn: (angleDeg: number) => number, y: number) {
  const points: THREE.Vector3[] = [];
  for (let angle = -45; angle <= 45; angle += FIELD_STEP_DEG) {
    points.push(polarToPoint(angle, radiusFn(angle), y));
  }

  const vertices: number[] = [];
  const origin = new THREE.Vector3(0, y, 0);
  for (let i = 0; i < points.length - 1; i++) {
    vertices.push(origin.x, origin.y, origin.z);
    vertices.push(points[i].x, points[i].y, points[i].z);
    vertices.push(points[i + 1].x, points[i + 1].y, points[i + 1].z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Sample points along the top of the outfield wall (for the home-run rail line). */
function buildWallTopPoints(park: Ballpark) {
  const points: [number, number, number][] = [];
  for (let angle = -45; angle <= 45; angle += FIELD_STEP_DEG) {
    const dist = getFenceDistanceAtAngle(park, angle);
    const height = getWallHeightAtAngle(park, angle);
    const p = polarToPoint(angle, dist, height);
    points.push([p.x, p.y, p.z]);
  }
  return points;
}

/** Builds a vertical ribbon (wall) following the fence arc, with per-angle height. */
function buildWallGeometry(park: Ballpark) {
  const bottoms: THREE.Vector3[] = [];
  const tops: THREE.Vector3[] = [];

  for (let angle = -45; angle <= 45; angle += FIELD_STEP_DEG) {
    const dist = getFenceDistanceAtAngle(park, angle);
    const height = getWallHeightAtAngle(park, angle);
    bottoms.push(polarToPoint(angle, dist, 0));
    tops.push(polarToPoint(angle, dist, height));
  }

  const vertices: number[] = [];
  for (let i = 0; i < bottoms.length - 1; i++) {
    const b0 = bottoms[i];
    const b1 = bottoms[i + 1];
    const t0 = tops[i];
    const t1 = tops[i + 1];

    vertices.push(b0.x, b0.y, b0.z, t0.x, t0.y, t0.z, b1.x, b1.y, b1.z);
    vertices.push(t0.x, t0.y, t0.z, t1.x, t1.y, t1.z, b1.x, b1.y, b1.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Builds one tier of the stands as a ribbon behind the field. Detailed
 * per-park seating geometry isn't publicly available, so this is a stylized
 * approximation: it hugs the real outfield fence in the outfield arc
 * (-45..45deg) and blends to a generic infield radius around the rest of the
 * bowl. The ring is left open directly behind home plate so the default
 * camera has a clear view into the park.
 */
function buildStandsTierGeometry(
  park: Ballpark,
  outfieldPadding: number,
  infieldRadius: number,
  yBottom: number,
  yTop: number,
  rake: number,
) {
  const radiusAt = (angleDeg: number) => {
    const abs = Math.abs(angleDeg);
    if (abs <= 45) {
      return getFenceDistanceAtAngle(park, angleDeg) + outfieldPadding;
    }
    const edgeRadius = getFenceDistanceAtAngle(park, Math.sign(angleDeg) * 45) + outfieldPadding;
    const t = (abs - 45) / (180 - 45);
    const smooth = t * t * (3 - 2 * t);
    return edgeRadius + (infieldRadius - edgeRadius) * smooth;
  };

  const bottoms: THREE.Vector3[] = [];
  const tops: THREE.Vector3[] = [];

  // Leave a gap directly behind home plate (|angle| > 150deg) so we don't
  // build seating between the camera and the field.
  for (let angle = -150; angle <= 150; angle += STANDS_STEP_DEG) {
    const radius = radiusAt(angle);
    bottoms.push(polarToPoint(angle, radius, yBottom));
    tops.push(polarToPoint(angle, radius + rake, yTop));
  }

  const vertices: number[] = [];
  for (let i = 0; i < bottoms.length - 1; i++) {
    const b0 = bottoms[i];
    const b1 = bottoms[i + 1];
    const t0 = tops[i];
    const t1 = tops[i + 1];

    vertices.push(b0.x, b0.y, b0.z, t0.x, t0.y, t0.z, b1.x, b1.y, b1.z);
    vertices.push(t0.x, t0.y, t0.z, t1.x, t1.y, t1.z, b1.x, b1.y, b1.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Builds a physically-grounded parabolic trajectory from home plate to the landing point. */
function buildTrajectoryPoints(sprayAngle: number, distance: number, launchAngle: number | null) {
  const angle = launchAngle ?? DEFAULT_LAUNCH_ANGLE;
  const angleRad = Math.max(5, angle) * DEG_TO_RAD;
  // Ideal-projectile relation: peak height = range * tan(launchAngle) / 4
  const peakHeight = Math.max(20, distance * Math.tan(angleRad)) / 4;

  const points: THREE.Vector3[] = [];
  const steps = 40;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const traveled = distance * t;
    const height = 4 * peakHeight * t * (1 - t);
    points.push(polarToPoint(sprayAngle, traveled, Math.max(0, height)));
  }

  return points;
}

export function Stadium3D({ park, sprayAngle, distance, launchAngle, clearsFence }: Stadium3DProps) {
  const grassGeometry = useMemo(
    () => buildFanGeometry((angle) => getFenceDistanceAtAngle(park, angle), 0),
    [park],
  );
  const dirtGeometry = useMemo(() => buildFanGeometry(() => 95, 0.05), [park]);
  const warningTrackGeometry = useMemo(
    () => buildFanGeometry((angle) => getFenceDistanceAtAngle(park, angle), 0.08),
    [park],
  );
  const warningTrackInnerGeometry = useMemo(
    () => buildFanGeometry((angle) => getFenceDistanceAtAngle(park, angle) - 15, 0.1),
    [park],
  );
  const wallGeometry = useMemo(() => buildWallGeometry(park), [park]);
  const wallTopPoints = useMemo(() => buildWallTopPoints(park), [park]);

  const lowerBowl = useMemo(() => buildStandsTierGeometry(park, 8, 150, 0, 40, 24), [park]);
  const upperBowl = useMemo(() => buildStandsTierGeometry(park, 48, 210, 44, 94, 36), [park]);

  const trajectoryPoints = useMemo(
    () => buildTrajectoryPoints(sprayAngle, Math.max(distance, 1), launchAngle),
    [sprayAngle, distance, launchAngle],
  );
  const landingPoint = trajectoryPoints[trajectoryPoints.length - 1];
  const trajectoryColor = clearsFence ? "#22d3b8" : "#e11d48";

  const cfDistance = getFenceDistanceAtAngle(park, 0);
  const wallHeightAtAngle = getWallHeightAtAngle(park, sprayAngle);
  const fenceDistanceAtAngle = getFenceDistanceAtAngle(park, sprayAngle);
  const foulPoleLeftHeight = getWallHeightAtAngle(park, -45) + 30;
  const foulPoleRightHeight = getWallHeightAtAngle(park, 45) + 30;
  const foulLineLeft = polarToPoint(-45, getFenceDistanceAtAngle(park, -45));
  const foulLineRight = polarToPoint(45, getFenceDistanceAtAngle(park, 45));
  const scoreboardPos = polarToPoint(0, cfDistance + 32, 58);

  const bases = [
    polarToPoint(45, 90, 0.5),
    polarToPoint(0, 127.3, 0.5),
    polarToPoint(-45, 90, 0.5),
  ];

  return (
    <Canvas
      shadows
      camera={{ position: [0, 150, -210], fov: 46, near: 1, far: 3000 }}
      className="!h-full !w-full"
    >
      <color attach="background" args={["#060d1a"]} />
      <fog attach="fog" args={["#060d1a", 460, 950]} />

      <hemisphereLight args={["#bcd3ff", "#0c1a12", 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[240, 340, -40]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-520}
        shadow-camera-right={520}
        shadow-camera-top={520}
        shadow-camera-bottom={-520}
      />
      <directionalLight position={[-220, 240, 280]} intensity={0.5} />

      {/* Grass */}
      <mesh geometry={grassGeometry} receiveShadow>
        <meshStandardMaterial color="#227140" side={THREE.DoubleSide} roughness={0.95} />
      </mesh>

      {/* Warning track (dirt ring just inside the wall) */}
      <mesh geometry={warningTrackGeometry} receiveShadow>
        <meshStandardMaterial color="#b07a44" side={THREE.DoubleSide} roughness={1} />
      </mesh>
      <mesh geometry={warningTrackInnerGeometry} receiveShadow>
        <meshStandardMaterial color="#227140" side={THREE.DoubleSide} roughness={0.95} />
      </mesh>

      {/* Infield dirt */}
      <mesh geometry={dirtGeometry} receiveShadow>
        <meshStandardMaterial color="#b07a44" side={THREE.DoubleSide} roughness={1} />
      </mesh>

      {/* Pitcher's mound */}
      <mesh position={polarToPoint(0, 60.5, 0.6)} castShadow receiveShadow>
        <cylinderGeometry args={[9, 11, 1.2, 24]} />
        <meshStandardMaterial color="#9a6636" roughness={1} />
      </mesh>

      {/* Bases */}
      {bases.map((pos, index) => (
        <mesh key={index} position={pos} castShadow>
          <boxGeometry args={[3, 0.6, 3]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}

      {/* Home plate */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.4, 5]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Foul lines */}
      <Line points={[[0, 0.2, 0], foulLineLeft.toArray()]} color="#f7fafc" lineWidth={2} />
      <Line points={[[0, 0.2, 0], foulLineRight.toArray()]} color="#f7fafc" lineWidth={2} />

      {/* Outfield wall */}
      <mesh geometry={wallGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#0f5c3c" side={THREE.DoubleSide} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Bright yellow home-run line along the top of the wall */}
      <Line points={wallTopPoints} color="#ffd23f" lineWidth={3} />

      {/* Foul poles */}
      <group position={polarToPoint(-45, getFenceDistanceAtAngle(park, -45))}>
        <mesh position={[0, foulPoleLeftHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[1, 1, foulPoleLeftHeight, 12]} />
          <meshStandardMaterial color="#ffd23f" emissive="#a97e00" emissiveIntensity={0.3} />
        </mesh>
      </group>
      <group position={polarToPoint(45, getFenceDistanceAtAngle(park, 45))}>
        <mesh position={[0, foulPoleRightHeight / 2, 0]} castShadow>
          <cylinderGeometry args={[1, 1, foulPoleRightHeight, 12]} />
          <meshStandardMaterial color="#ffd23f" emissive="#a97e00" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Stadium seating bowl (stylized, not per-park accurate) */}
      <mesh geometry={lowerBowl} receiveShadow>
        <meshStandardMaterial color="#24345a" side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
      <mesh geometry={upperBowl} receiveShadow>
        <meshStandardMaterial color="#1a2744" side={THREE.DoubleSide} roughness={0.95} />
      </mesh>

      {/* Scoreboard, seated beyond the center-field fence */}
      <group position={scoreboardPos}>
        <mesh castShadow>
          <boxGeometry args={[110, 46, 5]} />
          <meshStandardMaterial color="#0a0f1e" />
        </mesh>
        <mesh position={[0, 0, 3]}>
          <planeGeometry args={[100, 36]} />
          <meshStandardMaterial color="#0d2a1c" emissive="#12633f" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Trajectory arc */}
      <Line points={trajectoryPoints} color={trajectoryColor} lineWidth={4} />
      <mesh position={landingPoint} castShadow>
        <sphereGeometry args={[3, 20, 20]} />
        <meshStandardMaterial color={trajectoryColor} emissive={trajectoryColor} emissiveIntensity={0.7} />
      </mesh>

      {/* Highlight of the wall segment at the ball's spray angle */}
      <mesh position={polarToPoint(sprayAngle, fenceDistanceAtAngle, wallHeightAtAngle / 2)}>
        <boxGeometry args={[6, Math.max(wallHeightAtAngle, 1), 2]} />
        <meshStandardMaterial
          color={trajectoryColor}
          emissive={trajectoryColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.65}
        />
      </mesh>

      <OrbitControls
        target={[0, 25, 190]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={120}
        maxDistance={720}
        enableDamping
      />
    </Canvas>
  );
}
