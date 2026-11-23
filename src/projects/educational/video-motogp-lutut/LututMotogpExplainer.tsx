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

// ================= LututMotogpExplainer =================
// "Kenapa lutut pembalap MotoGP nempel aspal pas nikung?"
// Sekuel MotorMiringExplainer (motor miring 66°) — sekarang lutut sebagai sensor.
// Estimasi 1350 frame = 45 detik @ 30fps — DIKUNCI ULANG ke durasi VO Sami asli
// via ffprobe setelah VO selesai.
// 1080x1920, 9 scene. Profil B toy-explainer.
// Visual: procedural Motor+Rider dari MotorMiring (Rider sudah punya lutut +
// knee slider amber yang turun ke aspal saat miring). GLB motorbike TIDAK dipakai
// sebagai hero: tidak ada GLB rider, dan lutut — hero cerita ini — hanya ada di
// Rider prosedural; ganti motor akan merusak konsistensi + alignment rider.
// Angka bersumber: 66° (motogp.com, rekor Marc Márquez GP Jerman 2019).

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

// Panah gaya: batang + kerucut di ujung.
const Arrow: React.FC<{
  a: [number, number, number];
  b: [number, number, number];
  color: string;
  r?: number;
}> = ({ a, b, color, r = 0.09 }) => {
  const { pos, quat, len, tipPos, tipQuat } = useMemo(() => {
    const va = new THREE.Vector3(a[0], a[1], a[2]);
    const vb = new THREE.Vector3(b[0], b[1], b[2]);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const norm = dir.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      norm
    );
    const pos = va.clone().add(vb).multiplyScalar(0.5);
    const tipPos = vb.clone().add(norm.clone().multiplyScalar(-0.25));
    return { pos, quat, len, tipPos, tipQuat: quat };
  }, [a, b]);
  return (
    <group>
      <mesh position={pos} quaternion={quat}>
        <cylinderGeometry args={[r, r, Math.max(0.1, len - 0.5), 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          emissive={color}
          emissiveIntensity={0.9}
        />
      </mesh>
      <mesh position={tipPos} quaternion={tipQuat}>
        <coneGeometry args={[r * 2.2, 0.4, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          emissive={color}
          emissiveIntensity={0.9}
        />
      </mesh>
    </group>
  );
};

// ================= Roda motor (berputar mengikuti jarak) =================
const WHEEL_R = 0.35;

const Wheel: React.FC<{ spin: number; width?: number }> = ({ spin, width = 0.16 }) => (
  <group rotation={[spin, 0, 0]}>
    {/* ban */}
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[WHEEL_R, WHEEL_R, width, 24]} />
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
          position={[0, Math.sin(a) * WHEEL_R, Math.cos(a) * WHEEL_R]}
          rotation={[a, 0, 0]}
        >
          <boxGeometry args={[width + 0.02, 0.06, 0.1]} />
          <meshStandardMaterial color="#2E2E2E" roughness={1} />
        </mesh>
      );
    })}
  </group>
);

