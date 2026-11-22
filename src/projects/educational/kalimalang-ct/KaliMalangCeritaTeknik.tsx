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

export const KALIMALANG_CT_FPS = 30;
export const KALIMALANG_CT_FRAMES = 1350; // 45.0s matching vo_sami.mp3 (45.024s)
const SCENE_LEN = 150;

// === @ceritateknik_id Architectural Diorama Palette ===
const PAPER_BG = "#F3F1EA";
const CONCRETE = "#D9D7CF";
const CONCRETE_DARK = "#B4B1A7";
const ASPHALT = "#464D56";
const BUILDING_WALL = "#E6E4DC";
const BUILDING_GLASS = "#7B9DB5";
const ORANGE = "#EA580C";
const TEAL = "#0F766E";
const TEAL_LIGHT = "#14B8A6";
const WATER_COLOR = "#6FA8A3";
const SOIL_CUT = "#8C7458";
const INK = "#1E293B";

// Reusable Outlined 3D Box (Blender Freestyle / Technical Ink Look)
const OutlinedBox: React.FC<{
  args: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  opacity?: number;
  transparent?: boolean;
  outlineColor?: string;
}> = ({
  args,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  opacity = 1,
  transparent = false,
  outlineColor = INK,
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
          roughness={0.85}
          metalness={0.05}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={outlineColor} transparent opacity={transparent ? opacity * 0.7 : 0.75} />
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
}> = ({ args, position = [0, 0, 0], rotation = [0, 0, 0], color }) => {
  const { cylGeo, edgesGeo } = useMemo(() => {
    const c = new THREE.CylinderGeometry(args[0], args[1], args[2], args[3]);
    const e = new THREE.EdgesGeometry(c, 28);
    return { cylGeo: c, edgesGeo: e };
  }, [args[0], args[1], args[2], args[3]]);

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={cylGeo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={INK} transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
};

// Stylized Architectural Traffic Vehicle (crisp ink outlines, Cerita Teknik style)
const TechCar: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  color: string;
  isBus?: boolean;
}> = ({ position, rotationY = 0, color, isBus = false }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {isBus ? (
      <>
        <OutlinedBox args={[1.6, 1.5, 4.6]} position={[0, 1.0, 0]} color="#F8FAFC" />
        <OutlinedBox args={[1.64, 0.45, 4.2]} position={[0, 1.25, 0]} color="#334155" />
        <OutlinedBox args={[1.66, 0.25, 4.62]} position={[0, 0.55, 0]} color="#2563EB" />
      </>
    ) : (
      <>
        <OutlinedBox args={[1.35, 0.55, 2.7]} position={[0, 0.48, 0]} color={color} />
        <OutlinedBox args={[1.18, 0.45, 1.35]} position={[0, 0.96, -0.1]} color="#CBD5E1" />
      </>
    )}
    {[
      [-0.68, 0.22, 0.85],
      [0.68, 0.22, 0.85],
      [-0.68, 0.22, -0.85],
      [0.68, 0.22, -0.85],
    ].map(([wx, wy, wz], i) => (
      <mesh key={i} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.24, 0.24, 0.18, 10]} />
        <meshStandardMaterial color="#1E293B" />
      </mesh>
    ))}
  </group>
);

