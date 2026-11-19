import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= TolMiringExplainer — "Kenapa Jalan Tol di Tikungan Dimiringin?" =================
// 1658 frame = 55.27 detik, 30fps, 1080x1920. 9 scene x 183 frame.
// VO Sami 55.24s (1657.2 frame) — durasi diperpanjang dari 1650 supaya VO muat penuh.
// Profil B toy-explainer, TAPI tanpa header band / kotak gelap (judul + subtitle
// melayang bebas dengan text-shadow tebal). Visual 3D detail (bukan kotak polos):
// mobil berkaca biru-abu + lampu + velg, jalan bermarka + guardrail + pohon +
// bukit 2 lapis + awan. Kamera ganti tiap ~6 detik.

// ================= Palette (terang, warm cream / langit cerah) =================
const SKY = "#BFE0EE";
const GROUND = "#A8C3A0";
const HILL_FAR = "#7FA06E";
const HILL_NEAR = "#B5CBA8";
const CREAM = "#FFF8E7";
const CONCRETE = "#B5B5AC";
const CONCRETE_DARK = "#9A9A90";
const ROAD_EDGE = "#F5F5F0";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const GLASS = "#6E93B0";
const GLASS_LIGHT = "#A8C8DC";
const TIRE = "#262626";
const HUB = "#D8D8D8";
const RED = "#E63946";
const HEADLIGHT = "#FFF3C4";
const TRUNK = "#8B6B4A";
const LEAF = "#5E9B4D";
const LEAF_LIGHT = "#7FB069";
const BLUE_FORCE = "#3B82F6";
const GREEN_FORCE = "#22C55E";

const FONT = "Inter, Arial, sans-serif";

// ================= Jalur jalan (lurus + busur 90 derajat + lurus) =================
const DECK_TOP = 1.6;
const ROAD_WIDTH = 6;
const BANK_MAX = (12 * Math.PI) / 180; // superelevasi visual 12% ~ 6,8 derajat (batas AASHTO)
const STRAIGHT_LEN = 60;
const ARC_R = 25;
const ARC_LEN = (Math.PI / 2) * ARC_R;
const FINAL_LEN = 30;
const PATH_LEN = STRAIGHT_LEN + ARC_LEN + FINAL_LEN;
const PILLAR_S = [12, 30, 48, 66, 84, 102, 120];
const GUARD_POST_S: number[] = [];
for (let s = 3; s < PATH_LEN; s += 6) GUARD_POST_S.push(s);
const DASH_S: number[] = [];
for (let s = 2; s < PATH_LEN; s += 4) DASH_S.push(s);

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

type PathPoint = { x: number; z: number; tx: number; tz: number; bank: number };

function pathPoint(s: number): PathPoint {
  const sc = Math.max(0, Math.min(PATH_LEN, s));
  if (sc < STRAIGHT_LEN) {
    return { x: 0, z: 40 - sc, tx: 0, tz: -1, bank: 0 };
  }
  if (sc < STRAIGHT_LEN + ARC_LEN) {
    const a = sc - STRAIGHT_LEN;
    const theta = Math.PI + a / ARC_R;
    let bf = 1;
    if (a < 10) bf = smoothstep(a / 10);
    else if (a > ARC_LEN - 10) bf = smoothstep((ARC_LEN - a) / 10);
    return {
      x: 25 + ARC_R * Math.cos(theta),
      z: -20 + ARC_R * Math.sin(theta),
      tx: -Math.sin(theta),
      tz: Math.cos(theta),
      bank: BANK_MAX * bf,
    };
  }
  const d = sc - STRAIGHT_LEN - ARC_LEN;
  return { x: 25 + d, z: -45, tx: 1, tz: 0, bank: 0 };
}

type RoadFrame = {
  pos: THREE.Vector3;
  X: THREE.Vector3;
  Y: THREE.Vector3;
  Z: THREE.Vector3;
  quat: THREE.Quaternion;
};

// Basis jalan di titik s: X = melintang, Y = tegak (miring saat banking), Z = tangen.
function roadFrame(s: number, banked: boolean): RoadFrame {
  const p = pathPoint(s);
  const Z = new THREE.Vector3(p.tx, 0, p.tz).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const L = new THREE.Vector3().crossVectors(up, Z).normalize();
  const bank = banked ? p.bank : 0;
  const Y = new THREE.Vector3()
    .addScaledVector(up, Math.cos(bank))
    .addScaledVector(L, Math.sin(bank))
    .normalize();
  const X = new THREE.Vector3().crossVectors(Y, Z).normalize();
  const pos = new THREE.Vector3(p.x, DECK_TOP, p.z);
  const quat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(X, Y, Z)
  );
  return { pos, X, Y, Z, quat };
}

