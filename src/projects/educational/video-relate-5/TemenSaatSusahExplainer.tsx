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

// ================= TemenSaatSusahExplainer =================
// "Dia nggak pernah nanya kabar, tapi dia yang pertama datang"
// 1487 frame = 49.58 detik @ 30fps (DIKUNCI ke durasi VO Sami asli 49.58s
// via ffprobe), 1080x1920, 8 scene. Profil B toy-explainer.
// Audio: VO Sami + BGM chill (vol 0.15) + whoosh di tiap awal scene.
// Slot 16:00 WIB 2026-11-22, destinasi profil pribadi, #fyp #fbpro.
// JANGAN upload — upload dilakukan koordinator.
//
// Pola mengikuti CintaTanpaKataExplainer (sudah terbukti jalan):
// GLB load + normalizeHeight + delayRender/continueRender 3 detik,
// Scene bounds, SKIES, Subtitle dengan pill gelap, audio, easing.
//
// ATURAN GLB (standing rule Maya 19:19 WIB): model GLB DULU — procedural
// hanya untuk yang tidak ada modelnya (tanah, jalan, HP, bulan, kunci pas).
// Model CC0 dari Poly Pizza (lihat ~/workspace/video-relate-5/model-catalog.md):
//   house/house.glb (Quaternius), person/man.glb x2 (Quaternius — tokoh
//   utama + temennya), motorbike/motorcycle-cartoony.glb x2 (CC0, motor
//   mogok + motor temen), streetlamp/street-light.glb (Quaternius).
//   tree/trees.glb DILARANG — tidak pernah render (9 tes gagal); pohon
//   prosedural.
// FIX GLB (2026-11-21): model Quaternius hasil konversi FBX winding-nya
// terbalik + boundingSphere bikin culling salah — setiap model yang di-load
// di-traverse: frustumCulled=false + material.side=DoubleSide + metalness=0.
// Rumah juga diterangkan (brightenHouse) karena material aslinya sangat gelap.
//
// ATURAN v2 (evaluasi Bekasi — "kaku"):
// 1. EASING di SEMUA gerakan (nol interpolate linear mentah untuk gerakan).
// 2. SECONDARY MOTION tiap scene: awan hanyut, pohon bergoyang, bintang,
//    lampu berdenyut, kunci pas berputar, garis jalan bergerak.
// 3. KAMERA BERGERAK DI DALAM SCENE (push-in / tracking, easeInOut),
//    hero selalu utuh di frame.
// 4. Sosok GLB asli (bukan kapsul prosedural); props kecil prosedural.

// ================= Palette (terang, Profil B) =================
const SKY_DAY = "#C8DCE8";
const SKY_MUTED = "#B8C8D4";
const SKY_DUSK = "#9FB2C4";
const SKY_NIGHT = "#2F4B66";
const SKY_DAWN = "#F2C98A";
const SKY_WARM = "#F2D8A8";
const GREEN = "#A8C3A0";
const ROAD = "#3A3F44";
const SIDEWALK = "#D8D2C0";
const AMBER = "#FFB300";
const ORANGE = "#FF7A00";
const LEAF = "#7FAE7A";
const LEAF_DARK = "#6B9E6B";
const LAMP_WARM = "#FFC873";
const MOON = "#F2E8C8";
const PHONE_DARK = "#23272E";
const SCREEN_LIGHT = "#F5F2EA";
const SCREEN_DARK = "#2E3238";

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

