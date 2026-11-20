import { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= KrlListrikExplainer =================
// "Kenapa KRL Nggak Pakai Bensin?"
// 1666 frame = 55.52 detik @ 30fps (durasi VO Sami real, ffprobe),
// 1080x1920, 9 scene (~185 frame/scene).
// Profil B toy-explainer. Kartun TETAP kartun, tapi bentuk MIRIP ASLINYA:
// KRL KAI Commuter (livery putih-merah, jendela berderet, pantograf di
// atap, bogie + roda baja), rel + bantalan + tiang LAA + kabel zig-zag,
// gardu traksi, stasiun + peron + penumpang (siluet, tanpa wajah).
// Feedback Maya yang diterapkan:
// - Environment PENUH: tiang LAA berderet, kabel, pohon, bangunan,
//   stasiun, awan, bukit 2 lapis. Tidak ada dunia kosong.
// - Penempatan masuk akal: kereta DI ATAS rel dan JAUH dari semak/pohon
//   (pohon lateral >= 9, tidak ada di zona peron/gardu); pantograf DI
//   ATAP kereta dan MENYENTUH kabel; kabel DI ATAS rel (5,3 m);
//   penumpang DI ATAS peron, bukan di rel.
// - Teks MELAYANG tanpa kotak/band gelap, subtitle 40px maks 2 baris +
//   highlight amber, safe zone atas >=140px bawah >=220px samping >=70px.
// - TANPA audio di komposisi ini (VO/BGM dipasang terpisah nanti).

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const CREAM = "#F5EFE0";
const GREEN = "#A8C3A0";
const GREEN_DARK = "#8FAE8A";
const GREEN_LIGHT = "#B5CBA8";
const BALLAST = "#8A7F72";
const SLEEPER = "#6B5D4F";
const RAIL = "#B9C0C7";
const STEEL_DARK = "#6B7280";
const KRL_WHITE = "#F4F2EC";
const KRL_RED = "#D32F2F";
const KRL_BLUE = "#3A5A78";
const KRL_GREY = "#5C6670";
const GLASS = "#2E4A63";
const COPPER = "#B87333";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const TRUNK = "#8A6B4F";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const CONCRETE = "#C9C4B8";
const PLATFORM_YELLOW = "#F5C542";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Jalur rel LURUS (sepanjang sumbu Z) =================
// Rel dari z=50 sampai z=-140. trainS = jarak tempuh dari start;
// posisi lokomotif z = 40 - trainS (bergerak ke arah -Z).
const RAIL_TOP = 0.57;
const WIRE_Y = 5.9; // kabel tembaga 5,3 m di atas rel (0,57 + 5,3)
const MESSENGER_Y = 6.9;
const POLE_X = -4.5;
const POLE_SPACING = 20;

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// Deterministik (bukan Math.random): hash dari indeks.
function pseudo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Offset zig-zag kabel: +-0,45 bergantian tiap tiang (20 unit).
// Nilai asli +-20 cm; diperbesar di visual 3D supaya terbaca kamera.
// Nilai faktual +-20 cm tetap yang tampil di label/diagram.
function wireX(s: number): number {
  const k = Math.floor(s / POLE_SPACING);
  const t = (s - k * POLE_SPACING) / POLE_SPACING;
  const a = k % 2 === 0 ? 0.45 : -0.45;
  const b = k % 2 === 0 ? -0.45 : 0.45;
  return a + (b - a) * t;
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

// ================= Beam: silinder di antara dua titik (kabel, lengan) =================
const Beam: React.FC<{
  a: [number, number, number];
  b: [number, number, number];
  r?: number;
  color: string;
  emissive?: string;
  opacity?: number;
}> = ({ a, b, r = 0.05, color, emissive, opacity }) => {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(a[0], a[1], a[2]);
    const vb = new THREE.Vector3(b[0], b[1], b[2]);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    const pos = va.clone().add(vb).multiplyScalar(0.5);
    return { pos, quat, len };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 8]} />
      <meshStandardMaterial
        color={color}
        roughness={0.5}
        metalness={0.4}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 1.6 : 0}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
      />
    </mesh>
  );
};

// ================= Roda + bogie =================
const Wheel: React.FC<{ side: number; spin: number }> = ({ side, spin }) => (
  <group position={[side * 0.75, 0.55, 0]} rotation={[spin, 0, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.55, 0.55, 0.22, 24]} />
      <meshStandardMaterial color="#8A9199" roughness={0.4} metalness={0.5} />
    </mesh>
  </group>
);

const Bogie: React.FC<{ z: number; spin: number }> = ({ z, spin }) => (
  <group position={[0, 0, z]}>
    <mesh position={[0, 0.95, 0]}>
      <boxGeometry args={[1.7, 0.3, 2.6]} />
      <meshStandardMaterial color={KRL_GREY} roughness={0.8} />
    </mesh>
    {[0.85, -0.85].map((az) => (
      <group key={az} position={[0, 0, az]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 1.5, 12]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
        </mesh>
        <Wheel side={1} spin={spin} />
        <Wheel side={-1} spin={spin} />
      </group>
    ))}
  </group>
);

