import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ================= KeretaBelokExplainer =================
// "Kenapa Kereta Api Nggak Punya Setir tapi Bisa Belok?"
// 1593 frame = 53.1 detik @ 30fps, 1080x1920, 9 scene (VO 53.08 detik).
// Perbaikan dari kritik video sebelumnya:
// - TANPA header band / kotak gelap. Judul + subtitle MELAYANG bebas,
//   text-shadow hitam tebal, tanpa background gelap.
// - Detail 3D lengkap (bukan kotak polos): bodi + kaca + lampu + roda
//   kerucut + rel + bantalan + tiang listrik + lanskap.
// - Kamera dinamis tiap ~6 detik. Fisika benar: geometri kerucut yang
//   menyetir, flens cuma pengaman (celah 10-15 mm, tidak menyentuh rel).
// - Audio: VO Sami + BGM chill (loop, 15%) + whoosh di tiap cut
//   + chirp di angka besar scene 7 ("1:20" + "10-15 mm").

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
const TRAIN_CREAM = "#F2EDE0";
const TRAIN_BLUE = "#5B7A99";
const TRAIN_BLUE_DARK = "#3A5A78";
const GLASS = "#3A5A78";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const TRUNK = "#8A6B4F";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Jalur rel (lurus + tikungan kanan 70 derajat) =================
const RAIL_TOP = 0.57;
const STRAIGHT_LEN = 60;
const ARC_R = 38;
const ARC_ANGLE = (70 * Math.PI) / 180;
const ARC_LEN = ARC_ANGLE * ARC_R;
const FINAL_LEN = 40;
const PATH_LEN = STRAIGHT_LEN + ARC_LEN + FINAL_LEN;

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// Deterministik (bukan Math.random): hash dari indeks.
function pseudo(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type PathPoint = { x: number; z: number; tx: number; tz: number };

function pathPoint(s: number): PathPoint {
  const sc = Math.max(0, Math.min(PATH_LEN, s));
  if (sc < STRAIGHT_LEN) {
    return { x: 0, z: 40 - sc, tx: 0, tz: -1 };
  }
  if (sc < STRAIGHT_LEN + ARC_LEN) {
    const a = sc - STRAIGHT_LEN;
    const theta = Math.PI + a / ARC_R;
    return {
      x: ARC_R + ARC_R * Math.cos(theta),
      z: -20 + ARC_R * Math.sin(theta),
      tx: -Math.sin(theta),
      tz: Math.cos(theta),
    };
  }
  const d = sc - STRAIGHT_LEN - ARC_LEN;
  const thetaEnd = Math.PI + ARC_LEN / ARC_R;
  const ex = ARC_R + ARC_R * Math.cos(thetaEnd);
  const ez = -20 + ARC_R * Math.sin(thetaEnd);
  const etx = -Math.sin(thetaEnd);
  const etz = Math.cos(thetaEnd);
  return { x: ex + etx * d, z: ez + etz * d, tx: etx, tz: etz };
}

// Titik di jalur: lat > 0 = kiri (luar tikungan), y = tinggi absolut.
function trackPoint(s: number, lat: number, y: number): THREE.Vector3 {
  const p = pathPoint(s);
  return new THREE.Vector3(p.x + lat * p.tz, y, p.z - lat * p.tx);
}

type TrackFrame = {
  pos: THREE.Vector3;
  X: THREE.Vector3;
  Y: THREE.Vector3;
  Z: THREE.Vector3;
  quat: THREE.Quaternion;
};

// Basis: X = lateral kiri, Y = tegak, Z = tangen arah jalan.
function trackFrame(s: number): TrackFrame {
  const p = pathPoint(s);
  const Z = new THREE.Vector3(p.tx, 0, p.tz).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const X = new THREE.Vector3().crossVectors(up, Z).normalize();
  const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
  const pos = new THREE.Vector3(p.x, RAIL_TOP, p.z);
  const quat = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(X, Y, Z)
  );
  return { pos, X, Y, Z, quat };
}

// Pergeseran poros ke luar tikungan (0 -> 0.35 saat masuk tikungan).
function axleShift(s: number): number {
  const up = smoothstep((s - 58) / 12);
  const down = 1 - smoothstep((s - 110) / 15);
  return 0.35 * up * down;
}

