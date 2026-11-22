import { useEffect, useState } from "react";
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

// ================= CpnsFormasiExplainer =================
// "Formasi CPNS 2026 Belum Diumumkan" — fact-check.
// TOTAL dikunci ke durasi VO Sami asli via ffprobe (ubah 1 angka di bawah).
// 1080x1920, 9 scene. Profil B toy-explainer. Slot 12:00 WIB 2026-11-22.
// Audio: VO Sami + BGM chill (vol 0.15) + whoosh di tiap awal scene.
// Sumber (resmi): sscasn.bkn.go.id/daftar-formasi (dicek 22 Nov 2026 pagi),
// bkn.go.id 4 Jun 2026 (poster hoaks). Angka di video HANYA yang resmi:
// 0 tab CPNS 2026; Sekolah Rakyat PPPK 258 + 1.734 + 20 (bukan CPNS).
// GLB dulu (standing rule): house/man/woman/lamp CC0 Quaternius.
// Fix GLB: traverse frustumCulled=false + DoubleSide + metalness=0.
// trees.glb DILARANG. Subtitle: pill gelap di belakang kata aktif (fix pagi ini).
// Easing di semua gerakan + secondary motion (awan, pohon, bob).

const SKY = "#C8DCE8";
const SKY_WARM = "#F2D8A8";
const GREEN = "#A8C3A0";
const PATH = "#E8E0CC";
const AMBER = "#FFB300";
const RED = "#E61919";

const FONT = "Inter, Arial, sans-serif";
const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const normalizeHeight = (scene: THREE.Group, targetH: number): THREE.Group => {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const scale = targetH / Math.max(size.y, 0.001);
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

const Ground: React.FC = () => (
  <>
    <mesh position={[0, 0, -6]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[90, 90]} />
      <meshStandardMaterial color={GREEN} roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 0.02, -4]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.4, 12]} />
      <meshStandardMaterial color={PATH} roughness={1} metalness={0} />
    </mesh>
  </>
);

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

// ================= Props prosedural (tidak ada model GLB-nya) =================
// Poster + tanda X merah besar (hoaks).
const PosterX: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position} rotation={[0, 0, Math.sin(frame * 0.03) * 0.03]}>
    <mesh>
      <boxGeometry args={[1.7, 2.3, 0.08]} />
      <meshStandardMaterial color="#F2EFE8" roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.7, 0.06]}>
      <boxGeometry args={[1.3, 0.18, 0.02]} />
      <meshStandardMaterial color={RED} roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.35, 0.06]}>
      <boxGeometry args={[1.3, 0.18, 0.02]} />
      <meshStandardMaterial color="#C9C4B8" roughness={0.6} />
    </mesh>
    <mesh position={[0, 0, 0.06]}>
      <boxGeometry args={[1.3, 0.18, 0.02]} />
      <meshStandardMaterial color="#C9C4B8" roughness={0.6} />
    </mesh>
    {/* X merah */}
    <mesh position={[0, -0.55, 0.08]} rotation={[0, 0, Math.PI / 4]}>
      <boxGeometry args={[1.5, 0.22, 0.04]} />
      <meshStandardMaterial color={RED} roughness={0.5} />
    </mesh>
    <mesh position={[0, -0.55, 0.08]} rotation={[0, 0, -Math.PI / 4]}>
      <boxGeometry args={[1.5, 0.22, 0.04]} />
      <meshStandardMaterial color={RED} roughness={0.5} />
    </mesh>
  </group>
);

// HP di tangan (kotak + layar).
const Phone: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position} rotation={[0, 0.2, Math.sin(frame * 0.03) * 0.05]}>
    <mesh>
      <boxGeometry args={[0.5, 0.9, 0.07]} />
      <meshStandardMaterial color="#2B2B2B" roughness={0.4} metalness={0.3} />
    </mesh>
    <mesh position={[0, 0, 0.045]}>
      <planeGeometry args={[0.42, 0.78]} />
      <meshStandardMaterial color="#BFE0F0" roughness={0.3} emissive="#7FB8D8" emissiveIntensity={0.6} />
    </mesh>
  </group>
);