// ================= Pantograf (di atap, menyentuh kabel) =================
// Bentuk belah ketupat dilihat dari samping (bidang Z-Y): pivot bawah di
// atap, simpul tengah kiri-kanan, strip karbon di atas menyentuh kabel.
const Pantograph: React.FC = () => (
  <group position={[0, 2.9, -0.3]}>
    {/* alas + isolator */}
    <mesh position={[0, 0.1, 0]}>
      <boxGeometry args={[1.2, 0.2, 1.6]} />
      <meshStandardMaterial color={KRL_GREY} roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.28, 0]}>
      <cylinderGeometry args={[0.12, 0.16, 0.18, 10]} />
      <meshStandardMaterial color="#E8E0C8" roughness={0.6} />
    </mesh>
    {/* lengan bawah: pivot -> simpul tengah */}
    <Beam a={[0, 0.35, -0.8]} b={[0, 1.5, 0]} r={0.06} color={STEEL_DARK} />
    <Beam a={[0, 0.35, 0.8]} b={[0, 1.5, 0]} r={0.06} color={STEEL_DARK} />
    {/* palang tengah */}
    <Beam a={[0, 1.5, -0.7]} b={[0, 1.5, 0.7]} r={0.05} color={STEEL_DARK} />
    {/* lengan atas: simpul tengah -> strip karbon */}
    <Beam a={[0, 1.5, -0.7]} b={[0, 2.95, 0]} r={0.06} color={STEEL_DARK} />
    <Beam a={[0, 1.5, 0.7]} b={[0, 2.95, 0]} r={0.06} color={STEEL_DARK} />
    {/* strip karbon (yang nempel ke kabel): batang gelap melintang */}
    <mesh position={[0, 2.95, 0]}>
      <boxGeometry args={[1.6, 0.1, 0.35]} />
      <meshStandardMaterial color="#2B2B2B" roughness={0.4} />
    </mesh>
  </group>
);

