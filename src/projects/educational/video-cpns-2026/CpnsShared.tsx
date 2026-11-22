// ================= CpnsShared — helpers + props + teks bersama 4 video CPNS 2026 =================
// Profil B toy-explainer. GLB dulu; trees.glb DILARANG. Fix GLB: frustumCulled=false
// + DoubleSide + metalness=0 (normalizeHeight). Subtitle: pill gelap (fix pagi ini).

import { interpolate } from "remotion";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Easing } from "remotion";

export const SKY = "#C8DCE8";
export const SKY_WARM = "#F2D8A8";
export const SKY_MUTED = "#B8C8D4";
export const GREEN = "#A8C3A0";
export const PATH = "#E8E0CC";
export const AMBER = "#FFB300";
export const ORANGE = "#FF7A00";
export const RED = "#E61919";
export const LEAF = "#7FAE7A";
export const LEAF_DARK = "#6B9E6B";
export const WATER_BLUE = "#2E86C1";
export const LAMP_WARM = "#FFC873";

export const FONT = "Inter, Arial, sans-serif";
export const SHADOW = "0 4px 14px rgba(0,0,0,0.85)";

export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const normalizeHeight = (scene: THREE.Group, targetH: number): THREE.Group => {
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

export const brightenHouse = (scene: THREE.Group): void => {
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

export const easeCam = (
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

export const CameraRig: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
}> = ({ position, target }) => {
  const camera = useThree((state) => state.camera);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  return null;
};

export const Ground: React.FC = () => (
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

export const Clouds: React.FC<{ frame: number }> = ({ frame }) => {
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

export const Tree: React.FC<{ h: number; x: number; z: number }> = ({ h, x, z }) => (
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

export const TreeCluster: React.FC<{ position: [number, number, number]; seed: number; sway: number }> = ({
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

export const Figure: React.FC<{
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

export type Models = {
  house?: THREE.Group;
  house2?: THREE.Group;
  man?: THREE.Group;
  woman?: THREE.Group;
  lamp?: THREE.Group;
};

// ================= Props prosedural =================
export const PosterX: React.FC<{ position: [number, number, number]; frame: number }> = ({
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

export const Phone: React.FC<{ position: [number, number, number]; frame: number }> = ({
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

export const LaptopSet: React.FC<{ position: [number, number, number]; frame: number }> = ({
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

export const CoinsX: React.FC<{ position: [number, number, number]; frame: number }> = ({
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

export const Calendar: React.FC<{ position: [number, number, number]; frame: number }> = ({
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

export const BigCheck: React.FC<{ position: [number, number, number]; frame: number }> = ({
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

// Bendera (program prioritas).
export const Flag: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position} rotation={[0, 0, Math.sin(frame * 0.02) * 0.02]}>
    <mesh position={[0, 1.6, 0]}>
      <cylinderGeometry args={[0.06, 0.06, 3.2, 8]} />
      <meshStandardMaterial color="#8A6B4A" roughness={0.8} />
    </mesh>
    <mesh position={[0.55, 2.7, 0]} rotation={[0, 0, 0]}>
      <boxGeometry args={[1.1, 0.7, 0.04]} />
      <meshStandardMaterial color={AMBER} roughness={0.6} />
    </mesh>
    <mesh position={[0, 3.25, 0]}>
      <sphereGeometry args={[0.12, 10, 8]} />
      <meshStandardMaterial color={AMBER} roughness={0.5} />
    </mesh>
  </group>
);

// Api kecil (Manggala Agni) — cone oranye/kuning + emissive, berdenyut.
export const Fire: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => {
  const s = 1 + Math.sin(frame * 0.08) * 0.12;
  return (
    <group position={position} scale={[s, 1 + Math.sin(frame * 0.08) * 0.18, s]}>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.55, 1.3, 10]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} emissive={ORANGE} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.32, 0.85, 10]} />
        <meshStandardMaterial color="#FFD23F" roughness={0.6} emissive="#FFD23F" emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
};

// Dokumen / surat resmi (pengumuman).
export const Document: React.FC<{ position: [number, number, number]; frame: number }> = ({
  position,
  frame,
}) => (
  <group position={position} rotation={[0, 0, Math.sin(frame * 0.02) * 0.03]}>
    <mesh>
      <boxGeometry args={[1.5, 2.0, 0.07]} />
      <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.65, 0.05]}>
      <boxGeometry args={[1.1, 0.16, 0.02]} />
      <meshStandardMaterial color="#2B4A6B" roughness={0.6} />
    </mesh>
    {[0.3, -0.05, -0.4].map((y, i) => (
      <mesh key={i} position={[0, y, 0.05]}>
        <boxGeometry args={[1.1, 0.14, 0.02]} />
        <meshStandardMaterial color="#C9C4B8" roughness={0.7} />
      </mesh>
    ))}
    <mesh position={[0, -0.75, 0.05]}>
      <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
      <meshStandardMaterial color={RED} roughness={0.5} />
    </mesh>
  </group>
);

// ================= Lapisan teks =================
export const Headline2: React.FC<{ line1: string; line2: string; line2Color?: string }> = ({
  line1,
  line2,
  line2Color = AMBER,
}) => (
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
      {line1}
    </div>
    <div
      style={{
        fontFamily: FONT,
        fontSize: 56,
        fontWeight: 800,
        color: line2Color,
        lineHeight: 1.25,
        marginTop: 10,
        textShadow: SHADOW,
      }}
    >
      {line2}
    </div>
  </div>
);

export const BigNumberOverlay: React.FC<{ n: string; label: string }> = ({ n, label }) => (
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
        fontSize: 170,
        fontWeight: 800,
        color: AMBER,
        lineHeight: 1,
        textShadow: SHADOW,
      }}
    >
      {n}
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
      {label}
    </div>
  </div>
);

export const StampOverlay: React.FC<{ text: string }> = ({ text }) => (
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
      {text}
    </span>
  </div>
);

export const SubtitleText: React.FC<{ text: string; highlight: string; local: number }> = ({
  text,
  highlight,
  local,
}) => {
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
          const hlClean = highlight.toLowerCase().replace(/[^a-z0-9-]/g, "");
          const isMatch = clean !== "" && clean === hlClean;
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

export const WatermarkText: React.FC = () => (
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
