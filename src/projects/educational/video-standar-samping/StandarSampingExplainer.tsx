import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= StandarSampingExplainer =================
// "Standar Samping Turun, Motor Mati"
// Motor matic mati pas standar samping diturunin — saklar kecil di pangkal
// standar memutus pengapian. Bukan rusak, itu pengaman pabrikan.
// Estimasi 1260 frame = 42 detik @ 30fps — DIKUNCI ULANG ke durasi VO Sami asli
// via ffprobe setelah VO selesai.
// 1080x1920, 9 scene. Profil B toy-explainer.
// Visual: Scooter matic prosedural (step-through, pengendara duduk tegak)
// + ParkedStudio untuk mekanisme (standar naik/turun, saklar merah/hijau,
// busi nyala/mati) + Scene jalan untuk S5/S6/S9. GLB motorbike TIDAK dipakai:
// hero cerita ini mekanisme standar + busi, dan tidak ada GLB matic +
// standar-bergerak; mekanisme hanya bisa ditunjukkan prosedural.
// Angka: tidak ada angka kunci bersumber di naskah ini (tanpa BigNumber/chirp).
// Sumber: buku panduan pemilik motor matic Honda/Yamaha.

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const CREAM = "#F5EFE0";
const GREEN = "#A8C3A0";
const GREEN_DARK = "#8FAE8A";
const GREEN_LIGHT = "#B5CBA8";
const ASPHALT = "#55565E";
const ASPHALT_LINE = "#F5F5F5";
const CONCRETE = "#C9C4B8";
const STEEL_DARK = "#6B7280";
const TIRE = "#1F1F1F";
const RIM = "#9AA0A6";
const GLASS = "#2E4A63";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const TRUNK = "#8A6B4F";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const RACE_RED = "#D32F2F";
const RACE_WHITE = "#F4F2EC";
const STREET_TEAL = "#2A8A8A";
const JACKET_BLUE = "#3A5A78";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Jalan melengkung (tikungan) =================
// Jalan = busur lingkaran jari-jari R=20, pusat di (0,0,0).
// Motor menempuh jarak s di sepanjang busur; phi = s / R.
// Belok KANAN: pusat tikungan ada di sisi kanan motor (lokal +X).
const R = 20;

function arcPos(s: number, r: number = R): [number, number] {
  const phi = s / r;
  return [r * Math.sin(phi), r * Math.cos(phi)];
}

function arcYaw(s: number, r: number = R): number {
  return s / r + Math.PI / 2;
}

// Offset lokal motor (lx=kanan, ly=atas, lz=depan) -> koordinat dunia.
function worldPoint(
  px: number,
  pz: number,
  yaw: number,
  lx: number,
  ly: number,
  lz: number
): [number, number, number] {
  return [
    px + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    ly,
    pz - lx * Math.sin(yaw) + lz * Math.cos(yaw),
  ];
}

// Deterministik (bukan Math.random): hash dari indeks.
function pseudo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ================= Camera rig =================
const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
}> = ({ position, target }) => {
  const camera = useThree((state) => state.camera);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

const WHEEL_R = 0.35;

// ================= Beam: silinder di antara dua titik =================
const Beam: React.FC<{
  a: [number, number, number];
  b: [number, number, number];
  r?: number;
  color: string;
  emissive?: string;
}> = ({ a, b, r = 0.05, color, emissive }) => {
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
      />
    </mesh>
  );
};

const Wheel: React.FC<{ spin: number; width?: number; r?: number }> = ({ spin, width = 0.16, r = WHEEL_R }) => (
  <group rotation={[spin, 0, 0]}>
    {/* ban */}
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, width, 24]} />
      <meshStandardMaterial color={TIRE} roughness={0.95} />
    </mesh>
    {/* velg */}
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.22, 0.22, width + 0.02, 20]} />
      <meshStandardMaterial color={RIM} roughness={0.35} metalness={0.55} />
    </mesh>
    {/* jari-jari velg (5, supaya putaran TERLIHAT) */}
    {[0, 1, 2, 3, 4].map((k) => {
      const a = (k / 5) * Math.PI * 2;
      return (
        <mesh
          key={k}
          position={[0, Math.sin(a) * 0.11, Math.cos(a) * 0.11]}
          rotation={[a, 0, 0]}
        >
          <boxGeometry args={[width + 0.04, 0.2, 0.05]} />
          <meshStandardMaterial color="#6B7280" roughness={0.5} metalness={0.4} />
        </mesh>
      );
    })}
    {/* tapak ban: tonjolan kecil di sekeliling */}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
      const a = (k / 8) * Math.PI * 2;
      return (
        <mesh
          key={k}
          position={[0, Math.sin(a) * r, Math.cos(a) * r]}
          rotation={[a, 0, 0]}
        >
          <boxGeometry args={[width + 0.02, 0.06, 0.1]} />
          <meshStandardMaterial color="#2E2E2E" roughness={1} />
        </mesh>
      );
    })}
  </group>
);

