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

// ================= IbuJanganPulangExplainer =================
// "Ibu bilang: nggak usah pulang, padahal tiap minggu masak kesukaan lo"
// 1504 frame = 50.13 detik @ 30fps (DIKUNCI ke durasi VO Sami asli 50.14s
// via ffprobe), 1080x1920, 10 scene. Profil B toy-explainer.
// Audio: VO Sami + BGM chill (vol 0.15) + whoosh di tiap awal scene.
// Slot 19:00 WIB 2026-11-22, destinasi profil pribadi, #fyp #fbpro.
//
// Pola ini MENYALIN CintaTanpaKataExplainer (sudah terbukti jalan +
// terverifikasi 9/9 scene): GLB loading, normalizeHeight, brightenHouse,
// audio, Subtitle dengan pill gelap. File parsial sebelumnya (192 baris,
// hanya helper CameraRig/Beam/Steam/RingingPhone, tanpa komponen utama)
// diganti total dengan pola ini — RingingPhone + Steam dipertahankan.
//
// ATURAN GLB (standing rule Maya 19:19 WIB): model GLB DULU — procedural
// hanya untuk yang tidak ada modelnya (tanah, dapur, uap, props kecil).
// Model CC0 dari Poly Pizza (lihat ~/workspace/video-relate-5/model-catalog.md):
//   house/house.glb (Quaternius), person/man.glb + person/woman-casual.glb
//   (Quaternius, 11 animasi), streetlamp/street-light.glb (Quaternius).
//   tree/trees.glb DILARANG — tidak pernah ter-render (9 tes terkontrol);
//   pohon prosedural.
// FIX GLB (2026-11-21): model Quaternius hasil konversi FBX winding-nya
// terbalik + boundingSphere bikin culling salah — setiap model yang di-load
// di-traverse: frustumCulled=false + material.side=DoubleSide + metalness=0.
// Rumah juga diterangkan (brightenHouse) karena material aslinya sangat gelap.
// Pola load: GLTFLoader + delayRender/continueRender, continueRender
// ditunda 3 detik (R3F menggambar lewat rAF loop sendiri).
//
// ATURAN v2 (evaluasi Bekasi — "kaku"):
// 1. EASING di SEMUA gerakan (nol interpolate linear mentah untuk gerakan).
// 2. SECONDARY MOTION tiap scene: uap naik, api kompor bergoyang, cincin
//    dering telepon mengembang, lampu berdenyut, daun jatuh, awan hanyut.
// 3. KAMERA BERGERAK DI DALAM SCENE (push-in / tracking / orbit, easeInOut),
//    hero selalu utuh di frame.
// 4. Sosok GLB asli (bukan kapsul prosedural); props kecil prosedural.
// 5. Subtitle: teks putih 44px weight 800, kata aktif AMBER, textShadow,
//    DAN pill gelap rgba(0,0,0,0.55) di belakang teks (fix kontras).
//
// Scene (10, bounds proporsional jumlah kata, total 1504f):
//   S0 hook 0-81: telepon berdering di dekat pintu + headline.
//   S1 81-162: "Nggak usah pulang, nak, hemat ongkos." Ibu melambai, anak pergi.
//   S2 162-271: dapur — ibu masak, uap naik, api bergoyang.
//   S3 271-447: meja penuh — ayam goreng (aksen amber) + sayur.
//   S4 447-610: malam — ibu telepon, pura-pura nanya kabar.
//   S5 610-759: ibu sendiri di pintu malam — "takut jadi beban".
//   S6 759-962: "lo pulang, makan bareng" — anak datang ke meja.
//   S7 962-1125: malam — ibu berdoa di sajadah sebelum tidur.
//   S8 TWIST 1125-1328: dapur dingin tanpa uap, meja kosong, daun jatuh.
//   S9 1328-1504: penutup — anak pulang, makan bareng, pertanyaan komentar.

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const SKY_NIGHT = "#5A7A96";
const SKY_COLD = "#9AA5AD";
const SKY_WARM = "#F2D8A8";
const SKY_MUTED = "#B8C8D4";
const GREEN = "#A8C3A0";
const PATH = "#E8E0CC";
const AMBER = "#FFB300";
const ORANGE = "#E8710A";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const WATER_BLUE = "#2E86C1";
const BOWL = "#EFE9D8";
const LAMP_WARM = "#FFC873";
const STEEL_DARK = "#6B7280";
const CREAM = "#F2EFE8";

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
  // (metalness 0.4 tanpa env map bikin material gelap pekat).
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

