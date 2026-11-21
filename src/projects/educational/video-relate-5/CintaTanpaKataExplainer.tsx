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

// ================= CintaTanpaKataExplainer =================
// "Dia nggak pernah bilang sayang, tapi tiap pagi bilang hati-hati"
// 1709 frame = 56.98 detik @ 30fps (DIKUNCI ke durasi VO Sami asli 56.98s
// via ffprobe), 1080x1920, 9 scene. Profil B toy-explainer.
// Audio: VO Sami + BGM chill (vol 0.15) + whoosh di tiap awal scene.
// Slot 07:00 WIB 2026-11-22, destinasi profil pribadi, #fyp #fbpro.
//
// ATURAN GLB (standing rule Maya 19:19 WIB): model GLB DULU — procedural
// hanya untuk yang tidak ada modelnya (tanah, jalan, hujan, uap, props kecil).
// Model CC0 dari Poly Pizza (lihat ~/workspace/video-relate-5/model-catalog.md):
//   house/house.glb (Quaternius), person/man.glb + person/woman-casual.glb
//   (Quaternius, 11 animasi), streetlamp/street-light.glb (Quaternius).
//   tree/trees.glb DICOBA tapi file-nya tidak pernah ter-render (9 tes
//   terkontrol, termasuk dengan fix DoubleSide) — pohon prosedural.
// FIX GLB (2026-11-21): model Quaternius hasil konversi FBX winding-nya
// terbalik + boundingSphere bikin culling salah — setiap model yang di-load
// di-traverse: frustumCulled=false + material.side=DoubleSide + metalness=0
// (lihat normalizeHeight). Rumah juga diterangkan (brightenHouse) karena
// material aslinya sangat gelap.
// Pola load: GLTFLoader + delayRender/continueRender (seperti spike
// TestGlbExplainer), normalisasi skala via bounding box (alas di y=0).
//
// ATURAN v2 (evaluasi Bekasi — "kaku"):
// 1. EASING di SEMUA gerakan (nol interpolate linear mentah untuk gerakan).
// 2. SECONDARY MOTION tiap scene: pohon bergoyang, awan hanyut, hujan,
//    uap, lampu berdenyut, daun jatuh.
// 3. KAMERA BERGERAK DI DALAM SCENE (push-in / tracking / orbit, easeInOut),
//    hero selalu utuh di frame.
// 4. Sosok GLB asli (bukan kapsul prosedural); props kecil prosedural.

// ================= Palette (terang, Profil B) =================
const SKY = "#C8DCE8";
const SKY_RAIN = "#8FA8BC";
const SKY_NIGHT = "#5A7A96";
const SKY_MUTED = "#B8C8D4";
const SKY_WARM = "#F2D8A8";
const GREEN = "#A8C3A0";
const PATH = "#E8E0CC";
const AMBER = "#FFB300";
const ORANGE = "#FF7A00";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const WATER_BLUE = "#2E86C1";
const BOWL = "#EFE9D8";
const LAMP_WARM = "#FFC873";

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

// ================= Hujan deras (S2) — streak jatuh, loop modulo =================
const Rain: React.FC<{ frame: number }> = ({ frame }) => {
  const drops = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        x: hash(i) * 16 - 8,
        z: -8 + hash(i + 100) * 10,
        off: hash(i + 200),
        len: 0.7 + hash(i + 300) * 0.6,
        speed: 0.028 + hash(i + 400) * 0.012,
      })),
    []
  );
  return (
    <group>
      {drops.map((d, i) => {
        const y = 7 - ((frame * d.speed + d.off * 7) % 7);
        return (
          <mesh key={i} position={[d.x, y, d.z]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.035, d.len, 0.035]} />
            <meshStandardMaterial color="#BFE0F0" transparent opacity={0.65} />
          </mesh>
        );
      })}
    </group>
  );
};

// ================= Uap naik dari mangkuk (S4/S8) =================
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