// ================= Geometri ribbon (balas + rel) =================
function buildStripGeometry(
  getPair: (s: number) => [THREE.Vector3, THREE.Vector3],
  winding: "up" | "left" | "right"
): THREE.BufferGeometry {
  const step = 1;
  const n = Math.ceil(PATH_LEN / step);
  const positions: number[] = [];
  const indices: number[] = [];
  const base = 0;
  for (let i = 0; i <= n; i++) {
    const s = Math.min(PATH_LEN, i * step);
    const [a, b] = getPair(s);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  for (let i = 0; i < n; i++) {
    const r0 = base + i * 2;
    const r1 = base + (i + 1) * 2;
    if (winding === "up" || winding === "right") {
      indices.push(r0, r0 + 1, r1, r0 + 1, r1 + 1, r1);
    } else {
      indices.push(r0, r1, r0 + 1, r1, r1 + 1, r0 + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Gabung manual: offset posisi + indeks.
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += (g.getAttribute("position") as THREE.BufferAttribute).count;
    iCount += (g.getIndex() as THREE.BufferAttribute).count;
  }
  const positions = new Float32Array(vCount * 3);
  const normals = new Float32Array(vCount * 3);
  const indices = new Uint32Array(iCount);
  let vOff = 0;
  let iOff = 0;
  for (const g of geos) {
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const nor = g.getAttribute("normal") as THREE.BufferAttribute;
    const idx = g.getIndex() as THREE.BufferAttribute;
    positions.set(pos.array as Float32Array, vOff * 3);
    normals.set(nor.array as Float32Array, vOff * 3);
    for (let k = 0; k < idx.count; k++) {
      indices[iOff + k] = idx.getX(k) + vOff;
    }
    vOff += pos.count;
    iOff += idx.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  return out;
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

// ================= Roda kerucut + flens =================
const Wheel: React.FC<{ side: number; spin: number }> = ({ side, spin }) => (
  <group position={[side * 0.75, 0.55, 0]} rotation={[spin, 0, 0]}>
    {/* tapak kerucut: ujung besar di dalam (dekat flens), kecil di luar */}
    <mesh rotation={[0, 0, (side * Math.PI) / 2]}>
      <cylinderGeometry args={[0.55, 0.46, 0.34, 24]} />
      <meshStandardMaterial color={ORANGE} roughness={0.7} />
    </mesh>
    {/* flens: piringan tipis di sisi dalam, celah dari rel */}
    <mesh position={[-side * 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.66, 0.66, 0.09, 24]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.5} />
    </mesh>
  </group>
);

const Bogie: React.FC<{ z: number; shift: number; spin: number }> = ({
  z,
  shift,
  spin,
}) => (
  <group position={[0, 0, z]}>
    {/* rangka bogie */}
    <mesh position={[0, 0.95, 0]}>
      <boxGeometry args={[1.7, 0.3, 2.6]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.8} />
    </mesh>
    {/* 2 poros roda (bergeser lateral saat tikungan, bodi tetap di tengah) */}
    {[0.85, -0.85].map((az) => (
      <group key={az} position={[shift, 0, az]}>
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

// ================= Gerbong kereta (lokomotif + 1 gerbong penumpang) =================
const TrainCar: React.FC<{
  s: number;
  shift: number;
  spin: number;
  isLoco: boolean;
}> = ({ s, shift, spin, isLoco }) => {
  const f = trackFrame(s);
  return (
    <group position={f.pos} quaternion={f.quat}>
      {/* bodi utama krem */}
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[2.3, 1.5, 5.0]} />
        <meshStandardMaterial color={TRAIN_CREAM} roughness={0.8} />
      </mesh>
      {/* garis biru-abu di sisi bodi */}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[2.34, 0.35, 5.02]} />
        <meshStandardMaterial color={TRAIN_BLUE} roughness={0.8} />
      </mesh>
      {/* atap */}
      <mesh position={[0, 2.75, 0]}>
        <boxGeometry args={[2.1, 0.25, 4.6]} />
        <meshStandardMaterial color={TRAIN_BLUE_DARK} roughness={0.8} />
      </mesh>
      {/* kaca depan (lokomotif) / jendela (gerbong) */}
      {isLoco ? (
        <>
          <mesh position={[0, 2.15, 2.52]}>
            <boxGeometry args={[1.9, 0.7, 0.1]} />
            <meshStandardMaterial color={GLASS} roughness={0.25} />
          </mesh>
          {/* lampu depan */}
          <mesh position={[0.7, 1.35, 2.53]}>
            <boxGeometry args={[0.3, 0.3, 0.08]} />
            <meshStandardMaterial color="#FFF8DC" roughness={0.3} />
          </mesh>
          <mesh position={[-0.7, 1.35, 2.53]}>
            <boxGeometry args={[0.3, 0.3, 0.08]} />
            <meshStandardMaterial color="#FFF8DC" roughness={0.3} />
          </mesh>
        </>
      ) : (
        <>
          {[1.6, 0.55, -0.55, -1.6].map((wz) => (
            <group key={wz}>
              <mesh position={[1.16, 2.15, wz]}>
                <boxGeometry args={[0.04, 0.65, 0.85]} />
                <meshStandardMaterial color={GLASS} roughness={0.25} />
              </mesh>
              <mesh position={[-1.16, 2.15, wz]}>
                <boxGeometry args={[0.04, 0.65, 0.85]} />
                <meshStandardMaterial color={GLASS} roughness={0.25} />
              </mesh>
            </group>
          ))}
        </>
      )}
      {/* bayangan kontak lembut di atas balas */}
      <mesh
        position={[0, -0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.3, 2.9, 1]}
      >
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial
          color="#000000"
          transparent
          opacity={0.18}
          roughness={1}
        />
      </mesh>
      <Bogie z={1.6} shift={shift} spin={spin} />
      <Bogie z={-1.6} shift={shift} spin={spin} />
    </group>
  );
};

// ================= Elemen statis: pohon, tiang listrik, bukit, awan =================
const TREE_S = [6, 14, 22, 30, 40, 50, 58, 68, 78, 88, 98, 108, 118, 128];
const POLE_S = [10, 30, 50, 70, 90, 110, 130];

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

// ================= Scene 3D =================
const Scene: React.FC<{ trainS: number }> = ({ trainS }) => {
  const shift = axleShift(trainS);
  const spin = trainS / 0.5;

  const ballastGeo = useMemo(
    () =>
      mergeGeometries([
        buildStripGeometry(
          (s) => [trackPoint(s, 2.25, 0.25), trackPoint(s, -2.25, 0.25)],
          "up"
        ),
        buildStripGeometry(
          (s) => [trackPoint(s, 2.25, 0.25), trackPoint(s, 2.25, 0)],
          "left"
        ),
        buildStripGeometry(
          (s) => [trackPoint(s, -2.25, 0.25), trackPoint(s, -2.25, 0)],
          "right"
        ),
      ]),
    []
  );

  const railGeo = useMemo(
    () =>
      mergeGeometries(
        [0.75, -0.75].flatMap((o) => [
          buildStripGeometry(
            (s) => [trackPoint(s, o + 0.08, RAIL_TOP), trackPoint(s, o - 0.08, RAIL_TOP)],
            "up"
          ),
          buildStripGeometry(
            (s) => [trackPoint(s, o + 0.08, RAIL_TOP), trackPoint(s, o + 0.08, 0.32)],
            "left"
          ),
          buildStripGeometry(
            (s) => [trackPoint(s, o - 0.08, RAIL_TOP), trackPoint(s, o - 0.08, 0.32)],
            "right"
          ),
        ])
      ),
    []
  );

  const sleepers = useMemo(() => {
    const arr: { pos: [number, number, number]; rotY: number }[] = [];
    for (let s = 1; s < PATH_LEN; s += 1.4) {
      const p = pathPoint(s);
      arr.push({
        pos: [p.x, 0.34, p.z],
        rotY: Math.atan2(p.tx, p.tz),
      });
    }
    return arr;
  }, []);

  const trees = useMemo(
    () =>
      TREE_S.map((s, i) => {
        const lat = (i % 2 === 0 ? 1 : -1) * (6 + pseudo(i) * 6);
        const p = trackPoint(s, lat, 0);
        return {
          pos: [p.x, 0, p.z] as [number, number, number],
          scale: 0.85 + pseudo(i + 40) * 0.5,
        };
      }),
    []
  );

  const poles = useMemo(
    () =>
      POLE_S.map((s) => {
        const p = pathPoint(s);
        const pos = trackPoint(s, -4.2, 0);
        return { pos: [pos.x, 0, pos.z] as [number, number, number], rotY: Math.atan2(p.tx, p.tz) };
      }),
    []
  );

  return (
    <>
      <color attach="background" args={[SKY]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[30, 50, 20]} intensity={1.15} />
      {/* tanah hijau */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}>
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
      <mesh geometry={ballastGeo}>
        <meshStandardMaterial color={BALLAST} roughness={1} />
      </mesh>
      {/* bantalan rel */}
      {sleepers.map((sl, i) => (
        <mesh key={i} position={sl.pos} rotation={[0, sl.rotY, 0]}>
          <boxGeometry args={[2.6, 0.18, 0.55]} />
          <meshStandardMaterial color={SLEEPER} roughness={1} />
        </mesh>
      ))}
      {/* rel besi */}
      <mesh geometry={railGeo}>
        <meshStandardMaterial color={RAIL} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* tiang listrik */}
      {poles.map((pl, i) => (
        <group key={i} position={pl.pos} rotation={[0, pl.rotY, 0]}>
          <mesh position={[0, 3.25, 0]}>
            <boxGeometry args={[0.28, 6.5, 0.28]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
          </mesh>
          <mesh position={[0, 5.8, 0]}>
            <boxGeometry args={[2.4, 0.22, 0.22]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* pohon (bola + kerucut) */}
      {trees.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} />
      ))}
      {/* kereta: lokomotif + 1 gerbong */}
      <TrainCar s={trainS} shift={shift} spin={spin} isLoco />
      <TrainCar s={trainS - 7} shift={axleShift(trainS - 7)} spin={(trainS - 7) / 0.5} isLoco={false} />
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
      Kereta Nggak Punya Setir, Kok Bisa Belok?
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
      Rahasianya ada di bentuk rodanya.
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Kereta melaju 100 km/jam tanpa setir. Kok bisa belok?", highlight: "setir" },
  { text: "Rahasianya ada di bentuk rodanya.", highlight: "bentuk" },
  { text: "Roda kereta itu kerucut miring, bukan silinder.", highlight: "kerucut" },
  { text: "Porosnya geser ke luar saat masuk tikungan.", highlight: "geser" },
  { text: "Roda luar diameter besar, roda dalam diameter kecil.", highlight: "diameter" },
  { text: "Flens cuma pengaman darurat, nggak pernah nyentuh rel.", highlight: "pengaman" },
  { text: "Kemiringan satu banding dua puluh.", highlight: "puluh" },
  { text: "Yang nyetir kereta itu geometri, bukan setir.", highlight: "geometri" },
  { text: "Kereta paling cepat yang pernah lo naikin berapa km/jam?", highlight: "cepat" },
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

// Angka besar (scene 7): badge "1:20" + "10–15 mm".
const BigNumbers: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 520,
      left: 70,
      right: 70,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontFamily: FONT,
        fontSize: 120,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1,
        textShadow: SHADOW,
      }}
    >
      1:20
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 8,
        textShadow: SHADOW,
      }}
    >
      kemiringan roda kerucut
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 84,
        fontWeight: 800,
        color: "#FFFFFF",
        lineHeight: 1,
        marginTop: 40,
        textShadow: SHADOW,
      }}
    >
      10–15 mm
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 30,
        fontWeight: 800,
        color: "#FFFFFF",
        marginTop: 8,
        textShadow: SHADOW,
      }}
    >
      celah flens (pengaman)
    </div>
  </div>
);

