import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= PltaListrikExplainer =================
// "Gimana PLTA bikin listrik dari air jatuh?" (PLTA Cirata, Purwakarta)
// 1747 frame = 58.25 detik @ 30fps (DIKUNCI ke durasi VO Sami asli 58.248s
// via ffprobe), 1080x1920, 13 scene.
// Profil B toy-explainer. TANPA AUDIO (VO/BGM belum ada, dipasang nanti).
// Angka bersumber (resmi ESDM/PJB): 1.008 MW, 112,5 m, 135 m3/detik,
// 187,5 rpm, 1.428 GWh/tahun, 500 kV, 8 turbin Francis.
//
// PERBAIKAN v2 (evaluasi v1 Bekasi — "kaku", air tidak terbaca):
// 1. EASING di SEMUA gerakan — Easing.inOut(Easing.quad) untuk kamera,
//    Easing.out untuk objek masuk. NOL interpolate linear mentah untuk gerak.
// 2. AIR BIRU DAN MENGALIR — waduk + sungai BIRU (#2E8BC0), garis arus
//    bergerak, air jatuh + percikan di turbin, turbin Francis BERPUTAR.
// 3. SECONDARY MOTION — awan bergerak, pohon bergoyang, perahu bobbing,
//    arus mengalir, titik listrik merambat di kabel. Tidak ada yang diam.
// 4. KAMERA BERGERAK DI DALAM SCENE — push-in/tracking/orbit kecil di
//    tiap scene (dengan easing). Hero selalu utuh di frame.
// 5. SCENE ANGKA sudut miring 3/4, bukan top-down datar.
// 6. DETAIL OBJEK — bendungan + pintu air + pipa pesat + turbin Francis
//    berbilah + generator + trafo + tiang 500 kV + waduk biru + perahu.

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const GREEN = "#A8C3A0";
const GREEN_DARK = "#8FAE8A";
const GREEN_LIGHT = "#B5CBA8";
const CONCRETE = "#C9C4B8";
const CONCRETE_DARK = "#A9A49A";
const JOINT = "#8A8578";
const WATER = "#2E8BC0";
const WATER_DEEP = "#1F6FA8";
const WATER_LIGHT = "#7FC4E8";
const FOAM = "#EAF6FF";
const STEEL = "#6B7280";
const PENSTOCK = "#8FA3B5"; // pipa pesat: baja terang (sisi bayangan tidak hitam)
const STEEL_DARK = "#4A5560";
const COPPER = "#B87333";
const GEN_BLUE = "#3A5A78";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const TRUNK = "#8A6B4F";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const SPARK = "#FFD54F";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Geometri dunia (satuan ~meter, skala mainan) =================
// Bendungan di z=0 (x -28..28, y 0..13). Waduk di belakang (z 2..60,
// permukaan y=10,2, BIRU). Power house di depan (z -10..-20, atap y=7,5,
// sisi selatan TERBUKA). Sungai di depan (z -20..-60, BIRU).
// Pipa pesat hero: (0,9,2) -> (-3,2,-13), lewat muka bendungan.
const UNIT_X = [-21, -15, -9, -3, 3, 9, 15, 21];
const HERO_X = -3;
const TURBINE_Z = -15;
const RES_Y = 10.2;