// ================= Tanah + jalan aspal + trotoar =================
const Ground: React.FC<{ frame: number; scene: number }> = ({ frame, scene }) => {
  // Garis putus-putus tengah jalan. Di S6 (riding) garis bergerak
  // berlawanan arah laju supaya terasa melaju; di scene lain statis.
  const dashOffset = scene === 6 ? (frame * 0.14) % 4 : 0;
  const dashes = Array.from({ length: 10 }, (_, i) => -18 + i * 4 - dashOffset);
  return (
    <>
      <mesh position={[0, 0, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color={GREEN} roughness={1} metalness={0} />
      </mesh>
      {/* jalan aspal sepanjang sumbu X */}
      <mesh position={[0, 0.02, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 5]} />
        <meshStandardMaterial color={ROAD} roughness={1} metalness={0} />
      </mesh>
      {/* garis tengah putus-putus */}
      {dashes.map((x, i) => (
        <mesh key={i} position={[x, 0.04, -6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.18]} />
          <meshStandardMaterial color="#F2EFE8" roughness={1} metalness={0} />
        </mesh>
      ))}
      {/* trotoar sisi dekat kamera */}
      <mesh position={[0, 0.03, -2.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 1.8]} />
        <meshStandardMaterial color={SIDEWALK} roughness={1} metalness={0} />
      </mesh>
    </>
  );
};

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

// ================= Bintang + bulan (scene malam) =================
const NightSky: React.FC = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: hash(i) * 44 - 22,
        y: 12 + hash(i + 50) * 10,
        z: -28 + hash(i + 100) * 8,
        s: 0.06 + hash(i + 150) * 0.09,
      })),
    []
  );
  return (
    <group>
      {stars.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[s.s, 6, 6]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive="#FFFFFF"
            emissiveIntensity={1.6}
          />
        </mesh>
      ))}
      {/* bulan */}
      <mesh position={[-9, 15, -32]}>
        <circleGeometry args={[1.7, 24]} />
        <meshStandardMaterial
          color={MOON}
          emissive={MOON}
          emissiveIntensity={0.9}
        />
      </mesh>
    </group>
  );
};

// ================= Matahari fajar / pagi =================
const Sun: React.FC<{ position: [number, number, number]; color: string }> = ({
  position,
  color,
}) => (
  <mesh position={position}>
    <circleGeometry args={[2.2, 24]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
  </mesh>
);

// ================= HP besar (props S0–S2) =================
// S0: layar terang, chat kosong (gelembung abu-abu, tanpa isi).
// S1: layar story — deret lingkaran story abu-abu (tidak ada like).
// S2: layar mati, HP tergeletak di tanah.
const BigPhone: React.FC<{
  position: [number, number, number];
  rotY?: number;
  lying?: boolean;
  mode: "empty" | "story" | "off";
}> = ({ position, rotY = 0, lying = false, mode }) => (
  <group
    position={position}
    rotation={lying ? [-Math.PI / 2 + 0.06, 0, 0.2] : [0, rotY, 0]}
  >
    {/* bodi */}
    <mesh position={[0, lying ? 0.1 : 2.3, 0]}>
      <boxGeometry args={[2.3, 4.6, 0.18]} />
      <meshStandardMaterial color={PHONE_DARK} roughness={0.5} metalness={0.2} />
    </mesh>
    {/* layar */}
    <mesh position={[0, lying ? 0.2 : 2.3, 0.1]}>
      <boxGeometry args={[2.05, 4.3, 0.02]} />
      <meshStandardMaterial
        color={mode === "off" ? SCREEN_DARK : SCREEN_LIGHT}
        roughness={0.4}
        metalness={0}
      />
    </mesh>
    {mode === "empty" && (
      <group>
        {/* gelembung chat kosong, berjejer tanpa isi */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.35, 3.3 - i * 0.75, 0.13]}>
            <boxGeometry args={[1.2, 0.5, 0.02]} />
            <meshStandardMaterial color="#D8D5CC" roughness={0.8} />
          </mesh>
        ))}
        {/* titik avatar kecil */}
        <mesh position={[0.65, 3.3, 0.13]}>
          <circleGeometry args={[0.16, 16]} />
          <meshStandardMaterial color="#B9B5AA" roughness={0.8} />
        </mesh>
      </group>
    )}
    {mode === "story" && (
      <group>
        {/* deret lingkaran story di atas layar — abu-abu, tidak ada yang aktif */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-0.75 + i * 0.5, 3.9, 0.13]}>
            <circleGeometry args={[0.19, 16]} />
            <meshStandardMaterial color="#C9C5BA" roughness={0.8} />
          </mesh>
        ))}
        {/* story besar di tengah, kosong */}
        <mesh position={[0, 2.4, 0.13]}>
          <circleGeometry args={[0.72, 24]} />
          <meshStandardMaterial color="#D8D5CC" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2.4, 0.14]}>
          <circleGeometry args={[0.55, 24]} />
          <meshStandardMaterial color="#E8E4D8" roughness={0.8} />
        </mesh>
        {/* baris ikon kecil di bawah — tanpa like menyala */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-0.5 + i * 0.5, 0.7, 0.13]}>
            <circleGeometry args={[0.12, 12]} />
            <meshStandardMaterial color="#B9B5AA" roughness={0.8} />
          </mesh>
        ))}
      </group>
    )}
  </group>
);