// ================= Ribbon generik (permukaan jalan, garis tepi, guardrail) =================
function buildRibbon(
  getPair: (s: number) => [THREE.Vector3, THREE.Vector3],
  step = 1
): THREE.BufferGeometry {
  const n = Math.ceil(PATH_LEN / step);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= n; i++) {
    const s = Math.min(PATH_LEN, i * step);
    const [a, b] = getPair(s);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  for (let i = 0; i < n; i++) {
    const r0 = i * 2;
    const r1 = (i + 1) * 2;
    indices.push(r0, r0 + 1, r1, r0 + 1, r1 + 1, r1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ================= Camera rig (gerak deterministik dari frame) =================
const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
}> = ({ position, target }) => {
  const camera = useThree((state) => state.camera);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

// ================= Mobil mainan DETAIL (bukan kotak polos) =================
const WHEEL_POS: [number, number][] = [
  [0.95, 1.15],
  [-0.95, 1.15],
  [0.95, -1.15],
  [-0.95, -1.15],
];

const Car: React.FC<{ s: number; lat: number; banked: boolean }> = ({
  s,
  lat,
  banked,
}) => {
  const f = roadFrame(s, banked);
  const pos = f.pos.clone().addScaledVector(f.X, lat);
  return (
    <group position={pos} quaternion={f.quat}>
      {/* bodi utama oranye */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.9, 0.62, 3.4]} />
        <meshStandardMaterial color={ORANGE} roughness={0.65} />
      </mesh>
      {/* lis bawah lebih gelap */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.94, 0.18, 3.44]} />
        <meshStandardMaterial color="#E66A00" roughness={0.7} />
      </mesh>
      {/* kabin kaca BIRU-ABU (bukan hitam pekat) */}
      <mesh position={[0, 1.32, -0.2]}>
        <boxGeometry args={[1.6, 0.55, 1.7]} />
        <meshStandardMaterial color={GLASS} roughness={0.2} metalness={0.15} />
      </mesh>
      {/* kaca depan lebih terang, sedikit miring (di ujung DEPAN, +z = arah jalan) */}
      <mesh position={[0, 1.34, 1.02]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[1.5, 0.42, 0.08]} />
        <meshStandardMaterial color={GLASS_LIGHT} roughness={0.15} metalness={0.2} />
      </mesh>
      {/* panel atap oranye */}
      <mesh position={[0, 1.63, -0.2]}>
        <boxGeometry args={[1.55, 0.08, 1.6]} />
        <meshStandardMaterial color={ORANGE} roughness={0.65} />
      </mesh>
      {/* lampu belakang merah (emissive) — di ujung BELAKANG, -z */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={`tail-${x}`} position={[x, 0.85, -1.72]}>
          <boxGeometry args={[0.36, 0.18, 0.06]} />
          <meshStandardMaterial
            color={RED}
            emissive={RED}
            emissiveIntensity={0.55}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* lampu depan kuning terang — di ujung DEPAN, +z */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={`head-${x}`} position={[x, 0.85, 1.72]}>
          <boxGeometry args={[0.36, 0.18, 0.06]} />
          <meshStandardMaterial
            color={HEADLIGHT}
            emissive={HEADLIGHT}
            emissiveIntensity={0.45}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* 4 roda: ban gelap + velg terang */}
      {WHEEL_POS.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.38, 0.38, 0.32, 20]} />
            <meshStandardMaterial color={TIRE} roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.38, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.34, 16]} />
            <meshStandardMaterial color={HUB} roughness={0.35} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* bayangan kontak jelas (elips gelap ganda) */}
      <mesh
        position={[0, 0.035, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.15, 1.95, 1]}
      >
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.28} roughness={1} />
      </mesh>
      <mesh
        position={[0, 0.045, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.85, 1.5, 1]}
      >
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color="#000000" transparent opacity={0.18} roughness={1} />
      </mesh>
    </group>
  );
};

// ================= Pohon (bola + kerucut, deterministik) =================
const TREES: { x: number; z: number; s: number }[] = [
  { x: -14, z: 25, s: 1.0 },
  { x: -20, z: 5, s: 1.2 },
  { x: -16, z: -15, s: 0.9 },
  { x: -22, z: -35, s: 1.1 },
  { x: -12, z: -55, s: 1.0 },
  { x: -28, z: -60, s: 1.3 },
  { x: 38, z: 15, s: 1.1 },
  { x: 48, z: -8, s: 1.0 },
  { x: 42, z: -38, s: 1.2 },
  { x: 60, z: -55, s: 1.0 },
  { x: 15, z: -70, s: 1.1 },
  { x: 55, z: 25, s: 0.9 },
  { x: -45, z: -75, s: 1.4 },
  { x: 70, z: -70, s: 1.3 },
];