// ================= Payung prosedural (props kecil — tidak ada modelnya) =================
const Umbrella: React.FC<{
  position: [number, number, number];
  open: boolean;
  frame: number;
}> = ({ position, frame, open }) => (
  <group
    position={position}
    rotation={[0, 0, Math.sin(frame * 0.03) * 0.03]}
  >
    {open ? (
      <>
        {/* kanopi oranye (aksen hangat) */}
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[1.15, 0.5, 16]} />
          <meshStandardMaterial color={ORANGE} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
          <meshStandardMaterial color="#6B7280" roughness={0.4} metalness={0.5} />
        </mesh>
      </>
    ) : (
      <>
        {/* payung tertutup: tongkat tipis + ujung kecil */}
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.3, 8]} />
          <meshStandardMaterial color="#6B7280" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.32, 0]}>
          <coneGeometry args={[0.09, 0.22, 8]} />
          <meshStandardMaterial color={ORANGE} roughness={0.7} />
        </mesh>
      </>
    )}
  </group>
);

// ================= Meja + kursi + mangkuk bubur (prosedural) =================
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
    {/* kursi: 1 di sisi kiri (kosong), 1 di sisi kanan */}
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
    {/* mangkuk bubur + uap */}
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

// ================= Pot tanaman + gayung (S5) =================
const PlantPot: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position}>
    {/* pot */}
    <mesh position={[0, 0.25, 0]}>
      <cylinderGeometry args={[0.32, 0.24, 0.5, 12]} />
      <meshStandardMaterial color="#C9C4B8" roughness={0.9} />
    </mesh>
    {/* tanaman bergoyang pelan */}
    <group rotation={[0, 0, Math.sin(frame * 0.03) * 0.05]}>
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.34, 10, 8]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
      <mesh position={[0.22, 0.6, 0.1]}>
        <sphereGeometry args={[0.24, 10, 8]} />
        <meshStandardMaterial color={LEAF_DARK} roughness={1} />
      </mesh>
      <mesh position={[-0.22, 0.62, -0.08]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color={LEAF} roughness={1} />
      </mesh>
    </group>
    {/* tetes air dari gayung */}
    {[0, 1, 2].map((i) => {
      const phase = (frame * 0.02 + i / 3) % 1;
      const fall = interpolate(phase, [0, 1], [0, 0.7], {
        easing: Easing.in(Easing.quad),
      });
      const op = interpolate(phase, [0, 0.8, 1], [0.9, 0.9, 0]);
      return (
        <mesh key={i} position={[0.55, 0.9 - fall, 0.25]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial
            color={WATER_BLUE}
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

// ================= Daun jatuh pelan (S7) =================
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

const Scene: React.FC<{
  frame: number;
  scene: number;
  local: number;
  models: Models | null;
}> = ({ frame, scene, local, models }) => {
  const sceneLen = SCENE_BOUNDS[scene + 1] - SCENE_BOUNDS[scene];
  // Pohon bergoyang pelan (secondary motion, deterministik).
  const sway = Math.sin(frame * 0.02) * 0.02;
  return (
    <>
      <ambientLight intensity={scene === 3 ? 0.55 : 0.9} />
      <directionalLight position={[30, 50, 20]} intensity={scene === 3 ? 0.5 : 1.2} />
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
      {/* lampu jalan (menyala di S3 malam) */}
      {models?.lamp && (
        <group position={[4.5, 0, -5]}>
          <primitive object={models.lamp} />
          {scene === 3 && (
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
      {scene === 2 && <Rain frame={frame} />}
      {/* S3 malam: tanpa jendela menyala — bidang LitWindows lama tidak
          sejajar bukaan jendela rumah GLB (nempel di atap/dinding);
          malam terbaca lewat langit gelap + lampu jalan yang menyala. */}

      {/* ===== S0 HOOK: pagi di pintu rumah, payung disiapkan ===== */}
      {scene === 0 && (
        <>
          <Figure
            group={models?.woman}
            position={[-0.9, 0, -9.3]}
            rotY={0.15}
            bob={0.03}
            frame={frame}
          />
          <Umbrella position={[-1.55, 0.35, -9.3]} open={false} frame={frame} />
          <Figure
            group={models?.man}
            position={[0.9, 0, -8.2]}
            rotY={-0.15}
            bob={0.05}
            frame={frame}
          />
        </>
      )}
      {/* ===== S1: pertanyaan — pria jalan pergi, wanita melambai ===== */}
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
      {/* ===== S2: hujan — payung disodorkan ===== */}
      {scene === 2 && (
        <>
          <Figure
            group={models?.man}
            position={[0.2, 0, -3.2]}
            rotY={0.2}
            bob={0.02}
            frame={frame}
          />
          <Figure
            group={models?.woman}
            position={[-1.1, 0, -4.2]}
            rotY={0.35}
            bob={0.03}
            frame={frame}
          />
          <Umbrella position={[-0.45, 2.15, -3.7]} open frame={frame} />
        </>
      )}
      {/* ===== S3: malam — wanita menunggu di pintu menyala ===== */}
      {scene === 3 && (
        <>
          <Figure
            group={models?.woman}
            position={[-0.9, 0, -9.3]}
            rotY={0.15}
            bob={0.04}
            bobSpeed={0.03}
            frame={frame}
          />
          <Figure
            group={models?.man}
            position={[5, 0, -2]}
            rotY={-0.6}
            bob={0.05}
            frame={frame}
            moveX={[5, 2.5]}
            local={local}
            len={sceneLen}
          />
        </>
      )}
      {/* ===== S4: bubur — meja + uap, wanita menyajikan ===== */}
      {scene === 4 && (
        <>
          <TableSet position={[3.5, 0, -7.5]} chairs={2} bowl frame={frame} />
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
      {/* ===== S5: hal kecil — wanita menyiram tanaman ===== */}
      {scene === 5 && (
        <>
          <PlantPot position={[-2.2, 0, -8.3]} frame={frame} />
          {/* gayung di tangan wanita: kotak kecil + cerat */}
          <Figure
            group={models?.woman}
            position={[-3.2, 0, -8]}
            rotY={0.7}
            bob={0.02}
            frame={frame}
          />
          <group position={[-2.75, 1.0, -7.8]} rotation={[0, 0, -0.5]}>
            <mesh>
              <boxGeometry args={[0.28, 0.2, 0.2]} />
              <meshStandardMaterial color="#7A9BB8" roughness={0.6} />
            </mesh>
            <mesh position={[0.22, 0.05, 0]} rotation={[0, 0, -0.9]}>
              <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
              <meshStandardMaterial color="#7A9BB8" roughness={0.6} />
            </mesh>
          </group>
        </>
      )}
      {/* ===== S6: diam-diam selalu ada — wanita sendiri di pintu ===== */}
      {scene === 6 && (
        <Figure
          group={models?.woman}
          position={[-0.9, 0, -9.3]}
          rotY={0.15}
          bob={0.02}
          bobSpeed={0.04}
          sway={0.02}
          frame={frame}
        />
      )}
      {/* ===== S7: TWIST — kursi kosong, rumah sepi ===== */}
      {scene === 7 && (
        <>
          <TableSet position={[3.5, 0, -7.5]} chairs={1} bowl={false} frame={frame} />
          <FallingLeaves frame={frame} />
        </>
      )}
      {/* ===== S8: penutup — makan bareng, cahaya hangat ===== */}
      {scene === 8 && (
        <>
          <TableSet position={[3.5, 0, -7.5]} chairs={2} bowl frame={frame} />
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
      Dia Nggak Pernah Bilang Sayang
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
      Tapi Tiap Pagi Bilang Hati-Hati
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Dia nggak pernah bilang sayang.", highlight: "sayang" },
  {
    text: "Pernah ngerasa dicintai, tapi nggak pernah denger kata sayang?",
    highlight: "dicintai",
  },
  { text: "Tiap pagi, dia selalu bilang hati-hati di jalan.", highlight: "hati-hati" },
  { text: "Pulang malem, dia nungguin di depan pintu.", highlight: "nungguin" },
  { text: "Lo sakit, dia masakin bubur tanpa diminta.", highlight: "bubur" },
  { text: "Dia selalu ada, di hal-hal kecil yang lo anggap biasa.", highlight: "selalu" },
  { text: "Cinta itu cuma orang yang diam-diam selalu ada.", highlight: "diam-diam" },
  { text: "Lo baru sadar betapa berartinya dia, pas dia lagi nggak ada.", highlight: "berartinya" },
  { text: "Orang yang kayak gitu masih ada di hidup lo?", highlight: "hidup" },
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

// ================= Scene bounds (dikunci ke narasi, 1709 frame) =================
const SCENE_BOUNDS = [0, 171, 342, 598, 782, 977, 1190, 1380, 1575, 1709];
const SKIES = [SKY, SKY, SKY_RAIN, SKY_NIGHT, SKY, SKY, SKY, SKY_MUTED, SKY_WARM];

export const CintaTanpaKataExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const [models, setModels] = useState<Models | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models cinta"));

  // Load 5 model GLB sekali, lanjut render kalau semuanya selesai (atau gagal).
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

  if (scene === 0) {
    // S0 HOOK: push-in 3/4 ke rumah, wanita + pria di pintu utuh.
    // Kamera agak mundur dari sebelumnya — rumah sempat terpotong kanan.
    camPos = easeCam(local, sceneLen, [10.5, 5, 5.5], [8.5, 4.3, 2]);
    camTarget = [0, 2.5, -10];
  } else if (scene === 1) {
    // S1: push-in ke dua sosok di jalan setapak.
    camPos = easeCam(local, sceneLen, [5, 3, 3], [3.5, 2.4, 0.5]);
    camTarget = [-0.5, 1.5, -4.5];
  } else if (scene === 2) {
    // S2 HUJAN: close-up payung + dua sosok di bawahnya.
    camPos = easeCam(local, sceneLen, [5, 3.2, 2], [3.8, 2.6, 0]);
    camTarget = [-0.5, 1.8, -3.5];
  } else if (scene === 3) {
    // S3 MALAM: dari kiri, pintu menyala + lampu jalan jadi hero.
    camPos = easeCam(local, sceneLen, [-5, 3, 1], [-3.5, 2.5, -1.5]);
    camTarget = [0, 1.8, -9];
  } else if (scene === 4) {
    // S4 BUBUR: dari kiri — lampu jalan di [4.5,0,-5] sempat menutupi
    // meja saat kamera dari kanan; dari kiri lampu jatuh di tepi kanan.
    camPos = easeCam(local, sceneLen, [-1.5, 3, 0.5], [-0.5, 2.6, -1]);
    camTarget = [3.5, 1.2, -7.5];
  } else if (scene === 5) {
    // S5 TANAMAN: dari kiri, wanita menyiram pot — kamera dimundurkan
    // supaya wanita + pot + sedikit rumah masuk satu frame.
    camPos = easeCam(local, sceneLen, [-8, 3.5, 1], [-7, 3, -1]);
    camTarget = [-3, 1.2, -8];
  } else if (scene === 6) {
    // S6 DIAM-DIAM: tracking lateral di depan pintu (orbit kecil).
    // Kamera dimundurkan jauh (z=+4) — sebelumnya dinding memenuhi frame.
    camPos = easeCam(local, sceneLen, [-6, 4, 4], [6, 4, 4]);
    camTarget = [-0.9, 1.4, -9.3];
  } else if (scene === 7) {
    // S7 TWIST: wide dari kiri ke kursi kosong — meja + kursi + rumah
    // satu frame; lampu jalan jatuh di tepi kanan.
    camPos = easeCam(local, sceneLen, [-4, 4, 3], [-3, 3.5, 1]);
    camTarget = [1.5, 1.2, -8.5];
  } else {
    // S8 PENUTUP: pull-back wide, rumah + meja + dua sosok satu frame.
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
      <Audio src={staticFile("audio/cinta-tanpa-kata/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 9).map((f) => (
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