// ================= Gerbong KRL KAI Commuter =================
// Livery: bodi putih, garis merah di level jendela, atap abu gelap,
// rok bawah biru-abu. Jendela berderet, kaca depan + lampu (lokomotif).
const TrainCar: React.FC<{
  z: number;
  spin: number;
  isLoco: boolean;
}> = ({ z, spin, isLoco }) => (
  <group position={[0, 0, z]}>
    {/* bodi utama putih */}
    <mesh position={[0, 1.9, 0]}>
      <boxGeometry args={[2.3, 1.5, 5.0]} />
      <meshStandardMaterial color={KRL_WHITE} roughness={0.7} />
    </mesh>
    {/* garis merah KAI Commuter di level jendela */}
    <mesh position={[0, 2.32, 0]}>
      <boxGeometry args={[2.34, 0.28, 5.02]} />
      <meshStandardMaterial color={KRL_RED} roughness={0.7} />
    </mesh>
    {/* rok bawah biru-abu */}
    <mesh position={[0, 1.22, 0]}>
      <boxGeometry args={[2.34, 0.22, 5.02]} />
      <meshStandardMaterial color={KRL_BLUE} roughness={0.8} />
    </mesh>
    {/* atap abu gelap */}
    <mesh position={[0, 2.75, 0]}>
      <boxGeometry args={[2.1, 0.25, 4.6]} />
      <meshStandardMaterial color={KRL_GREY} roughness={0.8} />
    </mesh>
    {/* kaca depan (lokomotif) / jendela berderet (gerbong) */}
    {isLoco ? (
      <>
        <mesh position={[0, 2.05, 2.52]}>
          <boxGeometry args={[1.9, 0.75, 0.1]} />
          <meshStandardMaterial color={GLASS} roughness={0.25} />
        </mesh>
        {/* lampu depan */}
        <mesh position={[0.7, 1.5, 2.53]}>
          <boxGeometry args={[0.3, 0.28, 0.08]} />
          <meshStandardMaterial color="#FFF8DC" roughness={0.3} />
        </mesh>
        <mesh position={[-0.7, 1.5, 2.53]}>
          <boxGeometry args={[0.3, 0.28, 0.08]} />
          <meshStandardMaterial color="#FFF8DC" roughness={0.3} />
        </mesh>
        {/* kotak display tujuan merah di atas kaca */}
        <mesh position={[0, 2.62, 2.53]}>
          <boxGeometry args={[0.9, 0.22, 0.08]} />
          <meshStandardMaterial color={KRL_RED} roughness={0.5} />
        </mesh>
      </>
    ) : (
      <>
        {[1.6, 0.55, -0.55, -1.6].map((wz) => (
          <group key={wz}>
            <mesh position={[1.16, 2.05, wz]}>
              <boxGeometry args={[0.04, 0.7, 0.85]} />
              <meshStandardMaterial color={GLASS} roughness={0.25} />
            </mesh>
            <mesh position={[-1.16, 2.05, wz]}>
              <boxGeometry args={[0.04, 0.7, 0.85]} />
              <meshStandardMaterial color={GLASS} roughness={0.25} />
            </mesh>
          </group>
        ))}
      </>
    )}
    {/* kotak peralatan VVVF di bawah lantai (bukan tangki bensin) */}
    <mesh position={[0, 1.05, 0]}>
      <boxGeometry args={[1.6, 0.25, 3.2]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.8} />
    </mesh>
    {/* bayangan kontak lembut */}
    <mesh
      position={[0, 0.26, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[1.3, 2.9, 1]}
    >
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color="#000000" transparent opacity={0.18} roughness={1} />
    </mesh>
    <Bogie z={1.6} spin={spin} />
    <Bogie z={-1.6} spin={spin} />
    {isLoco && <Pantograph />}
  </group>
);

// ================= Pohon, awan, bukit, bangunan, penumpang =================
const HILLS: { pos: [number, number, number]; r: number; color: string }[] = [
  { pos: [-60, 0, -80], r: 30, color: GREEN_DARK },
  { pos: [70, 0, -60], r: 35, color: GREEN_DARK },
  { pos: [-50, 0, 30], r: 28, color: GREEN_LIGHT },
  { pos: [60, 0, 60], r: 32, color: GREEN_LIGHT },
];

const CLOUDS: { pos: [number, number, number]; scale: number }[] = [
  { pos: [-45, 38, -85], scale: 1 },
  { pos: [35, 42, -65], scale: 1.2 },
  { pos: [5, 36, -105], scale: 0.85 },
  { pos: [-20, 40, 20], scale: 1 },
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

const Tree: React.FC<{ position: [number, number, number]; scale: number }> = ({
  position,
  scale,
}) => (
  <group position={position} scale={[scale, scale, scale]}>
    <mesh position={[0, 0.7, 0]}>
      <cylinderGeometry args={[0.18, 0.24, 1.4, 10]} />
      <meshStandardMaterial color={TRUNK} roughness={1} />
    </mesh>
    <mesh position={[0, 2.2, 0]}>
      <sphereGeometry args={[1.5, 18, 14]} />
      <meshStandardMaterial color={LEAF} roughness={1} />
    </mesh>
    <mesh position={[0, 3.4, 0]}>
      <coneGeometry args={[1.1, 1.8, 12]} />
      <meshStandardMaterial color={LEAF_DARK} roughness={1} />
    </mesh>
  </group>
);

// Bangunan latar (kotak + jendela gelap di sisi menghadap rel).
const Building: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}> = ({ position, size, color }) => {
  const [w, h, d] = size;
  const rows = Math.max(1, Math.floor(h / 3.2));
  const cols = Math.max(1, Math.floor(d / 2.4));
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      {/* atap */}
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
        <meshStandardMaterial color={KRL_GREY} roughness={1} />
      </mesh>
      {/* jendela di sisi +X dan -X */}
      {[1, -1].map((sx) =>
        Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <mesh
              key={`${sx}-${r}-${c}`}
              position={[
                sx * (w / 2 + 0.03),
                2.2 + r * 3.2,
                -d / 2 + 1.4 + c * 2.4,
              ]}
            >
              <boxGeometry args={[0.06, 1.4, 1.2]} />
              <meshStandardMaterial color={GLASS} roughness={0.3} />
            </mesh>
          ))
        )
      )}
    </group>
  );
};

// Penumpang siluet di peron (tanpa wajah/detail).
const PASSENGERS: {
  pos: [number, number, number];
  color: string;
  scale: number;
}[] = [
  { pos: [5.2, 1.05, -60], color: "#D32F2F", scale: 1 },
  { pos: [6.8, 1.05, -64], color: "#3A5A78", scale: 0.95 },
  { pos: [5.6, 1.05, -72], color: "#4A7A3A", scale: 1.05 },
  { pos: [7.2, 1.05, -76], color: "#E8A020", scale: 0.9 },
  { pos: [5.4, 1.05, -82], color: "#7A4A9E", scale: 1 },
  { pos: [6.6, 1.05, -88], color: "#2A8A8A", scale: 0.95 },
  { pos: [5.8, 1.05, -94], color: "#C25E2E", scale: 1.05 },
];