// ================= HP kecil di tangan (S3, telepon) =================
const HandPhone: React.FC<{
  position: [number, number, number];
  rotY?: number;
}> = ({ position, rotY = 0 }) => (
  <group position={position} rotation={[0, rotY, 0.15]}>
    <mesh>
      <boxGeometry args={[0.32, 0.65, 0.06]} />
      <meshStandardMaterial color={PHONE_DARK} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0, 0.04]}>
      <boxGeometry args={[0.26, 0.55, 0.02]} />
      <meshStandardMaterial
        color={LAMP_WARM}
        emissive={LAMP_WARM}
        emissiveIntensity={1.4}
      />
    </mesh>
  </group>
);

// ================= Kunci pas berputar (S5) =================
const Wrench: React.FC<{
  position: [number, number, number];
  frame: number;
}> = ({ position, frame }) => (
  <group position={position} rotation={[0, 0, frame * 0.07]}>
    <mesh>
      <boxGeometry args={[0.08, 0.7, 0.05]} />
      <meshStandardMaterial color="#8A8F96" roughness={0.35} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.42, 0]}>
      <boxGeometry args={[0.3, 0.16, 0.05]} />
      <meshStandardMaterial color="#8A8F96" roughness={0.35} metalness={0.6} />
    </mesh>
    <mesh position={[0, -0.42, 0]}>
      <circleGeometry args={[0.14, 12]} />
      <meshStandardMaterial color="#8A8F96" roughness={0.35} metalness={0.6} />
    </mesh>
  </group>
);

// ================= Sosok GLB (man / friend) =================
const Figure: React.FC<{
  group: THREE.Group | undefined;
  position: [number, number, number];
  rotY?: number;
  rotX?: number;
  bob?: number;
  bobSpeed?: number;
  sway?: number;
  frame: number;
  moveX?: [number, number];
  local?: number;
  len?: number;
}> = ({
  group,
  position,
  rotY = 0,
  rotX = 0,
  bob = 0,
  bobSpeed = 0.06,
  sway = 0,
  frame,
  moveX,
  local,
  len,
}) => {
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
    <group position={[x, y, position[2]]} rotation={[rotX, rotY, rz]}>
      <primitive object={group} />
    </group>
  );
};

// ================= Motor GLB =================
// fallen: motor tergeletak miring (roll ~80 derajat di sumbu panjang).
const Bike: React.FC<{
  group: THREE.Group | undefined;
  position: [number, number, number];
  rotY?: number;
  fallen?: boolean;
  moveX?: [number, number];
  local?: number;
  len?: number;
}> = ({ group, position, rotY = 0, fallen = false, moveX, local, len }) => {
  if (!group) return null;
  const x =
    moveX && local !== undefined && len
      ? interpolate(local, [0, len - 1], [moveX[0], moveX[1]], {
          easing: Easing.inOut(Easing.quad),
        })
      : position[0];
  return (
    <group
      position={[x, fallen ? 0.3 : position[1], position[2]]}
      rotation={[fallen ? 1.35 : 0, rotY, 0]}
    >
      <primitive object={group} />
    </group>
  );
};

// ================= Pohon prosedural =================
// tree/trees.glb TIDAK PERNAH ter-render di renderer ini (9 tes terkontrol:
// sendiri, mentah tanpa normalisasi, material diganti solid + DoubleSide,
// frustumCulled=false, kamera wide, kamera di lokasi mentah — tetap tak
// terlihat, dan keberadaannya mematikan render model lain dalam satu frame).
// Jadi pohon dibuat prosedural (toy style, warna solid Profil B).
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

