import React, { useEffect, useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export const STASIUN_SUMMARECON_FPS = 30;
export const STASIUN_SUMMARECON_FRAMES = 1800; // 60.0s locked to ffprobe VO Riko (59.208s) + 0.8s CTA tail

// === Architectural Technical Diorama Palette (Bright, Clean, Zero-Glitch) ===
const SKY_CREAM = "#F4F2EC";
const FOG_CREAM = "#ECEAE2";
const CONCRETE = "#E5E2D9";
const CONCRETE_MID = "#C8C4B8";
const CONCRETE_DARK = "#9E9B90";
const ASPHALT = "#3B424C";
const GLASS_TEAL = "#38BDF8";
const GLASS_DARK = "#1E3A5F";
const ACCENT_ORANGE = "#EA580C";
const ACCENT_AMBER = "#FFE600";
const ACCENT_TEAL = "#0F766E";
const ACCENT_CYAN = "#00F2FE";
const ACCENT_RED = "#EF4444";
const KRL_RED = "#DC2626";
const KRL_YELLOW = "#FACC15";
const INK = "#1E293B";

// Reusable Zero-Glitch Outlined Architectural Box
const ArchBox: React.FC<{
  args: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  opacity?: number;
  transparent?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  outline?: boolean;
  outlineOpacity?: number;
}> = ({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  opacity = 1,
  transparent = false,
  emissive,
  emissiveIntensity = 0,
  outline = true,
  outlineOpacity = 0.62,
}) => {
  const { boxGeo, edgesGeo } = useMemo(() => {
    const b = new THREE.BoxGeometry(args[0], args[1], args[2]);
    const e = outline ? new THREE.EdgesGeometry(b) : null;
    return { boxGeo: b, edgesGeo: e };
  }, [args[0], args[1], args[2], outline]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={boxGeo} castShadow={!transparent} receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={transparent ? 0.18 : 0.78}
          metalness={transparent ? 0.25 : 0.06}
          transparent={transparent}
          opacity={opacity}
          depthWrite={!transparent}
          emissive={emissive || "#000000"}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {edgesGeo && (
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial
            color={INK}
            transparent
            opacity={transparent ? opacity * outlineOpacity : outlineOpacity}
          />
        </lineSegments>
      )}
    </group>
  );
};

// Animated Miniature Commuter (walks smoothly with subtle vertical stride bob!)
const AnimatedCommuter: React.FC<{
  x: number;
  y: number;
  z: number;
  phase: number;
  shirtColor: string;
  frame: number;
}> = ({ x, y, z, phase, shirtColor, frame }) => {
  const bob = Math.abs(Math.sin(frame * 0.28 + phase)) * 0.1;
  return (
    <group position={[x, y + bob, z]}>
      {/* Torso */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.32, 0.52, 0.22]} />
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.96, 0]} castShadow>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color="#F1C27D" roughness={0.65} />
      </mesh>
      {/* Legs */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.26, 0.32, 0.18]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
    </group>
  );
};

