import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ================= HariIniNgapainExplainer =================
// "Jam 9 malem, lo mikir... hari ini gue ngapain aja sih?"
// Slot 5 — 21:00 WIB 2026-11-22, seri relate (BUKAN explainer sains).
// 1853 frame = 61.78 detik @ 30fps (DIKUNCI ke durasi VO Sami asli
// 61.776s via ffprobe), 1080x1920, 6 scene. Profil B toy-explainer.
// Audio: VO Sami + BGM chill (vol 0.15) + whoosh di tiap awal scene.
// TANPA chirp.
//
// GLB DULU (standing rule Maya): house/man/woman/lamp/car GLB CC0.
// tree/trees.glb DILARANG — tidak pernah render (9 tes gagal); pohon
// prosedural. Setiap GLB di-traverse: frustumCulled=false +
// material.side=DoubleSide + metalness=0 (normalizeHeight).
// Subtitle: teks putih 44px w800, kata aktif AMBER, textShadow, DAN
// pill gelap rgba(0,0,0,0.55) di belakang teks (fix kontras 2026-11-22).
// Easing di semua gerakan, secondary motion tiap scene, kamera bergerak
// di dalam scene, hero selalu utuh di frame.

// ================= Palette (terang, Profil B) =================
const SKY_NIGHT = "#A9C6DA"; // biru senja terang (bukan hitam)
const SKY_DUSK = "#8FA8BC";
const SKY = "#C8DCE8";
const SKY_DAWN = "#F2D8A8";
const CREAM = "#F5EFE0";
const WALL = "#DCCFB9";
const FLOOR_WOOD = "#C9A876";
const GREEN = "#A8C3A0";
const PATH = "#E8E0CC";
const AMBER = "#FFB300";
const ORANGE = "#FF7A00";
const PHONE_GLOW = "#7FE3FF";
const HOODIE = "#C9CDD2";
const JEANS = "#3A4A5E";
const HAIR = "#2B2B2B";
const SKIN = "#E8B98A";
const ASPHALT = "#6B7280";
const CONCRETE = "#C9C4B8";
const BEDDING = "#7FA8C9";
const STEEL_DARK = "#6B7280";
const LAMP_WARM = "#FFC873";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Helpers deterministik =================
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Normalisasi GLB: tinggi jadi targetH, alas di y=0, tengah di x/z=0.
// FIX GLB (temuan 2026-11-21): winding terbalik + boundingSphere salah —
// frustumCulled=false + DoubleSide + metalness=0 di semua material.
const normalizeHeight = (scene: THREE.Group, targetH: number): THREE.Group => {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const scale = targetH / Math.max(size.y, 0.001);
  scene.traverse((o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.frustumCulled = false;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat: THREE.Material) => {
        const std = mat as THREE.MeshStandardMaterial;
        std.side = THREE.DoubleSide;
        std.metalness = 0;
      });
    }
  });
  const outer = new THREE.Group();
  scene.position.set(-center.x, -box.min.y, -center.z);
  outer.add(scene);
  outer.scale.setScalar(scale);
  return outer;
};

// Terangkan material rumah (asli GLB: Grey 0.087, DarkGrey 0.026).
const brightenHouse = (scene: THREE.Group): void => {
  const REMAP: Record<string, string> = {
    Grey: "#A9B2BC",
    DarkGrey: "#4A525E",
    White: "#F2EFE8",
    Brown: "#9A7B52",
  };
  scene.traverse((o: THREE.Object3D) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat: THREE.Material) => {
      const std = mat as THREE.MeshStandardMaterial;
      const bright = REMAP[std.name];
      if (bright) {
        std.color.set(bright);
      }
      std.roughness = 0.85;
    });
  });
};