// Laptop di atas meja kecil.
const LaptopSet: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position}>
    <mesh position={[0, 0.95, 0]}>
      <boxGeometry args={[2.0, 0.12, 1.1]} />
      <meshStandardMaterial color="#D8C9A8" roughness={0.8} />
    </mesh>
    {[
      [-0.9, -0.45],
      [0.9, -0.45],
      [-0.9, 0.45],
      [0.9, 0.45],
    ].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.45, z]}>
        <boxGeometry args={[0.1, 0.9, 0.1]} />
        <meshStandardMaterial color="#B8A888" roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[0, 1.05, 0]} rotation={[-0.06, 0, 0]}>
      <boxGeometry args={[1.3, 0.06, 0.85]} />
      <meshStandardMaterial color="#3A3A3A" roughness={0.4} metalness={0.3} />
    </mesh>
    <mesh position={[0, 1.55, -0.38]} rotation={[-0.25, 0, 0]}>
      <boxGeometry args={[1.3, 0.9, 0.06]} />
      <meshStandardMaterial color="#2B2B2B" roughness={0.4} metalness={0.3} />
    </mesh>
    <mesh position={[0, 1.55, -0.34]} rotation={[-0.25, 0, 0]}>
      <planeGeometry args={[1.15, 0.78]} />
      <meshStandardMaterial color="#BFE0F0" roughness={0.3} emissive="#7FB8D8" emissiveIntensity={0.6} />
    </mesh>
  </group>
);

// Tumpukan koin emas + X merah (bayar biar lolos = penipuan).
const CoinsX: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position} rotation={[0, Math.sin(frame * 0.02) * 0.1, 0]}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[i * 0.55 - 0.55, 0.14, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.28 + i * 0.14, 16]} />
        <meshStandardMaterial color="#F2C200" roughness={0.35} metalness={0.6} />
      </mesh>
    ))}
    <mesh position={[0, 1.15, 0.1]} rotation={[0, 0, Math.PI / 4]}>
      <boxGeometry args={[1.6, 0.2, 0.04]} />
      <meshStandardMaterial color={RED} roughness={0.5} />
    </mesh>
    <mesh position={[0, 1.15, 0.1]} rotation={[0, 0, -Math.PI / 4]}>
      <boxGeometry args={[1.6, 0.2, 0.04]} />
      <meshStandardMaterial color={RED} roughness={0.5} />
    </mesh>
  </group>
);

// Kalender dinding (belum diumumin).
const Calendar: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position} rotation={[0, 0, Math.sin(frame * 0.02) * 0.02]}>
    <mesh>
      <boxGeometry args={[1.8, 2.2, 0.08]} />
      <meshStandardMaterial color="#F2EFE8" roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.85, 0.06]}>
      <boxGeometry args={[1.8, 0.5, 0.04]} />
      <meshStandardMaterial color={RED} roughness={0.6} />
    </mesh>
    {Array.from({ length: 6 }).map((_, i) => (
      <mesh key={i} position={[-0.55 + (i % 3) * 0.55, 0.25 - Math.floor(i / 3) * 0.55, 0.06]}>
        <boxGeometry args={[0.4, 0.4, 0.02]} />
        <meshStandardMaterial color="#C9C4B8" roughness={0.7} />
      </mesh>
    ))}
    <mesh position={[0, -0.75, 0.06]}>
      <boxGeometry args={[1.2, 0.3, 0.02]} />
      <meshStandardMaterial color={AMBER} roughness={0.6} />
    </mesh>
  </group>
);