// ================= Tanah + jalan setapak =================
const Ground: React.FC = () => (
  <>
    <mesh position={[0, 0, -6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[90, 90]} />
      <meshStandardMaterial color={GREEN} roughness={1} metalness={0} />
    </mesh>
    {/* jalan setapak dari pintu ke kamera */}
    <mesh position={[0, 0.02, -4]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.4, 12]} />
      <meshStandardMaterial color={PATH} roughness={1} metalness={0} />
    </mesh>
  </>
);

// ================= Awan hanyut (secondary motion) =================
const Clouds: React.FC<{ frame: number }> = ({ frame }) => {
  const clouds = [
    { y: 20, z: -20, s: 1.2, off: 0 },
    { y: 23, z: -26, s: 1.6, off: 13 },
    { y: 19, z: -15, s: 0.9, off: 27 },
  ];
  return (
    <group>
      {clouds.map((c, i) => {
        const x = ((frame * 0.008 + c.off) % 44) - 22;
        return (
          <group key={i} position={[x, c.y, c.z]} scale={[c.s, c.s, c.s]}>
            {[
              [-1.2, 0, 0, 1.4],
              [0, 0.3, 0, 1.8],
              [1.3, 0, 0, 1.3],
            ].map(([px, py, pz, r], j) => (
              <mesh key={j} position={[px, py, pz]} scale={[1, 0.55, 1]}>
                <sphereGeometry args={[r, 12, 10]} />
                <meshStandardMaterial
                  color="#FFFFFF"
                  roughness={1}
                  transparent
                  opacity={0.92}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

// ================= Uap naik dari panci/mangkuk =================
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

// ================= Telepon berdering (getar + cincin mengembang) =================
const RingingPhone: React.FC<{
  position: [number, number, number];
  local: number;
}> = ({ position, local }) => {
  const wobble = Math.sin(local * 0.9) * 0.06;
  return (
    <group position={position} rotation={[0, 0.3, wobble]}>
      {/* bodi telepon */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.7, 0.24, 1.4]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* layar menyala amber */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.55, 0.02, 1.2]} />
        <meshStandardMaterial
          color={AMBER}
          emissive={AMBER}
          emissiveIntensity={1.4}
          roughness={0.3}
        />
      </mesh>
      {/* tombol putar */}
      <mesh position={[0, 0.26, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.04, 12]} />
        <meshStandardMaterial color={CREAM} roughness={0.5} />
      </mesh>
      {/* cincin dering mengembang di meja */}
      {[0, 1].map((i) => {
        const phase = (local * 0.012 + i * 0.5) % 1;
        const r = interpolate(phase, [0, 1], [0.9, 2.2], {
          easing: Easing.out(Easing.quad),
        });
        const op = (1 - phase) * 0.55;
        return (
          <mesh
            key={i}
            position={[0, 0.03, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[Math.max(0.05, r - 0.12), r, 32]} />
            <meshStandardMaterial
              color={AMBER}
              emissive={AMBER}
              emissiveIntensity={0.9}
              transparent
              opacity={op}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// ================= Meja kecil (telepon di dekat pintu) =================
const SideTable: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.8, 0]}>
      <boxGeometry args={[1.0, 0.08, 1.0]} />
      <meshStandardMaterial color="#D8C9A8" roughness={0.8} />
    </mesh>
    {[
      [-0.42, -0.42],
      [0.42, -0.42],
      [-0.42, 0.42],
      [0.42, 0.42],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.4, z]}>
        <boxGeometry args={[0.08, 0.8, 0.08]} />
        <meshStandardMaterial color="#B8A888" roughness={0.8} />
      </mesh>
    ))}
  </group>
);

// ================= Dapur: kompor + panci + ayam goreng =================
const KitchenCorner: React.FC<{
  position: [number, number, number];
  frame: number;
  cold?: boolean;
}> = ({ position, frame, cold = false }) => (
  <group position={position}>
    {/* kompor */}
    <mesh position={[0, 0.45, 0]}>
      <boxGeometry args={[1.7, 0.9, 1.0]} />
      <meshStandardMaterial
        color={cold ? "#8A9098" : STEEL_DARK}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
    {/* tungku */}
    <mesh position={[0, 0.95, 0]}>
      <cylinderGeometry args={[0.45, 0.45, 0.08, 16]} />
      <meshStandardMaterial color="#3A3A3A" roughness={0.5} />
    </mesh>
    {/* panci */}
    <mesh position={[0, 1.15, 0]}>
      <cylinderGeometry args={[0.42, 0.36, 0.4, 16]} />
      <meshStandardMaterial color="#9AA5AD" roughness={0.35} metalness={0.5} />
    </mesh>
    {/* isi panci: kuah hangat amber, atau dingin abu-abu */}
    <mesh position={[0, 1.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.36, 16]} />
      <meshStandardMaterial color={cold ? "#7A7F85" : ORANGE} roughness={0.6} />
    </mesh>
    {/* uap hanya kalau dapur menyala */}
    {!cold && <Steam position={[0, 1.4, 0]} frame={frame} />}
    {/* api kompor bergoyang */}
    {!cold && (
      <mesh
        position={[0.55, 0.98, 0.35]}
        scale={[1, 1 + Math.sin(frame * 0.15) * 0.15, 1]}
      >
        <coneGeometry args={[0.09, 0.3, 8]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.6} />
      </mesh>
    )}
    {/* meja samping + piring ayam goreng */}
    <mesh position={[1.55, 0.35, 0.25]}>
      <cylinderGeometry args={[0.45, 0.35, 0.7, 12]} />
      <meshStandardMaterial color="#B8A888" roughness={0.8} />
    </mesh>
    <mesh position={[1.55, 0.72, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.42, 16]} />
      <meshStandardMaterial color="#F2EFE8" roughness={0.5} />
    </mesh>
    {[
      [0, 0],
      [0.17, 0.1],
      [-0.15, 0.12],
    ].map(([x, z], i) => (
      <mesh key={i} position={[1.55 + x, 0.8, 0.25 + z]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial
          color={cold ? "#8A7A6A" : ORANGE}
          roughness={0.7}
        />
      </mesh>
    ))}
  </group>
);

// ================= Piring ayam goreng (di atas meja makan) =================
const AyamPlate: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.4, 16]} />
      <meshStandardMaterial color="#F2EFE8" roughness={0.5} />
    </mesh>
    {[
      [0, 0],
      [0.16, 0.1],
      [-0.14, 0.12],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.08, z]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color={ORANGE} roughness={0.7} />
      </mesh>
    ))}
  </group>
);

// ================= Meja makan + kursi + mangkuk (prosedural) =================
const TableSet: React.FC<{
  position: [number, number, number];
  chairs: number;
  bowl: boolean;
  frame: number;
}> = ({ position, chairs, bowl, frame }) => (
  <group position={position}>
    {/* meja */}
    <mesh position={[0, 0.95, 0]}>
      <boxGeometry args={[2.4, 0.12, 1.3]} />
      <meshStandardMaterial color="#D8C9A8" roughness={0.8} />
    </mesh>
    {[
      [-1.1, -0.55],
      [1.1, -0.55],
      [-1.1, 0.55],
      [1.1, 0.55],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.45, z]}>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#B8A888" roughness={0.8} />
      </mesh>
    ))}
    {/* kursi */}
    {Array.from({ length: chairs }).map((_, i) => {
      const x = i === 0 ? -1.7 : 1.7;
      return (
        <group key={i} position={[x, 0, 0]} rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.65, 0.1, 0.65]} />
            <meshStandardMaterial color="#C9A86A" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.95, -0.28]}>
            <boxGeometry args={[0.65, 0.9, 0.08]} />
            <meshStandardMaterial color="#C9A86A" roughness={0.8} />
          </mesh>
          {[
            [-0.28, -0.28],
            [0.28, -0.28],
            [-0.28, 0.28],
            [0.28, 0.28],
          ].map(([lx, lz], j) => (
            <mesh key={j} position={[lx, 0.25, lz]}>
              <boxGeometry args={[0.08, 0.5, 0.08]} />
              <meshStandardMaterial color="#B8A888" roughness={0.8} />
            </mesh>
          ))}
        </group>
      );
    })}
    {/* mangkuk sayur + uap */}
    {bowl && (
      <>
        <mesh position={[0.3, 1.08, 0]}>
          <cylinderGeometry args={[0.3, 0.22, 0.18, 16]} />
          <meshStandardMaterial color={BOWL} roughness={0.6} />
        </mesh>
        <mesh position={[0.3, 1.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.26, 16]} />
          <meshStandardMaterial color="#F2E8C8" roughness={0.5} />
        </mesh>
        <Steam position={[0.3, 1.2, 0]} frame={frame} />
        {/* sendok */}
        <mesh position={[-0.35, 1.05, 0.25]} rotation={[0, 0.5, 0.2]}>
          <boxGeometry args={[0.5, 0.03, 0.08]} />
          <meshStandardMaterial color="#C9C4B8" roughness={0.4} metalness={0.4} />
        </mesh>
      </>
    )}
  </group>
);

