import { useEffect, useMemo, useState } from "react";
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

// ================= GajianCepatHabisExplainer =================
// "Gajian tanggal 25, tanggal 27 habis — bocor halus yang nggak lo sadari"
// 1437 frame = 47.90 detik @ 30fps (DIKUNCI ke durasi VO Sami asli 47.90s
// via ffprobe), 1080x1920, 6 scene. Profil B toy-explainer.
// Audio: VO Sami + BGM chill (vol 0.15) + whoosh di tiap awal scene.
// Slot 12:00 WIB 2026-11-22, destinasi profil pribadi, #fyp #fbpro.
//
// ATURAN GLB (standing rule Maya 19:19 WIB): model GLB DULU — procedural
// hanya untuk yang tidak ada modelnya (dompet, kalender, gelas kopi, rak,
// HP, buku catatan, tanah, dinding, meja).
// Model CC0 dari Poly Pizza (lihat ~/workspace/video-relate-5/model-catalog.md):
//   house/house.glb (Quaternius, diterangkan), person/man.glb (Quaternius,
//   aktor berulang S1-S5), car/car.glb (Quaternius, ongkir S4),
//   streetlamp/street-light.glb (Quaternius, minimarket S3).
//   tree/trees.glb DILARANG — tidak pernah render (9 tes gagal); pohon prosedural.
// FIX GLB (2026-11-21): setiap model di-traverse: frustumCulled=false +
// material.side=DoubleSide + metalness=0 (lihat normalizeHeight).
// Pola load: GLTFLoader + delayRender/continueRender (seperti
// CintaTanpaKataExplainer), normalisasi skala via bounding box (alas di y=0),
// continueRender ditunda 3 detik setelah load (hindari still kosong).
//
// ATURAN v2 (evaluasi Bekasi — "kaku"):
// 1. EASING di SEMUA gerakan kamera/objek — nol interpolate linear mentah.
// 2. SECONDARY MOTION di tiap scene: uap kopi naik, koin berdenyut,
//    tanaman/pohon bergoyang, pena bergerak, tagihan bermunculan.
// 3. KAMERA BERGERAK DI DALAM SCENE (push-in / tracking, easeInOut),
//    hero selalu utuh di frame (cek via still).
// 4. Scene angka dari sudut 3/4, BUKAN top-down.
// Angka HANYA dari naskah: 25, 27, 20 ribu, 600 ribu, 15 ribu, 450 ribu.

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const CREAM = "#F5EFE0";
const WALL = "#EFE6D2";
const GREEN = "#A8C3A0";
const WOOD = "#C9A876";
const WOOD_DARK = "#A9855A";
const LEATHER = "#8A6B4F";
const LEATHER_DARK = "#6E543D";
const GOLD = "#FFC93A";
const GOLD_DARK = "#E8A800";
const COFFEE = "#6B4A2F";
const COFFEE_CUP = "#FFFFFF";
const PAPER = "#FFFFFF";
const AMBER = "#FFB300";
const ORANGE = "#FF7A00";
const CORAL = "#FF6B6B";
const LIME = "#8FD14F";
const CYAN = "#4FB8FF";
const PINK = "#FF8FC7";
const PURPLE = "#9B7ED9";
const PHONE_BODY = "#2B2B2B";
const SCREEN = "#BFE8FF";
const LAMP_WARM = "#FFC873";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

