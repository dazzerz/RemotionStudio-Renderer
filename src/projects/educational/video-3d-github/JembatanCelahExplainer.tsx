import { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= Palette (terang, siang cerah / malam biru dingin) =================
const SKY_DAY = "#BFE3F2";
const SKY_NIGHT = "#7FA3C8";
const CREAM = "#F5EFE0";
const GREEN = "#8FBF7A";
const GREEN_DARK = "#6FA85E";
const GREEN_LIGHT = "#A8D095";
const CONCRETE = "#B8B8B0";
const CONCRETE_DARK = "#9A9A92";
const ASPHALT = "#6E6E6E";
const STEEL = "#9AA0A6";
const STEEL_DARK = "#6E7378";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const GLASS = "#7A9AB0";
const TIRE = "#2E2E2E";
const HUB = "#C8C8C8";
const WATER = "#5E9CC4";
const WATER_LIGHT = "#8FC3E8";
const TRUNK = "#8A6B4A";
const RED = "#E02020";
const HEADLIGHT = "#FFF6C8";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85), 0 2px 6px rgba(0,0,0,0.7)";

const DECK_TOP = 2.0;
const TOOTH_LEN = 3;
const TEETH_A = [-4, -2, 0, 2, 4]; // gigi pelat approach (arah -z)
const TEETH_B = [-3, -1, 1, 3]; // gigi pelat far (arah +z), selang-seling

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

// ================= Mobil mainan (hero, kaca biru-abu, lampu, bayangan jelas) =================
const WHEEL_POS: [number, number][] = [
  [0.98, 1.15],
  [-0.98, 1.15],
  [0.98, -1.15],
  [-0.98, -1.15],
];

const Car: React.FC<{ z: number }> = ({ z }) => (
  <group position={[0, DECK_TOP, z]}>
    {/* bodi oranye */}
    <mesh position={[0, 0.75, 0]}>
      <boxGeometry args={[2.0, 0.7, 3.6]} />
      <meshStandardMaterial color={ORANGE} roughness={0.7} />
    </mesh>
    {/* bumper depan */}
    <mesh position={[0, 0.45, -1.82]}>
      <boxGeometry args={[1.9, 0.3, 0.12]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.6} />
    </mesh>
    {/* kabin kaca biru-abu (bukan hitam pekat) */}
    <mesh position={[0, 1.32, -0.2]}>
      <boxGeometry args={[1.7, 0.55, 1.8]} />
      <meshStandardMaterial color={GLASS} roughness={0.25} metalness={0.15} />
    </mesh>
    {/* kaca depan (strip lebih terang) */}
    <mesh position={[0, 1.3, -1.12]}>
      <boxGeometry args={[1.5, 0.45, 0.08]} />
      <meshStandardMaterial color="#A8C4D4" roughness={0.2} metalness={0.1} />
    </mesh>
    {/* spion */}
    {[-1.06, 1.06].map((x) => (
      <mesh key={x} position={[x, 1.15, 0.55]}>
        <boxGeometry args={[0.12, 0.18, 0.3]} />
        <meshStandardMaterial color={ORANGE} roughness={0.7} />
      </mesh>
    ))}
    {/* lampu depan putih-kuning */}
    {[-0.65, 0.65].map((x) => (
      <mesh key={x} position={[x, 0.82, -1.82]}>
        <boxGeometry args={[0.36, 0.18, 0.08]} />
        <meshStandardMaterial
          color={HEADLIGHT}
          roughness={0.3}
          emissive={HEADLIGHT}
          emissiveIntensity={0.35}
        />
      </mesh>
    ))}
    {/* lampu belakang merah */}
    {[-0.65, 0.65].map((x) => (
      <mesh key={x} position={[x, 0.82, 1.82]}>
        <boxGeometry args={[0.36, 0.18, 0.08]} />
        <meshStandardMaterial color={RED} roughness={0.3} emissive={RED} emissiveIntensity={0.3} />
      </mesh>
    ))}
    {/* 4 roda + velg terang */}
    {WHEEL_POS.map(([x, zz], i) => (
      <group key={i}>
        <mesh position={[x, 0.38, zz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.32, 20]} />
          <meshStandardMaterial color={TIRE} roughness={0.9} />
        </mesh>
        <mesh position={[x + (x > 0 ? 0.17 : -0.17), 0.38, zz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.34, 16]} />
          <meshStandardMaterial color={HUB} roughness={0.4} metalness={0.4} />
        </mesh>
      </group>
    ))}
    {/* bayangan kontak jelas (elips datar) */}
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 2.0, 1]}>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color="#000000" transparent opacity={0.22} roughness={1} />
    </mesh>
  </group>
);