// ================= Sajadah + lentera (S7 berdoa) =================
const PrayerMat: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position}>
    {/* sajadah */}
    <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.3, 2.0]} />
      <meshStandardMaterial color="#5E8C4A" roughness={1} />
    </mesh>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.5, 2.2]} />
      <meshStandardMaterial color={CREAM} roughness={1} />
    </mesh>
    {/* lentera hangat berdenyut pelan */}
    <pointLight
      position={[0.9, 0.8, 0.6]}
      intensity={6 + Math.sin(frame * 0.05) * 1.5}
      distance={8}
      color={LAMP_WARM}
    />
    <mesh position={[0.9, 0.55, 0.6]}>
      <sphereGeometry args={[0.18, 10, 8]} />
      <meshStandardMaterial
        color={LAMP_WARM}
        emissive={LAMP_WARM}
        emissiveIntensity={2.2}
      />
    </mesh>
    <mesh position={[0.9, 0.25, 0.6]}>
      <cylinderGeometry args={[0.12, 0.16, 0.5, 8]} />
      <meshStandardMaterial color="#8A6B4A" roughness={0.8} />
    </mesh>
  </group>
);

// ================= Daun jatuh pelan (S8 twist) =================
const FallingLeaves: React.FC<{ frame: number }> = ({ frame }) => (
  <group>
    {[0, 1].map((i) => {
      const phase = (frame * 0.006 + i * 0.5) % 1;
      const y = 4.5 - phase * 4.2;
      const x = 2 + Math.sin(frame * 0.04 + i * 2.5) * 0.5;
      return (
        <mesh
          key={i}
          position={[x, y, -6.5 + i]}
          rotation={[0.4, frame * 0.01 + i, 0.3]}
        >
          <planeGeometry args={[0.32, 0.22]} />
          <meshStandardMaterial color={LEAF_DARK} roughness={1} side={THREE.DoubleSide} />
        </mesh>
      );
    })}
  </group>
);

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