// Diagram top-down (scene 5): dua lingkaran + jarak tempuh.
const DiameterDiagram: React.FC = () => (
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
        top: 300,
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
      Putaran sama, jarak tempuh beda
    </div>
    {/* lingkaran besar (roda luar) */}
    <div
      style={{
        position: "absolute",
        top: 560,
        left: 130,
        width: 300,
        height: 300,
        borderRadius: 150,
        border: "12px solid #FF7A00",
        backgroundColor: "rgba(255,255,255,0.25)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 880,
        left: 130,
        width: 300,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 36,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      Diameter BESAR
    </div>
    <div
      style={{
        position: "absolute",
        top: 930,
        left: 130,
        width: 300,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 28,
        fontWeight: 700,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      roda luar
    </div>
    {/* lingkaran kecil (roda dalam) */}
    <div
      style={{
        position: "absolute",
        top: 635,
        right: 160,
        width: 180,
        height: 180,
        borderRadius: 90,
        border: "10px solid #FF7A00",
        backgroundColor: "rgba(255,255,255,0.25)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 880,
        left: 680,
        width: 300,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 36,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      Diameter KECIL
    </div>
    <div
      style={{
        position: "absolute",
        top: 935,
        left: 680,
        width: 300,
        textAlign: "center",
        fontFamily: FONT,
        fontSize: 28,
        fontWeight: 700,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      roda dalam
    </div>
    {/* jarak tempuh */}
    <div
      style={{
        position: "absolute",
        top: 1120,
        left: 130,
        fontFamily: FONT,
        fontSize: 32,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      Jarak tempuh:
    </div>
    <div
      style={{
        position: "absolute",
        top: 1180,
        left: 130,
        width: 560,
        height: 36,
        borderRadius: 18,
        backgroundColor: ORANGE,
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 1176,
        left: 710,
        fontFamily: FONT,
        fontSize: 32,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      lebih jauh
    </div>
    <div
      style={{
        position: "absolute",
        top: 1260,
        left: 130,
        width: 320,
        height: 36,
        borderRadius: 18,
        backgroundColor: ORANGE,
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 1256,
        left: 470,
        fontFamily: FONT,
        fontSize: 32,
        fontWeight: 800,
        color: "#FFFFFF",
        textShadow: SHADOW,
      }}
    >
      lebih dekat
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
    Sumber: Fisika Mekanika / Teknik Perkeretaapian
  </div>
);

// Watermark teks melayang (tanpa latar gelap, pojok kanan atas supaya
// tidak tertutup tombol/caption Instagram di kanan bawah).
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
const SCENE_BOUNDS = [0, 165, 330, 494, 659, 824, 989, 1154, 1318, 1593];
const S_RANGES: [number, number][] = [
  [5, 35],
  [35, 55],
  [52, 56],
  [56, 64],
  [64, 66],
  [64, 68],
  [68, 92],
  [92, 112],
  [112, 140],
];

export const KeretaBelokExplainer: React.FC = () => {
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

  const trainS = interpolate(local, [0, sceneLen - 1], S_RANGES[scene]);
  const shift = axleShift(trainS);

  const f = trackFrame(trainS);
  const T = f.Z;
  const X = f.X;
  const trainPos = f.pos;

  // Posisi roda depan kiri (luar tikungan) untuk close-up.
  const wheelF = trackFrame(trainS + 1.6);
  const wheelPos = wheelF.pos
    .clone()
    .addScaledVector(wheelF.X, 0.75 + shift)
    .add(new THREE.Vector3(0, 0.55, 0));
  const wheelsetPos = wheelF.pos
    .clone()
    .addScaledVector(wheelF.X, shift)
    .add(new THREE.Vector3(0, 0.55, 0));

  let camPos: THREE.Vector3;
  let camTarget: THREE.Vector3;
  if (scene === 0) {
    // S1 HOOK: follow shot belakang + sedikit di atas, dolly-forward
    // (jarak dijauhkan supaya bogie belakang tidak terpotong tepi bawah)
    const dist = interpolate(local, [0, 164], [17, 14]);
    const height = interpolate(local, [0, 164], [6, 5]);
    camPos = trainPos.clone().addScaledVector(T, -dist).add(new THREE.Vector3(0, height, 0));
    camTarget = trainPos.clone().addScaledVector(T, 10);
  } else if (scene === 1) {
    // S2 PROBLEM: side-tracking dari sisi luar, kereta masuk tikungan
    camPos = trainPos
      .clone()
      .addScaledVector(X, 16)
      .addScaledVector(T, -5)
      .add(new THREE.Vector3(0, 3.5, 0));
    camTarget = trainPos.clone().addScaledVector(T, 4);
  } else if (scene === 2) {
    // S3 ZOOM RODA: close-up roda kerucut, sudut 3/4 dari depan supaya
    // permukaan kerucut (taper) terbaca, bukan cuma lingkaran dari samping
    const dist = interpolate(local, [0, 163], [4.0, 3.4]);
    camPos = wheelPos
      .clone()
      .addScaledVector(X, dist)
      .addScaledVector(T, 3.5)
      .add(new THREE.Vector3(0, 1.3, 0));
    camTarget = wheelPos.clone().addScaledVector(T, -2.0);
  } else if (scene === 3) {
    // S4 MEKANISME: close-up wheelset depan-3/4, poros geser terlihat
    const dist = interpolate(local, [0, 164], [5, 4]);
    camPos = wheelsetPos
      .clone()
      .addScaledVector(X, dist)
      .addScaledVector(T, 4)
      .add(new THREE.Vector3(0, 1.6, 0));
    camTarget = wheelsetPos.clone().addScaledVector(X, 0.3);
  } else if (scene === 4) {
    // S5 DIAGRAM: tidak pakai kamera 3D (diagram DOM)
    camPos = trainPos.clone();
    camTarget = trainPos.clone();
  } else if (scene === 5) {
    // S6 FLENS: close-up flens + celah — cukup jauh supaya roda, rel,
    // dan flens terbaca dengan konteks (jangan terlalu dekat)
    camPos = wheelPos
      .clone()
      .addScaledVector(X, 4.5)
      .addScaledVector(T, 3.5)
      .add(new THREE.Vector3(0, 1.8, 0));
    camTarget = wheelPos.clone().add(new THREE.Vector3(0, -0.1, 0));
  } else if (scene === 6) {
    // S7 ANGKA: follow shot, sedikit lebih tinggi
    camPos = trainPos.clone().addScaledVector(T, -14).add(new THREE.Vector3(0, 6, 0));
    camTarget = trainPos.clone().addScaledVector(T, 8);
  } else if (scene === 7) {
    // S8 SELF-STEERING: side-tracking di tikungan, drift halus
    const sideDist = interpolate(local, [0, 163], [18, 15]);
    camPos = trainPos
      .clone()
      .addScaledVector(X, sideDist)
      .addScaledVector(T, -3)
      .add(new THREE.Vector3(0, 4, 0));
    camTarget = trainPos.clone().addScaledVector(T, 5);
  } else {
    // S9 CLOSE: pull-back sedang, kereta tetap besar di frame
    const height = interpolate(local, [0, 274], [10, 16]);
    const pull = interpolate(local, [0, 274], [1, 1.3]);
    camPos = trainPos
      .clone()
      .addScaledVector(T, -11 * pull)
      .addScaledVector(X, 5 * pull)
      .add(new THREE.Vector3(0, height, 0));
    camTarget = trainPos.clone().addScaledVector(T, -4);
  }

  const camPosArr: [number, number, number] = [camPos.x, camPos.y, camPos.z];
  const camTargetArr: [number, number, number] = [
    camTarget.x,
    camTarget.y,
    camTarget.z,
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      {/* ============ AUDIO (deterministik) ============ */}
      {/* VO Sami, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/kereta-belok/vo_sami.mp3")} volume={1} />
      {/* BGM chill, loop sepanjang video, volume 15% */}
      <Audio
        src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")}
        volume={0.15}
        loop
      />
      {/* Whoosh di tiap pergantian scene (hard cut) */}
      {[165, 330, 494, 659, 824, 989, 1154, 1318].map((cutFrame) => (
        <Sequence key={cutFrame} from={cutFrame}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp saat angka besar muncul (scene 7: "1:20" + "10-15 mm") */}
      <Sequence from={989}>
        <Audio
          src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")}
          volume={0.6}
        />
      </Sequence>
      {scene === 4 ? (
        <DiameterDiagram />
      ) : (
        <ThreeCanvas
          width={1080}
          height={1920}
          camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
        >
          <Scene trainS={trainS} />
          <CameraRig position={camPosArr} target={camTargetArr} />
        </ThreeCanvas>
      )}
      {scene === 0 && <Headline />}
      <Subtitle scene={scene} local={local} />
      {scene === 2 && <HairlineLabel top={680} right={90} text="Roda kerucut 1:20" />}
      {scene === 3 && (
        <>
          <HairlineLabel top={700} left={90} text="Diameter besar" />
          <HairlineLabel top={1080} left={90} text="Diameter kecil" />
        </>
      )}
      {scene === 5 && <HairlineLabel top={950} right={250} text="Flens (pengaman)" />}
      {scene === 6 && <BigNumbers />}
      {scene === 8 && <SourceLine />}
      <WatermarkText />
    </AbsoluteFill>
  );
};