// ================= Segmen dek jembatan (pelat + jalan + marka + railing + gigi) =================
const DeckSpan: React.FC<{
  len: number;
  dir: 1 | -1;
  teeth: number[];
  toothDir: 1 | -1;
}> = ({ len, dir, teeth, toothDir }) => {
  const dashes = useMemo(() => {
    const out: number[] = [];
    for (let z = 4; z < len - 1; z += 5) out.push(z);
    return out;
  }, [len]);
  const posts = useMemo(() => {
    const out: number[] = [];
    for (let z = 2; z < len - 1; z += 5) out.push(z);
    return out;
  }, [len]);

  return (
    <group>
      {/* pelat beton */}
      <mesh position={[0, 1.6, (dir * len) / 2]}>
        <boxGeometry args={[10, 0.8, len]} />
        <meshStandardMaterial color={CONCRETE} roughness={0.95} />
      </mesh>
      {/* permukaan jalan aspal */}
      <mesh position={[0, 2.03, (dir * len) / 2]}>
        <boxGeometry args={[8, 0.06, len]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.95} />
      </mesh>
      {/* marka tengah putus-putus */}
      {dashes.map((z) => (
        <mesh key={z} position={[0, 2.07, dir * z]}>
          <boxGeometry args={[0.18, 0.02, 2.2]} />
          <meshStandardMaterial color="#F5F5F5" roughness={0.8} />
        </mesh>
      ))}
      {/* garis tepi kuning */}
      {[-3.9, 3.9].map((x) => (
        <mesh key={x} position={[x, 2.07, (dir * len) / 2]}>
          <boxGeometry args={[0.14, 0.02, len]} />
          <meshStandardMaterial color="#F5E6A8" roughness={0.8} />
        </mesh>
      ))}
      {/* railing (tiang + 2 rel) */}
      {[-4.8, 4.8].map((x) => (
        <group key={x}>
          {posts.map((z) => (
            <mesh key={z} position={[x, 2.55, dir * z]}>
              <boxGeometry args={[0.15, 1.1, 0.15]} />
              <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
            </mesh>
          ))}
          <mesh position={[x, 3.1, (dir * len) / 2]}>
            <boxGeometry args={[0.14, 0.14, len]} />
            <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[x, 2.6, (dir * len) / 2]}>
            <boxGeometry args={[0.1, 0.1, len]} />
            <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {/* gigi besi bergerigi (finger joint), saling mengunci dengan sisi seberang */}
      {teeth.map((x) => (
        <mesh key={x} position={[x, 2.06, (toothDir * TOOTH_LEN) / 2]}>
          <boxGeometry args={[0.8, 0.12, TOOTH_LEN]} />
          <meshStandardMaterial color={STEEL} roughness={0.35} metalness={0.55} />
        </mesh>
      ))}
    </group>
  );
};

// ================= Retakan (garis zigzag dari kotak tipis gelap) =================
const CrackLine: React.FC<{
  points: [number, number][];
  width?: number;
  y?: number;
}> = ({ points, width = 0.12, y = 2.04 }) => {
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, z1] = points[i];
    const [x2, z2] = points[i + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    segs.push(
      <mesh
        key={i}
        position={[(x1 + x2) / 2, y, (z1 + z2) / 2]}
        rotation={[0, angle, 0]}
      >
        <boxGeometry args={[width, 0.03, len + 0.12]} />
        <meshStandardMaterial color="#232323" roughness={1} />
      </mesh>
    );
  }
  return <>{segs}</>;
};

// Retak kecil (scene 2, di dek approach dekat celah) — koordinat lokal grup approach
const CRACK_SMALL: [number, number][] = [
  [0.6, 6.6],
  [-0.4, 5.6],
  [0.9, 4.6],
  [-0.2, 3.6],
  [0.7, 2.6],
  [0, 1.6],
];

// Retak besar (scene 8, tanpa celah) — melintang penuh lebar dek
const CRACK_BIG: [number, number][] = [
  [-4.6, 2.6],
  [-2.6, 1.2],
  [-1.0, 2.3],
  [0.6, 0.8],
  [2.1, 1.9],
  [3.6, 0.5],
  [4.8, 1.6],
];
const CRACK_BIG_BRANCH: [number, number][] = [
  [0.6, 0.8],
  [1.4, -0.6],
  [0.4, -1.8],
  [1.6, -3.0],
];

// ================= Lingkungan (sungai, tanah, pohon, bukit, awan, matahari/bulan) =================
const WAVE_STRIPS: [number, number][] = [
  [-30, -12],
  [-12, 8],
  [8, -6],
  [24, 12],
  [-38, 4],
  [38, -14],
  [-6, -16],
  [16, 16],
];

const TREES: [number, number][] = [
  [-18, 32],
  [20, 28],
  [-24, -12],
  [22, -18],
  [-16, -45],
  [18, -48],
  [-28, 8],
  [26, 45],
  [-32, -32],
  [30, 8],
];

const CLOUDS: { pos: [number, number, number]; s: number }[] = [
  { pos: [-48, 26, -70], s: 0.9 },
  { pos: [42, 28, -55], s: 1.1 },
  { pos: [-22, 24, -95], s: 0.8 },
  { pos: [58, 26, -75], s: 0.9 },
];

const Cloud: React.FC<{ position: [number, number, number]; scale: number }> = ({
  position,
  scale,
}) => (
  <group position={position} scale={[scale, scale, scale]}>
    <mesh position={[0, 0, 0]} scale={[1, 0.45, 1]}>
      <sphereGeometry args={[6, 20, 16]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.9} emissive="#FFFFFF" emissiveIntensity={0.25} />
    </mesh>
    <mesh position={[5, 0.5, 0]} scale={[1, 0.45, 1]}>
      <sphereGeometry args={[4.5, 20, 16]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.9} emissive="#FFFFFF" emissiveIntensity={0.25} />
    </mesh>
    <mesh position={[-5, 0.5, 0]} scale={[1, 0.45, 1]}>
      <sphereGeometry args={[4, 20, 16]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.9} emissive="#FFFFFF" emissiveIntensity={0.25} />
    </mesh>
  </group>
);

const Environment: React.FC<{ night: boolean }> = ({ night }) => (
  <>
    {/* tanah hijau */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={GREEN} roughness={1} />
    </mesh>
    {/* sungai (kanal melintang sumbu X, di bawah jembatan) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <planeGeometry args={[260, 44]} />
      <meshStandardMaterial color={WATER} roughness={0.55} />
    </mesh>
    {/* riak air */}
    {WAVE_STRIPS.map(([x, z], i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.09, z]}>
        <planeGeometry args={[9, 0.7]} />
        <meshStandardMaterial color={WATER_LIGHT} roughness={0.5} />
      </mesh>
    ))}
    {/* pohon di tepi sungai */}
    {TREES.map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.25, 0.35, 1.6, 8]} />
          <meshStandardMaterial color={TRUNK} roughness={1} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[1.6, 16, 12]} />
          <meshStandardMaterial color={GREEN_DARK} roughness={1} />
        </mesh>
        <mesh position={[0.9, 2.0, 0.3]}>
          <sphereGeometry args={[1.1, 16, 12]} />
          <meshStandardMaterial color={GREEN} roughness={1} />
        </mesh>
      </group>
    ))}
    {/* bukit 2 lapis, 2 nada hijau */}
    <mesh position={[-45, -3, -110]} scale={[1, 0.28, 1]}>
      <sphereGeometry args={[48, 24, 16]} />
      <meshStandardMaterial color={GREEN_DARK} roughness={1} />
    </mesh>
    <mesh position={[50, -4, -125]} scale={[1, 0.24, 1]}>
      <sphereGeometry args={[58, 24, 16]} />
      <meshStandardMaterial color={GREEN_LIGHT} roughness={1} />
    </mesh>
    {/* awan */}
    {CLOUDS.map((c, i) => (
      <Cloud key={i} position={c.pos} scale={c.s} />
    ))}
    {/* matahari terik (siang) / bulan (malam) */}
    {night ? (
      <>
        <mesh position={[-28, 38, -70]}>
          <sphereGeometry args={[2.6, 20, 16]} />
          <meshStandardMaterial color="#E8EEF5" roughness={0.6} emissive="#C8D8F0" emissiveIntensity={0.25} />
        </mesh>
        {[
          [-45, 42, -80],
          [-10, 44, -85],
          [20, 40, -75],
          [45, 44, -80],
        ].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.8} />
          </mesh>
        ))}
      </>
    ) : (
      <mesh position={[35, 42, -70]}>
        <sphereGeometry args={[3.2, 20, 16]} />
        <meshStandardMaterial color="#FFDF6B" roughness={0.5} emissive="#FFE9A8" emissiveIntensity={0.7} />
      </mesh>
    )}
  </>
);