const Passenger: React.FC<{
  position: [number, number, number];
  color: string;
  scale: number;
}> = ({ position, color, scale }) => (
  <group position={position} scale={[scale, scale, scale]}>
    {/* badan */}
    <mesh position={[0, 0.62, 0]}>
      <cylinderGeometry args={[0.3, 0.34, 1.1, 12]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
    {/* kepala (tanpa wajah) */}
    <mesh position={[0, 1.35, 0]}>
      <sphereGeometry args={[0.28, 16, 12]} />
      <meshStandardMaterial color="#E8C39E" roughness={1} />
    </mesh>
    {/* kaki */}
    <mesh position={[-0.12, 0.12, 0]}>
      <boxGeometry args={[0.16, 0.24, 0.2]} />
      <meshStandardMaterial color="#3A3A3A" roughness={1} />
    </mesh>
    <mesh position={[0.12, 0.12, 0]}>
      <boxGeometry args={[0.16, 0.24, 0.2]} />
      <meshStandardMaterial color="#3A3A3A" roughness={1} />
    </mesh>
  </group>
);

// ================= Scene 3D =================
const Scene: React.FC<{
  trainS: number;
  scene: number;
  local: number;
}> = ({ trainS, scene, local }) => {
  const spin = trainS / 0.55;
  const locoZ = 40 - trainS;
  const pantoZ = locoZ - 0.3;
  const pantoX = wireX(trainS);

  // Titik kabel (zig-zag) tiap tiang. Tiang digeser +10 (s=10..190) supaya
  // tidak ada tiang yang segaris di belakang pantograf saat scene 5.
  const wirePoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let s = 10; s <= 190; s += POLE_SPACING) {
      pts.push([wireX(s), WIRE_Y, 40 - s]);
    }
    return pts;
  }, []);

  const poles = useMemo(() => {
    const arr: number[] = [];
    for (let s = 10; s <= 190; s += POLE_SPACING) arr.push(s);
    return arr;
  }, []);

  const sleepers = useMemo(() => {
    const arr: number[] = [];
    for (let s = 1; s < 190; s += 1.4) arr.push(40 - s);
    return arr;
  }, []);

  const droppers = useMemo(() => {
    const arr: { x: number; z: number }[] = [];
    for (let s = 2.5; s < 180; s += 5) {
      arr.push({ x: wireX(s), z: 40 - s });
    }
    return arr;
  }, []);

  // Pohon: lateral >= 9 dari rel (JAUH dari kereta — tidak ada yang
  // nabrak semak). Dilewati: zona peron kanan (z -50..-105) dan zona
  // gardu kiri (z -6..-30).
  const trees = useMemo(() => {
    const out: { pos: [number, number, number]; scale: number }[] = [];
    const S_LIST = [8, 20, 32, 44, 56, 68, 80, 92, 104, 116, 128, 140, 152, 164, 176];
    S_LIST.forEach((s, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const z = 40 - s;
      if (side > 0 && z < -50 && z > -105) return; // zona peron
      if (side < 0 && z < -6 && z > -30) return; // zona gardu
      const lat = side * (9 + pseudo(i) * 6);
      out.push({ pos: [lat, 0, z], scale: 0.85 + pseudo(i + 40) * 0.5 });
    });
    return out;
  }, []);

  // Titik arus (dot amber) — S4 mengalir di kabel, S7 loop penuh,
  // S8 arah berbalik (regeneratif).
  const wireDots = useMemo(() => {
    if (scene !== 3 && scene !== 6 && scene !== 7) return [];
    const dots: { pos: [number, number, number] }[] = [];
    if (scene === 3) {
      // S4: arus mengalir sepanjang kabel ke arah kereta
      for (let i = 0; i < 5; i++) {
        const d = ((local * 0.8 + i * 7) % 35) + 5;
        const z = -10 - d;
        const s = 40 - z;
        dots.push({ pos: [wireX(s), WIRE_Y, z] });
      }
    } else if (scene === 6) {
      // S7: gardu -> kabel -> pantograf (menuju kereta)
      for (let i = 0; i < 6; i++) {
        const d = ((local * 0.8 + i * 5) % 30) + 2;
        const z = -18 - d;
        const s = 40 - z;
        dots.push({ pos: [wireX(s), WIRE_Y, z] });
      }
      // turun pantograf
      for (let i = 0; i < 2; i++) {
        const d = (local * 0.45 + i * 1.4) % 2.85;
        dots.push({ pos: [0, 5.85 - d, pantoZ] });
      }
      // pulang lewat rel (ke arah gardu, +Z)
      for (let i = 0; i < 4; i++) {
        const d = ((local * 0.8 + i * 6) % 26) + 2;
        dots.push({ pos: [0.75, 0.62, pantoZ + d] });
      }
    } else {
      // S8 regeneratif: kereta -> pantograf -> kabel -> balik ke gardu
      for (let i = 0; i < 2; i++) {
        const d = (local * 0.45 + i * 1.4) % 2.85;
        dots.push({ pos: [0, 3.0 + d, pantoZ] });
      }
      for (let i = 0; i < 6; i++) {
        const d = ((local * 0.8 + i * 5) % 28) + 2;
        const z = pantoZ + d;
        const s = 40 - z;
        dots.push({ pos: [wireX(s), WIRE_Y, z] });
      }
    }
    return dots;
  }, [scene, local, pantoZ]);

  // Percikan biru di titik kontak pantograf (S5): kilat singkat
  // deterministik tiap 24 frame.
  const sparkOn = scene === 4 && local % 24 < 5;

  return (
    <>
      <color attach="background" args={[SKY]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[30, 50, 20]} intensity={1.15} />
      {/* tanah hijau */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -40]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={GREEN} roughness={1} />
      </mesh>
      {/* bukit 2 lapis */}
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={[1, 0.22, 1]}>
          <sphereGeometry args={[h.r, 24, 18]} />
          <meshStandardMaterial color={h.color} roughness={1} />
        </mesh>
      ))}
      {CLOUDS.map((c, i) => (
        <Cloud key={i} position={c.pos} scale={c.scale} />
      ))}
      {/* balas */}
      <mesh position={[0, 0.125, -45]}>
        <boxGeometry args={[4.5, 0.25, 190]} />
        <meshStandardMaterial color={BALLAST} roughness={1} />
      </mesh>
      {/* bantalan rel */}
      {sleepers.map((z, i) => (
        <mesh key={i} position={[0, 0.34, z]}>
          <boxGeometry args={[2.6, 0.18, 0.55]} />
          <meshStandardMaterial color={SLEEPER} roughness={1} />
        </mesh>
      ))}
      {/* rel besi */}
      {[0.75, -0.75].map((x) => (
        <mesh key={x} position={[x, 0.45, -45]}>
          <boxGeometry args={[0.16, 0.25, 190]} />
          <meshStandardMaterial color={RAIL} roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
      {/* tiang LAA (kiri, tiap 20 unit) + lengan ke atas rel */}
      {poles.map((s) => (
        <group key={s} position={[POLE_X, 0, 40 - s]}>
          <mesh position={[0, 3.6, 0]}>
            <boxGeometry args={[0.3, 7.2, 0.3]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
          </mesh>
          <mesh position={[2.25, 6.9, 0]}>
            <boxGeometry args={[4.5, 0.22, 0.22]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* kabel kontak tembaga (zig-zag) */}
      {wirePoints.slice(0, -1).map((p, i) => (
        <Beam key={i} a={p} b={wirePoints[i + 1]} r={0.045} color={COPPER} />
      ))}
      {/* kabel pembawa (messenger) lurus di atas */}
      <Beam a={[0, MESSENGER_Y, 50]} b={[0, MESSENGER_Y, -140]} r={0.04} color={STEEL_DARK} />
      {/* dropper vertikal messenger -> kabel kontak */}
      {droppers.map((d, i) => (
        <Beam
          key={i}
          a={[d.x, MESSENGER_Y, d.z]}
          b={[d.x, WIRE_Y, d.z]}
          r={0.02}
          color={STEEL_DARK}
        />
      ))}
      {/* pohon (jauh dari rel) */}
      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} />
      ))}
      {/* bangunan latar */}
      <Building position={[-22, 0, -40]} size={[10, 12, 10]} color="#D8CFC0" />
      <Building position={[20, 0, -30]} size={[12, 9, 10]} color="#C8D8C0" />
      <Building position={[-25, 0, -90]} size={[12, 15, 12]} color="#D0C8D8" />
      <Building position={[22, 0, -75]} size={[10, 8, 10]} color="#E0D8C8" />
      {/* ===== gardu traksi (kiri, z -12..-24) ===== */}
      <group>
        <mesh position={[-10.5, 1.75, -18]}>
          <boxGeometry args={[5, 3.5, 12]} />
          <meshStandardMaterial color="#E8E0C8" roughness={0.9} />
        </mesh>
        <mesh position={[-10.5, 3.65, -18]}>
          <boxGeometry args={[5.6, 0.3, 12.6]} />
          <meshStandardMaterial color={KRL_GREY} roughness={1} />
        </mesh>
        {/* pintu menghadap rel */}
        <mesh position={[-7.95, 1.1, -18]}>
          <boxGeometry args={[0.1, 2.2, 1.2]} />
          <meshStandardMaterial color={KRL_BLUE} roughness={0.7} />
        </mesh>
        {/* trafo + sirip */}
        <mesh position={[-7, 1.1, -14]}>
          <boxGeometry args={[1.6, 2.2, 1.6]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.4} />
        </mesh>
        {[-0.5, 0, 0.5].map((dz) => (
          <mesh key={dz} position={[-6.1, 1.1, -14 + dz]}>
            <boxGeometry args={[0.15, 1.6, 0.3]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
          </mesh>
        ))}
        {/* kabel feeder gardu -> tiang LAA terdekat (z=-30 setelah geser) */}
        <Beam a={[-8, 3.8, -18]} b={[POLE_X, 6.9, -30]} r={0.04} color={COPPER} />
      </group>
      {/* ===== stasiun: peron kanan (x 3,5..8,5, z -55..-100) ===== */}
      <group>
        {/* lantai peron */}
        <mesh position={[6, 0.525, -77.5]}>
          <boxGeometry args={[5, 1.05, 45]} />
          <meshStandardMaterial color={CONCRETE} roughness={1} />
        </mesh>
        {/* garis kuning tepi peron */}
        <mesh position={[3.7, 1.06, -77.5]}>
          <boxGeometry args={[0.3, 0.02, 45]} />
          <meshStandardMaterial color={PLATFORM_YELLOW} roughness={0.8} />
        </mesh>
        {/* atap peron */}
        <mesh position={[6, 6.1, -77.5]}>
          <boxGeometry args={[6, 0.25, 45]} />
          <meshStandardMaterial color={KRL_BLUE} roughness={0.9} />
        </mesh>
        {/* kolom atap */}
        {[-58, -69, -80, -91, -99].map((z) => (
          <mesh key={z} position={[8.2, 3.05, z]}>
            <boxGeometry args={[0.35, 5, 0.35]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
          </mesh>
        ))}
        {/* bangku */}
        <mesh position={[6.5, 1.45, -70]}>
          <boxGeometry args={[1.8, 0.15, 0.6]} />
          <meshStandardMaterial color={KRL_BLUE} roughness={0.8} />
        </mesh>
        <mesh position={[6.5, 1.2, -70]}>
          <boxGeometry args={[0.15, 0.35, 0.5]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.8} />
        </mesh>
        {/* lampu peron */}
        {[-66, -88].map((z) => (
          <group key={z} position={[7.8, 1.05, z]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 3.2, 8]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.8} />
            </mesh>
            <mesh position={[0, 3.3, 0]}>
              <sphereGeometry args={[0.28, 12, 10]} />
              <meshStandardMaterial color="#FFF8DC" roughness={0.3} />
            </mesh>
          </group>
        ))}
        {/* penumpang di atas peron */}
        {PASSENGERS.map((p, i) => (
          <Passenger key={i} position={p.pos} color={p.color} scale={p.scale} />
        ))}
      </group>
      {/* ===== KRL: lokomotif + 1 gerbong ===== */}
      <TrainCar z={locoZ} spin={spin} isLoco />
      <TrainCar z={locoZ + 7} spin={(trainS - 7) / 0.55} isLoco={false} />
      {/* titik arus amber */}
      {wireDots.map((d, i) => (
        <mesh key={i} position={d.pos}>
          <sphereGeometry args={[0.17, 12, 10]} />
          <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1.8} />
        </mesh>
      ))}
      {/* percikan biru di kontak pantograf */}
      {sparkOn && (
        <group position={[pantoX, WIRE_Y, pantoZ]}>
          <mesh>
            <sphereGeometry args={[0.28, 12, 10]} />
            <meshStandardMaterial color="#7FB8FF" emissive="#3A7BFF" emissiveIntensity={2.5} />
          </mesh>
          <mesh scale={[1.8, 1.8, 1.8]}>
            <sphereGeometry args={[0.28, 12, 10]} />
            <meshStandardMaterial
              color="#7FB8FF"
              emissive="#3A7BFF"
              emissiveIntensity={1}
              transparent
              opacity={0.35}
            />
          </mesh>
        </group>
      )}
    </>
  );
};

// ================= Lapisan teks (MELAYANG, tanpa kotak gelap) =================
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
      KRL Nggak Punya Tangki Bensin, Kok Bisa Jalan?
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
      Listriknya dicolok dari kabel di atas.
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "KRL nggak punya tangki bensin. Kok bisa jalan?", highlight: "bensin" },
  { text: "Nggak ada tangki, nggak ada knalpot. Listrik dari mana?", highlight: "knalpot" },
  { text: "Listrik PLN masuk gardu traksi, jadi 1.500 volt DC.", highlight: "1.500" },
  { text: "Arus naik ke kabel tembaga, 5,3 meter di atas rel.", highlight: "5,3" },
  { text: "Pantograf di atap nempel terus ke kabel sambil jalan.", highlight: "Pantograf" },
  { text: "Kabel zig-zag ±20 cm, biar karbon ausnya rata.", highlight: "zig-zag" },
  { text: "Arus turun ke motor, muterin roda. Pulang lewat rel.", highlight: "motor" },
  { text: "Pas ngerem, motor jadi generator. Listrik balik ke kabel.", highlight: "generator" },
  { text: "Lo pernah lihat percikan biru di pantograf nggak?", highlight: "percikan" },
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
        fontSize: 40,
        fontWeight: 800,
        lineHeight: 1.35,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      {words.map((w, i) => {
        const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
        const isMatch = clean === highlight;
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
    </div>
  );
};

// Label teknis hairline: teks + garis tipis 2px + titik jangkar.
const HairlineLabel: React.FC<{
  top: number;
  left?: number;
  right?: number;
  text: string;
}> = ({ top, left, right, text }) => (
  <div style={{ position: "absolute", top, left, right, textAlign: "center" }}>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 28,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      {text}
    </div>
    <div
      style={{
        width: 80,
        height: 2,
        backgroundColor: "#FFFFFF",
        margin: "8px auto 0",
        boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -5,
          top: -4,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
        }}
      />
    </div>
  </div>
);

// Angka besar (scene 4 "5,3 m", scene 7 "1.500 V DC", scene 9 ">1 juta").
const BigNumber: React.FC<{ value: string; caption: string; top?: number }> = ({
  value,
  caption,
  top = 480,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left: 70,
      right: 70,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 110,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1,
        textShadow: SHADOW,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      {caption}
    </div>
  </div>
);

// Diagram top-down zig-zag (scene 6): kabel lurus vs kabel zig-zag.
const ZigZagDiagram: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg, #C8DCE8 0%, #EFE7D3 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 280,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 48,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      Kenapa kabelnya zig-zag?
    </div>
    <div
      style={{
        position: "absolute",
        top: 420,
        left: 70,
        right: 70,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 96,
          fontWeight: 800,
          color: AMBER,
          lineHeight: 1,
          textShadow: SHADOW,
        }}
      >
        ±20 cm
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 800,
          color: "#FFFFFF",
          marginTop: 8,
          textShadow: SHADOW,
        }}
      >
        geser tiap tiang
      </div>
    </div>
    {/* Panel A: kabel lurus -> karbon cekung satu titik */}
    <div
      style={{
        position: "absolute",
        top: 660,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 36,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      Kalau lurus: karbon cekung di satu titik
    </div>
    <svg
      style={{ position: "absolute", top: 730, left: 70 }}
      width={940}
      height={110}
      viewBox="0 0 940 110"
    >
      <line x1="0" y1="30" x2="940" y2="30" stroke="#FF7A00" strokeWidth="7" />
      <rect x="0" y="72" width="940" height="22" rx="11" fill="#2B2B2B" />
      {/* cekungan merah di tengah strip karbon */}
      <path d="M 430 72 L 470 72 L 470 94 L 430 94 Z" fill="#D32F2F" />
      <line x1="470" y1="30" x2="470" y2="72" stroke="#D32F2F" strokeWidth="4" />
    </svg>
    {/* Panel B: kabel zig-zag -> aus rata */}
    <div
      style={{
        position: "absolute",
        top: 900,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 36,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      Zig-zag: karbon aus rata, kabel awet
    </div>
    <svg
      style={{ position: "absolute", top: 970, left: 70 }}
      width={940}
      height={130}
      viewBox="0 0 940 130"
    >
      <polyline
        points="0,65 117,20 235,110 352,20 470,110 587,20 705,110 822,20 940,65"
        fill="none"
        stroke="#FF7A00"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <rect x="0" y="92" width="940" height="22" rx="11" fill="#2B2B2B" />
    </svg>
    <div
      style={{
        position: "absolute",
        top: 1160,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      Titik kontak berpindah terus sepanjang strip karbon
    </div>
  </div>
);

const SourceLine: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 300,
      left: 70,
      right: 70,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 26,
      fontWeight: 700,
      color: "#FFFFFF",
      textShadow: SHADOW,
    }}
  >
    Sumber: KAI Commuter / Permenhub PM 50/2018
  </div>
);

// Watermark teks melayang, pojok kanan atas.
const WatermarkText: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 48,
      right: 48,
      fontFamily: FONT,
      fontSize: 24,
      fontWeight: 800,
      color: "#FFFFFF",
      textShadow: SHADOW,
    }}
  >
    Nur Maya
  </div>
);