const Tree: React.FC<{ x: number; z: number; s: number }> = ({ x, z, s }) => (
  <group position={[x, 0, z]} scale={[s, s, s]}>
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.22, 0.3, 1.2, 10]} />
      <meshStandardMaterial color={TRUNK} roughness={1} />
    </mesh>
    <mesh position={[0, 2.0, 0]}>
      <coneGeometry args={[1.25, 2.6, 12]} />
      <meshStandardMaterial color={LEAF} roughness={1} />
    </mesh>
    <mesh position={[0, 3.3, 0]}>
      <sphereGeometry args={[0.95, 16, 12]} />
      <meshStandardMaterial color={LEAF_LIGHT} roughness={1} />
    </mesh>
  </group>
);

// ================= Awan (bola pipih, posisi tepi — bukan tengah atas) =================
const CLOUDS: { pos: [number, number, number]; scale: number }[] = [
  { pos: [-55, 38, -90], scale: 1.0 },
  { pos: [52, 42, -75], scale: 1.25 },
  { pos: [-28, 40, -120], scale: 0.85 },
  { pos: [72, 36, -105], scale: 1.05 },
];

const Cloud: React.FC<{ position: [number, number, number]; scale: number }> = ({
  position,
  scale,
}) => (
  <group position={position} scale={[scale, scale, scale]}>
    <mesh position={[0, 0, 0]} scale={[1, 0.35, 1]}>
      <sphereGeometry args={[6, 20, 16]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
    <mesh position={[5, 0.5, 0]} scale={[1, 0.35, 1]}>
      <sphereGeometry args={[4.5, 20, 16]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
    <mesh position={[-5, 0.5, 0]} scale={[1, 0.35, 1]}>
      <sphereGeometry args={[4, 20, 16]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
  </group>
);

// ================= Bukit 2 lapis (2 nada hijau, jauh + dekat) =================
const HILLS: {
  pos: [number, number, number];
  scale: [number, number, number];
  color: string;
}[] = [
  { pos: [-60, -1, -112], scale: [55, 13, 30], color: HILL_FAR },
  { pos: [62, -1, -118], scale: [60, 15, 32], color: HILL_FAR },
  { pos: [-45, -1, -82], scale: [35, 7, 22], color: HILL_NEAR },
  { pos: [50, -1, -86], scale: [38, 8, 24], color: HILL_NEAR },
];

// ================= Panah gaya 3D (silinder + kerucut) =================
const Arrow3D: React.FC<{
  from: THREE.Vector3;
  dir: THREE.Vector3;
  len: number;
  color: string;
  thick?: boolean;
}> = ({ from, dir, len, color, thick }) => {
  const d = dir.clone().normalize();
  const shaftLen = len * 0.72;
  const headLen = len * 0.28;
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    d
  );
  const shaftCenter = from.clone().addScaledVector(d, shaftLen / 2);
  const headCenter = from
    .clone()
    .addScaledVector(d, shaftLen + headLen / 2);
  const r = thick ? 0.13 : 0.06;
  const hr = thick ? 0.34 : 0.17;
  return (
    <group>
      <mesh position={shaftCenter} quaternion={quat}>
        <cylinderGeometry args={[r, r, shaftLen, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={headCenter} quaternion={quat}>
        <coneGeometry args={[hr, headLen, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  );
};

// ================= Scene 3D =================
type SceneMode = "normal" | "guide" | "skid" | "mechanism";

const Scene: React.FC<{
  carS: number;
  carLat: number;
  banked: boolean;
  mode: SceneMode;
  smoke: number; // 0..1 intensitas asap (scene skid)
}> = ({ carS, carLat, banked, mode, smoke }) => {
  const roadGeo = useMemo(() => {
    const top = buildRibbon((s) => {
      const f = roadFrame(s, banked);
      return [
        f.pos.clone().addScaledVector(f.X, ROAD_WIDTH / 2),
        f.pos.clone().addScaledVector(f.X, -ROAD_WIDTH / 2),
      ];
    });
    const skirtL = buildRibbon((s) => {
      const f = roadFrame(s, banked);
      const topP = f.pos.clone().addScaledVector(f.X, ROAD_WIDTH / 2);
      return [topP, topP.clone().addScaledVector(f.Y, -0.55)];
    });
    const skirtR = buildRibbon((s) => {
      const f = roadFrame(s, banked);
      const topP = f.pos.clone().addScaledVector(f.X, -ROAD_WIDTH / 2);
      return [topP, topP.clone().addScaledVector(f.Y, -0.55)];
    });
    return { top, skirtL, skirtR };
  }, [banked]);

  const edgeGeo = useMemo(() => {
    const mk = (latA: number, latB: number) =>
      buildRibbon((s) => {
        const f = roadFrame(s, banked);
        const a = f.pos.clone().addScaledVector(f.X, latA).addScaledVector(f.Y, 0.02);
        const b = f.pos.clone().addScaledVector(f.X, latB).addScaledVector(f.Y, 0.02);
        return [a, b];
      });
    return { left: mk(2.65, 2.88), right: mk(-2.88, -2.65) };
  }, [banked]);

  const railGeo = useMemo(() => {
    const mk = (lat: number) =>
      buildRibbon((s) => {
        const f = roadFrame(s, banked);
        const a = f.pos.clone().addScaledVector(f.X, lat).addScaledVector(f.Y, 0.62);
        const b = f.pos.clone().addScaledVector(f.X, lat).addScaledVector(f.Y, 1.05);
        return [a, b];
      });
    return { left: mk(3.35), right: mk(-3.35) };
  }, [banked]);

  const pillars = useMemo(
    () =>
      PILLAR_S.map((s) => {
        const p = pathPoint(s);
        return new THREE.Vector3(p.x, 0.55, p.z);
      }),
    []
  );

  const guardPosts = useMemo(
    () =>
      GUARD_POST_S.map((s) => {
        const f = roadFrame(s, banked);
        return {
          left: f.pos.clone().addScaledVector(f.X, 3.35).addScaledVector(f.Y, 0.5),
          right: f.pos.clone().addScaledVector(f.X, -3.35).addScaledVector(f.Y, 0.5),
          quat: f.quat,
        };
      }),
    [banked]
  );

  const dashes = useMemo(
    () =>
      DASH_S.map((s) => {
        const f = roadFrame(s, banked);
        const pos = f.pos.clone().addScaledVector(f.Y, 0.03);
        return { pos, quat: f.quat };
      }),
    [banked]
  );

  // Garis lurus acuan kelembaman (scene 1): dash kuning lurus dari ujung tikungan.
  const guideDashes = useMemo(() => {
    const out: { pos: THREE.Vector3 }[] = [];
    for (let z = -22; z >= -46; z -= 4) {
      out.push({ pos: new THREE.Vector3(0, DECK_TOP + 0.03, z) });
    }
    return out;
  }, []);

  // Jejak ban selip (scene skid): 2 roda x 5 titik di belakang mobil.
  const skidMarks = useMemo(() => {
    if (mode !== "skid") return [];
    const marks: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
    const latAt = (s: number) => {
      const t = Math.max(0, Math.min(1, (s - 52) / 26));
      return t * 2.6;
    };
    for (let i = 1; i <= 5; i++) {
      const s = carS - i * 1.8;
      if (s < 50) break;
      const lat = latAt(s);
      for (const off of [-0.95, 0.95]) {
        const f = roadFrame(s, false);
        const pos = f.pos
          .clone()
          .addScaledVector(f.X, lat + off)
          .addScaledVector(f.Y, 0.025);
        marks.push({ pos, quat: f.quat });
      }
    }
    return marks;
  }, [mode, carS]);

  // Panah gaya (scene mechanism): gravitasi, normal, sentripetal.
  const arrows = useMemo(() => {
    if (mode !== "mechanism") return null;
    const f = roadFrame(carS, true);
    // Asal panah normal + gravitasi digeser ke sisi kamera (+X lateral)
    // supaya tidak tertutup bodi mobil.
    const origin = f.pos
      .clone()
      .addScaledVector(f.X, carLat + 1.4)
      .add(new THREE.Vector3(0, 1.6, 0));
    const gravity = { from: origin, dir: new THREE.Vector3(0, -1, 0), len: 1.8, color: BLUE_FORCE };
    const normal = { from: origin, dir: f.Y.clone(), len: 2.2, color: ORANGE };
    // Panah sentripetal di sisi DALAM tikungan (arah pusat), setinggi mobil,
    // supaya terlihat utuh mengarah ke pusat tikungan.
    const cpOrigin = f.pos
      .clone()
      .addScaledVector(f.X, -1.0)
      .add(new THREE.Vector3(0, 1.6, 0));
    const toCenter = new THREE.Vector3(25 - cpOrigin.x, 0, -20 - cpOrigin.z).normalize();
    const centripetal = { from: cpOrigin, dir: toCenter, len: 1.3, color: GREEN_FORCE, thick: true };
    return { gravity, normal, centripetal };
  }, [mode, carS, carLat]);

  const smokePuffs = useMemo(() => {
    if (mode !== "skid" || smoke <= 0.01) return [];
    const f = roadFrame(Math.max(50, carS - 2), false);
    const base = f.pos.clone().addScaledVector(f.X, carLat);
    return [
      { pos: base.clone().add(new THREE.Vector3(-0.9, 0.6, 1.2)), r: 0.7 * (0.6 + smoke) },
      { pos: base.clone().add(new THREE.Vector3(0.9, 0.5, 1.6)), r: 0.55 * (0.6 + smoke) },
      { pos: base.clone().add(new THREE.Vector3(0, 0.9, 2.2)), r: 0.8 * (0.6 + smoke) },
    ];
  }, [mode, smoke, carS, carLat]);

  return (
    <>
      <color attach="background" args={[SKY]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[30, 50, 20]} intensity={1.25} />
      <directionalLight position={[-20, 30, -30]} intensity={0.35} />
      {/* tanah hijau */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      {/* bukit 2 lapis */}
      {HILLS.map((h, i) => (
        <mesh key={`hill-${i}`} position={h.pos} scale={h.scale}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color={h.color} roughness={1} />
        </mesh>
      ))}
      {/* awan */}
      {CLOUDS.map((c, i) => (
        <Cloud key={`cloud-${i}`} position={c.pos} scale={c.scale} />
      ))}
      {/* pohon */}
      {TREES.map((t, i) => (
        <Tree key={`tree-${i}`} x={t.x} z={t.z} s={t.s} />
      ))}
      {/* jalan layang: permukaan + sisi */}
      <mesh geometry={roadGeo.top}>
        <meshStandardMaterial color={CONCRETE} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={roadGeo.skirtL}>
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={roadGeo.skirtR}>
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* garis tepi putih */}
      <mesh geometry={edgeGeo.left}>
        <meshStandardMaterial color={ROAD_EDGE} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={edgeGeo.right}>
        <meshStandardMaterial color={ROAD_EDGE} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* marka tengah putus-putus */}
      {dashes.map((d, i) => (
        <mesh key={`dash-${i}`} position={d.pos} quaternion={d.quat}>
          <boxGeometry args={[0.18, 0.03, 2.4]} />
          <meshStandardMaterial color={ROAD_EDGE} roughness={0.9} />
        </mesh>
      ))}
      {/* guardrail: rel + tiang */}
      <mesh geometry={railGeo.left}>
        <meshStandardMaterial color="#D8D8D8" roughness={0.5} metalness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={railGeo.right}>
        <meshStandardMaterial color="#D8D8D8" roughness={0.5} metalness={0.25} side={THREE.DoubleSide} />
      </mesh>
      {guardPosts.map((g, i) => (
        <group key={`post-${i}`}>
          <mesh position={g.left} quaternion={g.quat}>
            <boxGeometry args={[0.16, 1.0, 0.16]} />
            <meshStandardMaterial color="#C8C8C8" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={g.right} quaternion={g.quat}>
            <boxGeometry args={[0.16, 1.0, 0.16]} />
            <meshStandardMaterial color="#C8C8C8" roughness={0.6} metalness={0.2} />
          </mesh>
        </group>
      ))}
      {/* tiang penyangga jalan layang (tepat di bawah deck) */}
      {pillars.map((pos, i) => (
        <mesh key={`pillar-${i}`} position={pos}>
          <boxGeometry args={[1.5, 1.1, 1.5]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
        </mesh>
      ))}
      {/* garis lurus acuan kelembaman (scene 1 saja) */}
      {mode === "guide" &&
        guideDashes.map((g, i) => (
          <mesh key={`guide-${i}`} position={g.pos}>
            <boxGeometry args={[0.22, 0.03, 2.2]} />
            <meshStandardMaterial color={AMBER} roughness={0.8} />
          </mesh>
        ))}
      {/* jejak ban selip */}
      {skidMarks.map((m, i) => (
        <mesh key={`skid-${i}`} position={m.pos} quaternion={m.quat}>
          <boxGeometry args={[0.28, 0.02, 1.1]} />
          <meshStandardMaterial color="#3A3A3A" roughness={1} />
        </mesh>
      ))}
      {/* asap tipis roda selip */}
      {smokePuffs.map((p, i) => (
        <mesh key={`smoke-${i}`} position={p.pos}>
          <sphereGeometry args={[p.r, 12, 10]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.35} roughness={1} />
        </mesh>
      ))}
      {/* panah gaya (scene mechanism) */}
      {arrows && (
        <>
          <Arrow3D from={arrows.gravity.from} dir={arrows.gravity.dir} len={arrows.gravity.len} color={arrows.gravity.color} />
          <Arrow3D from={arrows.normal.from} dir={arrows.normal.dir} len={arrows.normal.len} color={arrows.normal.color} />
          <Arrow3D from={arrows.centripetal.from} dir={arrows.centripetal.dir} len={arrows.centripetal.len} color={arrows.centripetal.color} thick={arrows.centripetal.thick} />
        </>
      )}
      <Car s={carS} lat={carLat} banked={banked} />
    </>
  );
};

// ================= Lapisan teks — MELAYANG bebas, TANPA kotak/kartu gelap =================
const STRONG_SHADOW = "0 2px 8px rgba(0,0,0,0.9), 0 4px 14px rgba(0,0,0,0.85)";

const FloatingTitle: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 150,
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
        lineHeight: 1.15,
        textShadow: STRONG_SHADOW,
      }}
    >
      Kenapa Jalan Tol di Tikungan Dimiringin?
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 44,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1.2,
        marginTop: 10,
        textShadow: STRONG_SHADOW,
      }}
    >
      Bukan biar mobil nggak ngantuk.
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  {
    text: "Jalan tol lurus, mobil jalan normal. Begitu masuk tikungan, kenapa jalannya dibikin miring?",
    highlight: "miring",
  },
  {
    text: "Soalnya mobil itu cenderung terus lurus, padahal jalan membelok.",
    highlight: "lurus",
  },
  {
    text: "Di jalan datar, yang nahan mobil biar nggak selip keluar cuma gesekan ban.",
    highlight: "gesekan",
  },
  { text: "Makanya jalan tol dimiringin, disebut superelevasi.", highlight: "superelevasi" },
  {
    text: "Miringnya bikin gaya dari jalan ikut mendorong mobil ke tengah tikungan.",
    highlight: "tengah",
  },
  {
    text: "Pada kecepatan yang dirancang, miringnya aja udah cukup.",
    highlight: "cukup",
  },
  {
    text: "Maksimal dua belas persen, atau sekitar enam koma delapan derajat.",
    highlight: "persen",
  },
  {
    text: "Jadi jalan datar bikin mobil gampang selip, jalan miring bikin mobil tetap stabil.",
    highlight: "stabil",
  },
  {
    text: "Tikungan paling miring yang pernah lo lewatin di mana?",
    highlight: "mana",
  },
];

function splitLines(text: string): [string[], string[]] {
  const words = text.split(" ");
  if (words.length <= 7) return [words, []];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid), words.slice(mid)];
}