// Tiang penyangga (tetap, tidak ikut geser dek)
const PILLARS_Z = [35, 15, -15, -35];
const Pillars: React.FC = () => (
  <>
    {PILLARS_Z.map((z) => (
      <group key={z} position={[0, 0, z]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[2.5, 1.2, 2.5]} />
          <meshStandardMaterial color={CONCRETE_DARK} roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.08, 0]}>
          <boxGeometry args={[4, 0.25, 4]} />
          <meshStandardMaterial color={CONCRETE} roughness={0.95} />
        </mesh>
      </group>
    ))}
  </>
);

// ================= Dek tanpa celah (scene 8, ilustrasi retak) =================
const NoJointDeck: React.FC = () => (
  <group>
    {/* pelat beton menerus, tanpa celah */}
    <mesh position={[0, 1.6, 0]}>
      <boxGeometry args={[10, 0.8, 80]} />
      <meshStandardMaterial color={CONCRETE} roughness={0.95} />
    </mesh>
    <mesh position={[0, 2.03, 0]}>
      <boxGeometry args={[8, 0.06, 80]} />
      <meshStandardMaterial color={ASPHALT} roughness={0.95} />
    </mesh>
    {/* marka */}
    {[-3.9, 3.9].map((x) => (
      <mesh key={x} position={[x, 2.07, 0]}>
        <boxGeometry args={[0.14, 0.02, 80]} />
        <meshStandardMaterial color="#F5E6A8" roughness={0.8} />
      </mesh>
    ))}
    {/* railing menerus */}
    {[-4.8, 4.8].map((x) => (
      <group key={x}>
        <mesh position={[x, 3.1, 0]}>
          <boxGeometry args={[0.14, 0.14, 80]} />
          <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[x, 2.6, 0]}>
          <boxGeometry args={[0.1, 0.1, 80]} />
          <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    ))}
    {/* RETAK BESAR melintang penuh lebar dek + cabang */}
    <CrackLine points={CRACK_BIG} width={0.3} y={2.07} />
    <CrackLine points={CRACK_BIG_BRANCH} width={0.18} y={2.07} />
  </group>
);

