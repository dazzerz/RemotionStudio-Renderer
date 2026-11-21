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

// ================= AirPamExplainer =================
// "Kenapa air PAM bisa naik ke lantai 10 tanpa pompa di rumah?"
// 1675 frame = 55.85 detik @ 30fps (DIKUNCI ke durasi VO Sami asli 55.848s
// via ffprobe), 1080x1920, 9 scene.
// Profil B toy-explainer. TANPA AUDIO di komposisi ini (VO belum ada;
// VO/BGM/SFX dipasang terpisah nanti).
//
// PERBAIKAN v2 (evaluasi v1 Bekasi — "kaku", air tidak terbaca sebagai air):
// 1. EASING di SEMUA gerakan kamera/objek (Easing.inOut/out/in) — nol
//    interpolate linear mentah untuk gerakan. Aliran air kontinu (dot
//    modulo) tetap kecepatan konstan karena itu fisika aliran, bukan
//    gerakan objek — plus pulse halus supaya tidak mati.
// 2. AIR BIRU DAN MENGALIR: waduk biru + riak mengembang + kilau
//    bergerak; pipa transparan berisi inti air biru + dot aliran terang
//    yang bergerak searah aliran; keran mengeluarkan aliran + tetesan
//    jatuh dengan percepatan (ease-in).
// 3. SECONDARY MOTION di tiap scene: awan hanyut, pohon bergoyang,
//    riak waduk, impeller pompa berputar, mobil lewat (roda berputar).
// 4. KAMERA BERGERAK DI DALAM SCENE (push-in / tracking / orbit kecil,
//    easeInOut), hero selalu utuh di frame.
// 5. Scene angka (lantai 10 / 30 m) dari sudut miring 3/4, BUKAN top-down.
// 6. Detail objek: menara air (tangki + kaki + pipa), gedung 10 lantai
//    (jendela per lantai, band amber lantai 10, pipa riser + keran),
//    keran, toren atap, jalan ber-marka.
// Angka bersumber: 10 m ≈ 1 bar (resmi — Affinity Water via howcome.id);
// 30 m (hitungan: 10 lantai x 3 m); 3 bar (hitungan: 30 m x 0,1 bar/m).

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const SKY_MORNING = "#F2D8A8";
const CREAM = "#F5EFE0";
const GREEN = "#A8C3A0";
const GREEN_DARK = "#8FAE8A";
const GREEN_LIGHT = "#B5CBA8";
const WATER_BLUE = "#2E86C1";
const WATER_SPARK = "#8FD8FF";
const STEEL_DARK = "#6B7280";
const GLASS = "#2E4A63";
const ORANGE = "#FF7A00";
const AMBER = "#FFB300";
const TRUNK = "#8A6B4F";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const CONCRETE = "#C9C4B8";
const ASPHALT = "#6B7280";
const TOWER_TANK = "#C9DCE8";
const ROOF_GREY = "#8A9199";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

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
        metalness={0.3}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 1.6 : 0}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
      />
    </mesh>
  );
};