// ================= Pohon prosedural =================
// tree/trees.glb TIDAK PERNAH ter-render di renderer ini (9 tes terkontrol:
// sendiri, mentah tanpa normalisasi, material diganti solid + DoubleSide,
// frustumCulled=false, kamera wide, kamera di lokasi mentah — tetap tak
// terlihat, dan keberadaannya mematikan render model lain dalam satu frame;
// struktur file-nya identik dengan house.glb yang bisa render). Jadi pohon
// dibuat prosedural (toy style, warna solid Profil B).
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

// ================= Dunia 3D per scene =================
type Models = {
  house?: THREE.Group;
  man?: THREE.Group;
  woman?: THREE.Group;
  lamp?: THREE.Group;
};

const NIGHT_SCENES = [4, 5, 7];

const Scene: React.FC<{
  frame: number;
  scene: number;
  local: number;
  models: Models | null;
}> = ({ frame, scene, local, models }) => {
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  const isNight = NIGHT_SCENES.includes(scene);
  // Pohon bergoyang pelan (secondary motion, deterministik).
  const sway = Math.sin(frame * 0.02) * 0.02;
  return (
    <>
      <ambientLight intensity={isNight ? 0.55 : 0.9} />
      <directionalLight position={[30, 50, 20]} intensity={isNight ? 0.5 : 1.2} />
      <Ground />
      <Clouds frame={frame} />
      {/* rumah hero */}
      {models?.house && (
        <group position={[0, 0, -12]}>
          <primitive object={models.house} />
        </group>
      )}
      {/* rumpun pohon kiri + kanan (prosedural — lihat catatan di Tree) */}
      <TreeCluster position={[-11, 0, -7]} seed={3} sway={sway} />
      <TreeCluster position={[11, 0, -9]} seed={7} sway={-sway} />
      {/* dapur samping rumah (menyala kecuali S8 twist yang dingin) */}
      {(scene === 2 || scene === 8) && (
        <KitchenCorner
          position={[-4.8, 0, -8.8]}
          frame={frame}
          cold={scene === 8}
        />
      )}
      {/* lampu jalan (menyala di scene malam) */}
      {models?.lamp && (
        <group position={[4.5, 0, -5]}>
          <primitive object={models.lamp} />
          {isNight && (
            <>
              <pointLight position={[0, 2.6, 0]} intensity={14} distance={14} color={LAMP_WARM} />
              <mesh position={[0, 2.6, 0]}>
                <sphereGeometry args={[0.22, 10, 8]} />
                <meshStandardMaterial
                  color={LAMP_WARM}
                  emissive={LAMP_WARM}
                  emissiveIntensity={2.5}
                />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* ===== S0 HOOK: telepon berdering di dekat pintu, ibu di pintu ===== */}
      {scene === 0 && (
        <>
          <SideTable position={[-2.2, 0, -9.0]} />
          <RingingPhone position={[-2.2, 0.86, -9.0]} local={local} />
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
      {/* ===== S1: ibu melambai, anak jalan pergi ===== */}
      {scene === 1 && (
        <>
          <Figure
            group={models?.man}
            position={[0.5, 0, -4.5]}
            rotY={0}
            bob={0.06}
            frame={frame}
            moveX={[0.5, 2.0]}
            local={local}
            len={sceneLen}
          />
          <Figure
            group={models?.woman}
            position={[-1.2, 0, -5.5]}
            rotY={0.3}
            sway={0.04}
            frame={frame}
          />
        </>
      )}
      {/* ===== S2: dapur — ibu masak, uap naik ===== */}
      {scene === 2 && (
        <Figure
          group={models?.woman}
          position={[-3.2, 0, -8.0]}
          rotY={1.2}
          bob={0.02}
          sway={0.03}
          frame={frame}
        />
      )}
      {/* ===== S3: meja penuh — ayam goreng + sayur, ibu menyajikan ===== */}
      {scene === 3 && (
        <>
          <TableSet position={[3.5, 0, -7.5]} chairs={2} bowl frame={frame} />
          <AyamPlate position={[2.95, 1.03, -7.2]} />
          <Figure
            group={models?.woman}
            position={[2.0, 0, -7.0]}
            rotY={0.9}
            bob={0.02}
            frame={frame}
          />
          <Figure
            group={models?.man}
            position={[5.8, 0, -6.8]}
            rotY={-0.9}
            bob={0.05}
            frame={frame}
            moveX={[5.8, 5.2]}
            local={local}
            len={sceneLen}
          />
        </>
      )}
      {/* ===== S4: malam — ibu telepon, pura-pura nanya kabar ===== */}
      {scene === 4 && (
        <>
          <SideTable position={[-2.2, 0, -9.0]} />
          <RingingPhone position={[-2.2, 0.86, -9.0]} local={local} />
          <Figure
            group={models?.woman}
            position={[-0.9, 0, -9.3]}
            rotY={0.15}
            bob={0.03}
            bobSpeed={0.04}
            frame={frame}
          />
        </>
      )}
      {/* ===== S5: ibu sendiri di pintu malam — "takut jadi beban" ===== */}
      {scene === 5 && (
        <Figure
          group={models?.woman}
          position={[-0.9, 0, -9.3]}
          rotY={0.15}
          bob={0.02}
          bobSpeed={0.03}
          sway={0.02}
          frame={frame}
        />
      )}
      {/* ===== S6: anak datang ke meja — "lo pulang, makan bareng" ===== */}
      {scene === 6 && (
        <>
          <TableSet position={[3.5, 0, -7.5]} chairs={2} bowl frame={frame} />
          <AyamPlate position={[2.95, 1.03, -7.2]} />
          <Figure
            group={models?.woman}
            position={[2.0, 0, -7.0]}
            rotY={0.9}
            bob={0.02}
            frame={frame}
          />
          <Figure
            group={models?.man}
            position={[6.5, 0, -4.5]}
            rotY={-0.7}
            bob={0.06}
            frame={frame}
            moveX={[6.5, 5.2]}
            local={local}
            len={sceneLen}
          />
        </>
      )}
      {/* ===== S7: malam — ibu berdoa di sajadah ===== */}
      {scene === 7 && (
        <>
          <PrayerMat position={[-2.5, 0, -9.3]} frame={frame} />
          <Figure
            group={models?.woman}
            position={[-2.5, 0, -9.3]}
            rotY={0.15}
            bob={0.015}
            bobSpeed={0.03}
            frame={frame}
          />
        </>
      )}
      {/* ===== S8 TWIST: dapur dingin, meja kosong, daun jatuh ===== */}
      {scene === 8 && (
        <>
          <TableSet position={[3.5, 0, -7.5]} chairs={1} bowl={false} frame={frame} />
          <FallingLeaves frame={frame} />
        </>
      )}
      {/* ===== S9 PENUTUP: anak pulang, makan bareng, cahaya hangat ===== */}
      {scene === 9 && (
        <>
          <TableSet position={[3.5, 0, -7.5]} chairs={2} bowl frame={frame} />
          <AyamPlate position={[2.95, 1.03, -7.2]} />
          <Figure
            group={models?.woman}
            position={[2.1, 0, -6.9]}
            rotY={0.9}
            bob={0.02}
            frame={frame}
          />
          <Figure
            group={models?.man}
            position={[4.9, 0, -6.6]}
            rotY={-0.9}
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
      Ibu Bilang: Nggak Usah Pulang
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
      Padahal Tiap Minggu Masak Kesukaan Lo
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Ibu lo pernah bilang gini nggak?", highlight: "Ibu" },
  { text: "Nggak usah pulang, nak, hemat ongkos.", highlight: "hemat" },
  { text: "Padahal tiap minggu dia masak makanan kesukaan lo.", highlight: "masak" },
  {
    text: "Ayam goreng kesukaan lo, sayur yang cuma dia yang bisa masak seenak itu.",
    highlight: "Ayam",
  },
  {
    text: "Terus dia telepon, pura-pura nanya kabar, padahal cuma pengen denger suara lo.",
    highlight: "telepon",
  },
  {
    text: "Ibu itu nggak pernah minta apa-apa. Dia cuma takut jadi beban.",
    highlight: "beban",
  },
  {
    text: "Padahal yang dia mau cuma satu: lo pulang, makan bareng, terus dia lihat lo sehat.",
    highlight: "pulang",
  },
  {
    text: "Lo pikir ibu lo kuat-kuat aja. Padahal tiap malem dia doain lo.",
    highlight: "doain",
  },
  {
    text: "Dan kadang lo baru sadar, waktu udah nggak ada yang masakin makanan kesukaan lo lagi.",
    highlight: "sadar",
  },
  {
    text: "Minggu ini, pulanglah. Telepon ibu lo malam ini. Kapan terakhir kali lo pulang?",
    highlight: "pulanglah",
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

// ================= Scene bounds (dikunci ke narasi, 1504 frame) =================
const SCENE_BOUNDS = [0, 81, 162, 271, 447, 610, 759, 962, 1125, 1328, 1504];
const SKIES = [SKY, SKY, SKY, SKY, SKY_NIGHT, SKY_NIGHT, SKY, SKY_NIGHT, SKY_COLD, SKY_WARM];

export const IbuJanganPulangExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const [models, setModels] = useState<Models | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models ibu"));

  // Load 4 model GLB sekali, lanjut render kalau semuanya selesai (atau gagal).
  useEffect(() => {
    let cancelled = false;
    const jobs: [keyof Models, string, number][] = [
      ["house", "models/house/house.glb", 7],
      ["man", "models/person/man.glb", 1.8],
      ["woman", "models/person/woman-casual.glb", 1.75],
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
            // model GLB yang baru di-mount (terbukti: rumah tak terlihat
            // sampai continueRender ditunda; 3 detik untuk aman di beban berat).
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
  for (let i = 0; i < 10; i++) {
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
    // S0 HOOK: push-in 3/4 ke rumah, ibu + anak di pintu utuh.
    camPos = easeCam(local, sceneLen, [10.5, 5, 5.5], [8.5, 4.3, 2]);
    camTarget = [0, 2.5, -10];
  } else if (scene === 1) {
    // S1: push-in ke dua sosok di jalan setapak.
    camPos = easeCam(local, sceneLen, [5, 3, 3], [3.5, 2.4, 0.5]);
    camTarget = [-0.5, 1.5, -4.5];
  } else if (scene === 2) {
    // S2 DAPUR: dari kiri, dapur + ibu masak — kamera dimundurkan supaya
    // dapur, ibu, dan sebagian rumah masuk satu frame.
    camPos = easeCam(local, sceneLen, [-9, 3.5, 1], [-8, 3, -1]);
    camTarget = [-4.5, 1.3, -8.5];
  } else if (scene === 3) {
    // S3 MEJA PENUH: dari kiri — lampu jalan di [4.5,0,-5] jatuh di tepi kanan.
    camPos = easeCam(local, sceneLen, [-1.5, 3, 0.5], [-0.5, 2.6, -1]);
    camTarget = [3.5, 1.2, -7.5];
  } else if (scene === 4) {
    // S4 MALAM TELEPON: dari kiri, pintu + meja telepon + lampu jalan menyala.
    camPos = easeCam(local, sceneLen, [-5, 3, 1], [-3.5, 2.5, -1.5]);
    camTarget = [0, 1.8, -9];
  } else if (scene === 5) {
    // S5 SENDIRI: tracking lateral di depan pintu (orbit kecil).
    camPos = easeCam(local, sceneLen, [-6, 4, 4], [6, 4, 4]);
    camTarget = [-0.9, 1.4, -9.3];
  } else if (scene === 6) {
    // S6 ANAK DATANG: dari kiri ke meja, anak jalan masuk dari kanan.
    camPos = easeCam(local, sceneLen, [-1.5, 3, 0.5], [-0.5, 2.6, -1]);
    camTarget = [3.5, 1.2, -7.5];
  } else if (scene === 7) {
    // S7 BERDOA: dari kiri, sajadah + ibu + lentera hangat.
    camPos = easeCam(local, sceneLen, [-7, 3.5, 0], [-6, 3, -1]);
    camTarget = [-2.5, 1.2, -9.3];
  } else if (scene === 8) {
    // S8 TWIST: wide dari kiri ke dapur dingin + kursi kosong.
    camPos = easeCam(local, sceneLen, [-4, 4, 3], [-3, 3.5, 1]);
    camTarget = [1.5, 1.2, -8.5];
  } else {
    // S9 PENUTUP: pull-back wide, rumah + meja + dua sosok satu frame.
    camPos = easeCam(local, sceneLen, [10, 5.5, 4], [13, 7, 8]);
    camTarget = [1, 2, -8];
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
      <Audio src={staticFile("audio/ibu-jangan-pulang/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 10).map((f) => (
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