// ================= Scene 3D =================
const Scene: React.FC<{ shot: number; gap: number; carZ: number; night: boolean }> = ({
  shot,
  gap,
  carZ,
  night,
}) => (
  <>
    <color attach="background" args={[night ? SKY_NIGHT : SKY_DAY]} />
    <ambientLight intensity={night ? 0.8 : 0.9} color={night ? "#B8CCE0" : "#FFFFFF"} />
    <directionalLight
      position={night ? [-25, 40, -15] : [30, 55, 20]}
      intensity={night ? 0.75 : 1.15}
      color={night ? "#C8D8F0" : "#FFF5DC"}
    />
    <Environment night={night} />
    <Pillars />
    {shot === 7 ? (
      <NoJointDeck />
    ) : (
      <>
        {/* dek approach (z>0), ujung celah di z=+gap/2 */}
        <group position={[0, 0, gap / 2]}>
          <DeckSpan len={50} dir={1} teeth={TEETH_A} toothDir={-1} />
          {shot === 1 && <CrackLine points={CRACK_SMALL} width={0.12} y={2.04} />}
        </group>
        {/* dek far (z<0), ujung celah di z=-gap/2 */}
        <group position={[0, 0, -gap / 2]}>
          <DeckSpan len={70} dir={-1} teeth={TEETH_B} toothDir={1} />
        </group>
        <Car z={carZ} />
      </>
    )}
  </>
);