// ================= Pipa transparan + inti air biru + dot aliran =================
// Dot bergerak searah aliran (A -> B) dengan loop modulo — aliran kontinu
// memang berkecepatan konstan; dot juga berdenyut halus (pulse) supaya hidup.
const PipeSegment: React.FC<{
  a: [number, number, number];
  b: [number, number, number];
  local: number;
  dots?: number;
  speed?: number;
  r?: number;
}> = ({ a, b, local, dots = 4, speed = 0.012, r = 0.4 }) => {
  const dotList = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < dots; i++) arr.push(i / dots);
    return arr;
  }, [dots]);
  const pos = (t: number): [number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  return (
    <group>
      {/* pipa luar transparan */}
      <Beam a={a} b={b} r={r} color="#DCEFFA" opacity={0.35} />
      {/* inti air biru */}
      <Beam a={a} b={b} r={r * 0.6} color={WATER_BLUE} />
      {/* dot aliran terang */}
      {dotList.map((d, i) => {
        const t = (local * speed + d) % 1;
        const p = pos(t);
        const pulse = 1 + Math.sin(local * 0.15 + i * 1.7) * 0.18;
        return (
          <mesh key={i} position={p} scale={[pulse, pulse, pulse]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial
              color={WATER_SPARK}
              emissive="#4FB8FF"
              emissiveIntensity={1.6}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ================= Keran + aliran air =================
// flow: off (tertutup) | strong (deras) | medium (sedang) | drip (menetes).
// Tetesan jatuh dengan percepatan gravitasi (ease-in), lalu memudar.
const Tap: React.FC<{
  position: [number, number, number];
  flow: "off" | "strong" | "medium" | "drip";
  local: number;
}> = ({ position, flow, local }) => {
  const [x, y, z] = position;
  const dropH = flow === "strong" ? 2.6 : flow === "medium" ? 1.8 : 1.2;
  const dropCount = flow === "strong" ? 4 : flow === "medium" ? 3 : 1;
  const dropSpeed = flow === "drip" ? 0.012 : 0.03;
  return (
    <group position={[x, y, z]}>
      {/* corong keran menghadap +z */}
      <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.7, 10]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* handle oranye */}
      <mesh position={[0, 0.24, 0.35]}>
        <boxGeometry args={[0.5, 0.1, 0.14]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} />
      </mesh>
      {/* aliran kontinu */}
      {flow !== "off" && flow !== "drip" && (
        <mesh position={[0, -dropH / 2 - 0.1, 0.72]}>
          <cylinderGeometry args={[0.1, 0.13, dropH, 8]} />
          <meshStandardMaterial color={WATER_BLUE} transparent opacity={0.85} />
        </mesh>
      )}
      {/* tetesan jatuh */}
      {flow !== "off" &&
        Array.from({ length: dropCount }).map((_, i) => {
          const phase = (local * dropSpeed + i / dropCount) % 1;
          const fall = interpolate(phase, [0, 1], [0, dropH], {
            easing: Easing.in(Easing.quad),
          });
          const op = interpolate(phase, [0, 0.85, 1], [0.9, 0.9, 0]);
          return (
            <mesh key={i} position={[0, -0.2 - fall, 0.72]}>
              <sphereGeometry args={[0.14, 10, 8]} />
              <meshStandardMaterial
                color={WATER_SPARK}
                emissive="#4FB8FF"
                emissiveIntensity={1.2}
                transparent
                opacity={op}
              />
            </mesh>
          );
        })}
    </group>
  );
};

// ================= Waduk (air biru + riak + kilau bergerak) =================
const Reservoir: React.FC<{ frame: number }> = ({ frame }) => (
  <group position={[26, 0, -44]}>
    {/* tepi hijau */}
    <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[14, 32]} />
      <meshStandardMaterial color={GREEN_DARK} roughness={1} />
    </mesh>
    {/* air biru */}
    <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[12, 32]} />
      <meshStandardMaterial color={WATER_BLUE} roughness={0.35} />
    </mesh>
    {/* riak mengembang (ease-out) */}
    {[0, 1, 2].map((i) => {
      const phase = (frame * 0.006 + i / 3) % 1;
      const r = interpolate(phase, [0, 1], [2.5, 9], {
        easing: Easing.out(Easing.quad),
      });
      const op = (1 - phase) * 0.5;
      return (
        <mesh key={i} position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.1, r - 0.3), r, 32]} />
          <meshStandardMaterial
            color="#BFE8FF"
            transparent
            opacity={op}
            roughness={0.4}
          />
        </mesh>
      );
    })}
    {/* kilau bergerak di permukaan */}
    {[0, 1].map((i) => {
      const t = (frame * 0.004 + i * 0.5) % 1;
      const x = interpolate(t, [0, 1], [-9, 9]);
      return (
        <mesh
          key={i}
          position={[x, 0.42, -3 + i * 6]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[6, 0.5]} />
          <meshStandardMaterial
            color="#BFE8FF"
            transparent
            opacity={0.6}
            roughness={0.3}
          />
        </mesh>
      );
    })}
  </group>
);