const easeCam = (
  local: number,
  len: number,
  from: [number, number, number],
  to: [number, number, number]
): [number, number, number] => {
  const t = interpolate(local, [0, len - 1], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
};

const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
}> = ({ position, target }) => {
  const camera = useThree((state) => state.camera);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

// ================= Sosok GLB (man / woman) =================
const Figure: React.FC<{
  group: THREE.Group | undefined;
  position: [number, number, number];
  rotY?: number;
  bob?: number;
  bobSpeed?: number;
  sway?: number;
  frame: number;
  moveX?: [number, number];
  local?: number;
  len?: number;
}> = ({ group, position, rotY = 0, bob = 0, bobSpeed = 0.06, sway = 0, frame, moveX, local, len }) => {
  if (!group) return null;
  const y = position[1] + (bob === 0 ? 0 : Math.sin(frame * bobSpeed) * bob);
  const x =
    moveX && local !== undefined && len
      ? interpolate(local, [0, len - 1], [moveX[0], moveX[1]], {
          easing: Easing.inOut(Easing.quad),
        })
      : position[0];
  const rz = sway === 0 ? 0 : Math.sin(frame * 0.04) * sway;
  return (
    <group position={[x, y, position[2]]} rotation={[0, rotY, rz]}>
      <primitive object={group} />
    </group>
  );
};

// ================= Pohon prosedural (trees.glb DILARANG) =================
const Tree: React.FC<{ h: number; x: number; z: number }> = ({ h, x, z }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.6 * h, 0]}>
      <cylinderGeometry args={[0.16 * h, 0.26 * h, 1.2 * h, 8]} />
      <meshStandardMaterial color="#8A6B4A" roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 2.0 * h, 0]}>
      <coneGeometry args={[1.05 * h, 2.0 * h, 8]} />
      <meshStandardMaterial color="#5E8C4A" roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 3.1 * h, 0]}>
      <coneGeometry args={[0.7 * h, 1.6 * h, 8]} />
      <meshStandardMaterial color="#6FA055" roughness={1} metalness={0} />
    </mesh>
  </group>
);

const TreeCluster: React.FC<{ position: [number, number, number]; seed: number; sway: number }> = ({
  position,
  seed,
  sway,
}) => (
  <group position={position} rotation={[0, 0, sway]}>
    <Tree h={1.0 + hash(seed) * 0.3} x={-1.6} z={0.4} />
    <Tree h={1.25 + hash(seed + 1) * 0.25} x={0.3} z={-0.6} />
    <Tree h={0.9 + hash(seed + 2) * 0.3} x={1.9} z={0.5} />
  </group>
);

// ================= Uap naik (piring makan) =================
const Steam: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position}>
    {[0, 1, 2].map((i) => {
      const phase = (frame * 0.012 + i / 3) % 1;
      const y = interpolate(phase, [0, 1], [0, 1.1], {
        easing: Easing.out(Easing.quad),
      });
      const op = (1 - phase) * 0.55;
      const s = 0.1 + phase * 0.16;
      return (
        <mesh
          key={i}
          position={[Math.sin(frame * 0.05 + i * 2) * 0.06, y, 0]}
          scale={[s, s, s]}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={op} roughness={1} />
        </mesh>
      );
    })}
  </group>
);

// ================= Kamar: lantai + dinding =================
const BedroomShell: React.FC = () => (
  <>
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={FLOOR_WOOD} roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 6, -4]}>
      <planeGeometry args={[26, 12]} />
      <meshStandardMaterial color={WALL} roughness={1} metalness={0} />
    </mesh>
  </>
);

// ================= Jendela malam (bulan + bintang + tirai) =================
const STARS: { x: number; y: number; phase: number }[] = [
  { x: -1.8, y: 1.2, phase: 0 },
  { x: -0.6, y: 1.8, phase: 1.1 },
  { x: 0.9, y: 1.4, phase: 2.2 },
  { x: 1.7, y: 0.6, phase: 0.7 },
  { x: -1.2, y: 0.3, phase: 1.8 },
  { x: 0.2, y: 2.1, phase: 2.9 },
  { x: 1.9, y: 1.9, phase: 0.4 },
  { x: -2.1, y: 1.9, phase: 1.5 },
];