// ================= Pengendara (toy, tanpa wajah) =================
// lean: radian miring motor. Lutut dalam turun mendekati aspal saat miring.
const Rider: React.FC<{
  lean: number;
  variant: "race" | "street";
}> = ({ lean, variant }) => {
  const suit = variant === "race" ? RACE_RED : JACKET_BLUE;
  const helmet = variant === "race" ? RACE_WHITE : "#2B2B2B";
  const sinLean = Math.sin(lean);
  // Grup pengendara: ngegantung ke dalam tikungan (+X) + miring ekstra.
  const hangX = sinLean * 0.14;
  const extraLean = lean * 0.18;
  // Lutut dalam (kanan, +X): makin miring makin turun & keluar.
  const kneeIn: [number, number, number] = [
    0.3 + sinLean * 0.3,
    -0.55 - sinLean * 0.28,
    0.35,
  ];
  const kneeOut: [number, number, number] = [-0.32, -0.18, 0.28];
  return (
    <group position={[hangX, 0.92, -0.32]} rotation={[0, 0, -extraLean]}>
      {/* torso, condong ke depan */}
      <mesh position={[0, 0.42, 0.02]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.42, 0.62, 0.3]} />
        <meshStandardMaterial color={suit} roughness={0.85} />
      </mesh>
      {/* garis putih di punggung (race) */}
      {variant === "race" && (
        <mesh position={[0, 0.45, -0.14]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.44, 0.5, 0.04]} />
          <meshStandardMaterial color={RACE_WHITE} roughness={0.85} />
        </mesh>
      )}
      {/* helm */}
      <mesh position={[0, 0.82, 0.22]}>
        <sphereGeometry args={[0.21, 18, 14]} />
        <meshStandardMaterial color={helmet} roughness={0.4} />
      </mesh>
      {/* visor helm */}
      <mesh position={[0, 0.8, 0.4]}>
        <boxGeometry args={[0.26, 0.1, 0.1]} />
        <meshStandardMaterial color={GLASS} roughness={0.25} />
      </mesh>
      {/* lengan: bahu -> grip setang */}
      <Beam a={[0.24, 0.55, 0.05]} b={[0.35, 0.23, 0.87]} r={0.07} color={suit} />
      <Beam a={[-0.24, 0.55, 0.05]} b={[-0.35, 0.23, 0.87]} r={0.07} color={suit} />
      {/* sarung tangan */}
      <mesh position={[0.35, 0.23, 0.87]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#2B2B2B" roughness={0.9} />
      </mesh>
      <mesh position={[-0.35, 0.23, 0.87]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#2B2B2B" roughness={0.9} />
      </mesh>
      {/* paha: pinggul -> lutut */}
      <Beam a={[0.2, 0.02, -0.05]} b={kneeIn} r={0.09} color="#2B2B2B" />
      <Beam a={[-0.2, 0.02, -0.05]} b={kneeOut} r={0.09} color="#2B2B2B" />
      {/* betis: lutut -> footpeg */}
      <Beam a={kneeIn} b={[0.28, -0.47, 0.22]} r={0.07} color="#2B2B2B" />
      <Beam a={kneeOut} b={[-0.28, -0.47, 0.22]} r={0.07} color="#2B2B2B" />
      {/* slider lutut dalam (yang nyentuh aspal di MotoGP) */}
      <mesh position={kneeIn}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial color={AMBER} roughness={0.5} />
      </mesh>
      {/* sepatu */}
      <mesh position={[0.28, -0.47, 0.22]}>
        <boxGeometry args={[0.12, 0.09, 0.26]} />
        <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
      </mesh>
      <mesh position={[-0.28, -0.47, 0.22]}>
        <boxGeometry args={[0.12, 0.09, 0.26]} />
        <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
      </mesh>
    </group>
  );
};