// ================= Skuter matic (hero) =================
// Matic step-through: tanpa tangki, dek rata, jok rendah, pengendara duduk
// TEGAK (bukan menunduk seperti sport). Standar samping di sisi kiri (-X)
// dengan saklar (dot merah/hijau) + busi (percikan nyala/mati).
// Asal grup = titik kontak ban dengan aspal. Miring = rotasi Z.
// Depan = +Z lokal. standAngle: 0 = standar terlipat (naik), 1 = turun.
const WHEEL_R_SCOOTER = 0.3;

const ScooterRider: React.FC<{ jacket: string }> = ({ jacket }) => (
  <group position={[0, 0.84, -0.5]}>
    {/* torso TEGAK */}
    <mesh position={[0, 0.42, 0]}>
      <boxGeometry args={[0.42, 0.6, 0.3]} />
      <meshStandardMaterial color={jacket} roughness={0.85} />
    </mesh>
    {/* helm */}
    <mesh position={[0, 0.85, 0.05]}>
      <sphereGeometry args={[0.21, 18, 14]} />
      <meshStandardMaterial color="#2B2B2B" roughness={0.4} />
    </mesh>
    {/* visor helm */}
    <mesh position={[0, 0.83, 0.22]}>
      <boxGeometry args={[0.26, 0.1, 0.1]} />
      <meshStandardMaterial color={GLASS} roughness={0.25} />
    </mesh>
    {/* lengan: bahu -> grip setang */}
    <Beam a={[0.24, 0.55, 0.02]} b={[0.35, 0.18, 1.05]} r={0.07} color={jacket} />
    <Beam a={[-0.24, 0.55, 0.02]} b={[-0.35, 0.18, 1.05]} r={0.07} color={jacket} />
    {/* sarung tangan */}
    <mesh position={[0.35, 0.18, 1.05]}>
      <sphereGeometry args={[0.09, 10, 8]} />
      <meshStandardMaterial color="#2B2B2B" roughness={0.9} />
    </mesh>
    <mesh position={[-0.35, 0.18, 1.05]}>
      <sphereGeometry args={[0.09, 10, 8]} />
      <meshStandardMaterial color="#2B2B2B" roughness={0.9} />
    </mesh>
    {/* paha: pinggul -> lutut */}
    <Beam a={[0.2, 0.02, 0.02]} b={[0.26, -0.2, 0.55]} r={0.09} color="#2B2B2B" />
    <Beam a={[-0.2, 0.02, 0.02]} b={[-0.26, -0.2, 0.55]} r={0.09} color="#2B2B2B" />
    {/* betis: lutut -> pijakan dek */}
    <Beam a={[0.26, -0.2, 0.55]} b={[0.26, -0.52, 0.5]} r={0.07} color="#2B2B2B" />
    <Beam a={[-0.26, -0.2, 0.55]} b={[-0.26, -0.52, 0.5]} r={0.07} color="#2B2B2B" />
    {/* sepatu di atas dek */}
    <mesh position={[0.26, -0.52, 0.5]}>
      <boxGeometry args={[0.12, 0.09, 0.26]} />
      <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
    </mesh>
    <mesh position={[-0.26, -0.52, 0.5]}>
      <boxGeometry args={[0.12, 0.09, 0.26]} />
      <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
    </mesh>
  </group>
);

