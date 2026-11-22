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

export const SAYAP_3D_PRO_FPS = 30;
export const SAYAP_3D_PRO_FRAMES = 1530; // 51.0s (VO Riko is 49.296s + 1.7s CTA buffer)

// === Editorial Technical Toon Palette (0-Credit 3D Backup for Rhythm & Motion ASMR) ===
const CREAM_SKY = "#F4F2EC";
const SKY_MID = "#DCEBF5";
const HANGAR_BG = "#EAE7DF";
const FUSELAGE_WHITE = "#F8FAFC";
const WING_SILVER = "#E2E8F0";
const ENGINE_BLUE = "#1E3A8A";
const ACCENT_ORANGE = "#EA580C";
const ACCENT_AMBER = "#FFE600";
const ACCENT_TEAL = "#0F766E";
const ACCENT_CYAN = "#00F2FE";
const ACCENT_RED = "#EF4444";
const INK = "#1E293B";

// Reusable Outlined 3D Box (Blender Grease Pencil / Freestyle Technical Toon Look)
const OutlinedBox: React.FC<{
  args: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  opacity?: number;
  transparent?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
}> = ({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  opacity = 1,
  transparent = false,
  emissive,
  emissiveIntensity = 0,
}) => {
  const { boxGeo, edgesGeo } = useMemo(() => {
    const b = new THREE.BoxGeometry(args[0], args[1], args[2]);
    const e = new THREE.EdgesGeometry(b);
    return { boxGeo: b, edgesGeo: e };
  }, [args[0], args[1], args[2]]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={boxGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.65}
          metalness={0.1}
          transparent={transparent}
          opacity={opacity}
          emissive={emissive || "#000000"}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={INK} transparent opacity={transparent ? opacity * 0.65 : 0.72} />
      </lineSegments>
    </group>
  );
};