// ================= Motor (hero) =================
// Asal grup = titik kontak ban dengan aspal. Miring = rotasi Z (ke +X,
// arah pusat tikungan). Depan = +Z lokal.
const Motor: React.FC<{
  variant: "race" | "street";
  spin: number;
  lean: number;
  steer: number;
  frame: number;
  position: [number, number, number];
  yaw: number;
}> = ({ variant, spin, lean, steer, frame, position, yaw }) => {
  const body = variant === "race" ? RACE_RED : STREET_TEAL;
  // Getaran halus mesin (secondary motion).
  const vibe = Math.sin(frame * 0.9) * 0.008;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group position={[0, vibe, 0]}>
        <group rotation={[0, 0, -lean]}>
          {/* --- rangka + mesin --- */}
          <mesh position={[0, 0.55, 0.1]}>
            <boxGeometry args={[0.4, 0.35, 0.55]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.7} />
          </mesh>
          {/* tangki */}
          <mesh position={[0, 0.95, 0.15]}>
            <boxGeometry args={[0.55, 0.35, 0.7]} />
            <meshStandardMaterial color={body} roughness={0.55} />
          </mesh>
          {/* strip amber (aksen hangat — objek yang dijelaskan) */}
          <mesh position={[0, 0.95, 0.15]}>
            <boxGeometry args={[0.57, 0.1, 0.72]} />
            <meshStandardMaterial color={AMBER} roughness={0.55} />
          </mesh>
          {/* jok */}
          <mesh position={[0, 0.86, -0.45]}>
            <boxGeometry args={[0.42, 0.14, 0.55]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.95} />
          </mesh>
          {/* buntut */}
          <mesh position={[0, 0.98, -0.82]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.4, 0.12, 0.4]} />
            <meshStandardMaterial color={body} roughness={0.55} />
          </mesh>
          {/* lampu belakang */}
          <mesh position={[0, 0.95, -1.0]}>
            <boxGeometry args={[0.25, 0.08, 0.06]} />
            <meshStandardMaterial color="#FF2222" emissive="#FF2222" emissiveIntensity={1.2} />
          </mesh>
          {/* knalpot kanan */}
          <mesh position={[0.3, 0.45, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.95, 12]} />
            <meshStandardMaterial color="#C8CCD2" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* footpeg */}
          <mesh position={[0.28, 0.45, -0.1]}>
            <boxGeometry args={[0.12, 0.05, 0.2]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.8} />
          </mesh>
          <mesh position={[-0.28, 0.45, -0.1]}>
            <boxGeometry args={[0.12, 0.05, 0.2]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.8} />
          </mesh>
          {/* --- roda belakang (tetap) --- */}
          <group position={[0, WHEEL_R, -0.85]}>
            <Wheel spin={spin} width={0.2} />
          </group>
          {/* bayangan kontak lembut */}
          <mesh
            position={[0, 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[1, 1.9, 1]}
          >
            <circleGeometry args={[0.75, 20]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.16} roughness={1} />
          </mesh>

          {/* --- rakitan depan (steer): garpu + roda depan + setang --- */}
          <group position={[0, 1.0, 0.7]} rotation={[0, steer, 0]}>
            {/* garpu */}
            <Beam a={[-0.14, 0, 0]} b={[-0.14, -0.65, 0.15]} r={0.05} color={STEEL_DARK} />
            <Beam a={[0.14, 0, 0]} b={[0.14, -0.65, 0.15]} r={0.05} color={STEEL_DARK} />
            {/* roda depan */}
            <group position={[0, -0.65, 0.15]}>
              <Wheel spin={spin} width={0.16} />
            </group>
            {/* setang */}
            <mesh position={[0, 0.15, -0.15]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.75, 10]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            {/* grip setang */}
            <mesh position={[0.36, 0.15, -0.15]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.14, 10]} />
              <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
            </mesh>
            <mesh position={[-0.36, 0.15, -0.15]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.14, 10]} />
              <meshStandardMaterial color="#1F1F1F" roughness={0.9} />
            </mesh>
            {/* spion */}
            <Beam a={[0.3, 0.15, -0.15]} b={[0.42, 0.38, -0.18]} r={0.02} color="#2B2B2B" />
            <Beam a={[-0.3, 0.15, -0.15]} b={[-0.42, 0.38, -0.18]} r={0.02} color="#2B2B2B" />
            <mesh position={[0.42, 0.4, -0.18]}>
              <boxGeometry args={[0.12, 0.09, 0.03]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            <mesh position={[-0.42, 0.4, -0.18]}>
              <boxGeometry args={[0.12, 0.09, 0.03]} />
              <meshStandardMaterial color="#2B2B2B" roughness={0.6} />
            </mesh>
            {variant === "race" ? (
              <>
                {/* fairing depan */}
                <mesh position={[0, -0.05, 0.28]}>
                  <boxGeometry args={[0.6, 0.7, 0.5]} />
                  <meshStandardMaterial color={body} roughness={0.55} />
                </mesh>
                {/* windscreen */}
                <mesh position={[0, 0.28, 0.45]} rotation={[-0.5, 0, 0]}>
                  <boxGeometry args={[0.45, 0.3, 0.04]} />
                  <meshStandardMaterial color={GLASS} roughness={0.2} transparent opacity={0.85} />
                </mesh>
                {/* lampu depan */}
                <mesh position={[0, -0.05, 0.54]}>
                  <boxGeometry args={[0.4, 0.14, 0.06]} />
                  <meshStandardMaterial color="#FFF8DC" emissive="#FFF8DC" emissiveIntensity={1.4} />
                </mesh>
              </>
            ) : (
              <>
                {/* lampu depan bulat (street) */}
                <mesh position={[0, -0.02, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.14, 0.14, 0.1, 14]} />
                  <meshStandardMaterial color="#FFF8DC" emissive="#FFF8DC" emissiveIntensity={1.4} />
                </mesh>
              </>
            )}
          </group>

          <Rider lean={lean} variant={variant} />
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
  driftA: number;
  speedPerFrame: number;
}> = ({ s, lean, steer, variant, scene, local, frame, driftA, speedPerFrame }) => {
  const spin = s / WHEEL_R;
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
    if (![0, 1, 3, 4, 6, 7, 8].includes(scene)) return [];
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

  // Percikan knee slider (S1 hook + S6 close-up): partikel amber deterministik
  // di titik kontak lutut-aspal, hanya saat miring > 50°.
  const sparks = useMemo(() => {
    if (![0, 5].includes(scene)) return [];
    if (lean < (50 * Math.PI) / 180) return [];
    const out: { pos: [number, number, number]; opacity: number; scale: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const flick = 0.5 + 0.5 * Math.sin(frame * 0.9 + i * 2.4);
      const spread = (pseudo(i + 7) - 0.5) * 0.7;
      const back = pseudo(i + 21) * 0.6;
      out.push({
        pos: [
          mx + toCenter[0] * 0.55 - tangent[0] * (0.3 + back) + spread * tangent[0],
          0.06 + pseudo(i + 33) * 0.14,
          mz + toCenter[2] * 0.55 - tangent[2] * (0.3 + back) + spread * tangent[2],
        ],
        opacity: 0.35 + 0.6 * flick,
        scale: 0.05 + pseudo(i + 55) * 0.06,
      });
    }
    return out;
  }, [scene, frame, s, lean, mx, mz, tangent, toCenter]);

  // Panah-panah gaya (pop-in dengan easing di main via arrowScale).
  const arrowScale = interpolate(local, [15, 30], [0, 1], {
    easing: Easing.out(Easing.back(1.7)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Titik jangkar panah (dunia).
  const rearWheel: [number, number, number] = [
    mx - tangent[0] * 0.85,
    0.35,
    mz - tangent[2] * 0.85,
  ];
  const arrowFriction: { a: [number, number, number]; b: [number, number, number] } = {
    a: [rearWheel[0], 0.18, rearWheel[2]],
    b: [
      rearWheel[0] + toCenter[0] * 2.6,
      0.18,
      rearWheel[2] + toCenter[2] * 2.6,
    ],
  };
  // Panah dorong setang: TIDAK dipakai di video ini (dihapus — dulu S6 MotorMiring).

  // Split-view S4: motor A (tegak, drift keluar) + motor B (miring, di busur).
  const [ax, az] = arcPos(s, R + driftA);
  const yawA = arcYaw(s, R + driftA);

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
      {/* ===== Motor hero ===== */}
      {scene === 3 ? (
        <>
          {/* S4 split-view: A tegak (drift keluar) vs B miring (seimbang) */}
          <Motor
            variant="race"
            spin={s / WHEEL_R}
            lean={(30 * Math.PI) / 180}
            steer={0}
            frame={frame}
            position={[ax, 0, az]}
            yaw={yawA}
          />
          <Motor
            variant="race"
            spin={spin}
            lean={lean}
            steer={0}
            frame={frame}
            position={[mx, 0, mz]}
            yaw={yaw}
          />
        </>
      ) : (
        <Motor
          variant={variant}
          spin={spin}
          lean={lean}
          steer={steer}
          frame={frame}
          position={[mx, 0, mz]}
          yaw={yaw}
        />
      )}
      {/* ===== Panah gaya (3D) =====
          S2 pakai panah DOM (di bawah, overlay) — panah 3D ke pusat
          tikungan terbaca sebagai "!" dari kamera samping.
          S5 juga pakai panah DOM (di bawah) — panah 3D gravitasi/sentripetal
          terlalu tebal dan menutupi motor dari kamera depan. */}
      {scene === 1 && (
        <group scale={[arrowScale, arrowScale, arrowScale]}>
          <Arrow a={arrowFriction.a} b={arrowFriction.b} color={AMBER} r={0.07} />
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
        fontSize: 60,
        fontWeight: 800,
        color: "#FFFFFF",
        lineHeight: 1.2,
        textShadow: SHADOW,
      }}
    >
      LUTUT NEMPEL ASPAL
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
      Sensor paling jujur di MotoGP
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Pembalap MotoGP nikung sampai lututnya nempel aspal. Ngapain? Pamer? Bukan.", highlight: "nempel" },
  { text: "Lutut itu sensor. Pas lutut nyentuh aspal, pembalap langsung tahu motornya udah miring seberapa.", highlight: "sensor" },
  { text: "Miringnya bisa sampai 66° — hampir rebah.", highlight: "66°" },
  { text: "Kalau lutut belum nyentuh, artinya masih bisa miring lagi. Kalau udah nyentuh, itu batasnya.", highlight: "batasnya" },
  { text: "Lutut juga mindahin berat badan ke dalam tikungan, supaya motor lebih stabil.", highlight: "stabil" },
  { text: "Pelindung lututnya — knee slider — yang bergesekan sama aspal, bukan kulit.", highlight: "slider" },
  { text: "Slider itu bisa habis dalam satu balapan.", highlight: "balapan" },
  { text: "Jadi lutut nempel aspal itu bukan gaya-gayaan. Itu alat ukur paling jujur di MotoGP.", highlight: "jujur" },
  { text: "Lo pernah ngeliat lutut pembalap sampai keluar api?", highlight: "api" },
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

// Panah DOM (callout 2D): garis + segitiga, menunjuk ke atas.
// Dipakai S2 — panah 3D ke pusat tikungan selalu terbaca sebagai
// "!" dari kamera samping (ujung kerucut menghadap kamera).
const DomArrowUp: React.FC<{ top: number; left: number; height?: number }> = ({
  top,
  left,
  height = 160,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      transform: "translateX(-50%)",
    }}
  >
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: "14px solid transparent",
        borderRight: "14px solid transparent",
        borderBottom: `26px solid ${AMBER}`,
        margin: "0 auto",
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
      }}
    />
    <div
      style={{
        width: 6,
        height,
        backgroundColor: AMBER,
        margin: "0 auto",
        boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
      }}
    />
  </div>
);

// Panah DOM menunjuk ke bawah (gravitasi, S5): segitiga di bawah.
const DomArrowDown: React.FC<{ top: number; left: number; height?: number }> = ({
  top,
  left,
  height = 200,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      transform: "translateX(-50%)",
    }}
  >
    <div
      style={{
        width: 8,
        height,
        backgroundColor: "#FFFFFF",
        margin: "0 auto",
        boxShadow: "0 2px 6px rgba(0,0,0,0.7)",
      }}
    />
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: "16px solid transparent",
        borderRight: "16px solid transparent",
        borderTop: `30px solid #FFFFFF`,
        margin: "0 auto",
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
      }}
    />
  </div>
);

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