// ================= Helpers deterministik =================
// Hash pseudo-acak dari index (DILARANG Math.random()).
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Normalisasi GLB: tinggi jadi targetH, alas di y=0, tengah di x/z=0.
const normalizeHeight = (scene: THREE.Group, targetH: number): THREE.Group => {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const scale = targetH / Math.max(size.y, 0.001);
  // FIX GLB (temuan 2026-11-21): model Quaternius hasil konversi FBX punya
  // winding terbalik (tidak kegambar dengan material FrontSide default)
  // dan/atau boundingSphere yang bikin frustum culling salah — di semua
  // model: matikan culling, paksa DoubleSide, dan nol-kan metalness
  // (metalness tanpa env map bikin material gelap pekat).
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

// Terangkan material rumah (asli GLB: Grey 0.087, DarkGrey 0.026 —
// hampir hitam). Dipetakan ke tone terang Profil B.
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

const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
}> = ({ position, target }) => {
  const camera = useThree((state) => state.camera);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

// ================= Ruangan: tanah + dinding + meja utama =================
const Room: React.FC = () => (
  <>
    {/* tanah hijau */}
    <mesh position={[0, 0, -6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[90, 90]} />
      <meshStandardMaterial color={GREEN} roughness={1} metalness={0} />
    </mesh>
    {/* dinding belakang krem */}
    <mesh position={[0, 7, -16]}>
      <boxGeometry args={[44, 14, 0.5]} />
      <meshStandardMaterial color={WALL} roughness={1} metalness={0} />
    </mesh>
    {/* meja utama (top y=1.0): dompet / kopi / HP / buku catatan */}
    <group position={[0, 0, 3]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[11, 0.22, 4]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} metalness={0} />
      </mesh>
      {[
        [-5.2, -1.7],
        [5.2, -1.7],
        [-5.2, 1.7],
        [5.2, 1.7],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.4, z]}>
          <boxGeometry args={[0.22, 0.8, 0.22]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </group>
    {/* meja kecil di bawah kalender (top y=0.9) */}
    <group position={[5.5, 0, -14.6]}>
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[3, 0.18, 1.5]} />
        <meshStandardMaterial color={WOOD} roughness={0.8} metalness={0} />
      </mesh>
      {[
        [-1.35, -0.6],
        [1.35, -0.6],
        [-1.35, 0.6],
        [1.35, 0.6],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]}>
          <boxGeometry args={[0.16, 0.72, 0.16]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </group>
  </>
);

// ================= Koin emas =================
const Coin: React.FC<{
  position: [number, number, number];
  r?: number;
  pulse?: number;
}> = ({ position, r = 0.32, pulse = 0 }) => (
  <mesh position={position} scale={[1 + pulse, 1, 1 + pulse]}>
    <cylinderGeometry args={[r, r, 0.14, 20]} />
    <meshStandardMaterial
      color={GOLD}
      roughness={0.3}
      metalness={0.6}
      emissive={GOLD_DARK}
      emissiveIntensity={0.25}
    />
  </mesh>
);

// ================= Dompet terbuka (flap membuka dengan ease-out) =================
// local: frame lokal scene. Flap membuka 0 -> -1.1 rad dalam 45 frame pertama.
const Wallet: React.FC<{ local: number; frame: number }> = ({ local, frame }) => {
  const open = interpolate(local, [0, 45], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flapRot = -0.15 - open * 1.0;
  const pulse = Math.sin(frame * 0.05) * 0.06;
  // Koin tumpah di depan dompet, berdenyut halus.
  const spill: [number, number][] = [
    [2.6, 1.4],
    [3.1, 0.6],
    [2.2, 0.2],
    [3.4, -0.4],
    [2.7, -1.0],
  ];
  return (
    <group position={[-2, 1.0, 2]}>
      {/* badan dompet */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[3.6, 0.55, 2.6]} />
        <meshStandardMaterial color={LEATHER} roughness={0.8} />
      </mesh>
      {/* lapisan dalam lebih terang */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[3.3, 0.1, 2.3]} />
        <meshStandardMaterial color={LEATHER_DARK} roughness={0.9} />
      </mesh>
      {/* uang kertas hijau menjulur */}
      <mesh position={[-0.6, 0.75, 0.3]} rotation={[0, 0.15, 0.12]}>
        <boxGeometry args={[2.2, 0.06, 1.1]} />
        <meshStandardMaterial color="#7FB069" roughness={0.9} />
      </mesh>
      {/* flap (engsel di tepi belakang, membuka ke atas) */}
      <group position={[0, 0.55, -1.3]} rotation={[flapRot, 0, 0]}>
        <mesh position={[0, 0.06, -0.65]}>
          <boxGeometry args={[3.6, 0.14, 1.3]} />
          <meshStandardMaterial color={LEATHER_DARK} roughness={0.8} />
        </mesh>
      </group>
      {/* koin tumpah di depan dompet */}
      {spill.map(([sx, sz], i) => (
        <Coin key={i} position={[sx, 0.1, sz]} pulse={pulse * (i % 2 === 0 ? 1 : -1)} />
      ))}
      {/* 2 koin di dalam dompet */}
      <Coin position={[-1.1, 0.68, -0.5]} r={0.3} />
      <Coin position={[0.9, 0.68, -0.6]} r={0.3} />
    </group>
  );
};

// ================= Kalender dinding (tanggal 25 dilingkari amber) =================
// Grid 7x5; sel (baris 3, kolom 3) = tanggal 25 (amber + cincin).
const Calendar: React.FC<{ local: number }> = ({ local }) => {
  const pop = interpolate(local, [20, 45], [0, 1], {
    easing: Easing.out(Easing.back(1.7)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cells: { x: number; y: number; is25: boolean }[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 7; c++) {
      cells.push({ x: (c - 3) * 0.95, y: 1.9 - r * 0.95, is25: r === 3 && c === 3 });
    }
  }
  return (
    <group position={[5.5, 4.5, -15.6]}>
      {/* panel */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[7.4, 6.4, 0.3]} />
        <meshStandardMaterial color={PAPER} roughness={0.9} />
      </mesh>
      {/* strip atas amber */}
      <mesh position={[0, 2.85, 0.18]}>
        <boxGeometry args={[7.4, 0.7, 0.1]} />
        <meshStandardMaterial color={AMBER} roughness={0.7} />
      </mesh>
      {/* grid hari */}
      {cells.map((cell, i) => (
        <mesh key={i} position={[cell.x, cell.y, 0.18]}>
          <boxGeometry args={[0.8, 0.8, 0.06]} />
          <meshStandardMaterial
            color={cell.is25 ? AMBER : "#EDE7D8"}
            roughness={0.9}
            emissive={cell.is25 ? AMBER : "#000000"}
            emissiveIntensity={cell.is25 ? 0.7 : 0}
          />
        </mesh>
      ))}
      {/* cincin di tanggal 25 (pop masuk) */}
      <mesh
        position={[0, 1.9 - 3 * 0.95, 0.24]}
        scale={[pop, pop, pop]}
      >
        <torusGeometry args={[0.55, 0.07, 10, 24]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.8} />
      </mesh>
      {/* tumpukan koin di meja kecil bawah kalender (gajian masuk) */}
      {[0, 1, 2].map((i) => {
        const s = interpolate(local, [50 + i * 10, 70 + i * 10], [0, 1], {
          easing: Easing.out(Easing.back(1.7)),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <group key={i} position={[-2.2 + i * 1.1, -3.6, 0.4]} scale={[s, s, s]}>
            <Coin position={[0, 0.1 + i * 0.15, 0]} r={0.34} />
          </group>
        );
      })}
    </group>
  );
};

// ================= Gelas kopi + uap naik + tumpukan koin =================
// Tumpukan koin tumbuh: 5 koin pop masuk berurutan (stagger 12 frame).
const CoffeeCup: React.FC<{ local: number; frame: number }> = ({ local, frame }) => {
  const steam = [0, 1, 2].map((i) => {
    const phase = (local * 0.008 + i / 3) % 1;
    const y = interpolate(phase, [0, 1], [0, 2.2], {
      easing: Easing.out(Easing.quad),
    });
    const op = (1 - phase) * 0.55;
    const drift = Math.sin(phase * 5 + i * 2) * 0.25;
    return { y, op, drift, i };
  });
  return (
    <group>
      {/* meja kopi: gelas di atas meja */}
      <group position={[2, 1.0, 3]}>
        {/* tatakan */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[1.25, 1.25, 0.12, 24]} />
          <meshStandardMaterial color={CREAM} roughness={0.9} />
        </mesh>
        {/* gelas */}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.85, 0.7, 1.7, 24]} />
          <meshStandardMaterial color={COFFEE_CUP} roughness={0.5} />
        </mesh>
        {/* band amber di gelas */}
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.87, 0.84, 0.35, 24]} />
          <meshStandardMaterial color={AMBER} roughness={0.6} />
        </mesh>
        {/* permukaan kopi */}
        <mesh position={[0, 1.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.72, 24]} />
          <meshStandardMaterial color={COFFEE} roughness={0.3} />
        </mesh>
        {/* pegangan */}
        <mesh position={[0.95, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.45, 0.1, 10, 20, Math.PI]} />
          <meshStandardMaterial color={COFFEE_CUP} roughness={0.5} />
        </mesh>
        {/* uap naik */}
        {steam.map(({ y, op, drift, i }) => (
          <mesh key={i} position={[drift, 1.9 + y, 0]}>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial
              color="#FFFFFF"
              transparent
              opacity={op}
              roughness={1}
            />
          </mesh>
        ))}
      </group>
      {/* tumpukan koin di samping gelas: tumbuh 1 per 12 frame */}
      <group position={[5.2, 1.0, 3]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const s = interpolate(local, [30 + i * 12, 48 + i * 12], [0, 1], {
            easing: Easing.out(Easing.back(1.7)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <group key={i} scale={[s, s, s]}>
              <Coin position={[0, 0.1 + i * 0.16, 0]} r={0.42} />
            </group>
          );
        })}
        {/* koin ke-6 miring di atas (tumpukan goyah) */}
        <group
          scale={[
            interpolate(local, [95, 115], [0, 1], {
              easing: Easing.out(Easing.back(1.7)),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            1,
            1,
          ]}
        >
          <mesh position={[0.1, 0.95, 0]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.42, 0.42, 0.14, 20]} />
            <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ================= Rak minimarket + keranjang jajan =================
const SNACK_COLORS = [CORAL, AMBER, CYAN, LIME, PINK, PURPLE, ORANGE, "#7FB069"];
const ShelfSet: React.FC<{ local: number }> = ({ local }) => {
  const boxes: { x: number; y: number; c: string }[] = [];
  for (let shelf = 0; shelf < 2; shelf++) {
    for (let i = 0; i < 6; i++) {
      boxes.push({
        x: -3.3 + i * 1.32,
        y: shelf === 0 ? 2.15 : 3.75,
        c: SNACK_COLORS[Math.floor(hash(shelf * 10 + i) * SNACK_COLORS.length)],
      });
    }
  }
  return (
    <group position={[0, 0, -12]}>
      {/* tiang rak */}
      {[-4.2, 4.2].map((x, i) => (
        <mesh key={i} position={[x, 2.2, 0]}>
          <boxGeometry args={[0.25, 4.4, 0.9]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
      ))}
      {/* papan rak */}
      {[1.6, 3.2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[8.6, 0.22, 1.1]} />
          <meshStandardMaterial color={WOOD} roughness={0.8} />
        </mesh>
      ))}
      {/* kotak jajan warna-warni */}
      {boxes.map((b, i) => {
        const s = interpolate(local, [15 + i * 4, 30 + i * 4], [0, 1], {
          easing: Easing.out(Easing.back(1.7)),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <group key={i} position={[b.x, b.y, 0]} scale={[s, s, s]}>
            <mesh>
              <boxGeometry args={[1.0, 0.85, 0.7]} />
              <meshStandardMaterial color={b.c} roughness={0.7} />
            </mesh>
          </group>
        );
      })}
      {/* keranjang di lantai, jajan masuk satu per satu */}
      <group position={[1.8, 0, 2.2]}>
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[1.6, 0.35, 1.1]} />
          <meshStandardMaterial color={ORANGE} roughness={0.7} />
        </mesh>
        {[
          [-0.7, 0],
          [0.7, 0],
          [-0.7, 0],
          [0.7, 0],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.55, z]}>
            <boxGeometry args={[0.12, 0.75, 1.1]} />
            <meshStandardMaterial color={ORANGE} roughness={0.7} />
          </mesh>
        ))}
        {[0, 1, 2].map((i) => {
          const s = interpolate(local, [60 + i * 25, 78 + i * 25], [0, 1], {
            easing: Easing.out(Easing.back(1.7)),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <group key={i} position={[-0.45 + i * 0.45, 0.55, 0]} scale={[s, s, s]}>
              <mesh>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial
                  color={SNACK_COLORS[(i * 3 + 1) % SNACK_COLORS.length]}
                  roughness={0.7}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};

// ================= HP besar + ikon langganan + tagihan menumpuk =================
const APP_COLORS = [AMBER, CORAL, CYAN, LIME, PINK, PURPLE, "#4FB8FF", "#FF8FC7", "#8FD14F"];
const Phone: React.FC<{ local: number; frame: number }> = ({ local, frame }) => {
  const glow = 0.5 + Math.sin(frame * 0.04) * 0.25;
  return (
    <group position={[0.3, 0, 2.8]} rotation={[-0.08, -0.12, 0]}>
      {/* badan HP berdiri di atas meja */}
      <mesh position={[0, 3.0, 0]}>
        <boxGeometry args={[2.2, 4.0, 0.22]} />
        <meshStandardMaterial color={PHONE_BODY} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* layar menyala */}
      <mesh position={[0, 3.0, 0.13]}>
        <planeGeometry args={[1.9, 3.6]} />
        <meshStandardMaterial
          color={SCREEN}
          roughness={0.3}
          emissive={SCREEN}
          emissiveIntensity={glow * 0.5}
        />
      </mesh>
      {/* grid ikon aplikasi 3x3 */}
      {APP_COLORS.map((c, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const s = interpolate(local, [20 + i * 6, 34 + i * 6], [0, 1], {
          easing: Easing.out(Easing.back(1.7)),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <group
            key={i}
            position={[-0.6 + col * 0.6, 4.35 - row * 0.65, 0.16]}
            scale={[s, s, s]}
          >
            <mesh>
              <boxGeometry args={[0.45, 0.45, 0.06]} />
              <meshStandardMaterial color={c} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
      {/* bar tagihan di bawah ikon */}
      {[0, 1, 2].map((i) => {
        const s = interpolate(local, [80 + i * 15, 96 + i * 15], [0, 1], {
          easing: Easing.out(Easing.back(1.7)),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <group key={i} position={[0, 2.0 - i * 0.32, 0.16]} scale={[s, 1, 1]}>
            <mesh>
              <boxGeometry args={[1.5, 0.18, 0.05]} />
              <meshStandardMaterial color={CORAL} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* tumpukan tagihan kertas di samping HP */}
      {[0, 1, 2, 3].map((i) => {
        const s = interpolate(local, [100 + i * 12, 116 + i * 12], [0, 1], {
          easing: Easing.out(Easing.back(1.7)),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <group
            key={i}
            position={[2.6, 1.15 + i * 0.1, 0.4]}
            rotation={[0, 0, (i - 1.5) * 0.12]}
            scale={[s, s, s]}
          >
            <mesh>
              <boxGeometry args={[1.4, 0.08, 1.9]} />
              <meshStandardMaterial color={PAPER} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[1.0, 0.02, 0.12]} />
              <meshStandardMaterial color={CORAL} roughness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ================= Buku catatan pengeluaran + pena bergerak =================
const Notebook: React.FC<{ local: number; frame: number }> = ({ local, frame }) => {
  // Pena menulis: bergerak sepanjang garis dengan easeInOut per baris.
  const penX = interpolate(local, [20, 130], [-0.8, 0.8], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const penBob = Math.sin(frame * 0.08) * 0.03;
  return (
    <group position={[0, 1.0, 3]} rotation={[0, 0.06, 0]}>
      {/* halaman kiri + kanan (buku terbuka) */}
      <mesh position={[-1.05, 0.08, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[2.0, 0.1, 2.8]} />
        <meshStandardMaterial color={PAPER} roughness={0.9} />
      </mesh>
      <mesh position={[1.05, 0.08, 0]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[2.0, 0.1, 2.8]} />
        <meshStandardMaterial color={PAPER} roughness={0.9} />
      </mesh>
      {/* garis catatan di halaman kanan */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[1.05, 0.15, -0.9 + i * 0.55]}>
          <boxGeometry args={[1.5, 0.02, 0.06]} />
          <meshStandardMaterial color="#9AA5B1" roughness={0.9} />
        </mesh>
      ))}
      {/* centang amber muncul satu per satu */}
      {[0, 1, 2].map((i) => {
        const s = interpolate(local, [60 + i * 30, 78 + i * 30], [0, 1], {
          easing: Easing.out(Easing.back(1.7)),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <group
            key={i}
            position={[-1.5, 0.18, -0.9 + i * 0.55]}
            scale={[s, s, s]}
            rotation={[0, 0, 0]}
          >
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0, 0.7]}>
              <boxGeometry args={[0.08, 0.28, 0.04]} />
              <meshStandardMaterial color={AMBER} roughness={0.6} />
            </mesh>
            <mesh position={[0.12, 0.06, 0]} rotation={[0, 0, -0.7]}>
              <boxGeometry args={[0.08, 0.42, 0.04]} />
              <meshStandardMaterial color={AMBER} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* pena bergerak di atas garis pertama halaman kanan */}
      <group position={[penX + 1.05, 0.28 + penBob, -0.9]} rotation={[0, 0, -0.5]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
          <meshStandardMaterial color={ORANGE} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <coneGeometry args={[0.05, 0.14, 8]} />
          <meshStandardMaterial color="#3A3A3A" roughness={0.5} />
        </mesh>
      </group>
      {/* koin receh di samping buku (sisa gaji) */}
      <Coin position={[-3.2, 0.08, 0.8]} r={0.3} />
      <Coin position={[-2.7, 0.08, 0.3]} r={0.3} />
    </group>
  );
};

// ================= Pohon prosedural =================
// tree/trees.glb TIDAK PERNAH ter-render di renderer ini (9 tes terkontrol)
// — pohon dibuat prosedural (toy style, warna solid Profil B).
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

// ================= Sosok GLB (man) =================
const Figure: React.FC<{
  group: THREE.Group | undefined;
  position: [number, number, number];
  rotY?: number;
  bob?: number;
  bobSpeed?: number;
  frame: number;
  moveX?: [number, number];
  local?: number;
  len?: number;
}> = ({ group, position, rotY = 0, bob = 0, bobSpeed = 0.06, frame, moveX, local, len }) => {
  if (!group) return null;
  const y = position[1] + (bob === 0 ? 0 : Math.sin(frame * bobSpeed) * bob);
  const x =
    moveX && local !== undefined && len
      ? interpolate(local, [0, len - 1], [moveX[0], moveX[1]], {
          easing: Easing.inOut(Easing.quad),
        })
      : position[0];
  return (
    <group position={[x, y, position[2]]} rotation={[0, rotY, 0]}>
      <primitive object={group} />
    </group>
  );
};

// ================= Dunia 3D per scene =================
type Models = {
  house?: THREE.Group;
  man?: THREE.Group;
  car?: THREE.Group;
  lamp?: THREE.Group;
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
      <ambientLight intensity={0.9} />
      <directionalLight position={[30, 50, 20]} intensity={1.2} />
      <Room />
      {/* ===== S0 HOOK: dompet di meja, rumah di belakang ===== */}
      {scene === 0 && (
        <>
          {models?.house && (
            <group position={[-7, 0, -11]} rotation={[0, 0.25, 0]}>
              <primitive object={models.house} />
            </group>
          )}
          <group rotation={[0, 0, sway]}>
            <Tree h={1.1} x={-11.5} z={-10} />
          </group>
          <group rotation={[0, 0, -sway]}>
            <Tree h={0.95} x={-3.5} z={-12.5} />
          </group>
          <Wallet local={local} frame={frame} />
        </>
      )}
      {/* ===== S1: kalender gajian + sosok menatap tanggal 25 ===== */}
      {scene === 1 && (
        <>
          <Calendar local={local} />
          <Figure
            group={models?.man}
            position={[2.2, 0, -13.2]}
            rotY={0.3}
            bob={0.02}
            frame={frame}
          />
        </>
      )}
      {/* ===== S2: gelas kopi + tumpukan koin tumbuh ===== */}
      {scene === 2 && (
        <>
          <CoffeeCup local={local} frame={frame} />
          <Figure
            group={models?.man}
            position={[-1.8, 0, 1.2]}
            rotY={0.7}
            bob={0.03}
            frame={frame}
          />
        </>
      )}
      {/* ===== S3: rak minimarket + keranjang terisi ===== */}
      {scene === 3 && (
        <>
          <ShelfSet local={local} />
          {models?.lamp && (
            <group position={[6.8, 0, -8]}>
              <primitive object={models.lamp} />
            </group>
          )}
          <Figure
            group={models?.man}
            position={[-2.2, 0, -9.2]}
            rotY={0.35}
            bob={0.03}
            frame={frame}
            moveX={[-2.2, -1.2]}
            local={local}
            len={sceneLen}
          />
        </>
      )}
      {/* ===== S4: HP langganan + tagihan menumpuk + mobil ongkir ===== */}
      {scene === 4 && (
        <>
          <Phone local={local} frame={frame} />
          {models?.car && (
            <group position={[6.5, 0, -6]} rotation={[0, -0.5, 0]}>
              <primitive object={models.car} />
            </group>
          )}
          <Figure
            group={models?.man}
            position={[-2.6, 0, 2.2]}
            rotY={0.8}
            bob={0.02}
            frame={frame}
          />
        </>
      )}
      {/* ===== S5: buku catatan pengeluaran + penutup ===== */}
      {scene === 5 && (
        <>
          <Notebook local={local} frame={frame} />
          <Figure
            group={models?.man}
            position={[-2.8, 0, 2.0]}
            rotY={0.6}
            bob={0.02}
            frame={frame}
          />
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
      Gajian Tanggal 25, Tanggal 27 Habis
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
      Bocor Halus yang Nggak Lo Sadari
    </div>
  </div>
);

const BADGES: Record<number, { text: string; top: number }> = {
  0: { text: "25 → 27", top: 400 },
  2: { text: "20 ribu/hari = 600 ribu/bulan", top: 200 },
  3: { text: "15 ribu/lewat = 450 ribu/bulan", top: 200 },
  4: { text: "Langganan + ongkir numpuk", top: 200 },
};

const Badge: React.FC<{ scene: number }> = ({ scene }) => {
  const b = BADGES[scene];
  if (!b) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: b.top,
        left: 0,
        right: 0,
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "inline-block",
          backgroundColor: AMBER,
          color: "#3A2A00",
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 800,
          padding: "10px 30px",
          borderRadius: 999,
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        }}
      >
        {b.text}
      </span>
    </div>
  );
};

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Gajian tanggal 25, tanggal 27 udah tinggal receh.", highlight: "receh" },
  {
    text: "Lo pernah gitu nggak? Bukan karena gaji lo kecil. Bukan juga karena lo boros. Tapi karena ada bocor halus yang nggak pernah lo sadari.",
    highlight: "bocor",
  },
  { text: "Kopi 20 ribu sehari, kelihatannya kecil. Sebulan, 600 ribu.", highlight: "600" },
  {
    text: "Jajan pas laper mata di minimarket, 15 ribu sekali lewat. Sebulan, 450 ribu.",
    highlight: "450",
  },
  {
    text: "Ongkir, langganan aplikasi yang nggak pernah dibuka, promo beli satu gratis satu yang akhirnya lo beli dua-duanya.",
    highlight: "langganan",
  },
  {
    text: "Ternyata yang bikin dompet lo kering bukan barang mahal. Tapi hal kecil yang lo ulang tiap hari. Bulan ini, coba catet semua pengeluaran lo selama seminggu. Lo bakal kaget. Menurut lo, bocor halus paling parah di hidup lo apa?",
    highlight: "kaget",
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

// ================= Scene bounds (dikunci ke narasi, 1437 frame) =================
// Draf naskah [0,3,12,24,36,46,54] detik diskalakan ke durasi VO asli 47.90 dtk.
const SCENE_BOUNDS = [0, 80, 319, 639, 958, 1224, 1437];

export const GajianCepatHabisExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const [models, setModels] = useState<Models | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models gajian"));

  // Load 4 model GLB sekali, lanjut render kalau semuanya selesai (atau gagal).
  useEffect(() => {
    let cancelled = false;
    const jobs: [keyof Models, string, number][] = [
      ["house", "models/house/house.glb", 6],
      ["man", "models/person/man.glb", 1.8],
      ["car", "models/car/car.glb", 2.0],
      ["lamp", "models/streetlamp/street-light.glb", 2.6],
    ];
    const results: Models = {};
    let done = 0;
    const loader = new GLTFLoader();
    jobs.forEach(([key, url, h]) => {
      loader.load(
        staticFile(url),
        (g: { scene: THREE.Group }) => {
          if (cancelled) return;
          // Rumah: material asli GLB sangat gelap (Grey 0.087, DarkGrey
          // 0.026) — terangkan ke tone Profil B supaya tidak hitam pekat.
          if (key === "house") {
            brightenHouse(g.scene);
          }
          results[key] = normalizeHeight(g.scene, h);
          done += 1;
          if (done === jobs.length) {
            setModels(results);
            // R3F menggambar lewat rAF loop sendiri: continueRender langsung
            // membuat still tercapture sebelum canvas sempat menggambar
            // model GLB yang baru di-mount (terbukti di cinta: rumah tak
            // terlihat sampai continueRender ditunda; 3 detik untuk aman).
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
    // S0 HOOK: push-in ke dompet di meja, rumah + pohon di belakang.
    camPos = easeCam(local, sceneLen, [7.5, 4.5, 9.5], [5.8, 3.6, 7]);
    camTarget = [-2, 2.2, -3];
  } else if (scene === 1) {
    // S1 KALENDER: dari depan, kalender + sosok satu frame.
    camPos = easeCam(local, sceneLen, [0.5, 4.5, -1], [-0.5, 4.2, -3]);
    camTarget = [4.5, 4.2, -14.5];
  } else if (scene === 2) {
    // S2 KOPI: push-in ke gelas + tumpukan koin di meja.
    camPos = easeCam(local, sceneLen, [7, 4, 8.5], [5.6, 3.2, 6.8]);
    camTarget = [2.2, 1.6, 2.5];
  } else if (scene === 3) {
    // S3 MINIMARKET: dari kiri, rak + keranjang + sosok satu frame.
    camPos = easeCam(local, sceneLen, [-6.5, 3.6, 1.5], [-5, 3.1, -0.5]);
    camTarget = [0.5, 2.2, -10];
  } else if (scene === 4) {
    // S4 HP: push-in ke HP + tagihan, mobil ongkir di belakang kanan.
    camPos = easeCam(local, sceneLen, [5, 3.6, 8], [4, 3.1, 6.2]);
    camTarget = [0.5, 2.4, 1.5];
  } else {
    // S5 BUKU: push-in ke buku catatan + sosok di sisi meja.
    camPos = easeCam(local, sceneLen, [5.5, 4, 8], [4.2, 3.2, 6]);
    camTarget = [-0.3, 1.5, 2.5];
  }

  return (
    <AbsoluteFill style={{ backgroundColor: SKY }}>
      <ThreeCanvas
        width={1080}
        height={1920}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 5, 12] }}
      >
        <Scene frame={frame} scene={scene} local={local} models={models} />
        <CameraRig position={camPos} target={camTarget} />
      </ThreeCanvas>
      {/* ======== Audio (VO + BGM + SFX, deterministik) ======== */}
      <Audio src={staticFile("audio/gajian-cepat-habis/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 6).map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {scene === 0 && <Headline />}
      <Badge scene={scene} />
      <Subtitle scene={scene} local={local} />
      <WatermarkText />
    </AbsoluteFill>
  );
};