// Detailed KAI Commuter Line (KRL) Train with Animated Sliding Doors & Pantograph
const KRLTrain: React.FC<{
  x: number;
  z: number;
  doorOpen: number; // 0 = closed, 1 = open
  facingNegZ?: boolean;
}> = ({ x, z, doorOpen, facingNegZ = true }) => {
  const cars = [-11.5, 0, 11.5];
  return (
    <group position={[x, 0.32, z]} rotation={[0, facingNegZ ? 0 : Math.PI, 0]}>
      {cars.map((cz, ci) => (
        <group key={ci} position={[0, 0, cz]}>
          {/* Main Car Body (White) */}
          <ArchBox args={[2.35, 2.35, 10.6]} position={[0, 1.48, 0]} color="#F8FAFC" />
          {/* Iconic KAI Commuter Red Roof & Side Stripe */}
          <ArchBox args={[2.38, 0.36, 10.64]} position={[0, 2.52, 0]} color={KRL_RED} outline={false} />
          <mesh position={[0, 0.82, 0]}>
            <boxGeometry args={[2.4, 0.32, 10.64]} />
            <meshStandardMaterial color={KRL_RED} />
          </mesh>
          {/* Yellow Safety Front Accent on Lead Car */}
          {ci === 0 && (
            <>
              <ArchBox args={[2.38, 0.65, 0.14]} position={[0, 1.05, -5.34]} color={KRL_YELLOW} outline={false} />
              <mesh position={[0, 1.85, -5.33]}>
                <boxGeometry args={[1.95, 0.72, 0.08]} />
                <meshStandardMaterial color="#0F172A" roughness={0.2} />
              </mesh>
              {/* Glowing Headlights */}
              <mesh position={[-0.72, 0.95, -5.42]}>
                <boxGeometry args={[0.32, 0.18, 0.05]} />
                <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={1.2} />
              </mesh>
              <mesh position={[0.72, 0.95, -5.42]}>
                <boxGeometry args={[0.32, 0.18, 0.05]} />
                <meshStandardMaterial color="#FEF08A" emissive="#FEF08A" emissiveIntensity={1.2} />
              </mesh>
            </>
          )}
          {/* Side Windows + Animated Sliding Doors */}
          {[-3.2, 0, 3.2].map((dz, di) => (
            <React.Fragment key={di}>
              {/* Interior dark doorway revealed when doors slide open */}
              <mesh position={[1.19, 1.4, dz]}>
                <boxGeometry args={[0.04, 1.55, 1.15]} />
                <meshStandardMaterial color="#1E293B" />
              </mesh>
              <mesh position={[-1.19, 1.4, dz]}>
                <boxGeometry args={[0.04, 1.55, 1.15]} />
                <meshStandardMaterial color="#1E293B" />
              </mesh>
              {/* Left & Right Sliding Door Leaves (east side) */}
              <mesh position={[1.22, 1.4, dz - 0.28 - doorOpen * 0.42]}>
                <boxGeometry args={[0.04, 1.5, 0.54]} />
                <meshStandardMaterial color="#E2E8F0" />
              </mesh>
              <mesh position={[1.22, 1.4, dz + 0.28 + doorOpen * 0.42]}>
                <boxGeometry args={[0.04, 1.5, 0.54]} />
                <meshStandardMaterial color="#E2E8F0" />
              </mesh>
            </React.Fragment>
          ))}
          {/* Dark Window Ribbon */}
          <mesh position={[1.19, 1.82, -1.6]}>
            <boxGeometry args={[0.03, 0.62, 1.7]} />
            <meshStandardMaterial color="#1E3A5F" roughness={0.2} />
          </mesh>
          <mesh position={[1.19, 1.82, 1.6]}>
            <boxGeometry args={[0.03, 0.62, 1.7]} />
            <meshStandardMaterial color="#1E3A5F" roughness={0.2} />
          </mesh>
          <mesh position={[-1.19, 1.82, -1.6]}>
            <boxGeometry args={[0.03, 0.62, 1.7]} />
            <meshStandardMaterial color="#1E3A5F" roughness={0.2} />
          </mesh>
          <mesh position={[-1.19, 1.82, 1.6]}>
            <boxGeometry args={[0.03, 0.62, 1.7]} />
            <meshStandardMaterial color="#1E3A5F" roughness={0.2} />
          </mesh>
          {/* Undercarriage Bogies */}
          <ArchBox args={[2.1, 0.45, 9.4]} position={[0, 0.22, 0]} color="#334155" outline={false} />
          {/* Roof AC Units & Pantograph on Middle Car */}
          <ArchBox args={[1.4, 0.28, 2.2]} position={[0, 2.82, -2.5]} color="#CBD5E1" outline={false} />
          <ArchBox args={[1.4, 0.28, 2.2]} position={[0, 2.82, 2.5]} color="#CBD5E1" outline={false} />
          {ci === 1 && (
            <group position={[0, 2.9, 0]}>
              <mesh position={[0, 0.6, 0]} rotation={[0.45, 0, 0]}>
                <boxGeometry args={[0.1, 1.4, 0.1]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
              <mesh position={[0, 1.25, 0]}>
                <boxGeometry args={[1.3, 0.08, 0.14]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  );
};

// Sleek LRT Jabodebek Train (White + Red Stripe on Elevated Viaduct)
const LRTTrain: React.FC<{ x: number; y: number; z: number }> = ({ x, y, z }) => (
  <group position={[x, y, z]}>
    {[-8.5, 0, 8.5].map((dx, i) => (
      <group key={i} position={[dx, 0, 0]}>
        <ArchBox args={[7.8, 2.1, 2.2]} position={[0, 1.2, 0]} color="#F8FAFC" />
        <mesh position={[0, 1.55, 1.12]}>
          <boxGeometry args={[7.2, 0.62, 0.04]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
        <mesh position={[0, 0.85, 1.12]}>
          <boxGeometry args={[7.82, 0.28, 0.05]} />
          <meshStandardMaterial color={KRL_RED} />
        </mesh>
      </group>
    ))}
  </group>
);

// Animated Traffic Vehicle (Car or Transpatriot Bus)
const UrbanVehicle: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  color: string;
  isBus?: boolean;
  braking?: boolean;
}> = ({ position, rotationY = 0, color, isBus = false, braking = false }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {isBus ? (
      <>
        <ArchBox args={[1.7, 1.65, 5.0]} position={[0, 1.05, 0]} color="#F8FAFC" />
        <mesh position={[0, 1.32, 0]}>
          <boxGeometry args={[1.74, 0.55, 4.4]} />
          <meshStandardMaterial color="#1E3A5F" />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[1.74, 0.34, 5.04]} />
          <meshStandardMaterial color="#0284C7" />
        </mesh>
      </>
    ) : (
      <>
        <ArchBox args={[1.38, 0.55, 2.75]} position={[0, 0.48, 0]} color={color} />
        <ArchBox args={[1.2, 0.46, 1.4]} position={[0, 0.98, -0.1]} color="#CBD5E1" />
      </>
    )}
    {braking && (
      <>
        <mesh position={[-0.45, 0.55, 1.42]}>
          <boxGeometry args={[0.25, 0.14, 0.06]} />
          <meshStandardMaterial color={ACCENT_RED} emissive={ACCENT_RED} emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[0.45, 0.55, 1.42]}>
          <boxGeometry args={[0.25, 0.14, 0.06]} />
          <meshStandardMaterial color={ACCENT_RED} emissive={ACCENT_RED} emissiveIntensity={1.6} />
        </mesh>
      </>
    )}
  </group>
);

// Moving 3D Escalator inside Stasiun Bekasi Ekstensi (Animated steps!)
const AnimatedEscalator: React.FC<{
  position: [number, number, number];
  frame: number;
  goingUp?: boolean;
}> = ({ position, frame, goingUp = true }) => {
  const stepCount = 10;
  return (
    <group position={position}>
      {/* Side glass balustrades */}
      <ArchBox args={[0.1, 0.9, 5.8]} position={[-0.65, 1.7, 0]} rotation={[-0.48, 0, 0]} color={GLASS_TEAL} transparent opacity={0.45} outline={false} />
      <ArchBox args={[0.1, 0.9, 5.8]} position={[0.65, 1.7, 0]} rotation={[-0.48, 0, 0]} color={GLASS_TEAL} transparent opacity={0.45} outline={false} />
      {/* Moving metallic steps */}
      {Array.from({ length: stepCount }).map((_, i) => {
        const raw = ((i / stepCount) + (goingUp ? frame * 0.014 : -frame * 0.014)) % 1;
        const u = raw < 0 ? raw + 1 : raw;
        const sy = 0.25 + u * 2.6;
        const sz = 2.4 - u * 4.8;
        return (
          <mesh key={i} position={[0, sy, sz]}>
            <boxGeometry args={[1.15, 0.14, 0.42]} />
            <meshStandardMaterial color="#64748B" metalness={0.4} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
};

// Modern Summarecon Bekasi High-Rise Tower
const SummareconTower: React.FC<{
  position: [number, number, number];
  w: number;
  h: number;
  d: number;
}> = ({ position, w, h, d }) => {
  const floors = Math.floor(h / 2.8);
  return (
    <group position={position}>
      <ArchBox args={[w, h, d]} position={[0, h / 2, 0]} color="#EFECE3" />
      {Array.from({ length: floors }).map((_, i) => (
        <mesh key={i} position={[0, 1.8 + i * 2.7, 0]}>
          <boxGeometry args={[w + 0.08, 1.15, d + 0.08]} />
          <meshStandardMaterial color="#7AA2C0" roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

// 3D Glowing Directional Flow Arrow (Scene 5: Barat/Selatan vs Utara/Timur)
const FlowArrow3D: React.FC<{
  position: [number, number, number];
  rotationY: number;
  color: string;
  pulse: number;
}> = ({ position, rotationY, color, pulse }) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={[1 + pulse * 0.08, 1, 1 + pulse * 0.08]}>
    <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.38, 0.38, 5.2, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45 + pulse * 0.35} />
    </mesh>
    <mesh position={[3.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <coneGeometry args={[0.92, 1.9, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45 + pulse * 0.35} />
    </mesh>
  </group>
);

const CameraRig: React.FC<{
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
}> = ({ pos, lookAt, fov = 42 }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [camera, pos[0], pos[1], pos[2], lookAt[0], lookAt[1], lookAt[2], fov]);
  return null;
};

// Complete Living TOD Summarecon — Stasiun Bekasi Ekstensi 3D World
const BekasiTODWorld: React.FC<{ frame: number; totalFrames: number }> = ({
  frame,
  totalFrames,
}) => {
  const sec = frame / STASIUN_SUMMARECON_FPS;
  const totalSec = totalFrames / STASIUN_SUMMARECON_FPS;
  // 8 dynamic story chapters strictly synced to narration
  const sceneBounds = [0, 7.0, 14.0, 21.5, 25.0, 35.5, 43.0, 52.0, totalSec + 1];
  let scene = 7;
  for (let i = 0; i < 8; i++) {
    if (sec >= sceneBounds[i] && sec < sceneBounds[i + 1]) {
      scene = i;
      break;
    }
  }
  const localSec = sec - sceneBounds[scene];
  const sceneDur = Math.max(1, sceneBounds[scene + 1] - sceneBounds[scene]);
  const p = Math.min(1, localSec / sceneDur);
  const smoothP = Easing.inOut(Easing.cubic)(p);
  const pulse = Math.sin(sec * Math.PI * 3) * 0.5 + 0.5;

  // === Animated KRL Trains ===
  // Train 1 arrives smoothly onto Track 1 (x = -7.2) in Scene 1 & stops with doors opening in Scene 3-4
  let krl1Z = 0;
  let krl1Doors = 0;
  if (scene === 0) {
    krl1Z = interpolate(p, [0, 1], [34, 4], { easing: Easing.out(Easing.cubic) });
  } else if (scene === 3) {
    krl1Z = 2;
    krl1Doors = interpolate(localSec, [0.8, 1.8, 4.8, 5.6], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else {
    krl1Z = 28 - ((frame * 0.28) % 90);
  }
  // Train 2 runs continuously on Track 3 (x = -1.6)
  const krl2Z = -38 + ((frame * 0.36) % 105);

  // === Animated Building Extension Reveal (Scene 3) & X-Ray Cutaway (Scene 4) ===
  const extRise =
    scene === 2
      ? interpolate(localSec, [0, 1.4], [0.08, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.1)),
        })
      : 1;
  const skybridgeGrow =
    scene === 2
      ? interpolate(localSec, [1.1, 2.5], [0.05, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
      : 1;
  const xrayMode = scene === 3;
  const facadeOpacity = xrayMode
    ? interpolate(localSec, [0, 0.7], [0.92, 0.18], { extrapolateRight: "clamp" })
    : 0.92;
  const highlightExt = scene === 2 || scene === 4;
  const highlightOldJam = scene === 1;
  const highlightLRT = scene === 5;

  // === Animated Traffic on Jl. Perjuangan (x = +3.5) & Flyover KH Noer Ali (z = -26) ===
  const jamMode = scene === 1;
  const roadSpeed = jamMode ? 0.04 : 0.32;
  const flyoverCar1 = -35 + ((frame * 0.45) % 85);
  const flyoverCar2 = 20 - ((frame * 0.38) % 85);
  const lrtX = -32 + ((frame * 0.48) % 92);

  // === Dynamic Multi-Angle Camera Choreography (Verified Unobstructed!) ===
  let camPos: [number, number, number] = [24, 18, 32];
  let camLook: [number, number, number] = [1, 3.5, 0];
  let fov = 44;

  if (scene === 0) {
    // Scene 1: Sweeping hero aerial reveal of BOTH stations + Skybridge + KRL gliding in!
    camPos = [22 - smoothP * 6, 17 - smoothP * 2.5, 34 - smoothP * 5];
    camLook = [2, 3.8, 0];
    fov = 44;
  } else if (scene === 1) {
    // Scene 2: Low urban angle on congested Jl. Perjuangan & crowded old station entrance
    camPos = [5.5 - smoothP * 1.5, 6.2, 26 - smoothP * 5];
    camLook = [-4.5, 2.2, 2];
    fov = 44;
  } else if (scene === 2) {
    // Scene 3: Dramatic architectural reveal of 3-story Stasiun Ekstensi + Skybridge spanning tracks!
    camPos = [19 - smoothP * 5, 10.5 + smoothP * 2, 25 - smoothP * 4];
    camLook = [4, 4.8, 0];
    fov = 45;
  } else if (scene === 3) {
    // Scene 4: X-Ray Cutaway zoom right into the 3 floors, moving escalators & KRL doors opening!
    camPos = [11.5 - smoothP * 2.5, 6.8, 22 - smoothP * 4.5];
    camLook = [8.5, 4.2, 0];
    fov = 42;
  } else if (scene === 4) {
    // Scene 5: Elevated 3/4 diagram showing TWO passenger flow arrows (Orange vs Teal) + Save Metrics
    camPos = [14 + smoothP * 5, 23 - smoothP * 2, 30];
    camLook = [1, 3.5, 0];
    fov = 46;
  } else if (scene === 5) {
    // Scene 6: Tracking aerial along the 5 km transit corridor & elevated LRT Jabodebek!
    camPos = [16 - smoothP * 12, 16.5, 16 - smoothP * 10];
    camLook = [4, 8.5, -28];
    fov = 45;
  } else if (scene === 6) {
    // Scene 7: Lively intermodal angle showing KRL + Transpatriot bus + Flyover + Skybridge commuters
    camPos = [-16 + smoothP * 5, 11.5, 28 - smoothP * 4];
    camLook = [4, 4.5, -2];
    fov = 44;
  } else {
    // Scene 8: Grand smooth orbital pull-back around the entire Bekasi TOD!
    const angle = interpolate(smoothP, [0, 1], [0.55, 0.92]);
    camPos = [Math.sin(angle) * 38, 17 + smoothP * 4, Math.cos(angle) * 38];
    camLook = [2, 4.2, -2];
    fov = 45;
  }

  return (
    <>
      <color attach="background" args={[SKY_CREAM]} />
      <fog attach="fog" args={[FOG_CREAM, 65, 185]} />
      <CameraRig pos={camPos} lookAt={camLook} fov={fov} />

      {/* Warm Sunlit Architectural Studio Lighting */}
      <hemisphereLight args={["#FFFFFF", "#CBD5E1", 1.15]} />
      <directionalLight
        position={[38, 62, 34]}
        intensity={1.25}
        color="#FFFBEB"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Base Ground Slab (y = -0.3 so road/ballast sit cleanly above at y >= 0, ZERO Z-fighting!) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, -10]} receiveShadow>
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial color="#DFDDD4" roughness={0.95} />
      </mesh>

      {/* === 1. RAIL CORRIDOR (4 Tracks, Ballast, Sleepers, Overhead Catenary LAA) === */}
      <ArchBox args={[14.0, 0.24, 150]} position={[-4.5, -0.14, -10]} color="#A8A29E" outline={false} />
      {[-9.8, -7.2, -1.6, 1.0].map((tx, ti) => (
        <group key={ti}>
          {/* Steel Rails */}
          <mesh position={[tx - 0.55, 0.06, -10]}>
            <boxGeometry args={[0.1, 0.12, 150]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[tx + 0.55, 0.06, -10]}>
            <boxGeometry args={[0.1, 0.12, 150]} />
            <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* Overhead Steel Catenary Portals (Tiang LAA) */}
      {[-34, -18, 12, 28].map((pz, pi) => (
        <group key={pi} position={[-4.5, 0, pz]}>
          <ArchBox args={[0.35, 6.2, 0.35]} position={[-7.2, 3.1, 0]} color="#64748B" outline={false} />
          <ArchBox args={[0.35, 6.2, 0.35]} position={[7.2, 3.1, 0]} color="#64748B" outline={false} />
          <ArchBox args={[14.8, 0.28, 0.28]} position={[0, 5.9, 0]} color="#64748B" outline={false} />
        </group>
      ))}

      {/* Concrete Island Platform (between Track 2 & Track 3, x = -4.4) */}
      <ArchBox args={[2.8, 0.9, 44]} position={[-4.4, 0.45, 0]} color={CONCRETE} />
      {/* Yellow Tactile Safety Strips */}
      <mesh position={[-5.65, 0.92, 0]}>
        <boxGeometry args={[0.16, 0.03, 43.6]} />
        <meshStandardMaterial color={KRL_YELLOW} />
      </mesh>
      <mesh position={[-3.15, 0.92, 0]}>
        <boxGeometry args={[0.16, 0.03, 43.6]} />
        <meshStandardMaterial color={KRL_YELLOW} />
      </mesh>
      {/* Glowing LED Platform Sign */}
      <ArchBox args={[2.2, 0.65, 0.22]} position={[-4.4, 3.8, 11]} color="#0F172A" />
      <mesh position={[-4.4, 3.8, 11.13]}>
        <boxGeometry args={[1.85, 0.32, 0.02]} />
        <meshStandardMaterial color={ACCENT_CYAN} emissive={ACCENT_CYAN} emissiveIntensity={1.0} />
      </mesh>

      {/* Animated KRL Commuter Trains */}
      <KRLTrain x={-7.2} z={krl1Z} doorOpen={krl1Doors} facingNegZ />
      <KRLTrain x={-1.6} z={krl2Z} doorOpen={0} facingNegZ={false} />

      {/* === 2. STASIUN BEKASI EKSISTING (Left/North Side, x = -14.5) === */}
      <group position={[-14.5, 0, 0]}>
        <ArchBox
          args={[6.8, 4.6, 30]}
          position={[0, 2.3, 0]}
          color={highlightOldJam ? "#FCA5A5" : scene === 4 ? "#99F6E4" : CONCRETE}
          emissive={highlightOldJam ? ACCENT_RED : scene === 4 ? ACCENT_TEAL : undefined}
          emissiveIntensity={highlightOldJam || scene === 4 ? 0.18 : 0}
        />
        {/* Iconic Blue-Slate Station Roof */}
        <ArchBox
          args={[8.6, 0.55, 32]}
          position={[0.6, 5.1, 0]}
          color={scene === 4 ? ACCENT_TEAL : "#335C81"}
        />
        {/* Entrance Canopy & Crowded Passengers in Scene 2 */}
        <ArchBox args={[2.6, 0.35, 10]} position={[4.2, 3.1, 6]} color={CONCRETE_DARK} />
        {Array.from({ length: 8 }).map((_, i) => (
          <AnimatedCommuter
            key={i}
            x={3.6 + (i % 3) * 0.65}
            y={0}
            z={3.2 + Math.floor(i / 3) * 1.4}
            phase={i * 1.1}
            shirtColor={highlightOldJam ? ACCENT_RED : i % 2 === 0 ? "#0F766E" : "#3B82F6"}
            frame={frame}
          />
        ))}
      </group>

      {/* === 3. JL. PERJUANGAN (Ground Road between Tracks & Extension, x = +5.6) === */}
      <ArchBox args={[5.8, 0.2, 145]} position={[5.6, -0.1, -10]} color={ASPHALT} outline={false} />
      {/* Dashed white road lane divider */}
      {Array.from({ length: 24 }).map((_, i) => (
        <mesh key={i} position={[5.6, 0.02, 42 - i * 5.2]}>
          <boxGeometry args={[0.14, 0.02, 2.2]} />
          <meshStandardMaterial color="#F8FAFC" />
        </mesh>
      ))}
      {/* Traffic along Jl. Perjuangan (jammed with glowing red brake lights in Scene 2!) */}
      {[0, 1, 2, 3, 4].map((vi) => {
        const vz = jamMode
          ? 16 - vi * 4.4 - ((frame * roadSpeed) % 4)
          : 36 - ((vi * 17 + frame * roadSpeed) % 90);
        return (
          <UrbanVehicle
            key={vi}
            position={[vi % 2 === 0 ? 4.3 : 6.9, 0.05, vz]}
            rotationY={vi % 2 === 0 ? 0 : Math.PI}
            color={["#EA580C", "#2563EB", "#F8FAFC", "#F59E0B", "#64748B"][vi]}
            isBus={vi === 1}
            braking={jamMode}
          />
        );
      })}

      {/* === 4. STASIUN BEKASI EKSTENSI — TOD SUMMARECON (3-Lantai Modern Landmark, x = +15.2) === */}
      <group position={[15.2, 0, 0]} scale={[1, extRise, 1]}>
        {/* Landscaped TOD Pedestrian Plaza & Green Bike Lane */}
        <ArchBox args={[14.5, 0.35, 38]} position={[0.5, 0.02, 0]} color="#E2E8F0" />
        <mesh position={[-5.6, 0.22, 0]}>
          <boxGeometry args={[1.1, 0.03, 36]} />
          <meshStandardMaterial color="#10B981" />
        </mesh>

        {/* 3 Floor Slabs (Lantai 1, 2, 3 — crisp white architectural edges) */}
        <ArchBox args={[10.5, 0.45, 26]} position={[0, 0.45, 0]} color={CONCRETE} />
        <ArchBox args={[10.5, 0.42, 26]} position={[0, 3.6, 0]} color={CONCRETE} />
        <ArchBox args={[10.5, 0.42, 26]} position={[0, 6.75, 0]} color={CONCRETE} />

        {/* Structural Corner Columns */}
        {[
          [-4.8, -12.2],
          [4.8, -12.2],
          [-4.8, 0],
          [4.8, 0],
          [-4.8, 12.2],
          [4.8, 12.2],
        ].map(([cx, cz], i) => (
          <ArchBox key={i} args={[0.75, 9.6, 0.75]} position={[cx, 5.0, cz]} color={CONCRETE_DARK} />
        ))}

        {/* Architectural Glass Curtain Wall (goes semi-transparent in Scene 4 X-Ray Cutaway!) */}
        <ArchBox
          args={[10.2, 8.8, 25.4]}
          position={[0, 4.9, 0]}
          color={highlightExt ? "#FB923C" : GLASS_TEAL}
          transparent
          opacity={xrayMode ? facadeOpacity : 0.48}
          emissive={highlightExt ? ACCENT_ORANGE : undefined}
          emissiveIntensity={highlightExt ? 0.22 : 0}
        />

        {/* Iconic Sloped Architectural Wing Canopy Roof (Floating clean over Floor 3) */}
        <ArchBox
          args={[12.8, 0.65, 28.5]}
          position={[0, 10.2, 0]}
          rotation={[0, 0, 0.08]}
          color={highlightExt ? ACCENT_ORANGE : "#F8FAFC"}
        />
        {/* Exposed Orange/Slate Steel Roof Ribs */}
        {[-11, -5.5, 0, 5.5, 11].map((rz, i) => (
          <ArchBox
            key={i}
            args={[13.2, 0.35, 0.42]}
            position={[0, 9.8, rz]}
            rotation={[0, 0, 0.08]}
            color={ACCENT_ORANGE}
          />
        ))}

        {/* Interior Animated Escalators (Floor 1 -> 2 & Floor 2 -> 3, visible in X-Ray Cutaway!) */}
        <AnimatedEscalator position={[-1.5, 0.65, 3.0]} frame={frame} goingUp />
        <AnimatedEscalator position={[1.5, 3.8, -2.5]} frame={frame} goingUp={false} />

        {/* Glowing Ticket Tap-Gates on Floor 2 */}
        {[-3, -1.5, 0, 1.5, 3].map((gz, i) => (
          <group key={i} position={[-3.2, 4.2, gz]}>
            <ArchBox args={[0.9, 0.9, 0.28]} color="#334155" outline={false} />
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[0.3, 0.08, 0.14]} />
              <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={1.2} />
            </mesh>
          </group>
        ))}

        {/* Animated Commuters inside Floor 1 & Floor 2 Concourse */}
        {[0, 1, 2, 3, 4, 5].map((ci) => {
          const cz = -9 + ((ci * 3.5 + frame * 0.09) % 18);
          return (
            <AnimatedCommuter
              key={ci}
              x={ci % 2 === 0 ? -1.8 : 2.2}
              y={ci % 2 === 0 ? 3.82 : 0.68}
              z={cz}
              phase={ci * 0.9}
              shirtColor={["#EA580C", "#0F766E", "#2563EB", "#F59E0B", "#EC4899", "#06B6D4"][ci]}
              frame={frame}
            />
          );
        })}

        {/* TOD Feeder Bus Drop-Off Bay right in front of Stasiun Ekstensi */}
        <UrbanVehicle position={[-6.8, 0.2, -7 + Math.sin(sec * 0.8) * 1.5]} color="#0284C7" isBus />
      </group>

      {/* === 5. ICONIC ELEVATED GLASS SKYBRIDGE (Connecting Stasiun Ekstensi <-> Stasiun Bekasi!) === */}
      <group position={[0.4, 6.2, 0]} scale={[skybridgeGrow, 1, 1]}>
        {/* Main Structural Deck Spanning x = -11.5 to +11.5 */}
        <ArchBox
          args={[23.2, 0.55, 4.4]}
          position={[0, 0, 0]}
          color={highlightExt ? ACCENT_ORANGE : CONCRETE}
        />
        {/* Translucent Cyan Glass Enclosure */}
        <ArchBox
          args={[22.8, 2.7, 4.0]}
          position={[0, 1.65, 0]}
          color={GLASS_TEAL}
          transparent
          opacity={0.34}
          outline={false}
        />
        {/* Architectural Steel Truss Frames every 3.5m */}
        {[-10, -6.5, -3, 0.5, 4, 7.5, 10.5].map((sx, i) => (
          <group key={i} position={[sx, 1.65, 0]}>
            <ArchBox args={[0.26, 2.9, 0.26]} position={[0, 0, 2.05]} color={ACCENT_ORANGE} outline={false} />
            <ArchBox args={[0.26, 2.9, 0.26]} position={[0, 0, -2.05]} color={ACCENT_ORANGE} outline={false} />
            <ArchBox args={[0.28, 0.28, 4.4]} position={[0, 1.48, 0]} color={INK} outline={false} />
          </group>
        ))}
        {/* Roof Slab */}
        <ArchBox args={[23.4, 0.32, 4.6]} position={[0, 3.22, 0]} color="#F8FAFC" />

        {/* Support Piers cleanly outside tracks & road */}
        <ArchBox args={[1.1, 6.2, 1.4]} position={[9.4, -3.2, 0]} color={CONCRETE_DARK} />
        <ArchBox args={[1.1, 6.2, 1.4]} position={[-10.8, -3.2, 0]} color={CONCRETE_DARK} />

        {/* 10 Animated Commuters Walking Smoothly Across the Skybridge! */}
        {Array.from({ length: 10 }).map((_, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          const rawX = ((i * 2.3 + frame * 0.11 * dir) % 20 + 20) % 20 - 10;
          return (
            <AnimatedCommuter
              key={i}
              x={rawX}
              y={0.3}
              z={dir > 0 ? 0.85 : -0.85}
              phase={i * 1.4}
              shirtColor={["#EA580C", "#0F766E", "#2563EB", "#F59E0B", "#0F172A"][i % 5]}
              frame={frame}
            />
          );
        })}
      </group>

      {/* === 6. FLYOVER KH NOER ALI SUMMARECON & 5 KM LRT JABODEBEK CORRIDOR (Background, z = -26 & -36) === */}
      {/* Flyover KH Noer Ali */}
      <group position={[0, 8.6, -24]}>
        <ArchBox args={[95, 1.1, 7.6]} position={[0, 0, 0]} color={CONCRETE_MID} />
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[95, 0.06, 6.6]} />
          <meshStandardMaterial color={ASPHALT} />
        </mesh>
        {[-22, 2, 26].map((px, i) => (
          <ArchBox key={i} args={[1.8, 8.6, 2.2]} position={[px, -4.5, 0]} color={CONCRETE_DARK} />
        ))}
        <UrbanVehicle position={[flyoverCar1, 0.66, -1.6]} rotationY={Math.PI / 2} color="#EA580C" />
        <UrbanVehicle position={[flyoverCar2, 0.66, 1.6]} rotationY={-Math.PI / 2} color="#38BDF8" isBus />
      </group>

      {/* Elevated LRT Jabodebek Viaduct (5 km Integration Corridor) */}
      <group position={[0, 12.6, -36]}>
        <ArchBox
          args={[110, 1.35, 5.2]}
          position={[0, 0, 0]}
          color={highlightLRT ? ACCENT_ORANGE : CONCRETE}
          emissive={highlightLRT ? ACCENT_ORANGE : undefined}
          emissiveIntensity={highlightLRT ? 0.22 : 0}
        />
        {[-30, -10, 10, 30].map((px, i) => (
          <ArchBox key={i} args={[1.6, 12.6, 1.8]} position={[px, -6.5, 0]} color={CONCRETE_DARK} />
        ))}
        <LRTTrain x={lrtX} y={0.72} z={0} />
      </group>

      {/* === 7. SUMMARECON BEKASI SKYLINE & LANDSCAPING === */}
      {[
        [32, 0, -14, 11, 28, 11],
        [34, 0, 6, 10, 22, 10],
        [28, 0, -48, 13, 34, 12],
        [-28, 0, -16, 10, 20, 10],
        [-30, 0, 10, 9, 16, 9],
      ].map(([x, y, z, w, h, d], i) => (
        <SummareconTower key={i} position={[x, y, z]} w={w} h={h} d={d} />
      ))}

      {/* Stylized Green Urban Trees along TOD Boulevard */}
      {[
        [23, -10],
        [23, 0],
        [23, 10],
        [23, 18],
        [-20, 16],
        [-20, -12],
      ].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh position={[0, 1.0, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.28, 2.0, 8]} />
            <meshStandardMaterial color="#78350F" />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <dodecahedronGeometry args={[1.65, 0]} />
            <meshStandardMaterial color="#15803D" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* === 8. SCENE 5 GLOWING 3D FLOW ARROWS (Barat/Selatan -> Ekstensi vs Utara/Timur -> Lama) === */}
      {scene === 4 && (
        <>
          {/* Orange Arrow: Barat & Selatan -> Stasiun Bekasi Ekstensi */}
          <FlowArrow3D position={[23.5, 11.8, 5]} rotationY={Math.PI} color={ACCENT_ORANGE} pulse={pulse} />
          {/* Teal Arrow: Utara & Timur -> Stasiun Bekasi Lama */}
          <FlowArrow3D position={[-22.5, 9.8, 5]} rotationY={0} color={ACCENT_TEAL} pulse={pulse} />
        </>
      )}
    </>
  );
};

// Hairline Technical Callout (NO card/box, accentColor per SOP Rule 4!)
const HairlineCallout: React.FC<{
  label: string;
  x: number;
  y: number;
  accentColor: string;
  localSec: number;
}> = ({ label, x, y, accentColor, localSec }) => {
  const op = interpolate(localSec, [0.35, 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        opacity: op,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 27,
          fontWeight: 900,
          color: accentColor,
          textShadow: "0 3px 14px rgba(0,0,0,0.92), 0 0 5px rgba(0,0,0,0.95)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 2.5,
          height: 62,
          backgroundColor: accentColor,
          marginTop: 4,
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: accentColor,
          border: "2.5px solid #FFFFFF",
          boxShadow: "0 2px 8px rgba(0,0,0,0.75)",
        }}
      />
    </div>
  );
};

interface SubCue {
  startSec: number;
  endSec: number;
  text: string;
  highlightWord: string;
}

const SUBTITLES: SubCue[] = [
  { startSec: 0, endSec: 3.5, text: "Stasiun Bekasi bakal punya kembaran baru.", highlightWord: "kembaran" },
  { startSec: 3.5, endSec: 7.0, text: "Bukan stasiun terpisah. Tapi ekstensi tiga lantai.", highlightWord: "tiga" },
  { startSec: 7.0, endSec: 10.5, text: "Warga Bekasi pasti hafal macetnya Jalan Perjuangan.", highlightWord: "macetnya" },
  { startSec: 10.5, endSec: 14.0, text: "Penumpang KRL numpuk di satu pintu saja.", highlightWord: "numpuk" },
  { startSec: 14.0, endSec: 17.8, text: "Solusinya? Groundbreaking dimulai Juli 2026.", highlightWord: "2026." },
  { startSec: 17.8, endSec: 21.5, text: "Stasiun Bekasi Ekstensi di TOD Summarecon Bekasi.", highlightWord: "Summarecon" },
  { startSec: 21.5, endSec: 25.0, text: "Luas bangunannya 6.733 meter persegi.", highlightWord: "6.733" },
  { startSec: 25.0, endSec: 28.5, text: "Langsung nyambung ke stasiun lama lewat skybridge layang.", highlightWord: "skybridge" },
  { startSec: 28.5, endSec: 32.0, text: "Arus penumpang dibagi dua: Ekstensi layani barat & selatan.", highlightWord: "barat" },
  { startSec: 32.0, endSec: 35.5, text: "Stasiun lama fokus layani utara & timur.", highlightWord: "utara" },
  { startSec: 35.5, endSec: 39.2, text: "Investasi Rp78 miliar. Target pengerjaan 18 bulan.", highlightWord: "Rp78" },
  { startSec: 39.2, endSec: 43.0, text: "Tahap lanjut: jalur transit 5 km ke LRT Jabodebek.", highlightWord: "LRT" },
  { startSec: 43.0, endSec: 47.5, text: "Kirim ke temen lo yang tiap pagi rebutan KRL di Bekasi.", highlightWord: "rebutan" },
  { startSec: 47.5, endSec: 52.0, text: "Simpan dulu, angkanya ada di detik 25.", highlightWord: "detik" },
  { startSec: 52.0, endSec: 60.0, text: "Skybridge ini bakal ngurangin macet? Like, Komen, dan Follow!", highlightWord: "Like," },
];

const CALLOUTS: { label: string; x: number; y: number; accentColor: string }[] = [
  { label: "Skybridge + Stasiun Ekstensi 3 Lantai", x: 52, y: 36, accentColor: ACCENT_AMBER },
  { label: "Penumpukan 1 Pintu Jl. Perjuangan", x: 46, y: 38, accentColor: "#FF6B6B" },
  { label: "Gedung Baru 6.733 m² + Skybridge", x: 56, y: 36, accentColor: ACCENT_ORANGE },
  { label: "Cutaway 3 Lantai • Eskalator & Tap Gate", x: 54, y: 36, accentColor: ACCENT_CYAN },
  { label: "Arus Dibagi 2: Barat/Selatan vs Utara/Timur", x: 50, y: 38, accentColor: ACCENT_AMBER },
  { label: "Koridor Transit 5 km -> LRT Jabodebek", x: 52, y: 36, accentColor: "#4ADE80" },
  { label: "Integrasi KRL • Bus • Sepeda • Flyover", x: 50, y: 37, accentColor: ACCENT_CYAN },
  { label: "TOD Summarecon Bekasi — Target 18 Bulan", x: 50, y: 38, accentColor: ACCENT_AMBER },
];

export const StasiunSummarecon3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const sec = frame / fps;
  const totalSec = durationInFrames / fps;

  const sceneBounds = [0, 7.0, 14.0, 21.5, 25.0, 35.5, 43.0, 52.0, totalSec + 1];
  let scene = 7;
  for (let i = 0; i < 8; i++) {
    if (sec >= sceneBounds[i] && sec < sceneBounds[i + 1]) {
      scene = i;
      break;
    }
  }
  const localSec = sec - sceneBounds[scene];
  const activeSub = SUBTITLES.find((s) => sec >= s.startSec && sec < s.endSec) || SUBTITLES[SUBTITLES.length - 1];
  const callout = CALLOUTS[scene];

  const hookOp = interpolate(sec, [0, 0.3, 6.2, 6.8], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const metricPop = spring({
    frame: Math.max(0, frame - Math.round(25 * fps)),
    fps,
    config: { damping: 13, stiffness: 130 },
  });
  const ctaPop = spring({
    frame: Math.max(0, frame - Math.round(52.0 * fps)),
    fps,
    config: { damping: 14, stiffness: 130 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: SKY_CREAM, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* VO Riko + Crisp Scene Transition SFX (Whoosh + Metric Chirp at 25s!) */}
      <Audio src={staticFile("audio/stasiun-summarecon-bekasi/vo_riko.mp3")} volume={1.0} />
      {[210, 420, 645, 750, 1065, 1290, 1560].map((f) => (
        <Sequence key={f} from={f} durationInFrames={18}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.32} />
        </Sequence>
      ))}
      <Sequence from={750} durationInFrames={8}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.55} />
      </Sequence>

      {/* Full-Bleed Architectural 3D Diorama */}
      <ThreeCanvas width={width} height={height} shadows style={{ width: "100%", height: "100%" }}>
        <BekasiTODWorld frame={frame} totalFrames={durationInFrames} />
      </ThreeCanvas>

      {/* NO "Cerita Teknik" badge in top-right (strict SOP compliance!) */}

      {/* Frame 1 Burned-In Headline — MAX 4 WORDS! (Threads + SOP Rule, Safe Zone Top >= 165px) */}
      {hookOp > 0 && (
        <div
          style={{
            position: "absolute",
            top: 165,
            left: 72,
            right: 72,
            textAlign: "center",
            opacity: hookOp,
          }}
        >
          <div
            style={{
              fontSize: 66,
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1.1,
              textShadow: "0 6px 24px rgba(0,0,0,0.88), 0 0 8px rgba(0,0,0,0.95)",
              WebkitTextStroke: "2px rgba(15,23,42,0.88)",
            }}
          >
            STASIUN BEKASI
          </div>
          <div
            style={{
              fontSize: 70,
              fontWeight: 900,
              color: ACCENT_AMBER,
              lineHeight: 1.1,
              marginTop: 4,
              textShadow: "0 6px 24px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.95)",
              WebkitTextStroke: "2px rgba(15,23,42,0.88)",
            }}
          >
            DIBELAH DUA?
          </div>
        </div>
      )}

      {/* Detik 25–32 Save Anchor Floating Metrics (6.733 m² • Rp78 M • 18 Bulan) */}
      {scene === 4 && (
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 72,
            right: 72,
            textAlign: "center",
            transform: `scale(${interpolate(metricPop, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: ACCENT_ORANGE,
              lineHeight: 1,
              textShadow: "0 6px 22px rgba(0,0,0,0.5)",
              WebkitTextStroke: "3px #FFFFFF",
            }}
          >
            Rp78 MILIAR
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 38,
              fontWeight: 900,
              color: "#0F172A",
              textShadow: "0 2px 10px rgba(255,255,255,0.95)",
            }}
          >
            6.733 m² • 3 Lantai • Target 18 Bulan
          </div>
        </div>
      )}

      {/* Scene 6 Metric Pop (5 KM -> LRT JABODEBEK) */}
      {scene === 5 && (
        <div
          style={{
            position: "absolute",
            top: 170,
            left: 72,
            right: 72,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 98,
              fontWeight: 900,
              color: ACCENT_TEAL,
              lineHeight: 1,
              textShadow: "0 6px 22px rgba(0,0,0,0.45)",
              WebkitTextStroke: "3px #FFFFFF",
            }}
          >
            5 KM TRANSIT
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 34,
              fontWeight: 900,
              color: "#0F172A",
              textShadow: "0 2px 10px rgba(255,255,255,0.95)",
            }}
          >
            Bekasi Utara → Summarecon → LRT Jabodebek
          </div>
        </div>
      )}

      {/* Hairline Technical Callout */}
      {callout && (
        <HairlineCallout
          label={callout.label}
          x={callout.x}
          y={callout.y}
          accentColor={callout.accentColor}
          localSec={localSec}
        />
      )}

      {/* CTA Banner in Final 8 Seconds */}
      {sec >= 52.0 && (
        <div
          style={{
            position: "absolute",
            top: 170,
            left: 72,
            right: 72,
            textAlign: "center",
            transform: `scale(${interpolate(ctaPop, [0, 1], [0.85, 1])})`,
          }}
        >
          <div
            style={{
              fontSize: 54,
              fontWeight: 900,
              color: ACCENT_AMBER,
              textShadow: "0 5px 22px rgba(0,0,0,0.9)",
              WebkitTextStroke: "2px #0F172A",
            }}
          >
            LIKE, KOMEN & FOLLOW!
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 30,
              fontWeight: 800,
              color: "#FFFFFF",
              textShadow: "0 4px 16px rgba(0,0,0,0.92)",
            }}
          >
            Skybridge ini bakal ngurangin macet Stasiun Bekasi?
          </div>
        </div>
      )}

      {/* Floating Kinetic Subtitle — NO BOX! (SOP Rule 4, Safe Zone Bottom >= 270px) */}
      {activeSub && (
        <div
          style={{
            position: "absolute",
            bottom: 270,
            left: 72,
            right: 72,
            textAlign: "center",
            fontSize: 42,
            fontWeight: 900,
            lineHeight: 1.28,
            color: "#FFFFFF",
            textShadow: "0 5px 18px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.95)",
            WebkitTextStroke: "1.6px rgba(15,23,42,0.88)",
          }}
        >
          {activeSub.text.split(" ").map((word, idx) => {
            const isHi = word.toLowerCase().includes(activeSub.highlightWord.toLowerCase());
            return (
              <span
                key={idx}
                style={{
                  color: isHi ? ACCENT_AMBER : "#FFFFFF",
                  marginRight: 10,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      )}

      {/* Official Reference Line (Safe Zone Bottom >= 220px) */}
      <div
        style={{
          position: "absolute",
          bottom: 222,
          left: 72,
          right: 72,
          textAlign: "center",
          fontSize: 22,
          fontWeight: 700,
          color: "#F8FAFC",
          textShadow: "0 2px 10px rgba(0,0,0,0.9)",
        }}
      >
        Sumber: Kemenko IPK / Kemenhub / KAI / Summarecon (Juli 2026)
      </div>
    </AbsoluteFill>
  );
};