const NightWindow: React.FC<{ frame: number; position: [number, number, number] }> = ({
  frame,
  position,
}) => {
  const sway = Math.sin(frame * 0.01) * 0.05;
  return (
    <group position={position} scale={[0.62, 0.62, 0.62]}>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[6.4, 5.2]} />
        <meshStandardMaterial color={SKY_NIGHT} roughness={1} />
      </mesh>
      <mesh position={[1.6, 1.5, 0.05]}>
        <circleGeometry args={[0.85, 24]} />
        <meshStandardMaterial color="#FFF8DC" emissive="#FFE9A8" emissiveIntensity={0.7} />
      </mesh>
      {STARS.map((s, i) => {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(frame * 0.03 + s.phase));
        return (
          <mesh key={i} position={[s.x, s.y, 0.05]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={tw * 1.4} />
          </mesh>
        );
      })}
      <mesh position={[0, 2.6, 0.08]}>
        <boxGeometry args={[6.8, 0.25, 0.15]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      <mesh position={[0, -2.6, 0.08]}>
        <boxGeometry args={[6.8, 0.25, 0.15]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      <mesh position={[-3.3, 0, 0.08]}>
        <boxGeometry args={[0.25, 5.6, 0.15]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      <mesh position={[3.3, 0, 0.08]}>
        <boxGeometry args={[0.25, 5.6, 0.15]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      <group position={[-3.6, 0, 0.15]} rotation={[0, 0, sway]}>
        <mesh>
          <boxGeometry args={[0.9, 5.6, 0.1]} />
          <meshStandardMaterial color="#E8B4B8" roughness={1} />
        </mesh>
      </group>
      <group position={[3.6, 0, 0.15]} rotation={[0, 0, -sway]}>
        <mesh>
          <boxGeometry args={[0.9, 5.6, 0.1]} />
          <meshStandardMaterial color="#E8B4B8" roughness={1} />
        </mesh>
      </group>
    </group>
  );
};

// ================= Tempat tidur =================
const Bed: React.FC = () => (
  <group position={[0.3, 0, -0.5]}>
    <mesh position={[0, 0.6, 0]}>
      <boxGeometry args={[5.4, 1.2, 3.0]} />
      <meshStandardMaterial color={FLOOR_WOOD} roughness={0.9} />
    </mesh>
    <mesh position={[0, 1.35, 0]}>
      <boxGeometry args={[5.2, 0.5, 2.8]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
    <mesh position={[-2.1, 1.7, 0]} rotation={[0, 0, 0.12]}>
      <boxGeometry args={[1.0, 0.35, 1.8]} />
      <meshStandardMaterial color="#FFFFFF" roughness={1} />
    </mesh>
    <mesh position={[0.9, 1.65, 0]} rotation={[0, 0, -0.04]}>
      <boxGeometry args={[3.0, 0.3, 2.85]} />
      <meshStandardMaterial color={BEDDING} roughness={1} />
    </mesh>
  </group>
);

// ================= Sosok prosedural rebahan / tidur =================
// GLB man/woman adalah sosok BERDIRI — tidak bisa direbahkan tanpa pose
// aneh; untuk adegan rebahan/tidur di kasur dipakai sosok prosedural
// (satu orang, hoodie abu + jeans, konsisten dengan karakter serial).
const LyingPerson: React.FC<{
  position: [number, number, number];
  frame: number;
  armUp: boolean;
  sleeping?: boolean;
}> = ({ position, frame, armUp, sleeping = false }) => {
  const breath = sleeping ? 1 + Math.sin(frame * 0.045) * 0.03 : 1;
  return (
    <group position={position}>
      {/* badan sepanjang sumbu X, kepala di -X */}
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh position={[0, 0.35, -0.45]}>
          <boxGeometry args={[0.42, 1.7, 0.42]} />
          <meshStandardMaterial color={JEANS} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.35, 0.45]}>
          <boxGeometry args={[0.42, 1.7, 0.42]} />
          <meshStandardMaterial color={JEANS} roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.6, -0.45]}>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.6, 0.45]}>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.6, 0]} scale={[1, breath, 1]}>
          <cylinderGeometry args={[0.62, 0.68, 1.9, 16]} />
          <meshStandardMaterial color={HOODIE} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.15, 0.6]}>
          <boxGeometry args={[0.7, 0.5, 0.1]} />
          <meshStandardMaterial color="#B9BDC2" roughness={0.9} />
        </mesh>
        {armUp ? (
          <mesh position={[0, 2.6, 0.75]} rotation={[0.5, 0, -0.4]}>
            <cylinderGeometry args={[0.16, 0.16, 1.1, 10]} />
            <meshStandardMaterial color={HOODIE} roughness={0.9} />
          </mesh>
        ) : (
          <mesh position={[0, 1.9, 0.75]} rotation={[0.2, 0, -0.15]}>
            <cylinderGeometry args={[0.16, 0.16, 1.0, 10]} />
            <meshStandardMaterial color={HOODIE} roughness={0.9} />
          </mesh>
        )}
        <mesh position={[0, 3.15, 0]}>
          <sphereGeometry args={[0.55, 20, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
        <mesh position={[0, 3.35, -0.12]} scale={[1, 0.75, 1]}>
          <sphereGeometry args={[0.56, 20, 16]} />
          <meshStandardMaterial color={HAIR} roughness={1} />
        </mesh>
      </group>
    </group>
  );
};