const Scooter: React.FC<{
  variant: "race" | "street";
  spin: number;
  lean: number;
  steer: number;
  frame: number;
  position: [number, number, number];
  yaw: number;
  standAngle: number; // 0 = naik/terlipat, 1 = turun
  switchOn: boolean; // saklar nyambung (hijau) / putus (merah)
  sparkOn: boolean; // busi dapat api
}> = ({ variant, spin, lean, steer, frame, position, yaw, standAngle, switchOn, sparkOn }) => {
  const body = variant === "race" ? RACE_RED : STREET_TEAL;
  // Getaran mesin halus — HANYA saat mesin hidup (busi nyala).
  const vibe = sparkOn ? Math.sin(frame * 0.9) * 0.008 : 0;
  // Standar: rotation.x 0 = tegak ke bawah (turun), 1.33 rad = terlipat ke belakang.
  const standRotX = interpolate(standAngle, [0, 1], [1.33, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sparkPulse = 0.8 + 0.3 * Math.sin(frame * 1.2);
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group position={[0, vibe, 0]}>
        <group rotation={[0, 0, -lean]}>
          {/* --- rangka + mesin --- */}
          <mesh position={[0, 0.5, -0.15]}>
            <boxGeometry args={[0.4, 0.3, 0.5]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.7} />
          </mesh>
          {/* dek rata (step-through) */}
          <mesh position={[0, 0.32, 0.15]}>
            <boxGeometry args={[0.5, 0.06, 0.75]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.9} />
          </mesh>
          {/* strip amber (aksen hangat — objek yang dijelaskan) */}
          <mesh position={[0, 0.36, 0.15]}>
            <boxGeometry args={[0.52, 0.03, 0.77]} />
            <meshStandardMaterial color={AMBER} roughness={0.55} />
          </mesh>
          {/* jok rendah */}
          <mesh position={[0, 0.78, -0.5]}>
            <boxGeometry args={[0.42, 0.12, 0.6]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.95} />
          </mesh>
          {/* bodi belakang */}
          <mesh position={[0, 0.58, -0.6]}>
            <boxGeometry args={[0.44, 0.32, 0.45]} />
            <meshStandardMaterial color={body} roughness={0.55} />
          </mesh>
          {/* lampu belakang */}
          <mesh position={[0, 0.68, -0.84]}>
            <boxGeometry args={[0.25, 0.07, 0.05]} />
            <meshStandardMaterial color="#FF2222" emissive="#FF2222" emissiveIntensity={1.2} />
          </mesh>
          {/* knalpot kanan */}
          <mesh position={[0.28, 0.35, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.8, 12]} />
            <meshStandardMaterial color="#C8CCD2" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* --- roda belakang --- */}
          <group position={[0, WHEEL_R_SCOOTER, -0.8]}>
            <Wheel spin={spin} width={0.18} r={WHEEL_R_SCOOTER} />
          </group>
          {/* bayangan kontak lembut */}
          <mesh
            position={[0, 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 1.9, 1]}
          >
            <circleGeometry args={[0.7, 20]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.16} roughness={1} />
          </mesh>

          {/* --- busi + percikan (sisi kanan mesin) --- */}
          <mesh position={[0.24, 0.55, -0.15]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.14, 10]} />
            <meshStandardMaterial color="#C8CCD2" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh
            position={[0.33, 0.55, -0.15]}
            scale={[sparkOn ? sparkPulse : 1, sparkOn ? sparkPulse : 1, sparkOn ? sparkPulse : 1]}
          >
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial
              color={sparkOn ? "#FFB300" : "#3A3A3A"}
              emissive={sparkOn ? "#FF7A00" : "#000000"}
              emissiveIntensity={sparkOn ? 2.5 : 0}
              roughness={0.4}
            />
          </mesh>

          {/* --- saklar standar (dot di pangkal standar) + kabel ke busi --- */}
          <Beam
            a={[-0.26, 0.32, -0.15]}
            b={[0.24, 0.55, -0.15]}
            r={0.02}
            color={switchOn ? "#22C55E" : "#FF2222"}
          />
          <mesh position={[-0.26, 0.32, -0.15]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial
              color={switchOn ? "#22C55E" : "#FF2222"}
              emissive={switchOn ? "#22C55E" : "#FF2222"}
              emissiveIntensity={1.5}
              roughness={0.4}
            />
          </mesh>

          {/* --- standar samping (kiri, -X): berputar di pangkal --- */}
          <group position={[-0.26, 0.32, -0.15]} rotation={[standRotX, 0, 0]}>
            <mesh position={[0, -0.25, 0]}>
              <boxGeometry args={[0.05, 0.5, 0.07]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.4} />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
              <boxGeometry args={[0.12, 0.03, 0.12]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.8} />
            </mesh>
          </group>

          {/* --- rakitan depan (steer): garpu + roda depan + setang --- */}
          <group position={[0, 0.95, 0.62]} rotation={[0, steer, 0]}>
            {/* garpu */}
            <Beam a={[-0.13, 0, 0]} b={[-0.13, -0.6, 0.15]} r={0.045} color={STEEL_DARK} />
            <Beam a={[0.13, 0, 0]} b={[0.13, -0.6, 0.15]} r={0.045} color={STEEL_DARK} />
            {/* roda depan */}
            <group position={[0, -0.65, 0.15]}>
              <Wheel spin={spin} width={0.16} r={WHEEL_R_SCOOTER} />
            </group>
            {/* tameng depan (windshield matic) */}
            <mesh position={[0, -0.2, 0.12]} rotation={[-0.25, 0, 0]}>
              <boxGeometry args={[0.52, 0.55, 0.14]} />
              <meshStandardMaterial color={body} roughness={0.55} />
            </mesh>
            {/* lampu depan */}
            <mesh position={[0, -0.22, 0.21]}>
              <boxGeometry args={[0.3, 0.12, 0.06]} />
              <meshStandardMaterial color="#FFF8DC" emissive="#FFF8DC" emissiveIntensity={1.4} />
            </mesh>
            {/* setang */}
            <mesh position={[0, 0.07, -0.07]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.72, 10]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            {/* grip setang */}
            <mesh position={[0.35, 0.07, -0.07]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.055, 0.055, 0.13, 10]} />
              <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
            </mesh>
            <mesh position={[-0.35, 0.07, -0.07]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.055, 0.055, 0.13, 10]} />
              <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
            </mesh>
            {/* spion */}
            <Beam a={[0.28, 0.07, -0.07]} b={[0.4, 0.27, -0.1]} r={0.02} color="#2B2B2B" />
            <Beam a={[-0.28, 0.07, -0.07]} b={[-0.4, 0.27, -0.1]} r={0.02} color="#2B2B2B" />
            <mesh position={[0.4, 0.29, -0.1]}>
              <boxGeometry args={[0.12, 0.09, 0.03]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            <mesh position={[-0.4, 0.29, -0.1]}>
              <boxGeometry args={[0.12, 0.09, 0.03]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
          </group>

          <ScooterRider jacket={JACKET_BLUE} />
        </group>
      </group>
    </group>
  );
};