// Architectural Bekasi Glass Building (striped windows + ink outline like Kuningan towers)
const BekasiBuilding: React.FC<{
  position: [number, number, number];
  w: number;
  h: number;
  d: number;
  accent?: boolean;
}> = ({ position, w, h, d, accent = false }) => {
  const floors = Math.max(2, Math.floor(h / 2.6));
  return (
    <group position={position}>
      <OutlinedBox
        args={[w, h, d]}
        position={[0, h / 2, 0]}
        color={accent ? "#FDE68A" : BUILDING_WALL}
      />
      {Array.from({ length: floors }).map((_, idx) => (
        <mesh key={idx} position={[0, 1.6 + idx * 2.5, 0]}>
          <boxGeometry args={[w + 0.08, 1.15, d + 0.08]} />
          <meshStandardMaterial color={BUILDING_GLASS} roughness={0.35} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
};

// Curved Kalimalang Arch Bridge (Jembatan Lengkung Baru)
const ArchBridge: React.FC<{
  z: number;
  highlight?: boolean;
}> = ({ z, highlight = false }) => {
  const segs = 16;
  const span = 18;
  const rise = 2.4;
  const deckCol = highlight ? ORANGE : ASPHALT;
  const archCol = highlight ? ORANGE : "#F8FAFC";

  return (
    <group position={[0, 0, z]}>
      {/* Curved Road Deck + White Arch Beams */}
      {Array.from({ length: segs }).map((_, i) => {
        const t0 = -1 + (2 * i) / segs;
        const t1 = -1 + (2 * (i + 1)) / segs;
        const tm = (t0 + t1) / 2;
        const x = tm * (span / 2);
        const y = 2.0 + rise * (1 - tm * tm);
        const dy = -2 * rise * tm;
        const dx = span / 2;
        const rotZ = Math.atan2(dy, dx);
        const segLen = (span / segs) * 1.12;
        return (
          <group key={i} position={[x, y, 0]} rotation={[0, 0, rotZ]}>
            <OutlinedBox args={[segLen, 0.45, 5.4]} color={deckCol} />
            {/* Side curved architectural ribs */}
            <OutlinedBox args={[segLen, 0.85, 0.35]} position={[0, 0.45, 2.7]} color={archCol} />
            <OutlinedBox args={[segLen, 0.85, 0.35]} position={[0, 0.45, -2.7]} color={archCol} />
          </group>
        );
      })}
      {/* Overhead steel arch rib icon */}
      {Array.from({ length: 12 }).map((_, i) => {
        const t = -0.85 + (1.7 * i) / 11;
        const x = t * 7.5;
        const y = 3.2 + 2.8 * (1 - t * t);
        const rotZ = Math.atan2(-2 * 2.8 * t, 7.5);
        return (
          <group key={i} position={[x, y, 0]} rotation={[0, 0, rotZ]}>
            <OutlinedBox args={[1.55, 0.32, 0.32]} position={[0, 0, 2.7]} color={highlight ? "#FDBA74" : ORANGE} />
            <OutlinedBox args={[1.55, 0.32, 0.32]} position={[0, 0, -2.7]} color={highlight ? "#FDBA74" : ORANGE} />
          </group>
        );
      })}
      {/* Concrete Abutments on both canal banks */}
      <OutlinedBox args={[2.2, 2.5, 6.0]} position={[-8.8, 1.25, 0]} color={CONCRETE_DARK} />
      <OutlinedBox args={[2.2, 2.5, 6.0]} position={[8.8, 1.25, 0]} color={CONCRETE_DARK} />
    </group>
  );
};

// Old Low Flat Bridge (Jembatan Lama yang menghalangi perahu & sampah)
const OldFlatBridge: React.FC<{
  z: number;
  highlight?: boolean;
}> = ({ z, highlight = false }) => (
  <group position={[0, 0, z]}>
    <OutlinedBox args={[16.8, 0.65, 4.6]} position={[0, 1.55, 0]} color={highlight ? ORANGE : CONCRETE_DARK} />
    <OutlinedBox args={[16.8, 0.45, 0.25]} position={[0, 2.05, 2.25]} color={CONCRETE} />
    <OutlinedBox args={[16.8, 0.45, 0.25]} position={[0, 2.05, -2.25]} color={CONCRETE} />
    {/* Mid-canal concrete piers that trap flood debris! */}
    <OutlinedBox args={[0.9, 2.2, 3.8]} position={[-3.2, 0.5, 0]} color={highlight ? "#DC2626" : CONCRETE_DARK} />
    <OutlinedBox args={[0.9, 2.2, 3.8]} position={[3.2, 0.5, 0]} color={highlight ? "#DC2626" : CONCRETE_DARK} />
  </group>
);

// Iconic Elevated Tol Becakayu running parallel along south side of Kalimalang!
const TolBecakayuViaduct: React.FC<{ highlight?: boolean }> = ({ highlight = false }) => (
  <group position={[18.5, 0, 0]}>
    {/* Elevated Twin Deck */}
    <OutlinedBox args={[9.5, 1.2, 160]} position={[0, 11.2, -25]} color={highlight ? ORANGE : CONCRETE} />
    <OutlinedBox args={[8.4, 0.12, 160]} position={[0, 11.85, -25]} color={ASPHALT} />
    <OutlinedBox args={[0.35, 0.9, 160]} position={[-4.6, 12.1, -25]} color="#F8FAFC" />
    <OutlinedBox args={[0.35, 0.9, 160]} position={[4.6, 12.1, -25]} color="#F8FAFC" />
    {/* Giant T-Piers every 18m */}
    {Array.from({ length: 9 }).map((_, i) => {
      const pz = 35 - i * 18;
      return (
        <group key={i} position={[0, 0, pz]}>
          <OutlinedBox args={[2.1, 10.6, 2.4]} position={[0, 5.3, 0]} color={CONCRETE_DARK} />
          <OutlinedBox args={[8.2, 1.4, 2.8]} position={[0, 10.2, 0]} color={CONCRETE} />
        </group>
      );
    })}
  </group>
);

// Kalimalang Tourist Boat (Perahu Wisata Beratap)
const TouristBoat: React.FC<{ z: number; bob: number; blocked?: boolean }> = ({
  z,
  bob,
  blocked = false,
}) => (
  <group position={[0, 0.32 + bob, z]}>
    <OutlinedBox args={[2.2, 0.65, 5.2]} position={[0, 0.15, 0]} color={blocked ? "#DC2626" : "#B45309"} />
    <OutlinedBox args={[1.9, 0.2, 4.6]} position={[0, 0.52, 0]} color="#FEF3C7" />
    {/* Canopy roof */}
    <OutlinedBox args={[2.1, 0.16, 3.4]} position={[0, 1.85, -0.1]} color={TEAL_LIGHT} />
    {[
      [-0.95, 1.15, 1.4],
      [0.95, 1.15, 1.4],
      [-0.95, 1.15, -1.5],
      [0.95, 1.15, -1.5],
    ].map(([px, py, pz], i) => (
      <OutlinedCyl key={i} args={[0.06, 0.06, 1.35, 6]} position={[px, py, pz]} color="#334155" />
    ))}
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

const KalimalangDioramaWorld: React.FC<{ frame: number }> = ({ frame }) => {
  const scene = Math.min(8, Math.floor(frame / SCENE_LEN));
  const local = frame - scene * SCENE_LEN;
  const t = frame / KALIMALANG_CT_FPS;

  // Water rises slightly in Scene 4 (flood scene)
  const waterY = scene === 4 ? interpolate(local, [0, 75, 149], [0.25, 0.95, 0.85]) : 0.25;
  const boatBob = Math.sin(t * 4.5) * 0.06;

  // Boat movement matching each scene's narrative
  let boatZ = 14;
  if (scene === 0) {
    boatZ = interpolate(local, [0, 120], [22, 6.2], { extrapolateRight: "clamp" });
  } else if (scene === 1) {
    // Stuck right in front of the low old bridge!
    boatZ = 5.4 + Math.sin(local * 0.25) * 0.15;
  } else if (scene === 2) {
    // Gliding smoothly UNDER the new tall arch bridge!
    boatZ = interpolate(local, [0, 149], [16, -15]);
  } else if (scene === 3) {
    boatZ = interpolate(local, [0, 149], [18, -32]);
  } else if (scene === 4) {
    boatZ = interpolate(local, [0, 149], [14, -14]);
  } else {
    boatZ = interpolate(local, [0, 149], [15, -18]);
  }

  // Camera choreography tailored per scene (Architectural Isometric & Cutaway Angles!)
  let camPos: [number, number, number] = [18, 12, 28];
  let camLook: [number, number, number] = [0, 2.5, 0];
  let fov = 42;

  if (scene === 0) {
    // Establishing Bekasi Kalimalang diorama: Canal + Arch Bridge + Tol Becakayu + Traffic
    const p = local / 149;
    camPos = [19 - p * 3.5, 13.5 - p * 1.5, 29 - p * 4];
    camLook = [2, 2.8, 0];
  } else if (scene === 1) {
    // Low cutaway close-up: Boat roof hitting the low old bridge!
    const p = local / 149;
    camPos = [10.5 - p * 1.5, 3.6, 15.5 - p * 2];
    camLook = [0, 1.5, 2.5];
    fov = 40;
  } else if (scene === 2) {
    // Hero architectural side-3/4 of the new Arch Bridge with 2.5-3m clearance
    const p = local / 149;
    camPos = [15 - p * 2.5, 6.5, 16 - p * 2];
    camLook = [0, 2.6, 0];
  } else if (scene === 3) {
    // High aerial corridor view showing 5 new arch bridges along Kalimalang
    const p = local / 149;
    camPos = [24, 20, 32 - p * 18];
    camLook = [0, 2, -26 - p * 12];
    fov = 44;
  } else if (scene === 4) {
    // Side-by-side flood demonstration: Old low bridge (debris) vs New high arch (clear flow)
    const p = local / 149;
    camPos = [17, 11.5, 24 - p * 6];
    camLook = [0, 1.8, 6];
  } else if (scene === 5) {
    // Clean isometric below blueprint card
    const p = local / 149;
    camPos = [18 + p * 2, 14, 22];
    camLook = [1, 1.2, -2];
  } else if (scene === 6) {
    // Wide urban traffic flow view (Jl. KH Noer Ali + Tol Becakayu + Arch Bridge)
    const p = local / 149;
    camPos = [-18 + p * 3, 15, 26 - p * 4];
    camLook = [4, 3, -4];
  } else if (scene === 7) {
    // Sweeping hero orbit showing boat + smooth river + flowing cars together
    const p = local / 149;
    camPos = [16 - p * 5, 9.5, 20];
    camLook = [0, 2.5, -2];
  } else {
    // Grand Bekasi pull-back finale
    const p = local / 149;
    camPos = [18 + p * 6, 12 + p * 5, 24 + p * 10];
    camLook = [2, 3, -4];
  }

  // Animated traffic along Jl. KH Noer Ali (both sides of canal) & Tol Becakayu
  const carFlow1 = 40 - ((frame * 0.42) % 120);
  const carFlow2 = 15 - ((frame * 0.36) % 120);
  const carFlow3 = -35 + ((frame * 0.38) % 120);
  const carFlow4 = -65 + ((frame * 0.32) % 120);
  const tolCar1 = 40 - ((frame * 0.65) % 140);
  const tolCar2 = -20 - ((frame * 0.58) % 140);

  return (
    <>
      <color attach="background" args={[PAPER_BG]} />
      <fog attach="fog" args={[PAPER_BG, 55, 165]} />
      <CameraRig pos={camPos} lookAt={camLook} fov={fov} />

      {/* Soft Architectural Studio Lighting */}
      <hemisphereLight args={["#FFFFFF", "#CBD5E1", 1.15]} />
      <directionalLight
        position={[35, 55, 30]}
        intensity={1.15}
        color="#FFFBEB"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Cross-section Soil Base & Canal Bed */}
      <OutlinedBox args={[140, 3.0, 175]} position={[0, -2.5, -25]} color={SOIL_CUT} />

      {/* Canal Water (Semi-transparent teal so bed & cutaway feel authentic) */}
      <mesh position={[0, waterY, -25]} receiveShadow>
        <boxGeometry args={[13.8, 1.3, 175]} />
        <meshStandardMaterial color={WATER_COLOR} transparent opacity={0.78} roughness={0.25} />
      </mesh>
      {/* Animated water flow lines */}
      {Array.from({ length: 14 }).map((_, i) => {
        const wz = 42 - ((i * 12 + frame * 0.35) % 150);
        return (
          <mesh key={i} position={[((i % 3) - 1) * 3.4, waterY + 0.67, wz]}>
            <boxGeometry args={[0.14, 0.02, 3.2]} />
            <meshStandardMaterial color="#E0F2FE" transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Concrete Canal Embankments (Turap Beton Kalimalang) */}
      <OutlinedBox args={[1.4, 3.1, 175]} position={[-7.5, 0.45, -25]} color={CONCRETE_DARK} />
      <OutlinedBox args={[1.4, 3.1, 175]} position={[7.5, 0.45, -25]} color={CONCRETE_DARK} />

      {/* Parallel Kalimalang Roads (Jl. KH Noer Ali North & South) */}
      <OutlinedBox args={[7.2, 0.35, 175]} position={[-11.8, 1.85, -25]} color={ASPHALT} />
      <OutlinedBox args={[7.2, 0.35, 175]} position={[11.8, 1.85, -25]} color={ASPHALT} />
      {/* Sidewalks */}
      <OutlinedBox args={[18, 0.4, 175]} position={[-24.4, 1.85, -25]} color={CONCRETE} />
      <OutlinedBox args={[28, 0.4, 175]} position={[29.4, 1.85, -25]} color={CONCRETE} />

      {/* Iconic Elevated Tol Becakayu */}
      <TolBecakayuViaduct />

      {/* Bekasi Commercial Buildings & Ruko with Glass Stripes */}
      {[
        [-21, 2, 16, 8, 14, 10],
        [-22, 2, 0, 9, 19, 11],
        [-21, 2, -18, 8, 12, 10],
        [-23, 2, -36, 10, 22, 12],
        [-21, 2, -56, 8, 16, 11],
        [30, 2, 12, 10, 20, 12],
        [31, 2, -10, 11, 25, 12],
        [30, 2, -34, 10, 17, 12],
        [31, 2, -56, 11, 21, 12],
      ].map(([x, y, z, w, h, d], idx) => (
        <BekasiBuilding
          key={idx}
          position={[x, y, z]}
          w={w}
          h={h}
          d={d}
          accent={idx === 1 && scene === 6}
        />
      ))}

      {/* Stylized Architectural Trees along Embankment */}
      {[-34, -18, -8, 12, 24].map((tz, i) => (
        <group key={i} position={[-16.2, 2.0, tz]}>
          <OutlinedCyl args={[0.18, 0.24, 1.4, 6]} position={[0, 0.7, 0]} color="#78350F" />
          <OutlinedBox args={[1.6, 1.8, 1.6]} position={[0, 2.1, 0]} color="#4D7C0F" />
        </group>
      ))}

      {/* Bridges according to Scene Story */}
      {scene === 1 ? (
        <OldFlatBridge z={0} highlight />
      ) : scene === 3 ? (
        <>
          <ArchBridge z={0} highlight={local < 35} />
          <ArchBridge z={-22} highlight={local >= 35 && local < 65} />
          <ArchBridge z={-44} highlight={local >= 65 && local < 95} />
          <ArchBridge z={-66} highlight={local >= 95 && local < 125} />
          <ArchBridge z={-88} highlight={local >= 125} />
        </>
      ) : scene === 4 ? (
        <>
          {/* Foreground Old Low Bridge trapping flood debris */}
          <OldFlatBridge z={14} highlight />
          {[-2.2, -0.5, 1.1, 2.6, -1.2].map((dx, i) => (
            <OutlinedBox
              key={i}
              args={[0.9, 0.55, 0.8]}
              position={[dx, waterY + 0.65, 16.4 + (i % 2) * 0.5]}
              color="#78350F"
            />
          ))}
          {/* Background New Tall Arch Bridge with clear flowing water */}
          <ArchBridge z={-6} />
        </>
      ) : (
        <ArchBridge z={0} highlight={scene === 2} />
      )}

      {/* Kalimalang Tourist Boat */}
      <TouristBoat z={boatZ} bob={boatBob} blocked={scene === 1} />

      {/* Moving Traffic on Jl. KH Noer Ali & Tol Becakayu */}
      <TechCar position={[-10.2, 2.05, carFlow1]} rotationY={Math.PI} color="#DC2626" />
      <TechCar position={[-13.4, 2.05, carFlow2]} rotationY={Math.PI} color="#FFFFFF" isBus />
      <TechCar position={[10.2, 2.05, carFlow3]} rotationY={0} color="#2563EB" />
      <TechCar position={[13.4, 2.05, carFlow4]} rotationY={0} color="#F59E0B" />
      <TechCar position={[16.8, 11.95, tolCar1]} rotationY={Math.PI} color="#F97316" />
      <TechCar position={[20.2, 11.95, tolCar2]} rotationY={Math.PI} color="#FFFFFF" />
    </>
  );
};

// Dynamic Chapter Headers (Exact @ceritateknik_id style!)
const CHAPTERS: { kicker: string; title: string; accentWord: string; tag?: string }[] = [
  { kicker: "KALIMALANG, BEKASI", title: "Dibikin tinggi banget?", accentWord: "tinggi", tag: "DIORAMA KALIMALANG" },
  { kicker: "MASALAHNYA", title: "Jembatan lama kependekan", accentWord: "kependekan", tag: "ILUSTRASI" },
  { kicker: "SOLUSINYA", title: "Jembatan lengkung baru", accentWord: "lengkung", tag: "JARAK BEBAS 2,5–3 M" },
  { kicker: "SKALA PROYEK", title: "5 gantiin 15 jembatan", accentWord: "5 gantiin 15", tag: "ILUSTRASI • DIPERCEPAT" },
  { kicker: "MANFAAT BANJIR", title: "Aliran air lebih lancar", accentWord: "lancar", tag: "SIMULASI DEBIT AIR" },
  { kicker: "ANGGARAN & TARGET", title: "Dana Rp123 miliar", accentWord: "Rp123 miliar", tag: "GAMBAR SKEMATIK" },
  { kicker: "DAMPAK LALU LINTAS", title: "Titik macet turun drastis", accentWord: "turun drastis", tag: "JL. KH NOER ALI" },
  { kicker: "INTINYA", title: "Perahu, air, dan jalan", accentWord: "Perahu,", tag: "RINGKASAN" },
  { kicker: "SELESAI!", title: "Udah paham Kalimalang!", accentWord: "Kalimalang!" },
];

const SUBTITLES: { line1: string; line2: string; highlight: string }[] = [
  { line1: "Jembatan Kali Malang kok dibikin", line2: "tinggi banget? Sampai dibongkar?", highlight: "tinggi" },
  { line1: "Soalnya jembatan lama terlalu rendah,", line2: "perahu nggak bisa lewat di bawahnya.", highlight: "rendah," },
  { line1: "Makanya dibangun jembatan lengkung", line2: "yang baru. Jarak air 2,5–3 meter.", highlight: "lengkung" },
  { line1: "Ini jembatan lengkung pertama.", line2: "Nantinya ada 5, gantiin 15 jembatan.", highlight: "5," },
  { line1: "Jembatan tinggi juga bikin aliran air", line2: "lebih lancar pas banjir.", highlight: "lancar" },
  { line1: "Diresmikan November 2026,", line2: "dananya Rp123 miliar.", highlight: "Rp123" },
  { line1: "Titik macet 13 tinggal 5,", line2: "lampu merah 13 jadi 3.", highlight: "tinggal" },
  { line1: "Bukan gaya-gayaan. Biar perahu lewat,", line2: "air lancar, jalanan nggak macet.", highlight: "lewat," },
  { line1: "Lo udah pernah naik perahu", line2: "di Kali Malang belum?", highlight: "belum?" },
];

const TechCallout: React.FC<{
  x: number;
  y: number;
  label: string;
  color?: string;
  lineH?: number;
}> = ({ x, y, label, color = ORANGE, lineH = 90 }) => (
  <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div
      style={{
        backgroundColor: color,
        color: "#FFFFFF",
        fontSize: 24,
        fontWeight: 800,
        padding: "7px 16px",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.22)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
    <div style={{ width: 2.5, height: lineH, backgroundColor: INK }} />
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: color,
        border: "2.5px solid #FFFFFF",
        marginTop: -2,
      }}
    />
  </div>
);

export const KaliMalangCeritaTeknik: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const scene = Math.min(8, Math.floor(frame / SCENE_LEN));
  const local = frame - scene * SCENE_LEN;
  const chap = CHAPTERS[scene];
  const sub = SUBTITLES[scene];

  const cardSpring = spring({ frame: local, fps, config: { damping: 14, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER_BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Clean VO + Tactile Whoosh SFX (minimal distractions like @ceritateknik_id) */}
      <Audio src={staticFile("audio/kali-malang/vo_sami.mp3")} volume={1.0} />
      {[150, 300, 450, 600, 750, 900, 1050, 1200].map((f) => (
        <Sequence key={f} from={f} durationInFrames={18}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.32} />
        </Sequence>
      ))}

      {/* Full-bleed Architectural 3D Diorama */}
      <ThreeCanvas width={width} height={height} shadows style={{ width: "100%", height: "100%" }}>
        <KalimalangDioramaWorld frame={frame} />
      </ThreeCanvas>

      {/* Top Editorial Header (Cerita Teknik Signature Layout, safe zone top >= 145px) */}
      <div
        style={{
          position: "absolute",
          top: 145,
          left: 68,
          right: 68,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: "#64748B",
              textTransform: "uppercase",
            }}
          >
            {chap.kicker}
          </div>
          <div
            style={{
              fontSize: 50,
              fontWeight: 900,
              color: "#0F172A",
              lineHeight: 1.12,
              marginTop: 4,
            }}
          >
            {chap.title.split(" ").map((w, i) => {
              const isAcc = chap.accentWord.toLowerCase().includes(w.toLowerCase().replace(/[^a-z0-9]/g, "")) && w.length > 1;
              return (
                <span key={i} style={{ color: isAcc ? TEAL : "#0F172A", marginRight: 10 }}>
                  {w}
                </span>
              );
            })}
          </div>
          {chap.tag && (
            <div
              style={{
                display: "inline-block",
                marginTop: 12,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 1,
                color: "#334155",
                backgroundColor: "rgba(255,255,255,0.88)",
                border: "1.5px solid #94A3B8",
                padding: "5px 12px",
                borderRadius: 6,
              }}
            >
              {chap.tag}
            </div>
          )}
        </div>

        {/* Clean Top-Right Brand Pill */}
        <div
          style={{
            backgroundColor: "#0F172A",
            color: "#FFFFFF",
            fontSize: 22,
            fontWeight: 800,
            padding: "9px 18px",
            borderRadius: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          Fakta Teknik
        </div>
      </div>

      {/* Scene-Specific Technical Hairline Callouts */}
      {scene === 0 && (
        <>
          <TechCallout x={710} y={580} label="Tol Becakayu" color="#334155" lineH={95} />
          <TechCallout x={340} y={760} label="Jembatan Lengkung" color={ORANGE} lineH={85} />
        </>
      )}
      {scene === 1 && (
        <TechCallout x={360} y={760} label="Perahu mentok!" color="#DC2626" lineH={110} />
      )}
      {scene === 2 && (
        <TechCallout x={350} y={700} label="Jarak bebas 2,5–3 m" color={ORANGE} lineH={110} />
      )}
      {scene === 4 && (
        <>
          <TechCallout x={160} y={640} label="Sampah nyangkut" color="#DC2626" lineH={95} />
          <TechCallout x={640} y={560} label="Air lancar" color={TEAL} lineH={105} />
        </>
      )}

      {/* Scene 5: Architectural Blueprint Card Insert (Signature @ceritateknik_id!) */}
      {scene === 5 && (
        <div
          style={{
            position: "absolute",
            top: 380,
            left: 68,
            right: 68,
            backgroundColor: "rgba(250, 248, 241, 0.96)",
            border: "2.5px solid #334155",
            borderRadius: 16,
            padding: "28px 32px",
            boxShadow: "0 14px 36px rgba(15,23,42,0.18)",
            transform: `translateY(${interpolate(cardSpring, [0, 1], [35, 0])}px)`,
            opacity: interpolate(local, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: "#64748B", letterSpacing: 1.4 }}>
            POTONGAN SKEMATIK • KALIMALANG BEKASI
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 78, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>Rp123 M</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#334155", marginTop: 6 }}>
                Dana penataan & jembatan lengkung
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 38, fontWeight: 900, color: TEAL }}>Nov 2026</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#64748B" }}>Target peresmian</div>
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1.5px dashed #94A3B8", display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>
            <span>5 Jembatan Baru</span>
            <span>Ganti 15 Jembatan Lama</span>
            <span>Clearance 2,5–3 m</span>
          </div>
        </div>
      )}

      {/* Scene 6: Traffic Impact Metric Card */}
      {scene === 6 && (
        <div
          style={{
            position: "absolute",
            top: 390,
            left: 68,
            right: 68,
            display: "flex",
            gap: 20,
            opacity: interpolate(local, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.94)", border: "2px solid #0F172A", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#64748B" }}>TITIK MACET</div>
            <div style={{ fontSize: 54, fontWeight: 900, color: ORANGE, marginTop: 4 }}>13 → 5</div>
          </div>
          <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.94)", border: "2px solid #0F172A", borderRadius: 14, padding: "20px 22px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#64748B" }}>LAMPU MERAH</div>
            <div style={{ fontSize: 54, fontWeight: 900, color: TEAL, marginTop: 4 }}>13 → 3</div>
          </div>
        </div>
      )}

      {/* Scene 8: Gamified Ending Summary Badges (Cerita Teknik Signature!) */}
      {scene === 8 && (
        <div
          style={{
            position: "absolute",
            top: 390,
            left: 68,
            right: 68,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(local, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {["1 PERAHU LEWAT", "2 AIR LANCAR", "3 KURANGI MACET"].map((item, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: TEAL,
                  color: "#FFFFFF",
                  fontSize: 22,
                  fontWeight: 900,
                  padding: "10px 18px",
                  borderRadius: 999,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              color: "#0F172A",
              border: "2.5px solid #0F766E",
              fontSize: 24,
              fontWeight: 900,
              padding: "10px 24px",
              borderRadius: 12,
            }}
          >
            LULUS: BEDAH JEMBATAN KALIMALANG
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#334155", backgroundColor: "rgba(255,255,255,0.85)", padding: "6px 14px", borderRadius: 8 }}>
            Sumber: Pemkot Bekasi / Pemprov Jabar (2025–2026)
          </div>
        </div>
      )}

      {/* Bottom Subtitle (Cerita Teknik Style: Dark Pill + Teal Highlight Underline) */}
      <div
        style={{
          position: "absolute",
          bottom: 265,
          left: 68,
          right: 68,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {[sub.line1, sub.line2].map((line, li) => (
          <div
            key={li}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.88)",
              padding: "10px 22px",
              borderRadius: 12,
              fontSize: 40,
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.2,
              textAlign: "center",
              boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
            }}
          >
            {line.split(" ").map((w, wi) => {
              const isHi = w.toLowerCase().includes(sub.highlight.toLowerCase());
              return (
                <span
                  key={wi}
                  style={{
                    marginRight: 9,
                    display: "inline-block",
                    borderBottom: isHi ? `5px solid ${TEAL_LIGHT}` : "none",
                    color: isHi ? "#CCFBF1" : "#FFFFFF",
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