// Reusable Outlined Cylinder
const OutlinedCyl: React.FC<{
  args: [number, number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  opacity?: number;
  transparent?: boolean;
}> = ({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  opacity = 1,
  transparent = false,
}) => {
  const { cylGeo, edgesGeo } = useMemo(() => {
    const c = new THREE.CylinderGeometry(args[0], args[1], args[2], args[3]);
    const e = new THREE.EdgesGeometry(c, 26);
    return { cylGeo: c, edgesGeo: e };
  }, [args[0], args[1], args[2], args[3]]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={cylGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.15}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={INK} transparent opacity={transparent ? opacity * 0.6 : 0.62} />
      </lineSegments>
    </group>
  );
};

// 3D Upward Force Arrow
const Arrow3D: React.FC<{
  position: [number, number, number];
  length: number;
  color: string;
  rotation?: [number, number, number];
}> = ({ position, length, color, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, length / 2, 0]}>
      <cylinderGeometry args={[0.09, 0.09, length, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>
    <mesh position={[0, length + 0.25, 0]}>
      <coneGeometry args={[0.24, 0.55, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>
  </group>
);

// Articulated Bending Boeing-787-Style Wing (14 flexing segments + internal cutaway spars!)
const FlexingWing: React.FC<{
  side: 1 | -1;
  flexAmount: number; // Wingtip vertical lift in world units (e.g., 0.5 normal, 4.8 extreme test!)
  xray?: boolean;
  stressMode?: "none" | "spread" | "root_danger";
  showEngine?: boolean;
}> = ({ side, flexAmount, xray = false, stressMode = "none", showEngine = true }) => {
  const segCount = 14;
  const span = 12.5;
  const dx = span / segCount;

  // Build segments along X = side * [1.3 .. 13.8]
  const segments = useMemo(() => {
    const arr: {
      i: number;
      u: number;
      x: number;
      y: number;
      z: number;
      chord: number;
      thick: number;
      rotZ: number;
    }[] = [];
    for (let i = 0; i < segCount; i++) {
      const u = (i + 0.5) / segCount;
      const x = side * (1.35 + u * span);
      // Cubic cantilever deflection curve: y(u) = flexAmount * u^2.2
      const y = flexAmount * Math.pow(u, 2.2);
      const dydu = flexAmount * 2.2 * Math.pow(Math.max(0.01, u), 1.2);
      const rotZ = side * Math.atan2(dydu, span);
      // Swept-back 787 planform
      const z = u * 4.2;
      const chord = 3.8 * (1 - u * 0.68);
      const thick = 0.52 * (1 - u * 0.65);
      arr.push({ i, u, x, y, z, chord, thick, rotZ });
    }
    return arr;
  }, [side, flexAmount]);

  // Engine mounts near segment 3
  const engSeg = segments[3];

  return (
    <group>
      {segments.map((s) => {
        let skinColor = WING_SILVER;
        let emissive: string | undefined;
        let emInt = 0;
        if (stressMode === "spread") {
          skinColor = s.u > 0.15 && s.u < 0.85 ? "#FB923C" : "#FDBA74";
          emissive = ACCENT_ORANGE;
          emInt = 0.25;
        } else if (stressMode === "root_danger") {
          if (s.i <= 2) {
            skinColor = ACCENT_RED;
            emissive = ACCENT_RED;
            emInt = 0.55;
          } else {
            skinColor = "#94A3B8";
          }
        }
        return (
          <group key={s.i} position={[s.x, s.y, s.z]} rotation={[0, side * -0.28, s.rotZ]}>
            {/* Outer Wing Skin */}
            <OutlinedBox
              args={[dx * 1.15, s.thick, s.chord]}
              color={skinColor}
              transparent={xray}
              opacity={xray ? 0.3 : 1}
              emissive={emissive}
              emissiveIntensity={emInt}
            />
            {/* Internal Carbon-Fiber Spar & Ribs (Visible in X-Ray mode!) */}
            {xray && (
              <>
                <OutlinedBox
                  args={[dx * 1.16, s.thick * 0.55, 0.24]}
                  position={[0, 0, -s.chord * 0.18]}
                  color={ACCENT_ORANGE}
                  emissive={ACCENT_ORANGE}
                  emissiveIntensity={0.35}
                />
                <OutlinedBox
                  args={[dx * 1.16, s.thick * 0.5, 0.2]}
                  position={[0, 0, s.chord * 0.2]}
                  color={ACCENT_TEAL}
                  emissive={ACCENT_TEAL}
                  emissiveIntensity={0.25}
                />
                <OutlinedBox
                  args={[0.12, s.thick * 0.72, s.chord * 0.86]}
                  color="#FACC15"
                />
              </>
            )}
          </group>
        );
      })}

      {/* Sleek Raked Wingtip */}
      <group
        position={[
          side * (1.35 + span + 0.5),
          flexAmount + 0.45,
          4.5,
        ]}
        rotation={[0, side * -0.35, side * (0.45 + flexAmount * 0.08)]}
      >
        <OutlinedBox args={[1.1, 0.18, 0.95]} color={ENGINE_BLUE} />
      </group>

      {/* Under-wing Turbofan Engine */}
      {showEngine && engSeg && (
        <group position={[engSeg.x, engSeg.y - 1.05, engSeg.z - 0.75]}>
          <OutlinedBox args={[0.35, 0.85, 1.8]} position={[0, 0.55, 0.35]} color="#94A3B8" />
          <OutlinedCyl
            args={[0.82, 0.74, 2.7, 16]}
            rotation={[Math.PI / 2, 0, 0]}
            color={ENGINE_BLUE}
          />
          <mesh position={[0, 0, -1.36]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.72, 0.72, 0.06, 16]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        </group>
      )}
    </group>
  );
};

// Complete Sleek Ink-Outlined Airliner (787 Dreamliner Inspired)
const Airliner3D: React.FC<{
  flexLeft: number;
  flexRight: number;
  xray?: boolean;
  stressLeft?: "none" | "spread" | "root_danger";
  stressRight?: "none" | "spread" | "root_danger";
  showEngines?: boolean;
}> = ({
  flexLeft,
  flexRight,
  xray = false,
  stressLeft = "none",
  stressRight = "none",
  showEngines = true,
}) => (
  <group>
    {/* Main Cylindrical Fuselage */}
    <OutlinedCyl args={[1.55, 1.55, 17, 18]} rotation={[Math.PI / 2, 0, 0]} color={FUSELAGE_WHITE} />
    {/* Nose Cone */}
    <OutlinedCyl args={[0.35, 1.55, 3.8, 18]} position={[0, -0.1, -10.4]} rotation={[Math.PI / 2, 0, 0]} color={FUSELAGE_WHITE} />
    {/* Tail Cone */}
    <OutlinedCyl args={[1.55, 0.45, 5.2, 18]} position={[0, 0.25, 11.1]} rotation={[Math.PI / 2, 0, 0]} color={FUSELAGE_WHITE} />
    {/* Cockpit Windshield */}
    <OutlinedBox args={[1.65, 0.55, 1.35]} position={[0, 0.65, -8.8]} color="#1E293B" />
    {/* Blue Accent Belly Stripe */}
    <OutlinedBox args={[3.14, 0.26, 16.5]} position={[0, -0.35, 0]} color={ENGINE_BLUE} />
    {/* Cabin Windows (left & right rows) */}
    {Array.from({ length: 12 }).map((_, i) => (
      <React.Fragment key={i}>
        <mesh position={[1.56, 0.35, -6.2 + i * 1.15]}>
          <boxGeometry args={[0.04, 0.34, 0.24]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[-1.56, 0.35, -6.2 + i * 1.15]}>
          <boxGeometry args={[0.04, 0.34, 0.24]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </React.Fragment>
    ))}
    {/* Vertical Tail Fin */}
    <OutlinedBox args={[0.26, 4.4, 3.6]} position={[0, 2.7, 10.6]} rotation={[-0.32, 0, 0]} color={ENGINE_BLUE} />
    {/* Horizontal Stabilizers */}
    <OutlinedBox args={[8.4, 0.22, 1.9]} position={[0, 0.7, 11.4]} color={WING_SILVER} />

    {/* Articulated Left & Right Wings */}
    <FlexingWing side={1} flexAmount={flexRight} xray={xray} stressMode={stressRight} showEngine={showEngines} />
    <FlexingWing side={-1} flexAmount={flexLeft} xray={xray} stressMode={stressLeft} showEngine={showEngines} />
  </group>
);

// Boeing 787 Static Ultimate Load Test Hangar Rig (Scene 3 & 4!)
const TestHangarRig: React.FC<{ liftAmount: number }> = ({ liftAmount }) => {
  const tipX = 13.85;
  const tipY = liftAmount + 0.2;
  return (
    <group>
      {/* Concrete Hangar Floor */}
      <OutlinedBox args={[65, 0.6, 55]} position={[0, -3.5, 0]} color="#D6D3CB" />
      {/* Yellow Safety Floor Stripes */}
      <mesh position={[0, -3.18, 0]}>
        <boxGeometry args={[32, 0.03, 0.35]} />
        <meshStandardMaterial color="#F59E0B" />
      </mesh>
      {/* Steel Test Gantry Towers (Left & Right) */}
      {[-14.5, 14.5].map((tx, idx) => (
        <group key={idx} position={[tx, 0, 4.2]}>
          <OutlinedBox args={[1.1, 15.5, 1.1]} position={[0, 4.2, 0]} color="#475569" />
          <OutlinedBox args={[4.5, 0.9, 1.2]} position={[tx > 0 ? -1.8 : 1.8, 11.5, 0]} color="#334155" />
          {/* Hydraulic Pull Cables attached to wingtip */}
          <mesh position={[tx > 0 ? -0.7 : 0.7, (11.5 + tipY) / 2, 0]}>
            <cylinderGeometry args={[0.07, 0.07, Math.max(0.5, 11.5 - tipY), 8]} />
            <meshStandardMaterial color={ACCENT_ORANGE} />
          </mesh>
        </group>
      ))}
      {/* Vertical Height Measurement Scale Pole (+7.6 m marker!) */}
      <group position={[tipX + 1.3, 0, 4.2]}>
        <OutlinedBox args={[0.18, 8.5, 0.18]} position={[0, 1.0, 0]} color={ACCENT_ORANGE} />
        {[0, 1.5, 3.0, 4.5, 6.0].map((my, i) => (
          <OutlinedBox key={i} args={[0.85, 0.12, 0.18]} position={[-0.35, -2.0 + my, 0]} color={INK} />
        ))}
      </group>
    </group>
  );
};

// Soft Stylized Cloud Clusters
const CloudsLayer: React.FC<{ frame: number }> = ({ frame }) => (
  <group>
    {[
      [-14, -4.5, -18, 3.4],
      [16, -5.5, -30, 4.2],
      [-10, -3.5, -45, 3.8],
      [12, -4.0, -5, 3.0],
      [-18, -5.0, 12, 3.6],
      [18, -4.5, 22, 3.2],
    ].map(([x, y, z, s], i) => {
      const zMoved = (((z as number) + frame * 0.32 + 60) % 100) - 60;
      return (
        <group key={i} position={[x as number, y as number, zMoved]}>
          <mesh>
            <sphereGeometry args={[s as number, 12, 10]} />
            <meshStandardMaterial color="#FFFFFF" roughness={1} />
          </mesh>
          <mesh position={[(s as number) * 0.75, -0.4, 0.3]}>
            <sphereGeometry args={[(s as number) * 0.7, 12, 10]} />
            <meshStandardMaterial color="#F8FAFC" roughness={1} />
          </mesh>
          <mesh position={[-(s as number) * 0.7, -0.5, -0.2]}>
            <sphereGeometry args={[(s as number) * 0.65, 12, 10]} />
            <meshStandardMaterial color="#F8FAFC" roughness={1} />
          </mesh>
        </group>
      );
    })}
  </group>
);

const CameraRig: React.FC<{
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
}> = ({ pos, lookAt, fov = 44 }) => {
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

// 8-Scene 3D World Strictly Synced to Riko's 49.3s VO
const SayapWorld: React.FC<{ frame: number }> = ({ frame }) => {
  const t = frame / SAYAP_3D_PRO_FPS;
  const scene = Math.min(7, Math.floor(t / 6.25));
  const localSec = t - scene * 6.25;
  const p = Math.min(1, localSec / 6.25);

  const isHangar = scene === 2 || scene === 3;
  const isXray = scene === 4;
  const isCompare = scene === 5;

  // Dynamic wing flex matching each exact scene in the VO!
  let flexLeft = 0.8;
  let flexRight = 0.8;
  let roll = 0;

  if (scene === 0) {
    // Scene 1: Dramatic turbulence flex hook
    flexLeft = 1.6 + Math.sin(t * 4.5) * 1.25;
    flexRight = flexLeft;
    roll = Math.sin(t * 3.2) * 0.06;
  } else if (scene === 1) {
    // Scene 2: Close-up turbulence oscillation ("ujung sayap naik-turun")
    flexLeft = 1.8 + Math.sin(t * 5.2) * 1.4;
    flexRight = flexLeft;
    roll = Math.sin(t * 2.8) * 0.04;
  } else if (scene === 2) {
    // Scene 3: Boeing 787 2010 Static Test — pulled smoothly up to +7.6m!
    const lift = interpolate(p, [0, 0.85], [0.4, 5.2], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    flexLeft = lift;
    flexRight = lift;
  } else if (scene === 3) {
    // Scene 4: Holding 150% extreme load without breaking!
    flexLeft = 5.2 + Math.sin(t * 6) * 0.12;
    flexRight = flexLeft;
  } else if (scene === 4) {
    // Scene 5: X-ray composite wing absorbing & spreading wind load
    flexLeft = 2.2 + Math.sin(t * 3.8) * 0.9;
    flexRight = flexLeft;
  } else if (scene === 5) {
    // Scene 6: Left wing = KAKU (rigid, 0.15 flex, glowing RED at root); Right wing = LENTUR (2.4 flex, safe!)
    flexLeft = 0.15;
    flexRight = 2.4 + Math.sin(t * 4.0) * 0.6;
  } else if (scene === 6) {
    // Scene 7: Normal flight — only ~0.5m gentle flex
    flexLeft = 0.75 + Math.sin(t * 2.0) * 0.25;
    flexRight = flexLeft;
  } else {
    // Scene 8: Hero flyby finale
    flexLeft = 1.1 + Math.sin(t * 2.5) * 0.35;
    flexRight = flexLeft;
    roll = -0.08 + p * 0.12;
  }

  // Camera Choreography (always centered, unobstructed, dynamic movement)
  let camPos: [number, number, number] = [14, 5.5, 16];
  let camLook: [number, number, number] = [2, 1.2, 1];
  let fov = 44;

  if (scene === 0) {
    // Hero front-3/4 chase showing aircraft + flexing wing in bright cream-blue sky
    camPos = [12.5 - p * 2.5, 4.8 - p * 0.8, -14.5 + p * 2.0];
    camLook = [1.5, 1.0, 0.5];
    fov = 46;
  } else if (scene === 1) {
    // Passenger-window close-up along the right wingtip flexing up & down!
    camPos = [2.6, 2.2, -3.5 + p * 1.4];
    camLook = [11.5, 1.6, 3.8];
    fov = 48;
  } else if (scene === 2) {
    // Boeing 787 Hangar front-3/4 wide shot showing both wings lifting dramatically to +7.6m
    camPos = [10 - p * 4, 3.2 + p * 2.5, -23.5 + p * 2.5];
    camLook = [0, 2.2, 2.0];
    fov = 48;
  } else if (scene === 3) {
    // Close-up on the right bent wing in the hangar under 150% load arrows
    camPos = [11.5 - p * 3.0, 4.5, -15.5 + p * 2.5];
    camLook = [6.5, 2.8, 2.5];
    fov = 45;
  } else if (scene === 4) {
    // Elevated X-ray structural view of the flexing composite wing spars
    camPos = [8.5 + p * 2.5, 7.5 - p * 1.2, -10.5 + p * 2.0];
    camLook = [6.0, 1.2, 2.0];
    fov = 44;
  } else if (scene === 5) {
    // Symmetrical front comparison: Rigid wing (RED root stress) vs Flexible wing (safe!)
    camPos = [0, 6.2, -23.0 + p * 2.5];
    camLook = [0, 1.0, 1.0];
    fov = 50;
  } else if (scene === 6) {
    // Calm cruise rear-3/4 above clouds
    camPos = [13.5 - p * 2.5, 5.2, 14.5 - p * 2.0];
    camLook = [1.0, 0.8, 0.0];
    fov = 44;
  } else {
    // Sweeping grand hero orbit finale
    const angle = interpolate(p, [0, 1], [-0.45, 0.35]);
    camPos = [Math.sin(angle) * 20, 6.5, -Math.cos(angle) * 20];
    camLook = [0, 1.0, 0];
    fov = 46;
  }

  return (
    <>
      <color attach="background" args={[isHangar ? HANGAR_BG : CREAM_SKY]} />
      <fog attach="fog" args={[isHangar ? HANGAR_BG : SKY_MID, 35, 115]} />
      <CameraRig pos={camPos} lookAt={camLook} fov={fov} />

      {/* Clean Studio Architectural Lighting */}
      <hemisphereLight args={["#FFFFFF", isHangar ? "#94A3B8" : "#BAE6FD", 1.15]} />
      <directionalLight
        position={[24, 42, -18]}
        intensity={1.3}
        color="#FFFBEB"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Aircraft Model */}
      <group rotation={[0, 0, roll]}>
        <Airliner3D
          flexLeft={flexLeft}
          flexRight={flexRight}
          xray={isXray}
          stressLeft={isCompare ? "root_danger" : isXray ? "spread" : "none"}
          stressRight={isXray ? "spread" : "none"}
          showEngines={!isHangar}
        />

        {/* Scene 4: Glowing Upward 150% Load Arrows under the Wing */}
        {scene === 3 && (
          <>
            <Arrow3D position={[5.5, -1.6, 1.2]} length={2.2} color={ACCENT_ORANGE} />
            <Arrow3D position={[8.5, -0.5, 2.3]} length={2.6} color={ACCENT_ORANGE} />
            <Arrow3D position={[11.5, 1.4, 3.4]} length={3.0} color={ACCENT_ORANGE} />
          </>
        )}

        {/* Scene 2 & 5: Blue Aerodynamic Gust Arrows */}
        {(scene === 1 || scene === 4) && (
          <>
            <Arrow3D position={[7.0, -1.5, 2.0]} length={2.0} color="#0284C7" />
            <Arrow3D position={[10.5, -0.8, 3.2]} length={2.2} color="#0284C7" />
          </>
        )}
      </group>

      {/* Hangar Rig vs Cloud Sky Environment */}
      {isHangar ? <TestHangarRig liftAmount={flexRight} /> : <CloudsLayer frame={frame} />}
    </>
  );
};

// Hairline Technical Callout (NO heavy card, accentColor per SOP Rule 4!)
const HairlineCalloutUI: React.FC<{
  label: string;
  x: number;
  y: number;
  accentColor: string;
  localSec: number;
}> = ({ label, x, y, accentColor, localSec }) => {
  const op = interpolate(localSec, [0.4, 0.85], [0, 1], {
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
          fontSize: 28,
          fontWeight: 900,
          color: accentColor,
          textShadow: "0 3px 12px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.95)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <div style={{ width: 2.5, height: 64, backgroundColor: accentColor, marginTop: 4, boxShadow: "0 2px 6px rgba(0,0,0,0.6)" }} />
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: accentColor,
          border: "2.5px solid #FFFFFF",
          boxShadow: "0 2px 8px rgba(0,0,0,0.7)",
        }}
      />
    </div>
  );
};

const CALLOUTS: { label: string; x: number; y: number; accentColor: string }[] = [
  { label: "Sayap Melentur Saat Turbulensi", x: 52, y: 38, accentColor: ACCENT_AMBER },
  { label: "Desain Aktif, Bukan Kerusakan", x: 54, y: 37, accentColor: ACCENT_CYAN },
  { label: "Ujung Sayap Naik +7,6 Meter", x: 58, y: 36, accentColor: ACCENT_AMBER },
  { label: "150% Beban Ekstrem — Utuh", x: 52, y: 37, accentColor: "#4ADE80" },
  { label: "Spar Komposit Menyebar Beban", x: 55, y: 37, accentColor: ACCENT_ORANGE },
  { label: "Kaku: Stres Menumpuk di Pangkal", x: 50, y: 36, accentColor: "#FF6B6B" },
  { label: "Terbang Normal: Cuma ±0,5 Meter", x: 52, y: 38, accentColor: ACCENT_AMBER },
  { label: "Lentur = Fitur Perlindungan", x: 50, y: 38, accentColor: "#4ADE80" },
];

// Subtitles strictly synced to Riko's real VO (highlightWord per SOP Rule 4!)
const SUBTITLES: { startSec: number; endSec: number; text: string; highlightWord: string }[] = [
  { startSec: 0, endSec: 6.25, text: "Sayap patah kalau kaku, lentur itu yang nyelametin.", highlightWord: "kaku" },
  { startSec: 6.25, endSec: 12.5, text: "Pas turbulensi, ujung sayap naik-turun. Itu desain, bukan kerusakan.", highlightWord: "desain" },
  { startSec: 12.5, endSec: 18.75, text: "Tahun 2010, Boeing menarik sayap 787 sampai ujungnya naik 7,6 meter.", highlightWord: "7,6" },
  { startSec: 18.75, endSec: 25.0, text: "Bebannya 150 persen gaya paling ekstrem seumur hidup pesawat. Tidak patah.", highlightWord: "150" },
  { startSec: 25.0, endSec: 31.25, text: "Sayap lentur menyerap hantaman angin dan menyebar bebannya.", highlightWord: "menyerap" },
  { startSec: 31.25, endSec: 37.5, text: "Sayap kaku menumpuk semua beban di pangkal, di situlah retak lahir.", highlightWord: "pangkal" },
  { startSec: 37.5, endSec: 43.75, text: "Di penerbangan normal, ujung sayap cuma bergerak sekitar setengah meter.", highlightWord: "setengah" },
  { startSec: 43.75, endSec: 51.0, text: "Simpan buat nenangin teman yang panik turbulensi! Like, komen & follow!", highlightWord: "Like," },
];

export const SayapMelentur3DPro: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const sec = frame / SAYAP_3D_PRO_FPS;
  const scene = Math.min(7, Math.floor(sec / 6.25));
  const localSec = sec - scene * 6.25;

  const activeSub = SUBTITLES.find((s) => sec >= s.startSec && sec < s.endSec) || SUBTITLES[7];
  const callout = CALLOUTS[scene];

  const hookOpacity = interpolate(sec, [0, 0.35, 5.6, 6.1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaPop = spring({ frame: Math.max(0, frame - 44 * fps), fps, config: { damping: 14, stiffness: 130 } });

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM_SKY, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* VO Riko (49.296s) + Whoosh SFX on scene transitions */}
      <Audio src={staticFile("audio/sayap-melentur/vo_riko.mp3")} volume={1.0} />
      {[188, 375, 563, 750, 938, 1125, 1313].map((f) => (
        <Sequence key={f} from={f} durationInFrames={18}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.3} />
        </Sequence>
      ))}

      {/* Full-bleed Pure 3D Architectural Diorama (0 Flow/Veo Credits!) */}
      <ThreeCanvas width={width} height={height} shadows style={{ width: "100%", height: "100%" }}>
        <SayapWorld frame={frame} />
      </ThreeCanvas>

      {/* NO "Cerita Teknik" badge in top-right (strictly removed per SOP Rule 4!) */}

      {/* Floating Hook Title (Scene 1, safe zone top >= 160px, NO box!) */}
      {hookOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 165,
            left: 72,
            right: 72,
            textAlign: "center",
            opacity: hookOpacity,
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1.12,
              textShadow: "0 5px 22px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.95)",
              WebkitTextStroke: "2px rgba(15,23,42,0.85)",
            }}
          >
            SAYAP PATAH KALAU KAKU,
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 56,
              fontWeight: 900,
              color: ACCENT_AMBER,
              lineHeight: 1.12,
              textShadow: "0 5px 22px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.95)",
              WebkitTextStroke: "2px rgba(15,23,42,0.85)",
            }}
          >
            LENTUR YANG NYELAMETIN
          </div>
        </div>
      )}

      {/* Scene 3 Big Floating Metric (+7,6 METER) */}
      {scene === 2 && (
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
              fontSize: 112,
              fontWeight: 900,
              color: ACCENT_ORANGE,
              lineHeight: 1,
              textShadow: "0 6px 24px rgba(0,0,0,0.45)",
              WebkitTextStroke: "3px #FFFFFF",
            }}
          >
            +7,6 m
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: "#0F172A",
              marginTop: 6,
            }}
          >
            Uji Statis Boeing 787 (2010)
          </div>
        </div>
      )}

      {/* Scene 4 Big Floating Metric (150% BEBAN EKSTREM) */}
      {scene === 3 && (
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
              fontSize: 112,
              fontWeight: 900,
              color: ACCENT_TEAL,
              lineHeight: 1,
              textShadow: "0 6px 24px rgba(0,0,0,0.4)",
              WebkitTextStroke: "3px #FFFFFF",
            }}
          >
            150%
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: "#0F172A",
              marginTop: 6,
            }}
          >
            Beban Maksimal Seumur Hidup — Tidak Patah
          </div>
        </div>
      )}

      {/* Scene 6 Comparison Labels (KAKU vs LENTUR) */}
      {scene === 5 && (
        <div
          style={{
            position: "absolute",
            top: 195,
            left: 72,
            right: 72,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: ACCENT_RED, textShadow: "0 3px 12px rgba(0,0,0,0.65)" }}>
              SAYAP KAKU
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>Stres numpuk di pangkal</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: ACCENT_TEAL, textShadow: "0 3px 12px rgba(0,0,0,0.35)" }}>
              SAYAP LENTUR
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>Beban menyebar aman</div>
          </div>
        </div>
      )}

      {/* Hairline Callout per Scene */}
      {callout && (
        <HairlineCalloutUI
          label={callout.label}
          x={callout.x}
          y={callout.y}
          accentColor={callout.accentColor}
          localSec={localSec}
        />
      )}

      {/* CTA Banner in Final 6 Seconds (SOP Rule 4) */}
      {sec >= 44 && (
        <div
          style={{
            position: "absolute",
            top: 175,
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
              textShadow: "0 5px 20px rgba(0,0,0,0.9)",
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
              textShadow: "0 4px 16px rgba(0,0,0,0.9)",
            }}
          >
            Pernah lihat sayap goyang pas turbulensi? Ceritain rasanya
          </div>
        </div>
      )}

      {/* Floating Kinetic Subtitle — NO BOX! Bold White + Dark Shadow + highlightWord (SOP Rule 4) */}
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

      {/* Source Citation (Safe zone bottom >= 220px) */}
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
        Sumber: Boeing 787 Ultimate Load Test 2010 / FAA 14 CFR 25.305
      </div>
    </AbsoluteFill>
  );
};