// ================= HP dengan feed yang scroll =================
const Phone: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  local: number;
}> = ({ position, rotation = [0, 0, 0], local }) => {
  const feedColors = ["#FFB300", "#7FA8C9", "#A8C3A0", "#FF8A65"];
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[1.15, 2.3, 0.12]} />
        <meshStandardMaterial color="#2B2B2B" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[1.0, 2.15]} />
        <meshStandardMaterial color={PHONE_GLOW} emissive="#4FB8FF" emissiveIntensity={0.9} />
      </mesh>
      {feedColors.map((c, i) => {
        const t = (local * 0.004 + i * 0.25) % 1;
        const y = interpolate(t, [0, 1], [-0.85, 0.85]);
        const op = interpolate(t, [0, 0.12, 0.88, 1], [0, 1, 1, 0]);
        return (
          <mesh key={i} position={[-0.18, y, 0.1]}>
            <boxGeometry args={[0.62, 0.3, 0.02]} />
            <meshStandardMaterial color={c} transparent opacity={op} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

// ================= Jam dinding (jarum berputar, menghadap kamera) =================
const WallClock: React.FC<{
  position: [number, number, number];
  frame: number;
  speed: number;
}> = ({ position, frame, speed }) => {
  const minuteAngle = -frame * speed;
  const hourAngle = -frame * speed * 0.08;
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.15, 32]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <torusGeometry args={[1.35, 0.09, 10, 32]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
      </mesh>
      {[
        [0, 1.05],
        [1.05, 0],
        [0, -1.05],
        [-1.05, 0],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.09]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0.12]} rotation={[0, 0, hourAngle]}>
        <boxGeometry args={[0.14, 0.85, 0.05]} />
        <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 0.14]} rotation={[0, 0, minuteAngle]}>
        <boxGeometry args={[0.1, 1.25, 0.05]} />
        <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.17]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
};

// ================= Nakas + lampu tidur =================
const NightstandLamp: React.FC<{ frame: number; dim?: boolean }> = ({ frame, dim = false }) => {
  const glow = 1 + Math.sin(frame * 0.02) * 0.12;
  return (
    <group position={[-4.4, 0, -2.6]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.2, 2.2, 1.8]} />
        <meshStandardMaterial color={FLOOR_WOOD} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.8, 10]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.2, 0]} scale={[glow, glow, glow]}>
        <coneGeometry args={[0.85, 0.9, 20]} />
        <meshStandardMaterial
          color={AMBER}
          emissive={AMBER}
          emissiveIntensity={dim ? 0.4 : 1.1}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh position={[0, 3.2, 0]} scale={[1.5, 1.5, 1.5]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshStandardMaterial
          color={AMBER}
          emissive={AMBER}
          emissiveIntensity={dim ? 0.15 : 0.5}
          transparent
          opacity={0.25}
        />
      </mesh>
    </group>
  );
};

// ================= Jalan raya (aspal + trotoar + rumput) =================
const StreetGround: React.FC = () => (
  <>
    <mesh position={[0, 0, 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[70, 9]} />
      <meshStandardMaterial color={ASPHALT} roughness={1} metalness={0} />
    </mesh>
    {/* garis tengah jalan */}
    {[-6, -2, 2, 6, 10].map((x) => (
      <mesh key={x} position={[x, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 0.3]} />
        <meshStandardMaterial color="#F5EFE0" roughness={1} />
      </mesh>
    ))}
    <mesh position={[0, 0.01, -3.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[70, 3.4]} />
      <meshStandardMaterial color={CONCRETE} roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 0, -8]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[70, 8]} />
      <meshStandardMaterial color={GREEN} roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 0, 8]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[70, 6]} />
      <meshStandardMaterial color={GREEN} roughness={1} metalness={0} />
    </mesh>
  </>
);