// ================= Lingkungan =================
const HILLS: { pos: [number, number, number]; r: number; color: string }[] = [
  // JAUH dari jalan (pusat tikungan radius 20, kamera orbit radius ~26):
  // bukit v1 terlalu dekat (pusat 35-50, r 26-32) sampai kamera masuk
  // ke dalam bukit di S9. Sekarang di horizon (jarak 80+).
  { pos: [-90, 0, -60], r: 40, color: GREEN_DARK },
  { pos: [90, 0, -50], r: 45, color: GREEN_DARK },
  { pos: [-80, 0, 70], r: 38, color: GREEN_LIGHT },
  { pos: [85, 0, 75], r: 42, color: GREEN_LIGHT },
];

const CLOUDS: { pos: [number, number, number]; scale: number; phase: number }[] = [
  { pos: [-25, 38, -40], scale: 1, phase: 0 },
  { pos: [30, 42, -20], scale: 1.2, phase: 1.7 },
  { pos: [5, 36, 30], scale: 0.85, phase: 3.1 },
  { pos: [-10, 40, -70], scale: 1, phase: 4.4 },
  { pos: [35, 39, 25], scale: 0.9, phase: 5.6 },
];

const Cloud: React.FC<{
  position: [number, number, number];
  scale: number;
  drift: number;
}> = ({ position, scale, drift }) => (
  <group position={[position[0] + drift, position[1], position[2]]} scale={[scale, scale, scale]}>
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

const Tree: React.FC<{
  position: [number, number, number];
  scale: number;
  sway: number;
}> = ({ position, scale, sway }) => (
  <group position={position} scale={[scale, scale, scale]} rotation={[0, 0, sway]}>
    <mesh position={[0, 0.7, 0]}>
      <cylinderGeometry args={[0.18, 0.24, 1.4, 10]} />
      <meshStandardMaterial color={TRUNK} roughness={1} />
    </mesh>
    <mesh position={[0, 2.2, 0]}>
      <sphereGeometry args={[1.3, 18, 14]} />
      <meshStandardMaterial color={LEAF} roughness={1} />
    </mesh>
    <mesh position={[0, 3.2, 0]}>
      <coneGeometry args={[0.9, 1.6, 12]} />
      <meshStandardMaterial color={LEAF_DARK} roughness={1} />
    </mesh>
  </group>
);

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
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={1} />
      </mesh>
      {[1, -1].map((sx) =>
        Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <mesh
              key={`${sx}-${r}-${c}`}
              position={[sx * (w / 2 + 0.03), 2.2 + r * 3.2, -d / 2 + 1.4 + c * 2.4]}
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

// ================= Scene 3D =================
const Scene: React.FC<{
  s: number;
  lean: number;
  steer: number;
  variant: "race" | "street";
  scene: number;
  local: number;
  frame: number;
  speedPerFrame: number;
  standAngle: number;
  switchOn: boolean;
  sparkOn: boolean;
}> = ({ s, lean, steer, variant, scene, local, frame, speedPerFrame, standAngle, switchOn, sparkOn }) => {
  const spin = s / WHEEL_R_SCOOTER;
  const [mx, mz] = arcPos(s);
  const yaw = arcYaw(s);
  // Arah maju (tangen) & arah pusat tikungan (lokal +X).
  const tangent: [number, number, number] = [Math.cos(s / R), 0, -Math.sin(s / R)];
  const toCenter: [number, number, number] = [
    Math.cos(yaw),
    0,
    -Math.sin(yaw),
  ];

  // Segmen jalan (aspal + marka + bahu) — memo, statis.
  const roadSegs = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number; s: number }[] = [];
    for (let ss = -6; ss <= 54; ss += 1.2) {
      const [x, z] = arcPos(ss);
      out.push({ pos: [x, 0.03, z], yaw: arcYaw(ss), s: ss });
    }
    return out;
  }, []);
  const dashes = useMemo(() => {
    const out: { pos: [number, number, number]; yaw: number }[] = [];
    for (let ss = -6; ss <= 54; ss += 2.4) {
      const [x, z] = arcPos(ss);
      out.push({ pos: [x, 0.07, z], yaw: arcYaw(ss) });
    }
    return out;
  }, []);

  // Pohon di kedua sisi jalan (JAUH dari aspal — v1: pohon raksasa di
  // tengah frame karena terlalu dekat kamera; v2: lebih sedikit + renggang
  // supaya tidak jadi tembok).
  const trees = useMemo(() => {
    const out: { pos: [number, number, number]; scale: number; phase: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const ss = -4 + i * 3.6 + pseudo(i) * 1.5;
      const side = i % 2 === 0 ? 1 : -1;
      const rad = R + side * (11 + pseudo(i + 50) * 9);
      const [x, z] = arcPos(ss, rad);
      out.push({ pos: [x, 0, z], scale: 0.6 + pseudo(i + 40) * 0.5, phase: pseudo(i + 90) * 6.28 });
    }
    return out;
  }, []);

  // Gedung latar (zona jalanan, s > 30).
  const buildings = useMemo(() => {
    const defs: { s: number; rad: number; size: [number, number, number]; color: string }[] = [
      { s: 32, rad: 40, size: [10, 12, 10], color: "#D8CFC0" },
      { s: 38, rad: 41, size: [12, 9, 10], color: "#C8D8C0" },
      { s: 44, rad: 39, size: [10, 15, 12], color: "#D0C8D8" },
    ];
    return defs.map((d) => {
      const [x, z] = arcPos(d.s, d.rad);
      return { pos: [x, 0, z] as [number, number, number], size: d.size, color: d.color };
    });
  }, []);

  // Debu di belakang ban (jejak deterministik di sepanjang busur).
  const dust = useMemo(() => {
    if (![4, 5, 8].includes(scene)) return [];
    const out: { pos: [number, number, number]; opacity: number; scale: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const age = (frame * 0.7 + i * 19) % 50;
      const back = age * speedPerFrame;
      const [x, z] = arcPos(Math.max(-6, s - back));
      out.push({
        pos: [x + (pseudo(i) - 0.5) * 0.9, 0.18 + age * 0.012, z],
        opacity: 0.12 * (1 - age / 50),
        scale: 0.12 + age * 0.008,
      });
    }
    return out;
  }, [scene, frame, s, speedPerFrame]);

  // Percikan standar nyangkut aspal (S6): partikel amber deterministik
  // di ujung standar (sisi kiri motor, lokal -X) saat belok kiri.
  const sparks = useMemo(() => {
    if (scene !== 5) return [];
    const out: { pos: [number, number, number]; opacity: number; scale: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const flick = 0.5 + 0.5 * Math.sin(frame * 0.9 + i * 2.4);
      const spread = (pseudo(i + 7) - 0.5) * 0.7;
      const back = pseudo(i + 21) * 0.6;
      out.push({
        pos: [
          mx - toCenter[0] * 0.4 - tangent[0] * (0.3 + back) + spread * tangent[0],
          0.06 + pseudo(i + 33) * 0.14,
          mz - toCenter[2] * 0.4 - tangent[2] * (0.3 + back) + spread * tangent[2],
        ],
        opacity: 0.35 + 0.6 * flick,
        scale: 0.05 + pseudo(i + 55) * 0.06,
      });
    }
    return out;
  }, [scene, frame, s, mx, mz, tangent, toCenter]);

  return (
    <>
      <color attach="background" args={[SKY]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[30, 50, 20]} intensity={1.15} />
      {/* tanah hijau */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, 0, 3]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={GREEN} roughness={1} />
      </mesh>
      {/* bukit 2 lapis */}
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={[1, 0.18, 1]}>
          <sphereGeometry args={[h.r, 24, 18]} />
          <meshStandardMaterial color={h.color} roughness={1} />
        </mesh>
      ))}
      {/* awan hanyut pelan (secondary motion) */}
      {CLOUDS.map((c, i) => (
        <Cloud
          key={i}
          position={c.pos}
          scale={c.scale}
          drift={Math.sin(frame * 0.004 + c.phase) * 6}
        />
      ))}
      {/* jalan melengkung: segmen aspal */}
      {roadSegs.map((seg, i) => (
        <mesh key={i} position={seg.pos} rotation={[0, seg.yaw, 0]}>
          <boxGeometry args={[6.4, 0.06, 1.35]} />
          <meshStandardMaterial color={ASPHALT} roughness={1} />
        </mesh>
      ))}
      {/* marka tengah putus-putus */}
      {dashes.map((d, i) => (
        <mesh key={i} position={d.pos} rotation={[0, d.yaw, 0]}>
          <boxGeometry args={[0.18, 0.02, 1.2]} />
          <meshStandardMaterial color={ASPHALT_LINE} roughness={1} />
        </mesh>
      ))}
      {/* bahu jalan (beton) */}
      {roadSegs.map((seg, i) => (
        <group key={`sh-${i}`} position={seg.pos} rotation={[0, seg.yaw, 0]}>
          <mesh position={[3.45, 0.01, 0]}>
            <boxGeometry args={[0.5, 0.04, 1.35]} />
            <meshStandardMaterial color={CONCRETE} roughness={1} />
          </mesh>
          <mesh position={[-3.45, 0.01, 0]}>
            <boxGeometry args={[0.5, 0.04, 1.35]} />
            <meshStandardMaterial color={CONCRETE} roughness={1} />
          </mesh>
        </group>
      ))}
      {/* pohon bergoyang halus */}
      {trees.map((t, i) => (
        <Tree
          key={i}
          position={t.pos}
          scale={t.scale}
          sway={Math.sin(frame * 0.02 + t.phase) * 0.02}
        />
      ))}
      {/* gedung latar (zona jalanan) */}
      {buildings.map((b, i) => (
        <Building key={i} position={b.pos} size={b.size} color={b.color} />
      ))}
      {/* debu di belakang ban (pipih, halus — bukan gelembung) */}
      {dust.map((d, i) => (
        <mesh key={i} position={d.pos} scale={[d.scale, d.scale * 0.6, d.scale]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={CREAM} transparent opacity={d.opacity} roughness={1} />
        </mesh>
      ))}
      {/* percikan knee slider (amber, berkedip) */}
      {sparks.map((sp, i) => (
        <mesh key={`sp-${i}`} position={sp.pos} scale={[sp.scale, sp.scale, sp.scale]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial
            color="#FFB300"
            emissive="#FF7A00"
            emissiveIntensity={2.2}
            transparent
            opacity={sp.opacity}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* ===== Skuter hero ===== */}
      <Scooter
        variant={variant}
        spin={spin}
        lean={lean}
        steer={steer}
        frame={frame}
        position={[mx, 0, mz]}
        yaw={yaw}
        standAngle={standAngle}
        switchOn={switchOn}
        sparkOn={sparkOn}
      />
    </>
  );
};

// ================= Studio parkir (mekanisme standar) =================
// Skuter parkir di tengah (origin), menghadap +Z; kamera dari kiri-depan
// supaya standar samping (-X) terlihat. Skuter miring sedikit ke kiri
// (ke arah standar) saat standar turun.
const ParkedStudio: React.FC<{
  frame: number;
  standAngle: number;
  switchOn: boolean;
  sparkOn: boolean;
}> = ({ frame, standAngle, switchOn, sparkOn }) => {
  const parkedLean = -0.1 * standAngle;
  return (
    <>
      <color attach="background" args={[SKY]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[30, 50, 20]} intensity={1.15} />
      {/* lantai beton */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[30, 40]} />
        <meshStandardMaterial color={CONCRETE} roughness={1} />
      </mesh>
      {/* rumput jauh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -20]}>
        <planeGeometry args={[120, 40]} />
        <meshStandardMaterial color={GREEN} roughness={1} />
      </mesh>
      {HILLS.map((h, i) => (
        <mesh key={i} position={h.pos} scale={[1, 0.18, 1]}>
          <sphereGeometry args={[h.r, 24, 18]} />
          <meshStandardMaterial color={h.color} roughness={1} />
        </mesh>
      ))}
      {CLOUDS.map((c, i) => (
        <Cloud
          key={i}
          position={c.pos}
          scale={c.scale}
          drift={Math.sin(frame * 0.004 + c.phase) * 6}
        />
      ))}
      <Scooter
        variant="street"
        spin={0}
        lean={parkedLean}
        steer={0}
        frame={frame}
        position={[0, 0, 0]}
        yaw={0}
        standAngle={standAngle}
        switchOn={switchOn}
        sparkOn={sparkOn}
      />
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
        fontSize: 60,
        fontWeight: 800,
        color: "#FFFFFF",
        lineHeight: 1.2,
        textShadow: SHADOW,
      }}
    >
      STANDAR TURUN
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
      Motor mati — bukan rusak, itu pengaman
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Motor matic lo pernah mati sendiri pas standar samping diturunin? Bukan rusak. Itu sengaja.", highlight: "sengaja" },
  { text: "Di pangkal standar samping ada saklar kecil. Begitu standar turun, saklar itu memutus pengapian.", highlight: "saklar" },
  { text: "Busi nggak dapat api, mesin langsung mati.", highlight: "mati" },
  { text: "Kalau standar naik lagi, saklar nyambung, motor bisa distarter normal.", highlight: "nyambung" },
  { text: "Kenapa dibikin begitu? Bayangin lo jalan sambil standar samping masih turun.", highlight: "turun" },
  { text: "Pas belok kiri, standar itu bisa nyangkut aspal. Motor bisa oleng, lo bisa jatuh.", highlight: "nyangkut" },
  { text: "Makanya pabrikan bikin pengaman ini, supaya motor nggak bisa jalan sebelum standarnya naik.", highlight: "pengaman" },
  { text: "Jadi kalau motor lo mati pas standar turun, jangan panik. Naikin standarnya, starter lagi, jalan.", highlight: "panik" },
  { text: "Lo pernah ngalamin motor mati gara-gara ini?", highlight: "ngalamin" },
];

const Subtitle: React.FC<{ scene: number; local: number }> = ({ scene, local }) => {
  const { text, highlight } = SUBTITLES[scene];
  if (!text) return null;
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
          const clean = w.toLowerCase().replace(/[^a-z0-9°–-]/g, "");
          const isMatch =
            clean === highlight.toLowerCase().replace(/[^a-z0-9°–-]/g, "");
          const opacity = interpolate(local, [i * 3, i * 3 + 8], [0, 1], {
            easing: Easing.out(Easing.quad),
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
    Sumber: buku panduan pemilik Honda/Yamaha
  </div>
);

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
export const TOTAL_FRAMES = 1260; // ESTIMASI awal 42 detik @ 30fps — DIKUNCI ke durasi VO asli via ffprobe setelah VO selesai

const SCENE_BOUNDS = [0, 185, 346, 432, 556, 680, 841, 1002, 1175, 1260]; // proporsional kata per scene (total 102 kata)
const S_RANGES: [number, number][] = [
  [0, 1], // S1 hook (studio — s tidak dipakai)
  [0, 1], // S2 saklar (studio)
  [0, 1], // S3 busi mati (studio)
  [0, 1], // S4 standar naik (studio)
  [0, 6], // S5 jalan sambil standar turun (jalan)
  [6, 12], // S6 belok kiri, standar nyangkut (jalan)
  [0, 1], // S7 pengaman pabrikan (studio)
  [0, 1], // S8 naikin standar, starter lagi (studio)
  [12, 18], // S9 penutup (jalan)
];
const LEAN_DEG: [number, number][] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];
const STEER_DEG: [number, number][] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];
const VARIANT: ("race" | "street")[] = [
  "street",
  "street",
  "street",
  "street",
  "street",
  "street",
  "street",
  "street",
  "street",
];

export const StandarSampingExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;

  let scene = 0;
  for (let i = 0; i < 9; i++) {
    if (frame >= SCENE_BOUNDS[i] && frame < SCENE_BOUNDS[i + 1]) {
      scene = i;
      break;
    }
  }
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const local = frame - SCENE_BOUNDS[scene];

  // Semua gerakan dengan easing (v2): jarak, miring, setang, drift.
  const easeInOut = Easing.inOut(Easing.quad);
  const s = interpolate(local, [0, sceneLen - 1], S_RANGES[scene], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leanDeg = interpolate(local, [0, sceneLen - 1], LEAN_DEG[scene], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const steerDeg = interpolate(local, [0, sceneLen - 1], STEER_DEG[scene], {
    easing: easeInOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lean = (leanDeg * Math.PI) / 180;
  const steer = (steerDeg * Math.PI) / 180;
  // S6 (scene 5) belok + standar nyangkut: motor miring ke arah standar
  // (-X, sisi standar) + goyang.
  const leanRoad = scene === 5 ? -0.08 + Math.sin(frame * 0.22) * 0.04 : lean;
  const steerRoad = scene === 5 ? Math.sin(frame * 0.3) * 0.12 : steer;
  // Standar per scene: S1 turun(1) | S2 turun bertahap 0->1 | S3 turun(1)
  // S4 naik bertahap 1->0 | S5+S6 turun(1) | S7+S8+S9 naik(0).
  const standAngle =
    scene === 1
      ? interpolate(local, [0, sceneLen - 1], [0, 1], {
          easing: easeInOut,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : scene === 3
        ? interpolate(local, [0, sceneLen - 1], [1, 0], {
            easing: easeInOut,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : [0, 2, 4, 5].includes(scene)
          ? 1
          : 0;
  // Saklar + busi ikut standar: nyambung hanya saat standar naik.
  const switchOn = standAngle < 0.5;
  const sparkOn = standAngle < 0.5;
  const speedPerFrame =
    (S_RANGES[scene][1] - S_RANGES[scene][0]) / Math.max(1, sceneLen - 1);

  // Posisi + arah motor.
  const [mx, mz] = arcPos(s);
  const yaw = arcYaw(s);
  const tangent: [number, number, number] = [Math.cos(s / R), 0, -Math.sin(s / R)];
  const camFrom = (
    lx: number,
    ly: number,
    lz: number
  ): [number, number, number] => worldPoint(mx, mz, yaw, lx, ly, lz);
  const targetAhead = (
    dist: number,
    y: number
  ): [number, number, number] => [
    mx + tangent[0] * dist,
    y,
    mz + tangent[2] * dist,
  ];
  // Lerp kamera dengan easing di dalam scene.
  const lerpE = (a: number, b: number) =>
    interpolate(local, [0, sceneLen - 1], [a, b], {
      easing: easeInOut,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  let camPos: [number, number, number];
  let camTarget: [number, number, number];
  // CATATAN: lokal +Z = arah maju. lz NEGATIF = kamera DI BELAKANG motor
  // (rear tracking), lz positif = kamera DI DEPAN motor (front 3/4).
  // Studio: skuter parkir di origin menghadap +Z, standar di sisi -X
  // (kiri) — kamera studio dari kiri-depan supaya standar terlihat.
  // Target selalu di dekat motor (bukan jauh di depan) supaya hero utuh.
  if (scene === 0) {
    // S1 HOOK (studio): 3/4 kiri-depan, push-in. Standar turun, mesin mati.
    camPos = [lerpE(-4.5, -3.8), lerpE(2.2, 1.9), lerpE(5.5, 4.8)];
    camTarget = [0, 0.8, 0];
  } else if (scene === 1) {
    // S2 SAKLAR (studio close-up): dekat ke pangkal standar (-0.26, 0.32, -0.15).
    camPos = [lerpE(-3.4, -3), lerpE(1.7, 1.5), lerpE(4.2, 3.8)];
    camTarget = [-0.2, 0.5, 0];
  } else if (scene === 2) {
    // S3 BUSI (studio close-up): dekat ke busi kanan (0.33, 0.55, -0.15).
    camPos = [lerpE(3.4, 3), lerpE(1.7, 1.5), lerpE(4.2, 3.8)];
    camTarget = [0.2, 0.5, -0.1];
  } else if (scene === 3) {
    // S4 STANDAR NAIK (studio): 3/4 kiri-depan, push-in.
    camPos = [lerpE(-4, -3.4), lerpE(2, 1.8), lerpE(5, 4.5)];
    camTarget = [0, 0.8, 0];
  } else if (scene === 4) {
    // S5 JALAN + STANDAR TURUN: tracking 3/4 belakang-LUAR.
    camPos = camFrom(lerpE(-6, -5), lerpE(2.6, 2.2), lerpE(-8, -7));
    camTarget = targetAhead(1, 1.2);
  } else if (scene === 5) {
    // S6 STANDAR NYANGKUT: kamera dari sisi standar (-X lokal, LUAR
    // tikungan) supaya ujung standar + percikan terlihat.
    const toCenter: [number, number, number] = [Math.cos(yaw), 0, -Math.sin(yaw)];
    camPos = camFrom(lerpE(-5.5, -4.8), lerpE(1.8, 1.5), lerpE(-4.5, -3.8));
    camTarget = [
      mx - toCenter[0] * 0.4,
      0.3,
      mz - toCenter[2] * 0.4,
    ];
  } else if (scene === 6) {
    // S7 PENGAMAN (studio): 3/4 kiri-depan, push-in.
    camPos = [lerpE(-4.5, -3.8), lerpE(2.2, 1.9), lerpE(5.5, 4.8)];
    camTarget = [0, 0.8, 0];
  } else if (scene === 7) {
    // S8 STARTER LAGI (studio): 3/4 kanan-depan (busi terlihat menyala).
    camPos = [lerpE(3.5, 3), lerpE(1.8, 1.6), lerpE(4.5, 4)];
    camTarget = [0.3, 0.6, 0];
  } else {
    // S9 PENUTUP (jalan): tracking belakang-LUAR, motor jalan normal.
    camPos = camFrom(lerpE(-6, -5), lerpE(2.6, 2.2), lerpE(-8.5, -7));
    camTarget = targetAhead(1, 1.2);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        {[0, 1, 2, 3, 6, 7].includes(scene) ? (
          <ParkedStudio
            frame={frame}
            standAngle={standAngle}
            switchOn={switchOn}
            sparkOn={sparkOn}
          />
        ) : (
          <Scene
            s={s}
            lean={leanRoad}
            steer={steerRoad}
            variant={VARIANT[scene]}
            scene={scene}
            local={local}
            frame={frame}
            speedPerFrame={speedPerFrame}
            standAngle={standAngle}
            switchOn={switchOn}
            sparkOn={sparkOn}
          />
        )}
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>
      {scene === 0 && <Headline />}
      <Subtitle scene={scene} local={local} />
      {scene === 1 && (
        <HairlineLabel top={820} left={70} right={70} text="saklar kecil di pangkal standar" />
      )}
      {scene === 2 && (
        <HairlineLabel top={820} left={70} right={70} text="busi nggak dapat api, mesin mati" />
      )}
      {scene === 3 && (
        <HairlineLabel top={700} left={70} right={70} text="standar naik = saklar nyambung" />
      )}
      {scene === 4 && (
        <HairlineLabel top={700} left={70} right={70} text="jalan sambil standar masih turun" />
      )}
      {scene === 5 && (
        <HairlineLabel top={780} left={70} right={70} text="standar nyangkut aspal" />
      )}
      {scene === 6 && (
        <HairlineLabel top={700} left={70} right={70} text="pengaman pabrikan" />
      )}
      {scene === 7 && (
        <HairlineLabel top={700} left={70} right={70} text="naikin standar, starter lagi, jalan" />
      )}
      {scene === 8 && <SourceLine />}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/standar-samping/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene */}
      {[0, 185, 346, 432, 556, 680, 841, 1002, 1175].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Tanpa chirp: video ini tidak punya scene angka kunci. */}
    </AbsoluteFill>
  );
};