// Centang hijau besar (gratis / benar).
const BigCheck: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => {
  const s = 1 + Math.sin(frame * 0.05) * 0.04;
  return (
    <group position={position} scale={[s, s, s]}>
      <mesh>
        <cylinderGeometry args={[0.9, 0.9, 0.12, 24]} />
        <meshStandardMaterial color="#2E9E4A" roughness={0.5} />
      </mesh>
      <mesh position={[-0.18, -0.05, 0.08]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.5, 0.16, 0.05]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
      <mesh position={[0.25, 0.12, 0.08]} rotation={[0, 0, -0.8]}>
        <boxGeometry args={[0.85, 0.16, 0.05]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
    </group>
  );
};

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
  const sway = Math.sin(frame * 0.02) * 0.02;
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[30, 50, 20]} intensity={1.2} />
      <Ground />
      <Clouds frame={frame} />
      {models?.house && (
        <group position={[0, 0, -12]}>
          <primitive object={models.house} />
        </group>
      )}
      <TreeCluster position={[-11, 0, -7]} seed={3} sway={sway} />
      <TreeCluster position={[11, 0, -9]} seed={7} sway={-sway} />
      {models?.lamp && (
        <group position={[4.5, 0, -5]}>
          <primitive object={models.lamp} />
        </group>
      )}

      {/* S0 HOOK: pria + HP, poster hoaks dicoret X */}
      {scene === 0 && (
        <>
          <Figure group={models?.man} position={[1.4, 0, -7.5]} rotY={-0.4} bob={0.05} frame={frame} />
          <Phone position={[0.9, 1.35, -7.2]} frame={frame} />
          <Figure group={models?.woman} position={[-1.6, 0, -8.5]} rotY={0.35} bob={0.03} frame={frame} />
          <PosterX position={[-0.2, 2.6, -9]} frame={frame} />
        </>
      )}
      {/* S1: cek langsung di laptop */}
      {scene === 1 && (
        <>
          <LaptopSet position={[2.2, 0, -7]} frame={frame} />
          <Figure group={models?.man} position={[1.0, 0, -6.2]} rotY={0.9} bob={0.03} frame={frame} />
          <Figure
            group={models?.woman}
            position={[-1.4, 0, -7.2]}
            rotY={0.5}
            bob={0.02}
            frame={frame}
            moveX={[-1.4, -0.6]}
            local={local}
            len={sceneLen}
          />
        </>
      )}
      {/* S2: angka 0 — tidak ada tab CPNS 2026 */}
      {scene === 2 && (
        <>
          <Figure group={models?.man} position={[0, 0, -5]} rotY={0} bob={0.04} frame={frame} />
          <Figure group={models?.woman} position={[-2.2, 0, -6]} rotY={0.4} bob={0.03} frame={frame} />
        </>
      )}
      {/* S3: Sekolah Rakyat — guru + gedung */}
      {scene === 3 && (
        <>
          <Figure group={models?.woman} position={[-0.9, 0, -9.3]} rotY={0.15} bob={0.03} frame={frame} />
          <Figure
            group={models?.man}
            position={[1.2, 0, -8]}
            rotY={-0.3}
            bob={0.05}
            frame={frame}
            moveX={[1.2, 2.2]}
            local={local}
            len={sceneLen}
          />
        </>
      )}
      {/* S4: bayar biar lolos = penipuan */}
      {scene === 4 && (
        <>
          <CoinsX position={[0, 0.6, -5.5]} frame={frame} />
          <Figure group={models?.man} position={[-1.8, 0, -6]} rotY={0.5} bob={0.04} frame={frame} />
          <Figure group={models?.woman} position={[2.0, 0, -6.5]} rotY={-0.5} bob={0.03} frame={frame} />
        </>
      )}
      {/* S5: stempel HOAKS dari BKN */}
      {scene === 5 && (
        <>
          <PosterX position={[0, 2.4, -8]} frame={frame} />
          <Figure group={models?.man} position={[1.6, 0, -6.5]} rotY={-0.5} bob={0.03} frame={frame} />
          <Figure group={models?.woman} position={[-1.8, 0, -7]} rotY={0.4} bob={0.04} frame={frame} />
        </>
      )}
      {/* S6: kalender — belum diumumin */}
      {scene === 6 && (
        <>
          <Calendar position={[0, 2.2, -7]} frame={frame} />
          <Figure group={models?.man} position={[0.4, 0, -5.5]} rotY={0} bob={0.02} bobSpeed={0.03} frame={frame} />
        </>
      )}
      {/* S7: GRATIS — centang hijau */}
      {scene === 7 && (
        <>
          <BigCheck position={[0, 2.0, -6]} frame={frame} />
          <Figure group={models?.man} position={[0, 0, -5]} rotY={0} bob={0.06} frame={frame} />
          <Figure group={models?.woman} position={[-2.4, 0, -6]} rotY={0.4} bob={0.03} frame={frame} />
        </>
      )}
      {/* S8: penutup — cek sendiri */}
      {scene === 8 && (
        <>
          <Figure group={models?.woman} position={[-0.9, 0, -9.3]} rotY={0.15} bob={0.02} frame={frame} />
          <Figure group={models?.man} position={[0.9, 0, -8.2]} rotY={-0.15} bob={0.04} frame={frame} />
          <Phone position={[0.4, 1.35, -7.8]} frame={frame} />
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
      CPNS 2026 Udah Dibuka?
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 64,
        fontWeight: 800,
        color: RED,
        lineHeight: 1.25,
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      BOHONG.
    </div>
  </div>
);

// Angka kunci sebagai grafis besar (scene angka saja).
const BIG_NUMBERS: Record<number, { n: string; label: string }> = {
  2: { n: "0", label: "tab CPNS 2026 di SSCASN" },
};

const BigNumber: React.FC<{ scene: number }> = ({ scene }) => {
  const b = BIG_NUMBERS[scene];
  if (!b) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 400,
        left: 70,
        right: 70,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 190,
          fontWeight: 800,
          color: AMBER,
          lineHeight: 1,
          textShadow: SHADOW,
        }}
      >
        {b.n}
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 800,
          color: "#FFFFFF",
          marginTop: 8,
          textShadow: SHADOW,
        }}
      >
        {b.label}
      </div>
    </div>
  );
};