// ================= Scene / kamera =================
const SCENE_BOUNDS = [0, 185, 370, 555, 740, 926, 1111, 1296, 1481, 1666];
const S_RANGES: [number, number][] = [
  [2, 28], // S1 hook: melaju
  [28, 42], // S2 problem: kolong kereta
  [42, 56], // S3 gardu traksi
  [56, 70], // S4 kabel di atas rel
  [70, 80], // S5 pantograf close-up
  [80, 80], // S6 diagram zig-zag (DOM, kereta diam)
  [80, 96], // S7 aliran arus
  [96, 110], // S8 rem regeneratif (mengerem ke stasiun)
  [110, 116], // S9 close: berhenti di stasiun
];

export const KrlListrikExplainer: React.FC = () => {
  const frame = useCurrentFrame();

  let scene = 0;
  for (let i = 0; i < 9; i++) {
    if (frame >= SCENE_BOUNDS[i] && frame < SCENE_BOUNDS[i + 1]) {
      scene = i;
      break;
    }
  }
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const local = frame - SCENE_BOUNDS[scene];

  // S8/S9: pengereman (ease-out) supaya kereta melambat ke stasiun.
  const rawT = sceneLen > 1 ? local / (sceneLen - 1) : 0;
  const easedT = scene === 7 || scene === 8 ? smoothstep(rawT) : rawT;
  const trainS =
    S_RANGES[scene][0] + (S_RANGES[scene][1] - S_RANGES[scene][0]) * easedT;

  const locoZ = 40 - trainS;
  const pantoZ = locoZ - 0.3;

  let camPos: THREE.Vector3;
  let camTarget: THREE.Vector3;
  if (scene === 0) {
    // S1 HOOK: follow shot 3/4 belakang-kanan — sisi kereta (putih +
    // garis merah + jendela) terlihat, bukan cuma atap; pantograf tidak
    // menutupi tengah frame.
    const dist = interpolate(local, [0, 184], [17, 15]);
    const height = interpolate(local, [0, 184], [6, 5.5]);
    camPos = new THREE.Vector3(8, height, locoZ + dist);
    camTarget = new THREE.Vector3(0, 2, locoZ - 8);
  } else if (scene === 1) {
    // S2 PROBLEM: low-angle sisi kanan, kolong kereta (tanpa tangki) —
    // kamera dimundurkan supaya bodi + roda + rel terbaca, bukan cuma
    // dinding putih.
    camPos = new THREE.Vector3(11, 2.2, locoZ + 7);
    camTarget = new THREE.Vector3(0, 1.2, locoZ - 3);
  } else if (scene === 2) {
    // S3 GARDU: kamera lebih jauh + ke kanan, gardu di kiri frame dan
    // kereta lewat di kanan frame — keduanya terlihat sekaligus.
    camPos = new THREE.Vector3(2, 4.5, -40);
    camTarget = new THREE.Vector3(-6, 2, -16);
  } else if (scene === 3) {
    // S4 KABEL: low-angle menengadah ke kabel + tiang LAA, agak mundur
    // supaya pantograf tidak memenuhi frame.
    camPos = new THREE.Vector3(5.5, 1.8, locoZ + 11);
    camTarget = new THREE.Vector3(0, 5.6, locoZ - 9);
  } else if (scene === 4) {
    // S5 PANTOGRAF: close-up 3/4 dari kanan, digeser supaya tiang LAA
    // tidak segaris di belakang pantograf.
    const dist = interpolate(local, [0, 185], [5.5, 4.8]);
    camPos = new THREE.Vector3(5.5, 7.2, pantoZ + dist);
    camTarget = new THREE.Vector3(-0.3, 5.4, pantoZ - 1);
  } else if (scene === 5) {
    // S6 DIAGRAM: tidak pakai kamera 3D (diagram DOM)
    camPos = new THREE.Vector3(0, 5, locoZ);
    camTarget = new THREE.Vector3(0, 2, locoZ);
  } else if (scene === 6) {
    // S7 ALIRAN: kamera membidik KERETA (bukan ke depan rel) — FOV
    // horizontal format vertikal sempit, target harus di kereta supaya
    // kereta tidak keluar frame; stasiun tetap terlihat di latar.
    camPos = new THREE.Vector3(12, 5, locoZ + 4);
    camTarget = new THREE.Vector3(0, 2.5, locoZ - 2);
  } else if (scene === 7) {
    // S8 REM: dari ujung peron, kereta mengerem masuk stasiun
    camPos = new THREE.Vector3(6, 3.2, -48);
    camTarget = new THREE.Vector3(0, 2, -72);
  } else {
    // S9 CLOSE: kamera RENDAH dari sisi peron — garis pandang lewat DI
    // BAWAH atap peron (y 6,1) supaya atap tidak menutupi kereta.
    const height = interpolate(local, [0, 184], [4.2, 5]);
    const x = interpolate(local, [0, 184], [15, 17]);
    camPos = new THREE.Vector3(x, height, -42);
    camTarget = new THREE.Vector3(0, 2.2, -76);
  }

  const camPosArr: [number, number, number] = [camPos.x, camPos.y, camPos.z];
  const camTargetArr: [number, number, number] = [
    camTarget.x,
    camTarget.y,
    camTarget.z,
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      {scene === 5 ? (
        <ZigZagDiagram />
      ) : (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
        >
          <Scene trainS={trainS} scene={scene} local={local} />
          <CameraRig position={camPosArr} target={camTargetArr} />
        </ThreeCanvas>
      )}
      {scene === 0 && <Headline />}
      <Subtitle scene={scene} local={local} />
      {scene === 1 && (
        <HairlineLabel top={700} left={90} text="Nggak ada tangki bensin" />
      )}
      {scene === 2 && <HairlineLabel top={680} right={120} text="Gardu traksi" />}
      {scene === 3 && (
        <BigNumber value="5,3 m" caption="tinggi kabel di atas rel" top={480} />
      )}
      {scene === 4 && (
        <>
          <HairlineLabel top={620} left={60} text="Pantograf" />
          <HairlineLabel top={950} left={60} text="Strip karbon" />
        </>
      )}
      {scene === 6 && (
        <BigNumber value="1.500 V DC" caption="tegangan listrik KRL" top={300} />
      )}
      {scene === 7 && (
        <HairlineLabel top={700} left={90} text="Listrik balik ke kabel" />
      )}
      {scene === 8 && (
        <>
          <BigNumber value=">1 juta" caption="perjalanan per hari" top={480} />
          <SourceLine />
        </>
      )}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami 55.52s, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/krl-listrik/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video 55.52s — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene (9 scene x ~185 frame) */}
      {[0, 185, 370, 555, 740, 926, 1111, 1296, 1481].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15s (5 frame) saat badge "1.500 V DC" muncul — scene 6, frame 1111 */}
      <Sequence from={1111} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