// ================= Tanah hijau + jalan setapak (halaman rumah) =================
const GreenGround: React.FC = () => (
  <>
    <mesh position={[0, 0, -6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[90, 90]} />
      <meshStandardMaterial color={GREEN} roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 0.02, -4]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.4, 12]} />
      <meshStandardMaterial color={PATH} roughness={1} metalness={0} />
    </mesh>
  </>
);

// ================= Meja kos: piring + uap, kunci, koin, tagihan =================
const KosTable: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position}>
    <mesh position={[0, 0.95, 0]}>
      <boxGeometry args={[2.6, 0.12, 1.4]} />
      <meshStandardMaterial color="#D8C9A8" roughness={0.8} />
    </mesh>
    {[
      [-1.2, -0.6],
      [1.2, -0.6],
      [-1.2, 0.6],
      [1.2, 0.6],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.45, z]}>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#B8A888" roughness={0.8} />
      </mesh>
    ))}
    {/* piring makan + uap */}
    <mesh position={[-0.5, 1.08, 0]}>
      <cylinderGeometry args={[0.34, 0.26, 0.12, 16]} />
      <meshStandardMaterial color="#EFE9D8" roughness={0.6} />
    </mesh>
    <mesh position={[-0.5, 1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.3, 16]} />
      <meshStandardMaterial color="#F2E8C8" roughness={0.5} />
    </mesh>
    <Steam position={[-0.5, 1.18, 0]} frame={frame} />
    {/* kunci kos (gantungan bundar + batang) */}
    <group position={[0.55, 1.05, 0.3]} rotation={[0, 0.4, 0]}>
      <mesh>
        <torusGeometry args={[0.16, 0.045, 8, 16]} />
        <meshStandardMaterial color={AMBER} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.25, -0.05, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.4, 0.08, 0.05]} />
        <meshStandardMaterial color="#C9C4B8" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
    {/* tumpukan koin (bayar kos sendiri) */}
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0.95, 1.07 + i * 0.07, -0.35]}>
        <cylinderGeometry args={[0.16, 0.16, 0.06, 16]} />
        <meshStandardMaterial color={AMBER} metalness={0.5} roughness={0.4} />
      </mesh>
    ))}
    {/* tagihan (kertas putih) */}
    <mesh position={[0.1, 1.03, -0.45]} rotation={[0, 0.3, 0]}>
      <boxGeometry args={[0.7, 0.02, 0.5]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
    </mesh>
  </group>
);