const TreeCluster: React.FC<{
  position: [number, number, number];
  seed: number;
  sway: number;
}> = ({ position, seed, sway }) => (
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
  friend?: THREE.Group;
  bike1?: THREE.Group;
  bike2?: THREE.Group;
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
  const isNight = scene === 4 || scene === 5;
  // S6 fajar: dua motor melaju bersama, posisi x easing in-out.
  const rideX =
    scene === 6
      ? interpolate(local, [0, sceneLen - 1], [-9, 7], {
          easing: Easing.inOut(Easing.quad),
        })
      : 0;
  // S5: motor temen + temen masuk dari kanan, ease-out, berhenti di 60% scene.
  const arriveX =
    scene === 5
      ? interpolate(local, [0, Math.floor(sceneLen * 0.6)], [14, 4.3], {
          easing: Easing.out(Easing.quad),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 4.3;
  return (
    <>
      <ambientLight intensity={isNight ? 0.5 : 0.9} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={isNight ? 0.45 : 1.2}
        color={scene === 6 ? "#FFD9A0" : "#FFFFFF"}
      />
      <Ground frame={frame} scene={scene} />
      {isNight ? <NightSky /> : <Clouds frame={frame} />}
      {scene === 6 && <Sun position={[10, 6, -30]} color="#FFC873" />}
      {scene === 7 && <Sun position={[8, 12, -30]} color="#FFE0A0" />}
      {/* rumah hero di latar (kos) — S0–S3 */}
      {models?.house && scene <= 3 && (
        <group position={[0, 0, -14]}>
          <primitive object={models.house} />
        </group>
      )}
      {/* rumpun pohon kiri + kanan (prosedural — lihat catatan di Tree) */}
      <TreeCluster position={[-11, 0, -9]} seed={3} sway={sway} />
      <TreeCluster position={[11, 0, -10]} seed={7} sway={-sway} />
      <TreeCluster position={[-13, 0, -1.5]} seed={11} sway={sway} />
      <TreeCluster position={[13, 0, -1]} seed={15} sway={-sway} />
      {/* lampu jalan (menyala di S4/S5 malam) */}
      {models?.lamp && (
        <group position={[4.5, 0, -4.2]}>
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

      {/* ===== S0 HOOK: HP sepi, tidak ada chat masuk ===== */}
      {scene === 0 && (
        <>
          <BigPhone position={[0, 0, -3.2]} rotY={0.15} mode="empty" />
          <Figure
            group={models?.man}
            position={[2.1, 0, -3.0]}
            rotY={-0.5}
            bob={0.04}
            frame={frame}
          />
        </>
      )}
      {/* ===== S1: story di HP, tidak ada like dari dia ===== */}
      {scene === 1 && (
        <>
          <BigPhone position={[0, 0, -3.2]} rotY={0.1} mode="story" />
          <Figure
            group={models?.man}
            position={[1.7, 0, -2.9]}
            rotY={-0.4}
            bob={0.03}
            frame={frame}
          />
        </>
      )}
      {/* ===== S2: sendirian, HP mati tergeletak ===== */}
      {scene === 2 && (
        <>
          <BigPhone position={[-1.9, 0.12, -3.2]} lying mode="off" />
          <Figure
            group={models?.man}
            position={[0.4, 0, -4]}
            rotY={0.3}
            rotX={0.18}
            bob={0.02}
            bobSpeed={0.03}
            frame={frame}
          />
        </>
      )}
      {/* ===== S3: yang angkat telepon cuma dia ===== */}
      {scene === 3 && (
        <>
          <Figure
            group={models?.man}
            position={[-2, 0, -4]}
            rotY={0.5}
            bob={0.03}
            frame={frame}
          />
          <HandPhone position={[-1.45, 1.55, -3.85]} rotY={0.4} />
          <Figure
            group={models?.friend}
            position={[7, 0, -6]}
            rotY={-0.6}
            bob={0.03}
            frame={frame}
          />
          <HandPhone position={[7.45, 1.5, -5.85]} rotY={-0.5} />
        </>
      )}
      {/* ===== S4 MALAM: motor mogok di jalan sepi ===== */}
      {scene === 4 && (
        <>
          <Bike group={models?.bike1} position={[0, 0, -6]} rotY={0.25} fallen />
          <Figure
            group={models?.man}
            position={[-1.4, 0, -5.0]}
            rotY={0.7}
            rotX={0.45}
            bob={0.02}
            frame={frame}
          />
        </>
      )}
      {/* ===== S5 MALAM: temen datang, langsung bantuin ===== */}
      {scene === 5 && (
        <>
          <Bike group={models?.bike1} position={[0, 0, -6]} rotY={0.25} fallen />
          <Bike group={models?.bike2} position={[arriveX, 0, -6.9]} rotY={-0.15} />
          <Figure
            group={models?.friend}
            position={[arriveX + 1.1, 0, -5.6]}
            rotY={-0.5}
            bob={0.04}
            frame={frame}
          />
          <Figure
            group={models?.man}
            position={[-1.4, 0, -5.0]}
            rotY={-0.6}
            bob={0.03}
            frame={frame}
          />
          <Wrench position={[0.8, 0.55, -5.4]} frame={frame} />
        </>
      )}
      {/* ===== S6 FAJAR: dua motor jalan bareng pulang ===== */}
      {scene === 6 && (
        <>
          <Bike group={models?.bike1} position={[rideX, 0, -6]} rotY={0} />
          <Figure
            group={models?.man}
            position={[rideX, 0.62, -6]}
            rotY={0}
            rotX={0.28}
            bob={0.02}
            bobSpeed={0.12}
            frame={frame}
          />
          <Bike group={models?.bike2} position={[rideX - 2.8, 0, -6.9]} rotY={0} />
          <Figure
            group={models?.friend}
            position={[rideX - 2.8, 0.62, -6.9]}
            rotY={0}
            rotX={0.28}
            bob={0.02}
            bobSpeed={0.12}
            frame={frame}
          />
        </>
      )}
      {/* ===== S7 PENUTUP: dua sosok duduk bareng pagi hari ===== */}
      {scene === 7 && (
        <>
          <Bike group={models?.bike1} position={[-2.6, 0, -6.5]} rotY={0.35} />
          <Bike group={models?.bike2} position={[3.2, 0, -6.5]} rotY={-0.35} />
          <Figure
            group={models?.man}
            position={[-0.6, 0, -4.5]}
            rotY={0.45}
            bob={0.02}
            frame={frame}
          />
          <Figure
            group={models?.friend}
            position={[1.3, 0, -4.8]}
            rotY={-0.45}
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
      Dia Nggak Pernah Nanya Kabar Lo
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
      Tapi Dia yang Pertama Datang
    </div>
  </div>
);

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "Dia nggak pernah nanya kabar lo.", highlight: "kabar" },
  {
    text: "Nggak pernah ngechat duluan, nggak pernah ngucapin ulang tahun, bahkan story lo aja jarang dia like.",
    highlight: "ngechat",
  },
  {
    text: "Lo pikir dia udah lupa sama lo. Padahal, di HP lo ada seribu kontak,",
    highlight: "lupa",
  },
  {
    text: "tapi pas lo bener-bener butuh, yang angkat telepon cuma dia.",
    highlight: "telepon",
  },
  {
    text: "Pas lo butuh pinjaman buat bayar kos, pas motor lo mogok tengah malem di jalan sepi, dia yang pertama datang.",
    highlight: "mogok",
  },
  {
    text: "Nggak banyak ngomong, langsung bantuin. Temen yang beneran itu nggak diukur dari seberapa sering dia ngechat.",
    highlight: "bantuin",
  },
  {
    text: "Tapi dari siapa yang datang pas lo lagi jatuh. Dan yang paling nyakitin, kadang orang kayak gitu malah lo anggap biasa aja.",
    highlight: "jatuh",
  },
  {
    text: "Sampai lo butuh dia, dan dia tetep datang. Coba lo inget, siapa temen yang kayak gitu di hidup lo?",
    highlight: "inget",
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

// ================= Scene bounds (dikunci ke narasi, 1487 frame) =================
// Proporsional jumlah kata (123 kata / 1487 frame = 12.09 frame/kata):
// S0 6 kata, S1 16, S2 13, S3 11, S4 20, S5 16, S6 22, S7 19.
const SCENE_BOUNDS = [0, 73, 266, 423, 556, 798, 991, 1257, 1487];
const SKIES = [
  SKY_DAY,
  SKY_DAY,
  SKY_MUTED,
  SKY_DUSK,
  SKY_NIGHT,
  SKY_NIGHT,
  SKY_DAWN,
  SKY_WARM,
];

export const TemenSaatSusahExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const [models, setModels] = useState<Models | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models temen"));

  // Load 6 model GLB sekali, lanjut render kalau semuanya selesai (atau gagal).
  useEffect(() => {
    let cancelled = false;
    const jobs: [keyof Models, string, number][] = [
      ["house", "models/house/house.glb", 7],
      ["man", "models/person/man.glb", 1.8],
      ["friend", "models/person/man.glb", 1.75],
      ["bike1", "models/motorbike/motorcycle-cartoony.glb", 1.1],
      ["bike2", "models/motorbike/motorcycle-cartoony.glb", 1.1],
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
            // model GLB yang baru di-mount (terbukti di Cinta: rumah tak
            // terlihat sampai continueRender ditunda; 3 detik untuk aman
            // di beban berat).
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
  for (let i = 0; i < 8; i++) {
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
    // S0 HOOK: push-in ke HP besar + pria di sampingnya, rumah di latar.
    // FIX 2026-11-22: kamera lama terlalu dekat (pos z 4.5→2.5) sehingga
    // pria di [2.1,0,-3.0] jatuh di luar frame kanan — mundurkan kamera
    // (z 7.5→6) dan geser target ke x=0.6 supaya HP + pria muat seframe.
    camPos = easeCam(local, sceneLen, [3.5, 3.8, 7.5], [2.5, 3.4, 6]);
    camTarget = [0.6, 2.0, -3.1];
  } else if (scene === 1) {
    // S1: close-up layar story + pria.
    // FIX 2026-11-22: kamera lama terlalu dekat (z 1.5→0.2) sehingga HP
    // memenuhi frame dan pria di [1.7,0,-2.9] tidak kelihatan. Mundurkan
    // kamera (z 4.5→3.5) dan geser target ke x=0.9 supaya keduanya muat.
    camPos = easeCam(local, sceneLen, [5, 3.4, 4.5], [4, 3.0, 3.5]);
    camTarget = [0.9, 2.0, -3.1];
  } else if (scene === 2) {
    // S2: pria sendirian, HP mati tergeletak, rumah di latar.
    camPos = easeCam(local, sceneLen, [-5.5, 3.2, 3.5], [-4, 2.7, 1.5]);
    camTarget = [0, 1.6, -4];
  } else if (scene === 3) {
    // S3: wide — dua pria bertelepon di ujung jalan yang berbeda.
    // FIX 2026-11-22: kamera lama (z 8→5.5) terlalu sempit — kedua pria
    // (x=-2 dan x=7) jatuh di luar frame kiri/kanan. Mundurkan kamera ke
    // z 14→12 supaya keduanya muat seframe (fov horizontal ~29°).
    // FIX2: z 14→12 masih mepet — pria kiri terpotong setengah badan.
    // Mundurkan lagi ke z 17→15 supaya keduanya muat dengan margin.
    camPos = easeCam(local, sceneLen, [2.5, 4.5, 17], [2.5, 4, 15]);
    camTarget = [2.5, 1.8, -5];
  } else if (scene === 4) {
    // S4 MALAM: motor tergeletak + pria membungkuk, lampu jalan menyala.
    // FIX 2026-11-22: kamera lama membidik terlalu ke kanan — pria di
    // x=-1.4 terpotong setengah badan di tepi kiri. Mundurkan kamera
    // (z 3→2) dan geser target ke x=-0.2 supaya pria + motor muat.
    camPos = easeCam(local, sceneLen, [5, 3.2, 3], [3.5, 2.7, 2]);
    camTarget = [-0.2, 1.1, -6];
  } else if (scene === 5) {
    // S5 MALAM: motor temen masuk dari kanan, kunci pas berputar.
    // FIX 2026-11-22: kamera lama (x 8→6.5, target x=2.2) membidik miring
    // — pria di x=-1.4 jatuh ~19° di luar frame kiri, temen di x~6.4 jatuh
    // ~27° di luar frame kanan; yang kelihatan cuma motor. Mundurkan kamera
    // (z 12→11) dan pusatkan target ke x=3 supaya aksi x -1.4..7.5 muat.
    // FIX2: z 12→11 masih mepet — pria kiri terpotong setengah badan
    // (frame kiri -1.3, pria di -1.4). Mundurkan lagi ke z 14→13.
    camPos = easeCam(local, sceneLen, [3, 3.5, 14], [3, 3, 13]);
    camTarget = [3, 1.2, -6];
  } else if (scene === 6) {
    // S6 FAJAR: tracking — kamera mengikuti dua motor yang melaju.
    const bx = interpolate(local, [0, sceneLen - 1], [-9, 7], {
      easing: Easing.inOut(Easing.quad),
    });
    camPos = [bx + 5, 2.8, 2.2];
    camTarget = [bx - 1.2, 1.3, -6.3];
  } else {
    // S7 PENUTUP: dua sosok + dua motor parkir, pagi hangat.
    // FIX 2026-11-22: kamera lama terlalu dekat — motor pertama di x=-2.6
    // jatuh ~24° di luar frame kiri (cuma 1 motor kelihatan). Mundurkan
    // kamera (z 6→5) dan geser target ke x=0.3 supaya dua motor muat.
    camPos = easeCam(local, sceneLen, [-5, 3.4, 6], [-3.5, 2.9, 5]);
    camTarget = [0.3, 1.4, -5.5];
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
      <Audio src={staticFile("audio/temen-saat-susah/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 8).map((f) => (
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