const Subtitle: React.FC<{ scene: number; local: number }> = ({ scene, local }) => {
  const { text, highlight } = SUBTITLES[scene];
  const [line1, line2] = splitLines(text);
  const all = [...line1, ...line2];
  const renderWord = (w: string, i: number) => {
    const clean = w.toLowerCase().replace(/[^a-z0-9,]/g, "");
    const isMatch = clean === highlight || clean.startsWith(highlight);
    const opacity = interpolate(local, [i * 3, i * 3 + 8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <span key={i} style={{ opacity, color: isMatch ? AMBER : "#FFFFFF" }}>
        {w}
        {i < all.length - 1 ? " " : ""}
      </span>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        bottom: 380,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 42,
        fontWeight: 800,
        lineHeight: 1.35,
        color: "#FFFFFF",
        textShadow: STRONG_SHADOW,
      }}
    >
      {line1.map((w, i) => renderWord(w, i))}
      {line2.length > 0 && (
        <>
          <br />
          {line2.map((w, j) => renderWord(w, line1.length + j))}
        </>
      )}
    </div>
  );
};

// Badge angka besar (scene 6): "12%" + "6,8 derajat".
const BigBadges: React.FC<{ local: number; fps: number }> = ({ local, fps }) => {
  const pop = spring({ frame: local, fps, config: { damping: 12, stiffness: 120 } });
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  const opacity = interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 560,
        left: 70,
        right: 70,
        textAlign: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 150,
          fontWeight: 900,
          color: ORANGE,
          lineHeight: 1,
          textShadow: STRONG_SHADOW,
        }}
      >
        12%
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 110,
          fontWeight: 900,
          color: AMBER,
          lineHeight: 1.1,
          marginTop: 8,
          textShadow: STRONG_SHADOW,
        }}
      >
        6,8&deg;
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 800,
          color: "#FFFFFF",
          marginTop: 16,
          textShadow: STRONG_SHADOW,
        }}
      >
        Maksimal superelevasi (AASHTO)
      </div>
    </div>
  );
};