// ================= Lapisan teks (MELAYANG, tanpa kotak/kartu/header band) =================
const Headline: React.FC = () => (
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
        lineHeight: 1.25,
        textShadow: SHADOW,
      }}
    >
      Kenapa Jembatan Punya Celah Besi Bergerigi?
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 40,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1.25,
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      Tanpa celah ini, betonnya bisa retak.
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Kalau jembatan dicor tanpa celah, betonnya bisa retak patah.", highlight: "retak" },
  { text: "Beton memuai kalau panas, menyusut kalau dingin.", highlight: "memuai" },
  { text: "Jembatan 60 meter, naik 25 derajat, memanjang 15 milimeter.", highlight: "15" },
  { text: "Itu namanya expansion joint, celah besi bergerigi.", highlight: "expansion" },
  { text: "Gigi-giginya saling mengunci, tapi bisa bergeser.", highlight: "bergeser" },
  { text: "Siang terik, beton memuai, celahnya merapat.", highlight: "merapat" },
  { text: "Malam dingin, beton menyusut, celahnya melebar.", highlight: "melebar" },
  { text: "Tanpa celah, beton tak punya ruang memuai, akhirnya retak.", highlight: "retak" },
  { text: "Jembatan terpanjang yang pernah lo lewatin di mana?", highlight: "terpanjang" },
];