// ================= Instalasi pengolahan (3 tangki, di tepi waduk) =================
const Treatment: React.FC = () => (
  <group position={[14, 0, -33]}>
    {[0, 1, 2].map((i) => (
      <group key={i} position={[(i - 1) * 5, 0, 0]}>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[2, 2, 5, 20]} />
          <meshStandardMaterial color="#D8D2C4" roughness={0.9} />
        </mesh>
        {/* permukaan air biru di dalam tangki */}
        <mesh position={[0, 4.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.8, 20]} />
          <meshStandardMaterial color={WATER_BLUE} roughness={0.3} />
        </mesh>
        {/* atap kerucut */}
        <mesh position={[0, 5.4, 0]}>
          <coneGeometry args={[2.3, 1, 20]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
        </mesh>
      </group>
    ))}
  </group>
);

// ================= Rumah pompa + impeller berputar =================
const PumpHouse: React.FC<{ frame: number }> = ({ frame }) => (
  <group position={[-8, 0, -35]}>
    <mesh position={[0, 1.5, 0]}>
      <boxGeometry args={[4, 3, 4]} />
      <meshStandardMaterial color={CREAM} roughness={0.9} />
    </mesh>
    <mesh position={[0, 3.15, 0]}>
      <boxGeometry args={[4.5, 0.3, 4.5]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={1} />
    </mesh>
    {/* pintu menghadap jalan pipa */}
    <mesh position={[0, 1.1, 2.03]}>
      <boxGeometry args={[1.2, 2.2, 0.1]} />
      <meshStandardMaterial color={GLASS} roughness={0.7} />
    </mesh>
    {/* impeller berputar di dinding depan */}
    <group position={[1.2, 1.6, 2.1]} rotation={[0, 0, frame * 0.2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.15, 20]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.4} metalness={0.5} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * 2 * Math.PI) / 3) * 0.45,
            Math.sin((i * 2 * Math.PI) / 3) * 0.45,
            0.1,
          ]}
          rotation={[0, 0, (i * 2 * Math.PI) / 3]}
        >
          <boxGeometry args={[0.7, 0.18, 0.06]} />
          <meshStandardMaterial color={ORANGE} roughness={0.6} />
        </mesh>
      ))}
    </group>
  </group>
);