// Label split-screen (scene 7): kiri datar vs kanan miring.
const SplitLabels: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        top: 300,
        left: 0,
        width: 540,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 800,
          color: "#FFFFFF",
          textShadow: STRONG_SHADOW,
        }}
      >
        JALAN DATAR
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 800,
          color: "#FF6B6B",
          marginTop: 6,
          textShadow: STRONG_SHADOW,
        }}
      >
        mobil selip keluar
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        top: 300,
        right: 0,
        width: 540,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 800,
          color: "#FFFFFF",
          textShadow: STRONG_SHADOW,
        }}
      >
        JALAN MIRING
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 800,
          color: "#4ADE80",
          marginTop: 6,
          textShadow: STRONG_SHADOW,
        }}
      >
        mobil tetap stabil
      </div>
    </div>
  </>
);

// Label hairline tipis: teks + garis 1px + titik jangkar.
const HairlineLabel: React.FC<{
  x: number;
  y: number;
  lineW: number;
  flip?: boolean;
  text: string;
  color: string;
}> = ({ x, y, lineW, flip, text, color }) => (
  <div style={{ position: "absolute", left: x, top: y }}>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: STRONG_SHADOW,
        whiteSpace: "nowrap",
        transform: flip ? "translateX(-100%)" : undefined,
      }}
    >
      {text}
    </div>
    <div
      style={{
        position: "absolute",
        top: 34,
        left: flip ? -lineW : 0,
        width: lineW,
        height: 2,
        backgroundColor: color,
        boxShadow: "0 1px 4px rgba(0,0,0,0.8)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 29,
        left: (flip ? -lineW : lineW) - 5,
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: color,
        border: "2px solid #FFFFFF",
        boxShadow: "0 1px 4px rgba(0,0,0,0.8)",
      }}
    />
  </div>
);