const Subtitle: React.FC<{ shot: number; local: number }> = ({ shot, local }) => {
  const { text, highlight } = SUBTITLES[shot];
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
        fontSize: 42,
        fontWeight: 800,
        lineHeight: 1.35,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      {words.map((w, i) => {
        const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
        const isMatch = clean === highlight || clean.startsWith(highlight);
        const opacity = interpolate(local, [i * 3, i * 3 + 8], [0, 1], {
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

// Angka besar melayang (tanpa kotak): "15 mm" dan "200 mm"
const BigBadge: React.FC<{ text: string; sub: string }> = ({ text, sub }) => (
  <div
    style={{
      position: "absolute",
      right: 70,
      top: 540,
      textAlign: "right",
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 110,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1,
        textShadow: "0 6px 20px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.7)",
      }}
    >
      {text}
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
      {sub}
    </div>
  </div>
);

// Label teknis hairline tipis (teks + garis 2px + titik jangkar)
const HairlineLabel: React.FC<{
  text: string;
  top: number;
  left: number;
  lineLen?: number;
}> = ({ text, top, left, lineLen = 90 }) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      display: "flex",
      alignItems: "center",
    }}
  >
    <span
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: "0 3px 10px rgba(0,0,0,0.9)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
    <div
      style={{
        width: lineLen,
        height: 2,
        backgroundColor: "#FFFFFF",
        marginLeft: 14,
        boxShadow: "0 2px 6px rgba(0,0,0,0.8)",
      }}
    />
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: "#FFFFFF",
        border: "2px solid rgba(0,0,0,0.6)",
        marginLeft: -2,
      }}
    />
  </div>
);

// Label data kecil melayang (scene angka)
const DataLabel: React.FC<{ text: string; top: number; left?: number; right?: number }> = ({
  text,
  top,
  left,
  right,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      right,
      fontFamily: FONT,
      fontSize: 34,
      fontWeight: 800,
      color: "#FFFFFF",
      textShadow: SHADOW,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

// Sumber di akhir (teks kecil melayang)
const SourceLine: React.FC = () => (
  <div
    style={{
      position: "absolute",
      bottom: 250,
      left: 70,
      right: 70,
      textAlign: "center",
      fontFamily: FONT,
      fontSize: 24,
      fontWeight: 700,
      color: "#FFFFFF",
      textShadow: "0 3px 10px rgba(0,0,0,0.9)",
    }}
  >
    Sumber: IRC SP 77:2008 / Teknik Sipil
  </div>
);

// ================= Durasi scene (total 1570 frame = 52.33 dtk, pas dengan VO 52.32 dtk) =================
// 9 scene: 4 x 175 frame + 5 x 174 frame = 1570 frame
const SCENE_START = [0, 175, 350, 525, 700, 874, 1048, 1222, 1396, 1570];
const SCENE_COUNT = 9;

// Frame pergantian scene (hard cut) -> whoosh; frame badge angka besar muncul -> chirp
const WHOOSH_FRAMES = [175, 350, 525, 700, 874, 1048, 1222, 1396];
const CHIRP_FRAMES = [350, 700]; // S3 "15 mm" (f350), S5 "200 mm" (f700)

function shotAndLocal(frame: number): { shot: number; local: number; len: number } {
  for (let s = 0; s < SCENE_COUNT; s++) {
    if (frame < SCENE_START[s + 1]) {
      return { shot: s, local: frame - SCENE_START[s], len: SCENE_START[s + 1] - SCENE_START[s] };
    }
  }
  return { shot: 8, local: frame - SCENE_START[8], len: SCENE_START[9] - SCENE_START[8] };
}

// ================= Logika per scene =================
function gapForShot(shot: number, local: number, len: number): number {
  if (shot === 4) {
    // S5 mekanisme: gigi bergeser (osilasi halus, deterministik)
    return 0.8 + 0.35 * Math.sin((local / len) * Math.PI * 2);
  }
  if (shot === 5) {
    // S6 siang: celah MERAPAT 0.9 -> 0.3
    return interpolate(local, [0, len - 1], [0.9, 0.3]);
  }
  if (shot === 6) {
    // S7 malam: celah MELEBAR 0.3 -> 1.4
    return interpolate(local, [0, len - 1], [0.3, 1.4]);
  }
  return 0.8;
}

function carZForShot(shot: number, local: number, len: number): number {
  if (shot === 0) return interpolate(local, [0, len - 1], [45, 32]);
  if (shot === 1) return 28;
  if (shot === 2) return 8; // angka: mobil dekat celah, utuh di frame top-down
  if (shot === 3) return 10;
  if (shot === 4) return interpolate(local, [0, len - 1], [6, -6]);
  if (shot === 5) return -12;
  if (shot === 6) return -16;
  if (shot === 7) return -30; // scene retak: mobil tidak terlihat
  return interpolate(local, [0, len - 1], [-30, -55]);
}

// ================= Komposisi utama =================
export const JembatanCelahExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { shot, local, len } = shotAndLocal(frame);
  const end = len - 1;

  const gap = gapForShot(shot, local, len);
  const carZ = carZForShot(shot, local, len);
  const night = shot === 6;

  // ---- Kamera per scene (ganti sudut tiap ~6 detik) ----
  let camPos: [number, number, number];
  let camTarget: [number, number, number];
  if (shot === 0) {
    // S1 HOOK: follow shot belakang mobil, dolly-forward
    camPos = [0, 7, carZ + 13];
    camTarget = [0, 2.5, carZ - 12];
  } else if (shot === 1) {
    // S2 PROBLEM: close-up retak kecil, slow push-in
    camPos = [
      interpolate(local, [0, end], [3.5, 2.2]),
      interpolate(local, [0, end], [4.2, 3.2]),
      interpolate(local, [0, end], [10, 7.5]),
    ];
    camTarget = [0, 2, 4];
  } else if (shot === 2) {
    // S3 ANGKA: high angle, slow drift
    camPos = [interpolate(local, [0, end], [-6, 6]), 32, 28];
    camTarget = [0, 2, 0];
  } else if (shot === 3) {
    // S4 JOINT INTRO: close-up gigi dari 3/4 atas (di atas railing), slow dolly-in
    camPos = [interpolate(local, [0, end], [7, 5]), 6, interpolate(local, [0, end], [8, 6])];
    camTarget = [0, 2, 0];
  } else if (shot === 4) {
    // S5 MEKANISME: 3/4 atas, tracking mobil melewati celah
    camPos = [11, 7, carZ + 3];
    camTarget = [0, 2, carZ];
  } else if (shot === 5) {
    // S6 SIANG: 3/4 atas, celah merapat
    camPos = [10, 7, interpolate(local, [0, end], [8, 6])];
    camTarget = [0, 2, 0];
  } else if (shot === 6) {
    // S7 MALAM: 3/4 atas sama (kontinuitas), celah melebar
    camPos = [10, 7, interpolate(local, [0, end], [8, 6])];
    camTarget = [0, 2, 0];
  } else if (shot === 7) {
    // S8 TANPA CELAH: close-up retak besar, slow push-in
    camPos = [
      interpolate(local, [0, end], [3.5, 2.5]),
      interpolate(local, [0, end], [3.8, 3.2]),
      interpolate(local, [0, end], [8, 6]),
    ];
    camTarget = [0, 2, 0];
  } else {
    // S9 CLOSE: kamera naik + pull-back, jembatan utuh
    camPos = [
      0,
      interpolate(local, [0, end], [12, 28]),
      interpolate(local, [0, end], [35, 55]),
    ];
    camTarget = [0, 2, -10];
  }

  return (
    <AbsoluteFill style={{ backgroundColor: night ? SKY_NIGHT : SKY_DAY }}>
      {/* ======== Audio ======== */}
      {/* VO Sami (52.32 dtk, mulai frame 0, tanpa potong/perlambat) */}
      <Audio src={staticFile("audio/jembatan-celah/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56 dtk — lebih panjang dari video, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5 dtk (15 frame) di tiap pergantian scene */}
      {WHOOSH_FRAMES.map((f) => (
        <Sequence key={`w${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15 dtk (5 frame) saat badge angka besar muncul */}
      {CHIRP_FRAMES.map((f) => (
        <Sequence key={`c${f}`} from={f} durationInFrames={5}>
          <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
        </Sequence>
      ))}

      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        <Scene shot={shot} gap={gap} carZ={carZ} night={night} />
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>

      {/* ======== Lapisan teks (melayang, tanpa kotak) ======== */}
      {shot === 0 && <Headline />}
      <Subtitle shot={shot} local={local} />

      {/* Angka besar */}
      {shot === 2 && <BigBadge text="15 mm" sub="jembatan 60 m memanjang" />}
      {shot === 4 && <BigBadge text="200 mm" sub="kapasitas satu celah" />}

      {/* Label data scene angka */}
      {shot === 2 && (
        <>
          <DataLabel text="60 m" top={420} left={90} />
          <DataLabel text="25°C" top={420} right={90} />
        </>
      )}

      {/* Label hairline teknis */}
      {shot === 3 && <HairlineLabel text="Expansion joint" top={640} left={70} lineLen={110} />}
      {shot === 4 && (
        <HairlineLabel text="Gigi saling mengunci" top={620} left={70} lineLen={90} />
      )}
      {shot === 5 && (
        <>
          <HairlineLabel text="Beton memuai" top={1300} left={70} lineLen={130} />
          <HairlineLabel text="Celah merapat" top={920} left={70} lineLen={100} />
        </>
      )}
      {shot === 6 && (
        <>
          <HairlineLabel text="Beton menyusut" top={1300} left={70} lineLen={130} />
          <HairlineLabel text="Celah melebar" top={920} left={70} lineLen={100} />
        </>
      )}

      {/* Sumber di akhir */}
      {shot === 8 && <SourceLine />}
    </AbsoluteFill>
  );
};