// ================= Matahari terbit (S4) =================
const Sunrise: React.FC<{ frame: number; position: [number, number, number] }> = ({
  frame,
  position,
}) => {
  const rise = Math.sin(frame * 0.008) * 0.15;
  return (
    <group position={[position[0], position[1] + rise, position[2]]}>
      <mesh>
        <circleGeometry args={[2.2, 32]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1.0} />
      </mesh>
      <mesh scale={[1.6, 1.6, 1.6]}>
        <circleGeometry args={[2.2, 32]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.25} transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// ================= Dunia 3D per scene =================
type Models = {
  house?: THREE.Group;
  man?: THREE.Group;
  woman?: THREE.Group;
  lamp?: THREE.Group;
  car?: THREE.Group;
};

const Scene: React.FC<{
  frame: number;
  scene: number;
  local: number;
  models: Models | null;
}> = ({ frame, scene, local, models }) => {
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const sway = Math.sin(frame * 0.02) * 0.02;
  return (
    <>
      <ambientLight intensity={scene === 0 || scene === 5 ? 0.7 : 0.9} />
      <directionalLight position={[30, 50, 20]} intensity={scene === 0 || scene === 5 ? 0.6 : 1.2} />

      {/* ===== S0 HOOK: kamar jam 9 malem, rebahan buka HP ===== */}
      {scene === 0 && (
        <>
          <BedroomShell />
          <NightWindow frame={frame} position={[-3.6, 7.0, -3.9]} />
          <WallClock position={[3.9, 7.6, -3.9]} frame={frame} speed={0.02} />
          <Bed />
          <LyingPerson position={[1.15, 1.65, -0.5]} frame={frame} armUp />
          <Phone
            position={[-0.95, 3.1, 0.35]}
            rotation={[0.25, 0, -0.35]}
            local={local}
          />
          <NightstandLamp frame={frame} />
        </>
      )}

      {/* ===== S1: macet — mobil antre, lampu rem, pohon bergoyang ===== */}
      {scene === 1 && (
        <>
          <StreetGround />
          <TreeCluster position={[-9, 0, -6.5]} seed={3} sway={sway} />
          <TreeCluster position={[9, 0, -6.5]} seed={7} sway={-sway} />
          <TreeCluster position={[-4, 0, 7]} seed={11} sway={sway} />
          {models?.car && (
            <>
              <group position={[-5.5, 0, 2]} rotation={[0, 0, 0]}>
                <primitive object={models.car} />
              </group>
              <group position={[0.5, 0, 2]} rotation={[0, 0, 0]}>
                <primitive object={models.car} />
              </group>
              <group position={[6.5, 0, 2]} rotation={[0, 0, 0]}>
                <primitive object={models.car} />
              </group>
            </>
          )}
          {/* lampu rem menyala di belakang mobil tengah */}
          <mesh position={[0.5, 0.9, 4.6]}>
            <boxGeometry args={[1.6, 0.25, 0.1]} />
            <meshStandardMaterial color="#FF2222" emissive="#FF2222" emissiveIntensity={1.6} />
          </mesh>
          {models?.lamp && (
            <group position={[-8, 0, -1.5]}>
              <primitive object={models.lamp} />
            </group>
          )}
          <Figure
            group={models?.man}
            position={[3.5, 0, -3.2]}
            rotY={-0.4}
            bob={0.04}
            frame={frame}
          />
        </>
      )}

      {/* ===== S2: ketinggalan — rumah teman + mobil + dua sosok ===== */}
      {scene === 2 && (
        <>
          <GreenGround />
          {models?.house && (
            <group position={[0, 0, -12]}>
              <primitive object={models.house} />
            </group>
          )}
          <TreeCluster position={[-11, 0, -7]} seed={3} sway={sway} />
          <TreeCluster position={[11, 0, -9]} seed={7} sway={-sway} />
          {models?.car && (
            <group position={[5.8, 0, -8.5]} rotation={[0, -0.5, 0]}>
              <primitive object={models.car} />
            </group>
          )}
          {models?.lamp && (
            <group position={[4.5, 0, -5]}>
              <primitive object={models.lamp} />
            </group>
          )}
          <Figure
            group={models?.woman}
            position={[-0.9, 0, -9.3]}
            rotY={0.15}
            bob={0.03}
            frame={frame}
          />
          <Figure
            group={models?.man}
            position={[0.9, 0, -8.2]}
            rotY={-0.15}
            bob={0.05}
            frame={frame}
          />
        </>
      )}

      {/* ===== S3: bukti bertahan — meja kos + sosok ===== */}
      {scene === 3 && (
        <>
          <GreenGround />
          {models?.house && (
            <group position={[0, 0, -12]}>
              <primitive object={models.house} />
            </group>
          )}
          <TreeCluster position={[-11, 0, -7]} seed={3} sway={sway} />
          <TreeCluster position={[11, 0, -9]} seed={7} sway={-sway} />
          <KosTable position={[3.5, 0, -7.5]} frame={frame} />
          <Figure
            group={models?.man}
            position={[5.6, 0, -6.6]}
            rotY={-0.9}
            bob={0.04}
            frame={frame}
            moveX={[5.6, 5.1]}
            local={local}
            len={sceneLen}
          />
        </>
      )}

      {/* ===== S4: jalan lagi — trotoar pagi, matahari terbit ===== */}
      {scene === 4 && (
        <>
          <StreetGround />
          <Sunrise frame={frame} position={[-7, 7, -16]} />
          <TreeCluster position={[-9, 0, -6.5]} seed={5} sway={sway} />
          <TreeCluster position={[9, 0, -6.5]} seed={9} sway={-sway} />
          {models?.lamp && (
            <group position={[-5.5, 0, -1.5]}>
              <primitive object={models.lamp} />
              <pointLight position={[0, 2.6, 0]} intensity={6} distance={10} color={LAMP_WARM} />
            </group>
          )}
          <Figure
            group={models?.man}
            position={[-3, 0, -3.2]}
            rotY={0}
            bob={0.05}
            frame={frame}
            moveX={[-3, 3]}
            local={local}
            len={sceneLen}
          />
        </>
      )}

      {/* ===== S5: penutup — tidur tenang, kamar gelap hangat ===== */}
      {scene === 5 && (
        <>
          <BedroomShell />
          <NightWindow frame={frame} position={[-3.6, 7.0, -3.9]} />
          <WallClock position={[3.9, 7.6, -3.9]} frame={frame} speed={0.002} />
          <Bed />
          <LyingPerson position={[1.15, 1.65, -0.5]} frame={frame} armUp={false} sleeping />
          <NightstandLamp frame={frame} dim />
        </>
      )}
    </>
  );
};

// ================= Lapisan teks =================
const Headline: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 160,
      left: 70,
      right: 70,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 56,
        fontWeight: 800,
        color: "#FFFFFF",
        lineHeight: 1.2,
        textShadow: SHADOW,
      }}
    >
      Jam 9 Malem, Lo Mikir...
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 44,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1.25,
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      Hari Ini Gue Ngapain Aja Sih?
    </div>
  </div>
);