// Sumber kecil melayang (scene akhir).
const SourceText: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 300,
      left: 70,
      right: 70,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 28,
      fontWeight: 700,
      color: "#FFFFFF",
      textShadow: STRONG_SHADOW,
    }}
  >
    Sumber: AASHTO Green Book / Fisika Mekanika
  </div>
);

// ================= Komposisi utama =================
const SCENE_LEN = 183;
const CAR_S_RANGES: [number, number][] = [
  [8, 32], // 0 HOOK: lurus, follow
  [32, 58], // 1 PROBLEM: masuk tikungan, side-tracking
  [52, 78], // 2 FLAT SKID: top-down, jalan datar selip
  [62, 78], // 3 BANKING INTRO: low-angle side, potongan miring
  [68, 78], // 4 MEKANISME: close-up + panah gaya
  [72, 100], // 5 DESIGN SPEED: follow, stabil di tikungan miring
  [82, 98], // 6 ANGKA: top-down diagram + badge 12% / 6,8 derajat
  [60, 85], // 7 PERBANDINGAN: split datar vs miring
  [95, 118], // 8 CLOSE: naik + pull-back
];

export const TolMiringExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = Math.min(8, Math.floor(frame / SCENE_LEN));
  const local = frame - scene * SCENE_LEN;

  const carS = interpolate(local, [0, SCENE_LEN - 1], CAR_S_RANGES[scene]);
  const carLat =
    scene === 2
      ? interpolate(local, [0, SCENE_LEN - 1], [0, 2.6])
      : 0;
  const latLeft =
    scene === 7 ? interpolate(local, [0, SCENE_LEN - 1], [0, 2.6]) : 0;
  const smoke = scene === 2 ? interpolate(local, [40, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }) : 0;

  const mode: SceneMode =
    scene === 1 ? "guide" : scene === 2 ? "skid" : scene === 4 ? "mechanism" : "normal";
  const banked = scene !== 2;

  // Kamera dari posisi mobil di jalur.
  const p = pathPoint(carS);
  const T = new THREE.Vector3(p.tx, 0, p.tz).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const Lh = new THREE.Vector3().crossVectors(up, T).normalize();
  const carPos = new THREE.Vector3(p.x, DECK_TOP, p.z);

  let camPos: THREE.Vector3;
  let camTarget: THREE.Vector3;
  if (scene === 0) {
    const dist = interpolate(local, [0, SCENE_LEN - 1], [12, 10]);
    const height = interpolate(local, [0, SCENE_LEN - 1], [4.5, 3.8]);
    camPos = carPos.clone().addScaledVector(T, -dist).add(new THREE.Vector3(0, height, 0));
    camTarget = carPos.clone().addScaledVector(T, 8);
  } else if (scene === 1) {
    const sideDist = interpolate(local, [0, SCENE_LEN - 1], [15, 12]);
    camPos = carPos
      .clone()
      .addScaledVector(Lh, sideDist)
      .addScaledVector(T, -5)
      .add(new THREE.Vector3(0, 3.2, 0));
    camTarget = carPos.clone().addScaledVector(T, 2);
  } else if (scene === 2) {
    const height = interpolate(local, [0, SCENE_LEN - 1], [32, 28]);
    camPos = carPos.clone().add(new THREE.Vector3(0, height, -10));
    camTarget = carPos.clone();
  } else if (scene === 3) {
    camPos = carPos
      .clone()
      .addScaledVector(Lh, 9)
      .addScaledVector(T, -2)
      .add(new THREE.Vector3(0, 1.4, 0));
    camTarget = carPos.clone().add(new THREE.Vector3(0, 1.6, 0));
  } else if (scene === 4) {
    // MEKANISME: rear 3/4 view — supaya panah sentripetal (radial) tidak
    // foreshortened (kamera lateral murni membuat panah radial mengarah ke
    // kamera dan tampak seperti titik). Kamera dari belakang + sisi luar.
    camPos = carPos
      .clone()
      .addScaledVector(T, -9)
      .addScaledVector(Lh, 2)
      .add(new THREE.Vector3(0, 3.0, 0));
    camTarget = carPos.clone().add(new THREE.Vector3(0, 1.4, 0));
  } else if (scene === 5) {
    const dist = interpolate(local, [0, SCENE_LEN - 1], [11, 9]);
    camPos = carPos.clone().addScaledVector(T, -dist).add(new THREE.Vector3(0, 3.6, 0));
    camTarget = carPos.clone().addScaledVector(T, 8);
  } else if (scene === 6) {
    camPos = carPos.clone().add(new THREE.Vector3(0.5, 42, 2));
    camTarget = carPos.clone();
  } else if (scene === 7) {
    const sideDist = interpolate(local, [0, SCENE_LEN - 1], [20, 17]);
    camPos = carPos.clone().addScaledVector(Lh, sideDist).add(new THREE.Vector3(0, 4.5, 0));
    camTarget = carPos.clone().add(new THREE.Vector3(0, 1, 0));
  } else {
    const height = interpolate(local, [0, SCENE_LEN - 1], [24, 38]);
    const pullback = interpolate(local, [0, SCENE_LEN - 1], [1, 1.5]);
    camPos = carPos.clone().add(new THREE.Vector3(-16 * pullback, height, 12 * pullback));
    camTarget = carPos.clone().addScaledVector(T, 4);
  }

  const camPosArr: [number, number, number] = [camPos.x, camPos.y, camPos.z];
  const camTargetArr: [number, number, number] = [camTarget.x, camTarget.y, camTarget.z];

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      {scene === 7 ? (
        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          <div style={{ width: 540, height: 1920 }}>
            <ThreeCanvas
              width={540}
              height={1920}
              camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
            >
              <Scene carS={carS} carLat={latLeft} banked={false} mode="skid" smoke={smoke} />
              <CameraRig position={camPosArr} target={camTargetArr} />
            </ThreeCanvas>
          </div>
          <div style={{ width: 540, height: 1920 }}>
            <ThreeCanvas
              width={540}
              height={1920}
              camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
            >
              <Scene carS={carS} carLat={0} banked mode="normal" smoke={0} />
              <CameraRig position={camPosArr} target={camTargetArr} />
            </ThreeCanvas>
          </div>
        </div>
      ) : (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
        >
          <Scene carS={carS} carLat={carLat} banked={banked} mode={mode} smoke={smoke} />
          <CameraRig position={camPosArr} target={camTargetArr} />
        </ThreeCanvas>
      )}

      {/* ======== Lapisan teks (melayang bebas, TANPA kotak gelap) ======== */}
      {scene === 0 && <FloatingTitle />}
      <Subtitle scene={scene} local={local} />
      {scene === 6 && <BigBadges local={local} fps={fps} />}
      {scene === 7 && <SplitLabels />}
      {scene === 3 && (
        <HairlineLabel x={620} y={640} lineW={110} text="Sudut Superelevasi" color={AMBER} />
      )}
      {scene === 2 && (
        <HairlineLabel x={150} y={1180} lineW={130} text="Gesekan ban" color={AMBER} />
      )}
      {scene === 4 && (
        <>
          <HairlineLabel x={235} y={531} lineW={70} flip text="Gaya normal" color={ORANGE} />
          <HairlineLabel x={700} y={760} lineW={80} text="Gaya sentripetal" color={GREEN_FORCE} />
          <HairlineLabel x={180} y={1150} lineW={110} text="Gravitasi" color={BLUE_FORCE} />
        </>
      )}
      {scene === 8 && <SourceText />}

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami 55.24s, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/tol-miring/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video 55.27s — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene (9 scene x 183 frame) */}
      {[0, 183, 366, 549, 732, 915, 1098, 1281, 1464].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15s (5 frame) saat badge "12%" / "6,8°" muncul — scene 6, frame 1098 */}
      <Sequence from={1098} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