// Stempel merah HOAKS (scene 5).
const Stamp: React.FC<{ scene: number }> = ({ scene }) => {
  if (scene !== 5) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 560,
        left: 0,
        right: 0,
        textAlign: "center",
        transform: "rotate(-8deg)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontFamily: FONT,
          fontSize: 110,
          fontWeight: 800,
          color: RED,
          border: "10px solid " + RED,
          borderRadius: 20,
          padding: "6px 34px",
          backgroundColor: "rgba(255,255,255,0.85)",
        }}
      >
        HOAKS
      </span>
    </div>
  );
};

const SUBTITLES: { text: string; highlight: string }[] = [
  { text: "CPNS 2026 udah dibuka? Bohong.", highlight: "Bohong" },
  { text: "Gua cek langsung di SSCASN pagi ini.", highlight: "sscasn" },
  { text: "Di daftar formasi, nggak ada tab CPNS 2026.", highlight: "nggak" },
  { text: "Yang ada cuma Sekolah Rakyat — itu PPPK.", highlight: "PPPK" },
  { text: "Disuruh bayar biar lolos? Itu penipuan.", highlight: "penipuan" },
  { text: "BKN dari Juni udah bilang: poster itu hoaks.", highlight: "hoaks" },
  { text: "Formasi, jadwal, syarat — belum diumumin.", highlight: "belum" },
  { text: "Yang pasti: rekrutmen diadain 2026, dan gratis.", highlight: "gratis" },
  { text: "Cek sendiri di sscasn.bkn.go.id.", highlight: "sendiri" },
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

// ================= Scene bounds (fraksi dari TOTAL — retime = ubah 1 angka) =================
// TOTAL diisi durasi VO asli (detik) x 30 setelah ffprobe.
const TOTAL = 1719; // retimed to real VO: 57.288s x 30fps (ffprobe 2026-11-22)
const FRAC = [0, 0.1, 0.2, 0.32, 0.44, 0.56, 0.68, 0.78, 0.88, 1.0];
const SCENE_BOUNDS = FRAC.map((f) => Math.round(f * TOTAL));
const SKIES = [SKY, SKY, SKY, SKY, SKY, SKY, SKY, SKY, SKY_WARM];

export const CpnsFormasiExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const [models, setModels] = useState<Models | null>(null);
  const [handle] = useState(() => delayRender("Loading GLB models cpns-formasi"));

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
          if (key === "house") {
            brightenHouse(g.scene);
          }
          results[key] = normalizeHeight(g.scene, h);
          done += 1;
          if (done === jobs.length) {
            setModels(results);
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
    camPos = easeCam(local, sceneLen, [12, 6, 7], [10, 5, 4]);
    camTarget = [0, 2.2, -9];
  } else if (scene === 1) {
    camPos = easeCam(local, sceneLen, [5, 3, 3], [3.5, 2.4, 0.5]);
    camTarget = [1, 1.5, -7];
  } else if (scene === 2) {
    camPos = easeCam(local, sceneLen, [4, 3, 2], [3, 2.5, 0]);
    camTarget = [0, 1.5, -5];
  } else if (scene === 3) {
    camPos = easeCam(local, sceneLen, [6, 3.5, 2], [4.5, 3, 0]);
    camTarget = [0, 1.8, -9];
  } else if (scene === 4) {
    camPos = easeCam(local, sceneLen, [4, 3, 2], [3, 2.5, 0]);
    camTarget = [0, 1.2, -5.5];
  } else if (scene === 5) {
    camPos = easeCam(local, sceneLen, [7, 4, 3], [5.5, 3.5, 1]);
    camTarget = [0, 2, -8];
  } else if (scene === 6) {
    camPos = easeCam(local, sceneLen, [4, 3.5, 2], [3, 3, 0.5]);
    camTarget = [0, 1.8, -7];
  } else if (scene === 7) {
    camPos = easeCam(local, sceneLen, [4, 3, 2], [3, 2.5, 0]);
    camTarget = [0, 1.5, -6];
  } else {
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
      <Audio src={staticFile("audio/cpns-formasi/vo_sami.mp3")} volume={1} />
      <Audio src={staticFile("audio/sudut-ganjil/bgm_chill.mp3")} volume={0.15} />
      {SCENE_BOUNDS.slice(0, 9).map((f) => (
        <Sequence key={`whoosh-${f}`} from={f} durationInFrames={15}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}
      {scene === 0 && <Headline />}
      <BigNumber scene={scene} />
      <Stamp scene={scene} />
      <Subtitle scene={scene} local={local} />
      <WatermarkText />
    </AbsoluteFill>
  );
};