// Subtitle per scene = narasi_layar naskah Slot 5 (tanpa ubah kata).
const SUBTITLES: { text: string; highlight: string }[] = [
  {
    text: "Jam 9 malem. Lo rebahan, buka HP, terus mikir, hari ini gue ngapain aja sih?",
    highlight: "ngapain",
  },
  {
    text: "Kerja, makan, scroll, tidur. Kayak nggak ada yang berubah. Lo ngerasa hari lo kosong, padahal lo ngelewatin macet, deadline, tagihan, dan omongan orang.",
    highlight: "macet",
  },
  {
    text: "Lo ngerasa ketinggalan sama temen-temen lo yang udah nikah, udah punya rumah, udah sukses.",
    highlight: "ketinggalan",
  },
  {
    text: "Padahal lo bangun pagi, lo kerja, lo bayar kos sendiri, lo makan dari hasil keringat lo sendiri. Itu bukan nggak ngapa-ngapain. Itu bertahan.",
    highlight: "bertahan",
  },
  {
    text: "Dan bertahan itu capek. Nggak ada yang tepuk tangan buat lo hari ini. Tapi lo tetep jalan. Jangan bandingin hidup lo sama highlight orang lain. Besok bangun, jalan lagi. Pelan-pelan juga sampai.",
    highlight: "sampai",
  },
  {
    text: "Malam ini, sebelum tidur, coba inget satu hal baik yang terjadi hari ini. Apa itu?",
    highlight: "baik",
  },
];