// Deterministik (bukan Math.random): hash dari indeks.
function pseudo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Lerp kamera dengan easing ease-in-out (v2: kamera tidak pernah linear).
function camLerp(
  local: number,
  len: number,
  from: [number, number, number],
  to: [number, number, number]
): [number, number, number] {
  const t = interpolate(local, [0, Math.max(1, len - 1)], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
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

// ================= Beam: silinder di antara dua titik =================
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
      <cylinderGeometry args={[r, r, len, 10]} />
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

// ================= BENDUNGAN (dinding beton + jalan di puncak) =================
const Dam: React.FC = () => (
  <group>
    {/* dinding utama */}
    <mesh position={[0, 6.5, 0]}>
      <boxGeometry args={[56, 13, 4]} />
      <meshStandardMaterial color={CONCRETE} roughness={0.9} />
    </mesh>
    {/* jalan di puncak + garis tengah */}
    <mesh position={[0, 13.25, 0]}>
      <boxGeometry args={[56, 0.5, 5]} />
      <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
    </mesh>
    {[-20, -10, 0, 10, 20].map((x) => (
      <mesh key={x} position={[x, 13.55, 0]}>
        <boxGeometry args={[3, 0.06, 0.5]} />
        <meshStandardMaterial color={FOAM} roughness={0.8} />
      </mesh>
    ))}
    {/* sambungan vertikal di muka hilir */}
    {[-21, -14, -7, 0, 7, 14, 21].map((x) => (
      <mesh key={x} position={[x, 6.5, -2.06]}>
        <boxGeometry args={[0.18, 12, 0.12]} />
        <meshStandardMaterial color={JOINT} roughness={0.9} />
      </mesh>
    ))}
    {/* abutmen kiri-kanan */}
    <mesh position={[-29.5, 7.5, 0]}>
      <boxGeometry args={[3, 15, 5]} />
      <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
    </mesh>
    <mesh position={[29.5, 7.5, 0]}>
      <boxGeometry args={[3, 15, 5]} />
      <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
    </mesh>
    {/* pagar di puncak + 3 rangka pintu pelimpah (siluet di puncak) */}
    {Array.from({ length: 14 }).map((_, i) => (
      <mesh key={i} position={[-26 + i * 4, 14, -1.5]}>
        <cylinderGeometry args={[0.08, 0.08, 1, 6]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
      </mesh>
    ))}
    <mesh position={[0, 14.5, -1.5]}>
      <boxGeometry args={[52, 0.15, 0.15]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
    </mesh>
    {[-12, 0, 12].map((x) => (
      <group key={x} position={[x, 13.5, 0]}>
        <mesh position={[-1.4, 1, 0]}>
          <boxGeometry args={[0.6, 2, 0.8]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
        </mesh>
        <mesh position={[1.4, 1, 0]}>
          <boxGeometry args={[0.6, 2, 0.8]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.1, 0]}>
          <boxGeometry args={[3.4, 0.5, 0.9]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
        </mesh>
      </group>
    ))}
  </group>
);

// ================= MENARA INTAKE + PINTU AIR =================
// Pintu naik (ease-out) di scene 1; air masuk menara saat pintu terbuka.
const IntakeTower: React.FC<{ gateOpen: number }> = ({ gateOpen }) => (
  <group>
    {/* menara beton di sisi waduk */}
    <mesh position={[0, 6, 3.5]}>
      <boxGeometry args={[5, 12, 4]} />
      <meshStandardMaterial color={CONCRETE} roughness={0.9} />
    </mesh>
    <mesh position={[0, 12.3, 3.5]}>
      <boxGeometry args={[5.6, 0.6, 4.6]} />
      <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
    </mesh>
    {/* lubang pintu (gelap) di sisi waduk */}
    <mesh position={[0, 9.5, 5.55]}>
      <boxGeometry args={[3.2, 3, 0.3]} />
      <meshStandardMaterial color={WATER_DEEP} roughness={0.4} />
    </mesh>
    {/* daun pintu yang naik saat dibuka */}
    <mesh position={[0, 9.5 + gateOpen * 2.6, 5.6]}>
      <boxGeometry args={[3.4, 3, 0.35]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.3} />
    </mesh>
    {/* aliran air masuk saat pintu terbuka */}
    <mesh
      position={[0, 9.2, 6.4]}
      scale={[1, 1, Math.max(0.01, gateOpen)]}
    >
      <boxGeometry args={[2.8, 0.7, 2.2]} />
      <meshStandardMaterial
        color={WATER}
        roughness={0.25}
        transparent
        opacity={0.85 * Math.max(0, gateOpen)}
      />
    </mesh>
  </group>
);

// ================= PIPA PESAT (hero + 7 pipa tipis unit lain) =================
// Jendela di tengah pipa hero memperlihatkan air yang meluncur turun.
const Penstock: React.FC<{ frame: number }> = ({ frame }) => {
  // Gelembung arus di permukaan kolom air (sisi barat, menghadap kamera
  // scene 4): bergerak turun seiring frame. Ditempel DI LUAR kolom air
  // (radius 1,0) supaya terlihat — garis di dalam kolom tidak kelihatan.
  const bubbles = [0, 1, 2].map((i) => {
    const t = (frame * 0.06 + i * 0.33) % 1;
    return {
      x: -1.05 - 0.45 * t - 1.02,
      y: 6.55 - 1.05 * t,
      z: -3.25 - 2.25 * t,
    };
  });
  return (
    <group>
      {/* pipa hero segmen atas: intake -> jendela */}
      <Beam a={[0, 9, 2]} b={[-1.05, 6.55, -3.25]} r={1.3} color={PENSTOCK} />
      {/* air di dalam jendela */}
      <Beam
        a={[-1.05, 6.55, -3.25]}
        b={[-1.5, 5.5, -5.5]}
        r={1.0}
        color={WATER}
      />
      {bubbles.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[0.24, 8, 6]} />
          <meshStandardMaterial
            color={FOAM}
            roughness={0.3}
            transparent
            opacity={0.95}
          />
        </mesh>
      ))}
      {/* pipa hero segmen bawah: jendela -> power house */}
      <Beam a={[-1.5, 5.5, -5.5]} b={[-3, 2, -13]} r={1.3} color={PENSTOCK} />
      {/* pipa tipis 7 unit lain: turun di muka bendungan, masuk power house */}
      {UNIT_X.filter((x) => x !== HERO_X).map((x) => (
        <group key={x}>
          <Beam a={[x, 8, -2.1]} b={[x, 2.5, -2.1]} r={0.6} color={PENSTOCK} />
          <Beam a={[x, 2.5, -2.1]} b={[x, 2.5, -13]} r={0.6} color={PENSTOCK} />
          <Beam a={[x, 2.5, -13]} b={[x, 1.4, -14.6]} r={0.5} color={WATER} />
        </group>
      ))}
    </group>
  );
};

// ================= TURBIN FRANCIS + GENERATOR (satu unit) =================
// Runner berputar (rotation sebanding frame); bilah miring supaya putaran terbaca.
const TurbineUnit: React.FC<{ x: number; frame: number; hero?: boolean }> = ({
  x,
  frame,
  hero,
}) => {
  const spin = frame * 0.06; // putaran terbaca; angka 187,5 rpm tampil di teks
  return (
    <group position={[x, 0, TURBINE_Z]}>
      {/* rumah turbin (cincin rendah, runner TERLIHAT di atasnya) */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[1.7, 1.7, 0.8, 20, 1, true]} />
        <meshStandardMaterial
          color={CONCRETE_DARK}
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* runner Francis: hub + 8 bilah miring, BERPUTAR (di atas rumah) */}
      <group position={[0, 1.6, 0]} rotation={[0, spin, 0]}>
        <mesh>
          <cylinderGeometry args={[0.45, 0.45, 0.5, 12]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.4} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 4, 0]}>
            <mesh position={[0.85, 0, 0]} rotation={[0.55, 0, 0]}>
              <boxGeometry args={[1.15, 0.55, 0.12]} />
              <meshStandardMaterial color={COPPER} roughness={0.45} metalness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[1.35, 1.35, 0.14, 20]} />
          <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.4} />
        </mesh>
      </group>
      {/* poros */}
      <mesh position={[0, 2.9, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 2.2, 10]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* generator: silinder + pita tembaga + penanda putih (putaran terbaca) */}
      <group position={[0, 5, 0]} rotation={[0, spin, 0]}>
        <mesh>
          <cylinderGeometry args={[1.05, 1.05, 2, 16]} />
          <meshStandardMaterial color={GEN_BLUE} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1.08, 1.08, 0.4, 16]} />
          <meshStandardMaterial color={COPPER} roughness={0.45} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.3, 1.06]}>
          <boxGeometry args={[0.35, 1.2, 0.06]} />
          <meshStandardMaterial color={FOAM} roughness={0.6} />
        </mesh>
      </group>
      {/* alas */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[1.9, 2.1, 0.7, 20]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
      </mesh>
      {hero && (
        <>
          {/* pancaran air dari pipa hero ke runner */}
          <Beam a={[-0.0, 2.2, 1.8]} b={[0, 1.7, 0.4]} r={0.7} color={WATER} />
          {/* percikan kecil di sekitar runner */}
          {Array.from({ length: 14 }).map((_, i) => {
            const a = pseudo(i) * Math.PI * 2;
            const r = 1.4 + pseudo(i + 20) * 0.7;
            const y =
              1.2 + ((frame * 0.09 + i * 0.37) % 1.6);
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r, y, Math.sin(a) * r * 0.7]}
              >
                <sphereGeometry args={[0.08 + pseudo(i + 40) * 0.06, 8, 6]} />
                <meshStandardMaterial
                  color={FOAM}
                  roughness={0.3}
                  transparent
                  opacity={0.85}
                />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

// ================= POWER HOUSE (aula terbuka, 8 unit) =================
const Powerhouse: React.FC<{ frame: number }> = ({ frame }) => (
  <group>
    {/* lantai */}
    <mesh position={[0, 0.3, -15]}>
      <boxGeometry args={[52, 0.6, 10]} />
      <meshStandardMaterial color={CONCRETE} roughness={0.9} />
    </mesh>
    {/* garis kuning keselamatan */}
    <mesh position={[0, 0.65, -12.2]}>
      <boxGeometry args={[52, 0.06, 0.5]} />
      <meshStandardMaterial color={AMBER} roughness={0.7} />
    </mesh>
    {/* dinding belakang (utara) + dinding samping */}
    <mesh position={[0, 3.75, -10]}>
      <boxGeometry args={[52, 7.5, 0.8]} />
      <meshStandardMaterial color={CONCRETE} roughness={0.9} />
    </mesh>
    <mesh position={[-26, 3.75, -15]}>
      <boxGeometry args={[0.8, 7.5, 10]} />
      <meshStandardMaterial color={CONCRETE} roughness={0.9} />
    </mesh>
    <mesh position={[26, 3.75, -15]}>
      <boxGeometry args={[0.8, 7.5, 10]} />
      <meshStandardMaterial color={CONCRETE} roughness={0.9} />
    </mesh>
    {/* atap */}
    <mesh position={[0, 7.75, -15]}>
      <boxGeometry args={[52, 0.5, 10]} />
      <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
    </mesh>
    {/* kolom depan (sisi selatan terbuka) */}
    {[-26, -13, 0, 13, 26].map((x) => (
      <mesh key={x} position={[x, 3.75, -20]}>
        <boxGeometry args={[0.6, 7.5, 0.6]} />
        <meshStandardMaterial color={CONCRETE_DARK} roughness={0.9} />
      </mesh>
    ))}
    {/* lampu dinding (emissive, menyala) */}
    {[-18, -6, 6, 18].map((x) => (
      <mesh key={x} position={[x, 6.8, -10.5]}>
        <boxGeometry args={[1.2, 0.4, 0.2]} />
        <meshStandardMaterial color={FOAM} emissive="#FFF2C8" emissiveIntensity={1.2} />
      </mesh>
    ))}
    {/* 8 unit turbin-generator, semuanya berputar */}
    {UNIT_X.map((x) => (
      <TurbineUnit key={x} x={x} frame={frame} hero={x === HERO_X} />
    ))}
    {/* meja kontrol di sudut timur-laut aula (jauh dari kamera close-up) */}
    <mesh position={[10, 0.9, -12]}>
      <boxGeometry args={[2.2, 1.2, 1]} />
      <meshStandardMaterial color={GEN_BLUE} roughness={0.7} />
    </mesh>
  </group>
);

// ================= TRAFO + MENARA TRANSMISI 500 kV =================
const Transmission: React.FC<{ frame: number }> = ({ frame }) => {
  const towers: [number, number][] = [
    [34, -38],
    [34, -48],
    [34, -58],
  ];
  return (
    <group>
      {/* trafo di halaman switchyard */}
      <mesh position={[12, 1.75, -24]}>
        <boxGeometry args={[3, 3.5, 2.5]} />
        <meshStandardMaterial color={GEN_BLUE} roughness={0.7} />
      </mesh>
      {[11.2, 12, 12.8].map((x) => (
        <mesh key={x} position={[x, 3.9, -24]}>
          <cylinderGeometry args={[0.16, 0.2, 0.9, 8]} />
          <meshStandardMaterial color="#E8E0C8" roughness={0.6} />
        </mesh>
      ))}
      {/* menara transmisi */}
      {towers.map(([x, z], ti) => (
        <group key={ti} position={[x, 0, z]}>
          <mesh position={[0, 6.5, 0]}>
            <boxGeometry args={[0.9, 13, 0.9]} />
            <meshStandardMaterial color={STEEL} roughness={0.6} />
          </mesh>
          <mesh position={[0, 11, 0]}>
            <boxGeometry args={[7, 0.5, 0.5]} />
            <meshStandardMaterial color={STEEL} roughness={0.6} />
          </mesh>
          <mesh position={[0, 12.6, 0]}>
            <boxGeometry args={[5, 0.5, 0.5]} />
            <meshStandardMaterial color={STEEL} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* kabel antar menara (sedikit melengkung) + titik listrik merambat */}
      {towers.slice(0, -1).map(([x, z], ti) => {
        const [nx, nz] = towers[ti + 1];
        const mid: [number, number, number] = [(x + nx) / 2, 10.4, (z + nz) / 2];
        return (
          <group key={ti}>
            <Beam a={[x - 3, 11, z]} b={mid} r={0.07} color={STEEL_DARK} />
            <Beam a={mid} b={[nx - 3, 11, nz]} r={0.07} color={STEEL_DARK} />
            {[0, 1, 2].map((d) => {
              const p = (frame * 0.008 + d * 0.33) % 1;
              const px = x - 3 + (nx - x) * p;
              const pz = z + (nz - z) * p;
              const py = 11 - Math.sin(p * Math.PI) * 0.6;
              return (
                <mesh key={d} position={[px, py, pz]}>
                  <sphereGeometry args={[0.22, 8, 6]} />
                  <meshStandardMaterial
                    color={SPARK}
                    emissive={SPARK}
                    emissiveIntensity={2}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
      {/* kabel trafo -> menara pertama */}
      <Beam a={[12, 4.2, -24]} b={[31, 11, -38]} r={0.09} color={STEEL_DARK} />
    </group>
  );
};

// ================= WADUK (BIRU, mengalir) + PERAHU =================
const Reservoir: React.FC<{ frame: number }> = ({ frame }) => {
  // Garis arus di permukaan: bergerak ke arah bendungan (-Z).
  const stripes = Array.from({ length: 16 }).map((_, i) => {
    const x = -38 + pseudo(i) * 76;
    const z = 58 - ((frame * 0.22 + i * 3.6) % 54);
    return { x, z, w: 3 + pseudo(i + 30) * 2.5 };
  });
  // Perahu kecil: bobbing + melayang pelan di tengah waduk (gerak sinus
  // kecil, x -2..2 — JANGAN menghalangi menara intake di scene 1/11).
  const boatX = 2 * Math.sin(frame * 0.006);
  const boatY = RES_Y + 0.15 + Math.sin(frame * 0.05) * 0.14;
  const boatTilt = Math.sin(frame * 0.04) * 0.035;
  return (
    <group>
      {/* badan air: balok biru (sisi terbaca sebagai kedalaman) */}
      <mesh position={[0, RES_Y / 2, 31]}>
        <boxGeometry args={[90, RES_Y, 58]} />
        <meshStandardMaterial color={WATER} roughness={0.25} />
      </mesh>
      {/* garis arus bergerak */}
      {stripes.map((s, i) => (
        <mesh key={i} position={[s.x, RES_Y + 0.15, s.z]}>
          {/* tebal 0,35 + lebar z 1,0: tetap terbaca dari kamera rendah (grazing angle) */}
          <boxGeometry args={[s.w, 0.35, 1.0]} />
          <meshStandardMaterial
            color={WATER_LIGHT}
            roughness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      {/* perahu wisata kecil (z=22: jauh dari garis pandang scene 1/11) */}
      <group position={[boatX, boatY, 22]} rotation={[0, 0.3, boatTilt]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[3.2, 0.7, 1.5]} />
          <meshStandardMaterial color="#8A5A3B" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[2.2, 0.7, 1.1]} />
          <meshStandardMaterial color={FOAM} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.45, 0]}>
          <boxGeometry args={[2.4, 0.12, 1.3]} />
          <meshStandardMaterial color={ORANGE} roughness={0.7} />
        </mesh>
        {/* riak di sekitar perahu */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2.4, 20]} />
          <meshStandardMaterial
            color={FOAM}
            roughness={0.3}
            transparent
            opacity={0.5}
          />
        </mesh>
      </group>
    </group>
  );
};

// ================= SUNGAI HILIR (BIRU, mengalir menjauh) =================
const River: React.FC<{ frame: number }> = ({ frame }) => {
  const stripes = Array.from({ length: 12 }).map((_, i) => {
    const x = -25 + pseudo(i + 60) * 50;
    const z = -22 - ((frame * 0.35 + i * 3.1) % 36);
    return { x, z, w: 2 + pseudo(i + 90) * 2.4 };
  });
  return (
    <group>
      <mesh position={[0, 0.2, -40]}>
        <boxGeometry args={[60, 0.4, 40]} />
        <meshStandardMaterial color={WATER} roughness={0.25} />
      </mesh>
      {stripes.map((s, i) => (
        <mesh key={i} position={[s.x, 0.45, s.z]}>
          <boxGeometry args={[s.w, 0.08, 0.45]} />
          <meshStandardMaterial
            color={WATER_LIGHT}
            roughness={0.3}
            transparent
            opacity={0.75}
          />
        </mesh>
      ))}
      {/* buih di mulut tailrace: lapisan datar di permukaan air */}
      <mesh position={[0, 0.42, -21]} scale={[1.8, 0.25, 1.2]}>
        <sphereGeometry args={[2.2, 14, 8]} />
        <meshStandardMaterial
          color={FOAM}
          roughness={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
};

// ================= BUKIT + POHON (bergoyang) + AWAN (bergerak) =================
const Environment: React.FC<{ frame: number }> = ({ frame }) => {
  const hills: [number, number, number, number][] = [
    [-52, 25, 15, 0.45],
    [52, 25, 15, 0.45],
    [-34, 54, 17, 0.45],
    [32, 54, 16, 0.45],
    [0, 62, 18, 0.45],
    [-46, -32, 12, 0.45],
    [46, -34, 12, 0.45],
    // bukit tinggi di belakang bendungan (muncul di atas puncak, latar shot selatan)
    [-36, -30, 18, 0.85],
    [38, -30, 17, 0.85],
  ];
  const trees: [number, number, number][] = [
    [-52, 25, 1],
    [52, 25, 2],
    [-34, 54, 3],
    [32, 54, 4],
    [-46, -32, 5],
    [46, -34, 6],
    [-34, -6, 7],
    [34, -6, 8],
  ];
  const clouds = [0, 1, 2, 3, 4].map((i) => ({
    x: -55 + ((frame * 0.05 + i * 24) % 110),
    y: 17 + i * 1.6,
    z: 18 - i * 9,
    s: 1 + pseudo(i) * 0.7,
  }));
  return (
    <group>
      {/* tanah */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 140]} />
        <meshStandardMaterial color={GREEN} roughness={1} />
      </mesh>
      {/* bukit */}
      {hills.map(([x, z, r, sy], i) => (
        <mesh key={i} position={[x, 0, z]} scale={[1, sy, 1]}>
          <sphereGeometry args={[r, 18, 12]} />
          <meshStandardMaterial color={i % 2 ? GREEN_DARK : GREEN_LIGHT} roughness={1} />
        </mesh>
      ))}
      {/* pohon: goyang halus (sinus) */}
      {trees.map(([x, z, ph], i) => (
        <group
          key={i}
          position={[x, 0, z]}
          rotation={[0, 0, Math.sin(frame * 0.03 + ph) * 0.04]}
        >
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.25, 0.35, 2, 8]} />
            <meshStandardMaterial color={TRUNK} roughness={0.9} />
          </mesh>
          <mesh position={[0, 2.8, 0]}>
            <sphereGeometry args={[1.5, 12, 10]} />
            <meshStandardMaterial color={LEAF} roughness={0.9} />
          </mesh>
          <mesh position={[0.9, 2.2, 0.3]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={LEAF_DARK} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* awan: bergerak pelan melintasi langit */}
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={[c.s, c.s * 0.55, c.s]}>
          <mesh>
            <sphereGeometry args={[2.2, 12, 8]} />
            <meshStandardMaterial color="#FFFFFF" roughness={1} transparent opacity={0.92} />
          </mesh>
          <mesh position={[2, -0.3, 0]}>
            <sphereGeometry args={[1.6, 12, 8]} />
            <meshStandardMaterial color="#FFFFFF" roughness={1} transparent opacity={0.92} />
          </mesh>
          <mesh position={[-2, -0.3, 0]}>
            <sphereGeometry args={[1.5, 12, 8]} />
            <meshStandardMaterial color="#FFFFFF" roughness={1} transparent opacity={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ================= SCENE 3D (semua gerak dari frame) =================
const Scene: React.FC<{ frame: number; scene: number; local: number }> = ({
  frame,
  scene,
  local,
}) => {
  // Pintu air: naik ease-out selama scene 1, TETAP terbuka setelahnya.
  const gateOpen =
    scene > 1
      ? 1
      : scene === 1
        ? interpolate(local, [0, 100], [0, 1], {
            easing: Easing.out(Easing.quad),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : 0;
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[30, 50, 20]} intensity={1.15} />
      <directionalLight position={[-20, 30, -30]} intensity={0.3} />
      <Environment frame={frame} />
      <Reservoir frame={frame} />
      <River frame={frame} />
      <Dam />
      <IntakeTower gateOpen={gateOpen} />
      <Penstock frame={frame} />
      <Powerhouse frame={frame} />
      <Transmission frame={frame} />
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
      Air Jatuh Jadi Listrik 1.008 MW?
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
      PLTA Cirata, Purwakarta
    </div>
  </div>
);

// highlight = kata yang sudah dibersihkan (tanpa titik/komma), sesuai
// clean() di Subtitle — contoh "1.008" -> "1008".
const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Satu waduk di Purwakarta bikin listrik 1.008 MW.", highlight: "1008" },
  { text: "Bahan bakarnya cuma air jatuh. Kok bisa?", highlight: "air" },
  { text: "Ini PLTA Cirata, pembangkit terbesar di Indonesia.", highlight: "cirata" },
  { text: "Air waduk ditahan bendungan, terus dilepas lewat pipa besar.", highlight: "pipa" },
  { text: "Airnya jatuh 112,5 meter. Makin tinggi, makin kencang.", highlight: "1125" },
  { text: "Di bawah, air nabrak baling-baling turbin.", highlight: "turbin" },
  { text: "Turbinnya muter 187,5 putaran per menit.", highlight: "1875" },
  { text: "Begitu turbin muter, generator ikut muter.", highlight: "generator" },
  { text: "Listriknya dikirim lewat kabel 500 kV ke Jawa dan Bali.", highlight: "500" },
  { text: "Satu turbin bisa nelan 135 m³ air per detik.", highlight: "135" },
  { text: "Delapan turbin jalan bareng, totalnya 1.008 MW.", highlight: "1008" },
  { text: "Setahun, Cirata bikin 1.428 GWh listrik.", highlight: "1428" },
  { text: "Menurut lo, waduk mana lagi di Indonesia yang bisa jadi PLTA?", highlight: "waduk" },
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
      {words.map((w, i) => {
        const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
        const isMatch = clean === highlight;
        const opacity = interpolate(local, [i * 2, i * 2 + 6], [0, 1], {
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

// Angka besar (pop ease-out, satu angka di layar pada satu waktu).
const BigNumber: React.FC<{
  value: string;
  caption: string;
  top?: number;
  local: number;
}> = ({ value, caption, top = 480, local }) => {
  const scale = interpolate(local, [0, 12], [0.7, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(local, [0, 8], [0, 1], {
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
        scale: String(scale),
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
    Sumber: Kementerian ESDM / PT PJB
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
// 13 scene, 1747 frame = 58.25 detik @ 30fps (DIKUNCI ke durasi VO Sami asli
// 58.248s via ffprobe; bounds di-scale proporsional dari estimasi 1620).
// Satu aksi per scene; kamera push-in/tracking di DALAM scene (ease-in-out),
// bukan diam.
const SCENE_BOUNDS = [0, 97, 243, 388, 518, 647, 776, 906, 1035, 1165, 1294, 1456, 1618, 1747];

// [posFrom, posTo, tgtFrom, tgtTo] per scene.
const CAMS: [
  [number, number, number],
  [number, number, number],
  [number, number, number],
  [number, number, number],
][] = [
  [[38, 32, -48], [34, 28, -44], [0, 8, -2], [0, 8, -1]], // S0 hook wide (tinggi+jauh: bendungan hero, atap power house strip bawah)
  [[16, 15, 34], [12, 13, 28], [0, 9, 3], [0, 9.5, 3.5]], // S1 pintu air
  [[16, 10, -9], [14, 9, -8], [-1.3, 6, -4.5], [-1.3, 6, -4.5]], // S2 pipa pesat (dari timur, di halaman depan bendungan)
  [[10, 9, -10], [8, 8, -9], [-1.2, 5.8, -4.5], [-1.2, 5.8, -4.5]], // S3 pipa pesat (mundur: jendela air + pipa + muka bendungan utuh)
  [[-16, 8, -8], [-14, 7, -7], [-1.3, 6, -4.5], [-1.3, 6, -4.5]], // S4 air jatuh 112,5 m (dari barat, di halaman depan bendungan — z -8, JANGAN di dalam aula)
  [[7, 5, -20], [6, 4.5, -19], [-3, 1.6, -15], [-3, 1.6, -15]], // S5 turbin close-up
  [[12, 8, -30], [10, 6.5, -27], [-3, 2, -15], [-3, 2, -15]], // S6 turbin wide 187,5 rpm
  [[5, 6.5, -19], [4.5, 6, -18.5], [-3, 5.5, -15], [-3, 5, -15]], // S7 generator
  [[6, 3, -32], [7, 4, -34], [34, 9, -52], [34, 8, -54]], // S8 transmisi 500 kV
  [[28, 18, -38], [26, 16, -35], [-8, 2.5, -15], [-6, 2.5, -15]], // S9 8 turbin (barat bukit timur, tinggi — bukit tidak nutup frame)
  [[34, 26, -46], [30, 22, -42], [0, 7, -2], [0, 7, -1]], // S10 angka 1.008 MW (tinggi, 3/4)
  [[-14, 14, 30], [-12, 13, 27], [0, 9, 2], [0, 9.5, 1]], // S11 payoff (lebih tinggi: lihat permukaan air + garis arus)
  [[14, 14, 34], [12, 13, 32], [0, 10.5, 20], [0, 10.5, 20]], // S12 penutup (mundur: perahu utuh di frame)
];

export const PltaListrikExplainer: React.FC = () => {
  const frame = useCurrentFrame();

  let scene = 0;
  for (let i = 0; i < 13; i++) {
    if (frame >= SCENE_BOUNDS[i] && frame < SCENE_BOUNDS[i + 1]) {
      scene = i;
      break;
    }
  }
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const local = frame - SCENE_BOUNDS[scene];

  const [posFrom, posTo, tgtFrom, tgtTo] = CAMS[scene];
  const camPos = camLerp(local, sceneLen, posFrom, posTo);
  const camTarget = camLerp(local, sceneLen, tgtFrom, tgtTo);

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        <Scene frame={frame} scene={scene} local={local} />
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>
      {scene === 0 && <Headline />}
      <Subtitle scene={scene} local={local} />
      {scene === 1 && (
        <HairlineLabel top={620} left={400} text="Pintu air" />
      )}
      {scene === 3 && (
        <HairlineLabel top={640} left={560} text="Pipa pesat" />
      )}
      {scene === 4 && (
        <BigNumber value="112,5 m" caption="tinggi air jatuh" top={480} local={local} />
      )}
      {scene === 5 && (
        <HairlineLabel top={700} left={90} text="Turbin Francis" />
      )}
      {scene === 6 && (
        <BigNumber value="187,5 rpm" caption="putaran turbin per menit" top={480} local={local} />
      )}
      {scene === 7 && (
        <HairlineLabel top={700} left={90} text="Generator" />
      )}
      {scene === 8 && (
        <BigNumber value="500 kV" caption="tegangan transmisi ke Jawa–Bali" top={480} local={local} />
      )}
      {scene === 9 && (
        <BigNumber value="135 m³/detik" caption="debit air per turbin" top={300} local={local} />
      )}
      {scene === 10 && (
        <BigNumber value="1.008 MW" caption="8 turbin jalan bareng" top={420} local={local} />
      )}
      {scene === 11 && (
        <BigNumber value="1.428 GWh" caption="produksi listrik per tahun" top={480} local={local} />
      )}
      {scene === 12 && <SourceLine />}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami 58.248s, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/plta-listrik/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video 58.25s — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene */}
      {[0, 97, 243, 388, 518, 647, 776, 906, 1035, 1165, 1294, 1456, 1618].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15s (5 frame) saat BigNumber "1.008 MW" muncul — scene 10, frame 1294 */}
      <Sequence from={1294} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