const BigNumber: React.FC<{ value: string; caption: string; top?: number; local: number }> = ({
  value,
  caption,
  top = 480,
  local,
}) => {
  const scale = interpolate(local, [0, 12], [0.6, 1], {
    easing: Easing.out(Easing.back(1.7)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(local, [0, 6], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        textAlign: "center",
        scale,
        opacity,
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
};

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
    Sumber: motogp.com
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
export const TOTAL_FRAMES = 1190; // DIKUNCI ke durasi VO asli 39.68s @ 30fps (ffprobe)

const SCENE_BOUNDS = [0, 127, 299, 405, 576, 714, 841, 920, 1079, 1190]; // diskala proporsional dari estimasi awal (faktor 1190/1350) ke durasi VO asli 39.68s
const S_RANGES: [number, number][] = [
  [0, 5], // S1 hook: lutut nempel aspal
  [5, 10], // S2 lutut = sensor
  [10, 13], // S3 angka 66°
  [13, 18], // S4 split-view: belum nyentuh vs udah nyentuh
  [18, 23], // S5 berat badan pindah ke dalam
  [23, 27], // S6 close-up knee slider + percikan
  [27, 30], // S7 slider habis dalam satu balapan
  [30, 36], // S8 payoff: alat ukur paling jujur
  [36, 40], // S9 penutup: motor lurus lagi
];
const LEAN_DEG: [number, number][] = [
  [66, 66],
  [66, 55],
  [66, 66],
  [30, 66], // naik: belum nyentuh (30°) -> udah nyentuh (66°)
  [55, 55],
  [66, 66],
  [66, 66],
  [50, 30],
  [30, 0],
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
  "race",
  "race",
  "race",
  "race",
  "race",
  "race",
  "race",
  "race",
  "race",
];

export const LututMotogpExplainer: React.FC = () => {
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
  // S4: motor tegak drift keluar tikungan (radius membesar).
  const driftA =
    scene === 3
      ? interpolate(local, [0, sceneLen - 1], [0, 6], {
          easing: easeInOut,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
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
  // lx NEGATIF = sisi LUAR tikungan — motor miring MENJAUH dari kamera,
  // profil samping + roda terbaca (dari dalam, motor 66° malah kelihatan
  // jatuh/rebah — terbukti di still check hook pertama).
  // Target selalu di dekat motor (bukan jauh di depan) supaya hero utuh.
  if (scene === 0) {
    // S1 HOOK: tracking 3/4 belakang-LUAR, push-in. Lutut sudah nempel aspal.
    camPos = camFrom(lerpE(-5.5, -4.5), lerpE(2.4, 2), lerpE(-7, -6));
    camTarget = targetAhead(0.5, 1.3);
  } else if (scene === 1) {
    // S2 SENSOR: tracking samping LUAR dari ATAS.
    camPos = camFrom(lerpE(-9, -7.5), lerpE(5, 4.2), lerpE(0.5, 0));
    camTarget = [mx, 1.1, mz];
  } else if (scene === 2) {
    // S3 ANGKA 66°: 3/4 agak tinggi LUAR (BUKAN top-down), push-in.
    camPos = camFrom(lerpE(-6.5, -5.5), lerpE(4.5, 3.8), lerpE(-6.5, -5.5));
    camTarget = targetAhead(1, 1.1);
  } else if (scene === 3) {
    // S4 SPLIT-VIEW: kamera head-on 16 unit DI DEPAN, menengok ke belakang.
    // A (miring 30°, lutut belum nyentuh, drift keluar) di KIRI,
    // B (miring 66°, lutut nyentuh) di KANAN.
    const [ax, az] = arcPos(s, R + driftA);
    const midX = (ax + mx) / 2;
    const midZ = (az + mz) / 2;
    const [cx, cz] = arcPos(s + 16, R);
    camPos = [cx, lerpE(4, 3.5), cz];
    camTarget = [midX, 1, midZ];
  } else if (scene === 4) {
    // S5 BERAT BADAN: 3/4 depan-LUAR, drift pelan.
    camPos = camFrom(lerpE(-5.5, -4.5), lerpE(2.8, 2.4), lerpE(6, 5));
    camTarget = [mx, 1.2, mz];
  } else if (scene === 5) {
    // S6 CLOSE-UP KNEE SLIDER: sisi DALAM (+X, arah tikungan), jarak sedang
    // supaya motor + lutut + aspal utuh di frame (terlalu dekat = blok abstrak).
    const toCenter: [number, number, number] = [Math.cos(yaw), 0, -Math.sin(yaw)];
    camPos = camFrom(lerpE(5.5, 4.8), lerpE(1.8, 1.5), lerpE(-4.5, -3.8));
    camTarget = [
      mx + toCenter[0] * 0.55 - tangent[0] * 0.3,
      0.4,
      mz + toCenter[2] * 0.55 - tangent[2] * 0.3,
    ];
  } else if (scene === 6) {
    // S7 SLIDER HABIS: tracking 3/4 belakang-LUAR, push-in.
    camPos = camFrom(lerpE(-7, -6), lerpE(2.6, 2.2), lerpE(-7, -6));
    camTarget = targetAhead(1, 1.2);
  } else if (scene === 7) {
    // S8 PAYOFF: pull-back lebar + naik, sisi LUAR.
    camPos = camFrom(lerpE(-9, -13), lerpE(4, 7), lerpE(-11, -16));
    camTarget = targetAhead(1, 1.2);
  } else {
    // S9 PENUTUP: tracking belakang-LUAR, motor melurus.
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
        <Scene
          s={s}
          lean={lean}
          steer={steer}
          variant={VARIANT[scene]}
          scene={scene}
          local={local}
          frame={frame}
          driftA={driftA}
          speedPerFrame={speedPerFrame}
        />
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>
      {scene === 0 && <Headline />}
      <Subtitle scene={scene} local={local} />
      {scene === 2 && (
        <BigNumber value="66°" caption="sudut miring rekor Marc Márquez" top={560} local={local} />
      )}
      {scene === 1 && (
        <>
          <HairlineLabel top={690} left={260} right={500} text="lutut = sensor" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              scale: interpolate(local, [15, 30], [0, 1], {
                easing: Easing.out(Easing.back(1.7)),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              opacity: interpolate(local, [15, 25], [0, 1], {
                easing: Easing.out(Easing.quad),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <DomArrowUp top={780} left={420} height={160} />
          </div>
        </>
      )}
      {scene === 3 && (
        <>
          <HairlineLabel top={620} left={70} text="Belum nyentuh: masih bisa miring" />
          <HairlineLabel top={620} right={70} text="Udah nyentuh: ini batasnya" />
        </>
      )}
      {scene === 4 && (
        <>
          <HairlineLabel top={560} left={70} right={70} text="berat badan pindah ke dalam tikungan" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              scale: interpolate(local, [15, 30], [0, 1], {
                easing: Easing.out(Easing.back(1.7)),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              opacity: interpolate(local, [15, 25], [0, 1], {
                easing: Easing.out(Easing.quad),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <DomArrowDown top={620} left={620} height={200} />
          </div>
        </>
      )}
      {scene === 5 && (
        <HairlineLabel top={700} left={480} right={70} text="knee slider, bukan kulit" />
      )}
      {scene === 6 && (
        <HairlineLabel top={700} left={90} text="slider habis dalam satu balapan" />
      )}
      {scene === 8 && <SourceLine />}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/lutut-motogp/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene */}
      {[0, 127, 299, 405, 576, 714, 841, 920, 1079].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15s (5 frame) saat BigNumber "66°" muncul — scene 2 (S3), frame 299 */}
      <Sequence from={299} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