const Subtitle: React.FC<{ scene: number; local: number }> = ({ scene, local }) => {
  const { text, highlight } = SUBTITLES[scene];
  const words = text.split(" ");
  return (
    <div
      style={{
        position: "absolute",
        bottom: 380,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 44,
        fontWeight: 800,
        lineHeight: 1.35,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      <span
        style={{
          display: "inline-block",
          backgroundColor: "rgba(0,0,0,0.55)",
          padding: "10px 28px",
          borderRadius: 18,
        }}
      >
        {words.map((w, i) => {
          const clean = w.toLowerCase().replace(/[^a-z0-9-]/g, "");
          const isMatch = clean === highlight.toLowerCase();
          const opacity = interpolate(local, [i * 2, i * 2 + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span key={i} style={{ opacity, color: isMatch ? AMBER : "#FFFFFF" }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </span>
    </div>
  );
};

const WatermarkText: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 60,
      right: 60,
      fontFamily: FONT,
      fontSize: 24,
      fontWeight: 700,
      color: "rgba(255,255,255,0.85)",
      textShadow: "0 2px 8px rgba(0,0,0,0.7)",
    }}
  >
    Nur Maya
  </div>
);

// ================= Scene bounds (proporsional kata, total 1853 frame) =================
const SCENE_BOUNDS = [0, 212, 566, 792, 1160, 1627, 1853];
const SKIES = [SKY_NIGHT, SKY_DUSK, SKY, SKY, SKY_DAWN, SKY_NIGHT];

export const HariIniNgapainExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const [models, setModels] = useState<Models | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models hari-ini"));

  useEffect(() => {
    let cancelled = false;
    const jobs: [keyof Models, string, number][] = [
      ["house", "models/house/house.glb", 7],
      ["man", "models/person/man.glb", 1.8],
      ["woman", "models/person/woman-casual.glb", 1.75],
      ["lamp", "models/streetlamp/street-light.glb", 2.6],
      ["car", "models/car/car.glb", 1.7],
    ];
    const results: Models = {};
    let done = 0;
    const loader = new GLTFLoader();
    jobs.forEach(([key, url, h]) => {
      loader.load(
        staticFile(url),
        (g: { scene: THREE.Group }) => {
          if (cancelled) return;
          if (key === "house") {
            brightenHouse(g.scene);
          }
          results[key] = normalizeHeight(g.scene, h);
          done += 1;
          if (done === jobs.length) {
            setModels(results);
            setTimeout(() => continueRender(handle), 3000);
          }
        },
        undefined,
        () => {
          if (cancelled) return;
          done += 1;
          if (done === jobs.length) {
            setModels(results);
            setTimeout(() => continueRender(handle), 3000);
          }
        }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  let scene = 0;
  for (let i = 0; i < 6; i++) {
    if (frame >= SCENE_BOUNDS[i] && frame < SCENE_BOUNDS[i + 1]) {
      scene = i;
      break;
    }
  }
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const local = frame - SCENE_BOUNDS[scene];

  let camPos: [number, number, number];
  let camTarget: [number, number, number];

  if (scene === 0) {
    // S0 HOOK: push-in ke kasur — sosok rebahan + HP + jendela utuh.
    camPos = easeCam(local, sceneLen, [7, 5, 10], [5.5, 4, 8]);
    camTarget = [0, 1.8, -0.5];
  } else if (scene === 1) {
    // S1 MACET: tracking lateral menyusuri antrean mobil.
    camPos = easeCam(local, sceneLen, [-7, 3.5, 7], [7, 3.5, 7]);
    camTarget = easeCam(local, sceneLen, [-2, 1.5, 1], [2, 1.5, 1]);
  } else if (scene === 2) {
    // S2 RUMAH TEMAN: push-in 3/4 ke rumah, dua sosok + mobil utuh.
    camPos = easeCam(local, sceneLen, [10.5, 5, 5.5], [8.5, 4.3, 2]);
    camTarget = [0, 2.5, -10];
  } else if (scene === 3) {
    // S3 MEJA KOS: dari kiri, meja + sosok + rumah satu frame.
    camPos = easeCam(local, sceneLen, [-1.5, 3, 0.5], [-0.5, 2.6, -1]);
    camTarget = [3.5, 1.2, -7.5];
  } else if (scene === 4) {
    // S4 JALAN PAGI: tracking mengikuti sosok yang berjalan.
    camPos = easeCam(local, sceneLen, [-6, 3, 6], [0, 3, 6]);
    camTarget = easeCam(local, sceneLen, [-2, 1.5, -3.2], [2, 1.5, -3.2]);
  } else {
    // S5 PENUTUP: pull-back pelan dari kasur.
    camPos = easeCam(local, sceneLen, [5, 3.5, 8], [7, 5, 11]);
    camTarget = [0, 1.8, -0.5];
  }

  return (
    <AbsoluteFill style={{ backgroundColor: SKIES[scene] }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        <Scene frame={frame} scene={scene} local={local} models={models} />
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>
      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      <Audio src={staticFile("audio/hari-ini-ngapain/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 6).map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {scene === 0 && <Headline />}
      <Subtitle scene={scene} local={local} />
      <WatermarkText />
    </AbsoluteFill>
  );
};