// ================= Menara air di bukit =================
const WaterTower: React.FC<{ local: number }> = ({ local }) => (
  <group position={[-26, 0, -38]}>
    {/* bukit */}
    <mesh position={[0, 0, 0]} scale={[1, 0.25, 1]}>
      <sphereGeometry args={[15, 24, 18]} />
      <meshStandardMaterial color={GREEN_DARK} roughness={1} />
    </mesh>
    {/* 4 kaki baja */}
    {[
      [-3.5, -3.5],
      [3.5, -3.5],
      [-3.5, 3.5],
      [3.5, 3.5],
    ].map(([lx, lz]) => (
      <mesh key={`${lx}-${lz}`} position={[lx, 16.5, lz]}>
        <boxGeometry args={[0.7, 27, 0.7]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
      </mesh>
    ))}
    {/* palang silang */}
    <Beam a={[-3.5, 10, -3.5]} b={[3.5, 10, 3.5]} r={0.15} color={STEEL_DARK} />
    <Beam a={[3.5, 10, -3.5]} b={[-3.5, 10, 3.5]} r={0.15} color={STEEL_DARK} />
    {/* tangki */}
    <mesh position={[0, 34, 0]}>
      <cylinderGeometry args={[5, 5, 8, 24]} />
      <meshStandardMaterial color={TOWER_TANK} roughness={0.8} />
    </mesh>
    {/* garis air biru di tangki */}
    <mesh position={[0, 31.5, 0]}>
      <cylinderGeometry args={[5.05, 5.05, 0.5, 24]} />
      <meshStandardMaterial color={WATER_BLUE} roughness={0.5} />
    </mesh>
    {/* atap kerucut */}
    <mesh position={[0, 39.2, 0]}>
      <coneGeometry args={[5.6, 2.6, 24]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
    </mesh>
    {/* pipa naik ke tangki (pompa -> tangki) */}
    <PipeSegment a={[0, 1, 0]} b={[0, 30, 0]} local={local} dots={4} speed={0.012} r={0.4} />
    {/* pipa turun dari tangki (sisi BARAT, menghadap kamera S2/S3) */}
    <PipeSegment a={[-5.5, 30, 0]} b={[-5.5, 1, 0]} local={local} dots={4} speed={0.012} r={0.4} />
  </group>
);

// ================= Gedung 10 lantai =================
// Pipa riser di muka depan (x=4.2, z=5.35), keran di lantai 3 / 6 / 10.
// Band amber di y=27.5 menandai lantai 10 (di antara jendela lantai 9 dan 10).
const Building: React.FC<{ local: number; scene: number }> = ({ local, scene }) => {
  const floors = Array.from({ length: 10 });
  return (
    <group>
      {/* badan gedung */}
      <mesh position={[0, 15, 0]}>
        <boxGeometry args={[10, 30, 10]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      {/* atap */}
      <mesh position={[0, 30.2, 0]}>
        <boxGeometry args={[10.6, 0.4, 10.6]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={1} />
      </mesh>
      {/* band oranye lantai 10 (oranye — beda dari teks amber di headline) */}
      <mesh position={[0, 27.5, 0]}>
        <boxGeometry args={[10.3, 1.1, 10.3]} />
        <meshStandardMaterial color={ORANGE} roughness={0.7} />
      </mesh>
      {/* jendela depan (+z), 3 per lantai — lantai dasar tanpa jendela (pintu) */}
      {floors.map((_, f) =>
        f === 0
          ? null
          : [-3, 0, 3].map((wx) => (
          <mesh key={`f${f}-${wx}`} position={[wx, 2 + f * 3, 5.03]}>
            <boxGeometry args={[1.7, 1.5, 0.08]} />
            <meshStandardMaterial color={GLASS} roughness={0.25} />
          </mesh>
        ))
      )}
      {/* jendela samping (+x dan -x), 2 per lantai */}
      {[1, -1].map((sx) =>
        floors.map((_, f) =>
          [-2.5, 2.5].map((wz) => (
            <mesh key={`s${sx}-${f}-${wz}`} position={[sx * 5.03, 2 + f * 3, wz]}>
              <boxGeometry args={[0.08, 1.5, 1.7]} />
              <meshStandardMaterial color={GLASS} roughness={0.25} />
            </mesh>
          ))
        )
      )}
      {/* pintu masuk */}
      <mesh position={[-2, 1.1, 5.03]}>
        <boxGeometry args={[2, 2.2, 0.1]} />
        <meshStandardMaterial color={GLASS} roughness={0.7} />
      </mesh>
      {/* pipa riser: air naik ke lantai 10 */}
      <PipeSegment
        a={[4.2, 1, 5.35]}
        b={[4.2, 29.5, 5.35]}
        local={local}
        dots={6}
        speed={0.01}
        r={0.35}
      />
      {/* keran lantai 3 / 6 / 10 */}
      <Tap
        position={[4.2, 9, 5.35]}
        flow={scene === 6 ? "strong" : "off"}
        local={local}
      />
      <Tap
        position={[4.2, 18, 5.35]}
        flow={scene === 6 ? "medium" : "off"}
        local={local}
      />
      <Tap
        position={[4.2, 28.5, 5.35]}
        flow={scene === 5 ? "strong" : scene === 6 ? "drip" : "off"}
        local={local}
      />
    </group>
  );
};

// ================= Rumah + toren atap =================
const House: React.FC<{ local: number; scene: number }> = ({ local, scene }) => (
  <group position={[20, 0, 22]}>
    {/* badan rumah */}
    <mesh position={[0, 2.25, 0]}>
      <boxGeometry args={[7, 4.5, 6]} />
      <meshStandardMaterial color={CREAM} roughness={0.9} />
    </mesh>
    {/* atap datar */}
    <mesh position={[0, 4.65, 0]}>
      <boxGeometry args={[7.4, 0.3, 6.4]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={1} />
    </mesh>
    {/* pintu + jendela menghadap jalan (-z) */}
    <mesh position={[-1.5, 1.1, -3.03]}>
      <boxGeometry args={[1.4, 2.2, 0.1]} />
      <meshStandardMaterial color={GLASS} roughness={0.7} />
    </mesh>
    {[1.5, 2.5].map((wx) => (
      <mesh key={wx} position={[wx, 2.4, -3.03]}>
        <boxGeometry args={[1.3, 1.3, 0.08]} />
        <meshStandardMaterial color={GLASS} roughness={0.25} />
      </mesh>
    ))}
    {/* toren hitam di atap */}
    <mesh position={[1.5, 5.9, 0]}>
      <cylinderGeometry args={[1.1, 1.1, 2.2, 20]} />
      <meshStandardMaterial color="#2B2B2B" roughness={0.7} />
    </mesh>
    <mesh position={[1.5, 7.1, 0]}>
      <coneGeometry args={[1.25, 0.7, 20]} />
      <meshStandardMaterial color={STEEL_DARK} roughness={0.9} />
    </mesh>
    {/* pipa toren turun ke keran depan (muka -z, menghadap jalan) */}
    <PipeSegment
      a={[0, 4.8, -3.1]}
      b={[0, 2.2, -3.1]}
      local={local}
      dots={3}
      speed={0.012}
      r={0.3}
    />
    <Tap
      position={[0, 2.2, -3.1]}
      flow={scene === 7 ? "medium" : "off"}
      local={local}
    />
  </group>
);

// ================= Pohon bergoyang halus =================
const Tree: React.FC<{
  position: [number, number, number];
  scale: number;
  frame: number;
  phase: number;
}> = ({ position, scale, frame, phase }) => {
  const sway = Math.sin(frame * 0.012 + phase) * 0.025;
  return (
    <group position={position} scale={[scale, scale, scale]} rotation={[0, 0, sway]}>
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
};

// ================= Awan hanyut pelan =================
const Cloud: React.FC<{
  position: [number, number, number];
  scale: number;
  frame: number;
  phase: number;
}> = ({ position, scale, frame, phase }) => {
  const x = position[0] + frame * 0.02;
  const y = position[1] + Math.sin(frame * 0.008 + phase) * 0.8;
  return (
    <group position={[x, y, position[2]]} scale={[scale, scale, scale]}>
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
};

// ================= Mobil lewat (roda berputar) =================
// Bergerak sepanjang jalan (sumbu X); roda berputar mengikuti jarak tempuh.
const Car: React.FC<{ x: number }> = ({ x }) => {
  const spin = (x + 30) / 0.35;
  const wheels: [number, number][] = [
    [-1.1, 0.8],
    [1.1, 0.8],
    [-1.1, -0.8],
    [1.1, -0.8],
  ];
  return (
    <group position={[x, 0.35, 10]}>
      {/* bodi oranye */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[3.2, 0.7, 1.6]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} />
      </mesh>
      {/* kabin + kaca */}
      <mesh position={[-0.2, 1.15, 0]}>
        <boxGeometry args={[1.8, 0.6, 1.4]} />
        <meshStandardMaterial color={GLASS} roughness={0.25} />
      </mesh>
      {/* lampu depan */}
      <mesh position={[1.62, 0.55, 0.5]}>
        <boxGeometry args={[0.06, 0.22, 0.3]} />
        <meshStandardMaterial color="#FFF8DC" roughness={0.3} />
      </mesh>
      {/* roda berputar (sumbu Z, mobil jalan sepanjang X) */}
      {wheels.map(([wx, wz], i) => (
        <group key={i} position={[wx, 0.35, wz]} rotation={[0, 0, spin]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
            <meshStandardMaterial color="#2B2B2B" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.11]}>
            <circleGeometry args={[0.16, 12]} />
            <meshStandardMaterial color={ROOF_GREY} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ================= Data dunia (tetap) =================
const HILLS: { pos: [number, number, number]; r: number; color: string }[] = [
  { pos: [-60, 0, -70], r: 28, color: GREEN_DARK },
  { pos: [55, 0, -75], r: 32, color: GREEN_DARK },
  { pos: [-48, 0, 42], r: 26, color: GREEN_LIGHT },
  { pos: [62, 0, 48], r: 30, color: GREEN_LIGHT },
];

const CLOUDS: { pos: [number, number, number]; scale: number; phase: number }[] = [
  { pos: [-50, 40, -85], scale: 1, phase: 0 },
  { pos: [-20, 44, -60], scale: 1.2, phase: 1.3 },
  { pos: [0, 38, -105], scale: 0.85, phase: 2.1 },
  { pos: [-30, 42, 25], scale: 1, phase: 3.4 },
];

const TREES: { pos: [number, number, number]; scale: number; phase: number }[] = [
  { pos: [-14, 0, 12], scale: 1, phase: 0 },
  { pos: [14, 0, -12], scale: 1.1, phase: 1.1 },
  { pos: [-34, 0, 5], scale: 0.9, phase: 2.2 },
  { pos: [32, 0, 5], scale: 1.2, phase: 0.7 },
  { pos: [-18, 0, 28], scale: 1, phase: 1.8 },
  { pos: [8, 0, 30], scale: 0.85, phase: 2.9 },
  { pos: [36, 0, -20], scale: 1.05, phase: 0.4 },
  { pos: [-38, 0, -20], scale: 0.95, phase: 1.5 },
];


const Scene: React.FC<{
  frame: number;
  scene: number;
  local: number;
  carX: number | null;
}> = ({ frame, scene, local, carX }) => {
  const isMorning = scene === 6;
  const sunPos: [number, number, number] = isMorning
    ? [50, 16, -50]
    : [60, 55, -60];

  // Cincin tekanan di pipa turun menara (S3): 1 / 2 / 3 bar tiap 10 m.
  const pressureRings = [10, 20, 30];

  return (
    <>
      <color attach="background" args={[isMorning ? SKY_MORNING : SKY]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[30, 50, 20]} intensity={1.15} />
      {/* matahari + pijar */}
      <mesh position={sunPos}>
        <sphereGeometry args={[3, 20, 16]} />
        <meshStandardMaterial color="#FFD94A" emissive="#FFC93A" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={sunPos} scale={[1.8, 1.8, 1.8]}>
        <sphereGeometry args={[3, 20, 16]} />
        <meshStandardMaterial
          color="#FFD94A"
          emissive="#FFC93A"
          emissiveIntensity={0.5}
          transparent
          opacity={0.25}
        />
      </mesh>
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
        <Cloud key={i} position={c.pos} scale={c.scale} frame={frame} phase={c.phase} />
      ))}
      {/* plaza beton di sekitar gedung */}
      <mesh position={[0, 0.1, 2]}>
        <boxGeometry args={[22, 0.2, 22]} />
        <meshStandardMaterial color={CONCRETE} roughness={1} />
      </mesh>
      {/* jalan aspal + marka */}
      <mesh position={[0, 0.12, 10]}>
        <boxGeometry args={[90, 0.2, 7]} />
        <meshStandardMaterial color={ASPHALT} roughness={1} />
      </mesh>
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={i} position={[-42 + i * 4, 0.24, 10]}>
          <boxGeometry args={[1.8, 0.02, 0.3]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
        </mesh>
      ))}
      {/* pohon bergoyang */}
      {TREES.map((t, i) => (
        <Tree key={i} position={t.pos} scale={t.scale} frame={frame} phase={t.phase} />
      ))}
      {/* ===== waduk -> olah -> pompa -> menara ===== */}
      <Reservoir frame={frame} />
      <Treatment />
      <PumpHouse frame={frame} />
      <WaterTower local={local} />
      {/* pipa utama */}
      <PipeSegment a={[17, 0.8, -36]} b={[15, 0.8, -34]} local={local} dots={4} speed={0.012} r={0.4} />
      <PipeSegment a={[9, 0.8, -32]} b={[-6, 0.8, -33]} local={local} dots={4} speed={0.012} r={0.4} />
      <PipeSegment a={[-10, 0.8, -34]} b={[-26, 0.8, -38]} local={local} dots={4} speed={0.012} r={0.4} />
      {/* pipa turun menara -> gedung */}
      <PipeSegment a={[-31.5, 1, -38]} b={[-8, 1, -18]} local={local} dots={5} speed={0.012} r={0.4} />
      <PipeSegment a={[-8, 1, -18]} b={[4.2, 1, 5.35]} local={local} dots={5} speed={0.012} r={0.4} />
      {/* cincin tekanan 1/2/3 bar di pipa turun menara (S3) */}
      {scene === 3 &&
        pressureRings.map((y) => (
          <mesh
            key={y}
            position={[-31.5, y, -38]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.62, 0.09, 10, 24]} />
            <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.8} />
          </mesh>
        ))}
      {/* ===== gedung + rumah ===== */}
      <Building local={local} scene={scene} />
      <House local={local} scene={scene} />
      {/* mobil lewat di jalan (scene hook + penutup) */}
      {carX !== null && <Car x={carX} />}
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
      Air PAM Naik ke Lantai 10 Tanpa Pompa?
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
      Rahasianya: 10 meter = 1 bar
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "10 meter tinggi, tekanannya 1 bar.", highlight: "bar" },
  { text: "Air dari waduk diolah sampai bersih.", highlight: "waduk" },
  { text: "Terus dipompa naik ke menara air di tempat tinggi.", highlight: "menara" },
  {
    text: "Dari sana, gravitasi yang kerja. Tiap 10 meter, tekanannya nambah 1 bar.",
    highlight: "gravitasi",
  },
  { text: "Lantai 10 itu sekitar 30 meter dari tanah.", highlight: "30" },
  { text: "Artinya keran lo butuh dorongan sekitar 3 bar.", highlight: "bar" },
  {
    text: "Makanya jam 6 pagi, waktu semua orang mandi bareng, air di lantai atas mengecil.",
    highlight: "pagi",
  },
  {
    text: "Toren di atap lo pakai prinsip yang sama, cuma skalanya kecil.",
    highlight: "Toren",
  },
  { text: "Di rumah lo, air paling lemah di lantai berapa?", highlight: "berapa" },
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

// Angka besar (pop masuk dengan ease-out, bukan linear).
// align "left" dipakai saat pipa vertikal membelah tengah frame (S4/S6).
const BigNumber: React.FC<{
  value: string;
  caption: string;
  top?: number;
  local: number;
  align?: "center" | "left";
}> = ({ value, caption, top = 480, local, align = "center" }) => {
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
        right: align === "left" ? 500 : 70,
        textAlign: align === "left" ? "left" : "center",
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
    Sumber: howcome.id / SNI 8153:2015
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
// 9 scene x ~186 frame = 1675 frame (55.85 detik @ 30fps, DIKUNCI ke durasi
// VO Sami asli 55.848s via ffprobe; bounds di-scale proporsional dari 1620).
const SCENE_BOUNDS = [0, 186, 372, 558, 744, 931, 1117, 1303, 1489, 1675];

// Interpolasi kamera dengan easeInOut — kamera tidak pernah bergerak linear.
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

export const AirPamExplainer: React.FC = () => {
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

  let camPos: [number, number, number];
  let camTarget: [number, number, number];
  let carX: number | null = null;

  if (scene === 0) {
    // S0 HOOK: push-in 3/4 ke gedung, pipa riser + air naik kelihatan utuh.
    camPos = easeCam(local, sceneLen, [22, 26, 46], [18, 22, 38]);
    camTarget = [0, 15, 0];
    carX = interpolate(local, [0, sceneLen - 1], [-30, 30], {
      easing: Easing.inOut(Easing.quad),
    });
  } else if (scene === 1) {
    // S1 WADUK: tangki olah di kiri frame, waduk biru di kanan — satu frame.
    camPos = easeCam(local, sceneLen, [44, 16, -12], [38, 12, -20]);
    camTarget = [17, 1, -39];
  } else if (scene === 2) {
    // S2 MENARA: mulai wide (pompa + menara satu frame), push-in ke menara.
    // Target ikut bergerak supaya garis pandang tidak terhalang gedung.
    camPos = easeCam(local, sceneLen, [-52, 14, 8], [-62, 24, -6]);
    camTarget = easeCam(local, sceneLen, [-16, 17, -36], [-26, 25, -38]);
  } else if (scene === 3) {
    // S3 GRAVITASI: dari barat, pipa turun + cincin tekanan jadi hero.
    // (Kamera dari tenggara terhalang gedung — garis pandang menembus gedung.)
    camPos = easeCam(local, sceneLen, [-38, 18, -4], [-32, 16, -10]);
    camTarget = [-28, 18, -37];
  } else if (scene === 4) {
    // S4 GEDUNG 3/4 dari KIRI (pipa di sisi kanan frame, jauh dari angka):
    // push-in miring (BUKAN top-down), lantai 10 + pipa terbaca.
    camPos = easeCam(local, sceneLen, [-26, 22, 36], [-22, 19, 30]);
    camTarget = [0, 15, 0];
  } else if (scene === 5) {
    // S5 KERAN: close-up keran lantai 10, air deras.
    camPos = easeCam(local, sceneLen, [12, 31, 14], [10, 30, 12]);
    camTarget = [4.2, 28.3, 5.5];
  } else if (scene === 6) {
    // S6 JAM 6 PAGI: push-in ke muka gedung, 3 keran (deras/sedang/menetes).
    camPos = easeCam(local, sceneLen, [18, 20, 40], [15, 17, 34]);
    camTarget = [2, 15, 0];
  } else if (scene === 7) {
    // S7 TOREN: dari utara (seberang jalan), muka rumah + keran terlihat.
    camPos = easeCam(local, sceneLen, [40, 14, -6], [36, 12, 0]);
    camTarget = [20, 3.5, 22];
  } else {
    // S8 PENUTUP: pull-back wide, gedung + menara + waduk satu frame.
    camPos = easeCam(local, sceneLen, [26, 24, 48], [30, 28, 56]);
    camTarget = [-6, 12, -12];
    carX = interpolate(local, [0, sceneLen - 1], [30, -30], {
      easing: Easing.inOut(Easing.quad),
    });
  }

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        <Scene frame={frame} scene={scene} local={local} carX={carX} />
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>
      {scene === 0 && <Headline />}
      <Subtitle scene={scene} local={local} />
      {scene === 2 && <HairlineLabel top={620} left={90} text="Menara air" />}
      {scene === 4 && (
        <>
          <BigNumber
            value="30 m"
            caption="tinggi lantai 10"
            top={480}
            local={local}
            align="left"
          />
          <HairlineLabel top={300} left={90} text="Lantai 10" />
        </>
      )}
      {scene === 5 && (
        <BigNumber
          value="3 bar"
          caption="tekanan di keran lantai 10"
          top={420}
          local={local}
        />
      )}
      {scene === 6 && (
        <BigNumber
          value="06:00"
          caption="semua orang mandi bareng"
          top={420}
          local={local}
          align="left"
        />
      )}
      {scene === 8 && <SourceLine />}
      <WatermarkText />

      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      {/* VO Sami 55.848s, mulai frame 0, volume penuh */}
      <Audio src={staticFile("audio/air-pam/vo_sami.mp3")} volume={1} />
      {/* BGM chill 230.56s > durasi video 55.85s — diputar dari frame 0, tanpa loop */}
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {/* Whoosh 0.5s (15 frame) di tiap hard cut: awal tiap scene */}
      {[0, 186, 372, 558, 744, 931, 1117, 1303, 1489].map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {/* Chirp 0.15s (5 frame) saat BigNumber "30 m" muncul — scene 4, frame 744 */}
      <Sequence from={744} durationInFrames={5}>
        <Audio src={staticFile("audio/jarvis-sage/sfx_digital_chirp.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
