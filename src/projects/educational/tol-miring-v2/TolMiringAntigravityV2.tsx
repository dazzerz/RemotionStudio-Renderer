import React, { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const TOL_MIRING_V2_FPS = 30;
export const TOL_MIRING_V2_FRAMES = 1665; // ~55.5s (VO is 55.296s)

type LoadedModels = {
  car?: THREE.Group;
  lamp?: THREE.Group;
};

function normalizeModel(scene: THREE.Group, targetHeight: number): THREE.Group {
  const root = scene.clone(true);
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      if (m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          mat.side = THREE.DoubleSide;
        });
      }
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const scale = size.y > 0.001 ? targetHeight / size.y : 1;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  const wrapper = new THREE.Group();
  wrapper.add(root);
  return wrapper;
}

function tintCar(group: THREE.Group, hex: string): THREE.Group {
  const clone = group.clone(true);
  clone.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      if (m.material && !Array.isArray(m.material)) {
        const mat = m.material.clone() as THREE.MeshStandardMaterial;
        const n = (m.name || "").toLowerCase();
        if (
          mat.color &&
          !n.includes("wheel") &&
          !n.includes("tire") &&
          !n.includes("glass") &&
          !n.includes("window") &&
          !n.includes("light") &&
          mat.color.r + mat.color.g + mat.color.b > 0.4
        ) {
          mat.color.set(hex);
          mat.roughness = 0.32;
          mat.metalness = 0.22;
        }
        m.material = mat;
      }
    }
  });
  return clone;
}

// Smooth S-highway curve: straight from z=40 to z=-15, then gentle right curve
function roadX(z: number): number {
  if (z >= -15) return 0;
  const t = (-15 - z) / 110;
  return 26 * t * t;
}

function roadYaw(z: number): number {
  const dx = roadX(z - 0.5) - roadX(z + 0.5);
  return Math.atan2(dx, -1);
}

function roadBank(z: number, enableBank: boolean): number {
  if (!enableBank || z >= -10) return 0;
  const t = Math.min(1, (-10 - z) / 28);
  // Smooth ease-in banking up to ~9 deg visual tilt (right edge lower, left edge higher)
  const smooth = t * t * (3 - 2 * t);
  return 0.16 * smooth;
}

// Compute a world point on the banked road at longitudinal z, lateral offset u, height v
function roadPoint(z: number, u: number, v: number, enableBank: boolean): THREE.Vector3 {
  const cx = roadX(z);
  const yaw = roadYaw(z);
  const bank = roadBank(z, enableBank);
  // Local right vector tilted by banking angle (left side rises, right side drops for right curve)
  const cosB = Math.cos(bank);
  const sinB = Math.sin(bank);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const localRight = new THREE.Vector3(rx * cosB, -sinB, rz * cosB);
  const localUp = new THREE.Vector3(rx * sinB, cosB, rz * sinB);
  return new THREE.Vector3(cx, 0.2, z)
    .addScaledVector(localRight, u)
    .addScaledVector(localUp, v);
}

// Build a seamless continuous ribbon mesh along the highway curve
function buildRoadRibbon(
  zStart: number,
  zEnd: number,
  steps: number,
  uLeft: number,
  uRight: number,
  vOffset: number,
  enableBank: boolean
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const z = zStart + ((zEnd - zStart) * i) / steps;
    const pL = roadPoint(z, uLeft, vOffset, enableBank);
    const pR = roadPoint(z, uRight, vOffset, enableBank);
    positions.push(pL.x, pL.y, pL.z, pR.x, pR.y, pR.z);
    if (i < steps) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const CameraRig: React.FC<{
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
}> = ({ pos, lookAt, fov = 44 }) => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [camera, pos[0], pos[1], pos[2], lookAt[0], lookAt[1], lookAt[2], fov]);
  return null;
};

const ForceArrow3D: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  color: string;
}> = ({ position, rotation, length, color }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, length / 2, 0]} castShadow>
      <cylinderGeometry args={[0.11, 0.11, length, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.3} />
    </mesh>
    <mesh position={[0, length + 0.3, 0]} castShadow>
      <coneGeometry args={[0.3, 0.62, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.3} />
    </mesh>
  </group>
);

const HighwayWorld: React.FC<{
  frame: number;
  models: LoadedModels;
}> = ({ frame, models }) => {
  const tSec = frame / TOL_MIRING_V2_FPS;
  const isFlatSkidScene = frame >= 360 && frame < 540;
  const enableBank = !isFlatSkidScene;

  // Hero car moves forward along negative Z
  const carZ = interpolate(frame, [0, TOL_MIRING_V2_FRAMES], [22, -112], {
    extrapolateRight: "clamp",
  });
  const baseLaneU = 2.0; // Right lane
  const skidU = isFlatSkidScene
    ? interpolate(frame, [385, 520], [0, -3.1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;
  const skidYaw = isFlatSkidScene
    ? interpolate(frame, [385, 520], [0, -0.26], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const heroU = baseLaneU + skidU;
  const heroPos = roadPoint(carZ, heroU, 0.05 + Math.sin(tSec * 14) * 0.02, enableBank);
  const cyaw = roadYaw(carZ);
  const cbank = roadBank(carZ, enableBank);

  // Seamless continuous highway geometries
  const { roadGeo, leftYellowGeo, rightYellowGeo, leftRailGeo, rightRailGeo, dashes } =
    useMemo(() => {
      const zS = 40;
      const zE = -145;
      const steps = 120;
      const rGeo = buildRoadRibbon(zS, zE, steps, -5.2, 5.2, 0.0, enableBank);
      const lY = buildRoadRibbon(zS, zE, steps, -4.55, -4.35, 0.03, enableBank);
      const rY = buildRoadRibbon(zS, zE, steps, 4.35, 4.55, 0.03, enableBank);
      const lR = buildRoadRibbon(zS, zE, steps, -5.35, -5.15, 0.65, enableBank);
      const rR = buildRoadRibbon(zS, zE, steps, 5.15, 5.35, 0.65, enableBank);

      const dashGeos: THREE.BufferGeometry[] = [];
      for (let z = zS; z > zE + 4; z -= 5) {
        dashGeos.push(buildRoadRibbon(z, z - 2.3, 4, -0.1, 0.1, 0.03, enableBank));
      }
      return {
        roadGeo: rGeo,
        leftYellowGeo: lY,
        rightYellowGeo: rY,
        leftRailGeo: lR,
        rightRailGeo: rR,
        dashes: dashGeos,
      };
    }, [enableBank]);

  // Roadside lamp & tree placements following the curve cleanly
  const propsAlongRoad = useMemo(() => {
    const items: { z: number; idx: number }[] = [];
    for (let i = 0; i < 36; i++) {
      items.push({ z: 34 - i * 5, idx: i });
    }
    return items;
  }, []);

  // Cloned tinted GLB cars
  const heroCar = useMemo(
    () => (models.car ? tintCar(models.car, "#f97316") : null),
    [models.car]
  );
  const trafficCar1 = useMemo(
    () => (models.car ? tintCar(models.car, "#38bdf8") : null),
    [models.car]
  );
  const trafficCar2 = useMemo(
    () => (models.car ? tintCar(models.car, "#f1f5f9") : null),
    [models.car]
  );

  // Traffic cars ahead in left lane moving forward cleanly
  const t1Z = 10 - ((frame * 0.16) % 140);
  const t2Z = -48 - ((frame * 0.13) % 100);
  const t1Pos = roadPoint(t1Z, -2.2, 0.05, enableBank);
  const t2Pos = roadPoint(t2Z, -2.2, 0.05, enableBank);

  // Dynamic camera choreography — ALWAYS centered on heroPos!
  let camPos: [number, number, number] = [heroPos.x, heroPos.y + 4.0, heroPos.z + 10.5];
  let camLook: [number, number, number] = [heroPos.x, heroPos.y + 1.0, heroPos.z - 6];
  let fov = 45;

  if (frame < 180) {
    // Scene 1: Clean rear chase push-in showing full car + curving highway ahead
    const p = frame / 180;
    camPos = [heroPos.x - 1.2 + p * 0.8, heroPos.y + 3.6, heroPos.z + 9.2 - p * 1.0];
    camLook = [heroPos.x - 0.6, heroPos.y + 1.2, heroPos.z - 10];
    fov = 46;
  } else if (frame < 360) {
    // Scene 2: Wide 3/4 side-front tracking showing car moving forward + red inertia arrow
    camPos = [heroPos.x - 8.2, heroPos.y + 3.6, heroPos.z + 5.8];
    camLook = [heroPos.x, heroPos.y + 1.1, heroPos.z - 2.2];
    fov = 44;
  } else if (frame < 540) {
    // Scene 3: Clean high 3/4 overhead view of flat-road skid
    camPos = [heroPos.x - 3.5, heroPos.y + 12.5, heroPos.z + 8.5];
    camLook = [heroPos.x - 0.5, heroPos.y + 0.6, heroPos.z - 1.5];
    fov = 44;
  } else if (frame < 900) {
    // Scene 4: Rear 3/4 view showing banked road tilt + all 3 force vectors clearly
    const p = (frame - 540) / 360;
    camPos = [heroPos.x - 2.6 + p * 1.6, heroPos.y + 3.6, heroPos.z + 9.8];
    camLook = [heroPos.x, heroPos.y + 1.8, heroPos.z - 1.0];
    fov = 46;
  } else if (frame < 1380) {
    // Scene 5: Elevated sweeping drone view for 12% / 6.8 deg stat (no hills blocking!)
    const p = (frame - 900) / 480;
    camPos = [heroPos.x - 5.5 + p * 4.0, heroPos.y + 11.0, heroPos.z + 11.5];
    camLook = [heroPos.x, heroPos.y + 0.8, heroPos.z - 4.0];
    fov = 44;
  } else {
    // Scene 6: Bright elevated chase finale
    const p = (frame - 1380) / (TOL_MIRING_V2_FRAMES - 1380);
    camPos = [heroPos.x - 2.5 + p * 2.0, heroPos.y + 6.2 + p * 1.8, heroPos.z + 11.0];
    camLook = [heroPos.x, heroPos.y + 1.0, heroPos.z - 8.0];
    fov = 45;
  }

  return (
    <>
      <color attach="background" args={["#bae6fd"]} />
      <fog attach="fog" args={["#dbeafe", 55, 175]} />

      <CameraRig pos={camPos} lookAt={camLook} fov={fov} />

      {/* Bright sunny lighting with soft shadows */}
      <hemisphereLight args={["#f0f9ff", "#65a30d", 1.1]} />
      <directionalLight
        position={[30, 55, 35]}
        intensity={1.65}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Wide bright green terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, -0.35, -55]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#84cc16" roughness={0.95} />
      </mesh>

      {/* Distant rolling hills placed FAR away from the road so they NEVER clip */}
      {[
        [-88, -3, -45, 34, "#65a30d"],
        [-95, -4, -125, 42, "#4d7c0f"],
        [108, -3, -35, 32, "#65a30d"],
        [125, -4, -115, 44, "#4d7c0f"],
        [20, -5, -210, 52, "#4d7c0f"],
      ].map(([x, y, z, r, col], idx) => (
        <mesh key={idx} position={[x as number, y as number, z as number]} scale={[1.6, 0.45, 1.3]}>
          <sphereGeometry args={[r as number, 20, 14]} />
          <meshStandardMaterial color={col as string} roughness={0.95} />
        </mesh>
      ))}

      {/* Fluffy bright clouds */}
      {[
        [-22, 24, -45],
        [28, 28, -75],
        [-10, 26, -115],
        [45, 29, -135],
      ].map(([x, y, z], i) => (
        <group key={i} position={[(x as number) + tSec * 0.3, y as number, z as number]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[3.4, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          <mesh position={[2.8, -0.4, 0.3]}>
            <sphereGeometry args={[2.5, 12, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={1} />
          </mesh>
          <mesh position={[-2.6, -0.5, -0.2]}>
            <sphereGeometry args={[2.3, 12, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Seamless Curved & Banked Highway */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial color="#334155" roughness={0.86} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={leftYellowGeo}>
        <meshStandardMaterial color="#facc15" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rightYellowGeo}>
        <meshStandardMaterial color="#facc15" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={leftRailGeo} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.45} roughness={0.38} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rightRailGeo} castShadow>
        <meshStandardMaterial color="#e2e8f0" metalness={0.45} roughness={0.38} side={THREE.DoubleSide} />
      </mesh>
      {dashes.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Roadside Guardrail Posts, Real GLB Streetlamps, and Stylized Trees */}
      {propsAlongRoad.map(({ z, idx }) => {
        const pL = roadPoint(z, -5.25, 0.35, enableBank);
        const pR = roadPoint(z, 5.25, 0.35, enableBank);
        const lampPos = roadPoint(z, 6.2, 0.0, enableBank);
        const treeL = roadPoint(z, -10.5 - (idx % 3) * 2.5, -0.2, false);
        const treeR = roadPoint(z, 11.5 + (idx % 3) * 2.2, -0.2, false);
        const yaw = roadYaw(z);
        return (
          <group key={idx}>
            <mesh position={[pL.x, pL.y, pL.z]}>
              <boxGeometry args={[0.14, 0.72, 0.14]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[pR.x, pR.y, pR.z]}>
              <boxGeometry args={[0.14, 0.72, 0.14]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            {models.lamp && idx % 3 === 0 && (
              <primitive
                object={models.lamp.clone(true)}
                position={[lampPos.x, lampPos.y, lampPos.z]}
                rotation={[0, yaw - Math.PI / 2, 0]}
              />
            )}
            {idx % 2 === 0 && (
              <group position={[treeL.x, treeL.y, treeL.z]}>
                <mesh position={[0, 1.1, 0]} castShadow>
                  <cylinderGeometry args={[0.24, 0.34, 2.2, 8]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
                <mesh position={[0, 3.0, 0]} castShadow>
                  <coneGeometry args={[1.5, 2.8, 10]} />
                  <meshStandardMaterial color="#15803d" />
                </mesh>
                <mesh position={[0, 4.4, 0]} castShadow>
                  <coneGeometry args={[1.05, 2.1, 10]} />
                  <meshStandardMaterial color="#22c55e" />
                </mesh>
              </group>
            )}
            {idx % 3 === 1 && (
              <group position={[treeR.x, treeR.y, treeR.z]}>
                <mesh position={[0, 1.1, 0]} castShadow>
                  <cylinderGeometry args={[0.24, 0.34, 2.2, 8]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
                <mesh position={[0, 3.0, 0]} castShadow>
                  <coneGeometry args={[1.45, 2.7, 10]} />
                  <meshStandardMaterial color="#15803d" />
                </mesh>
                <mesh position={[0, 4.3, 0]} castShadow>
                  <coneGeometry args={[1.0, 2.0, 10]} />
                  <meshStandardMaterial color="#22c55e" />
                </mesh>
              </group>
            )}
          </group>
        );
      })}

      {/* Hero Car (Real GLB facing FORWARD along -Z!) */}
      <group
        position={[heroPos.x, heroPos.y, heroPos.z]}
        rotation={[0, cyaw + skidYaw, -cbank]}
      >
        {heroCar ? (
          <primitive object={heroCar} />
        ) : (
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[1.9, 1.2, 4.0]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
        )}

        {/* Scene 2: Red Inertia Arrow pointing straight ahead (-Z) */}
        {frame >= 180 && frame < 360 && (
          <ForceArrow3D
            position={[0, 1.4, -2.2]}
            rotation={[-Math.PI / 2, 0, 0]}
            length={3.2}
            color="#ef4444"
          />
        )}

        {/* Scene 4: 3D Force Vectors cleanly positioned around the car */}
        {frame >= 540 && frame < 900 && (
          <>
            {/* Gaya Normal (tilted inward with banked road) */}
            <ForceArrow3D
              position={[0, 1.85, 0]}
              rotation={[0, 0, -0.22]}
              length={2.7}
              color="#f59e0b"
            />
            {/* Gravitasi (straight down on left side) */}
            <ForceArrow3D
              position={[-1.45, 2.3, 0]}
              rotation={[0, 0, Math.PI]}
              length={2.1}
              color="#3b82f6"
            />
            {/* Gaya Sentripetal (inward toward curve center on right) */}
            <ForceArrow3D
              position={[1.3, 1.35, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              length={2.6}
              color="#22c55e"
            />
          </>
        )}
      </group>

      {/* Skid marks on flat road in Scene 3 */}
      {isFlatSkidScene && (
        <group position={[heroPos.x, heroPos.y + 0.04, heroPos.z + 3.2]} rotation={[0, cyaw, 0]}>
          {[-0.65, 0.65].map((lx, i) => (
            <mesh key={i} position={[lx, 0, 0]}>
              <boxGeometry args={[0.26, 0.02, 6.2]} />
              <meshStandardMaterial color="#0f172a" transparent opacity={0.78} />
            </mesh>
          ))}
        </group>
      )}

      {/* Traffic Cars (also facing FORWARD along -Z) */}
      {trafficCar1 && (
        <group
          position={[t1Pos.x, t1Pos.y, t1Pos.z]}
          rotation={[0, roadYaw(t1Z), -roadBank(t1Z, enableBank)]}
        >
          <primitive object={trafficCar1} />
        </group>
      )}
      {trafficCar2 && (
        <group
          position={[t2Pos.x, t2Pos.y, t2Pos.z]}
          rotation={[0, roadYaw(t2Z), -roadBank(t2Z, enableBank)]}
        >
          <primitive object={trafficCar2} />
        </group>
      )}
    </>
  );
};

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
  highlight: string;
}

const SUBTITLES: SubtitleCue[] = [
  { start: 0, end: 180, text: "Jalan tol lurus, mobil jalan normal. Begitu masuk tikungan, kenapa jalannya dibikin miring?", highlight: "miring?" },
  { start: 180, end: 360, text: "Soalnya mobil itu cenderung terus lurus, padahal jalan membelok.", highlight: "lurus," },
  { start: 360, end: 540, text: "Di jalan datar, yang nahan mobil biar nggak selip keluar cuma gesekan ban.", highlight: "gesekan" },
  { start: 540, end: 720, text: "Makanya jalan tol dimiringin, disebut superelevasi.", highlight: "superelevasi." },
  { start: 720, end: 900, text: "Miringnya bikin gaya dari jalan ikut mendorong mobil ke tengah tikungan.", highlight: "tengah" },
  { start: 900, end: 1110, text: "Pada kecepatan yang dirancang, gesekan ban hampir nggak kepakai.", highlight: "hampir" },
  { start: 1110, end: 1380, text: "Maksimal dua belas persen, atau sekitar enam koma delapan derajat.", highlight: "persen," },
  { start: 1380, end: 1560, text: "Jadi jalan datar bikin gampang selip, jalan miring bikin mobil tetap stabil.", highlight: "stabil." },
  { start: 1560, end: 1665, text: "Tikungan paling miring yang pernah lo lewatin di mana?", highlight: "mana?" },
];

export const TolMiringAntigravityV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [models, setModels] = useState<LoadedModels | null>(null);
  const [handle] = useState(() => delayRender("Loading TolMiringV2 GLB models"));

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    const out: LoadedModels = {};
    let done = 0;
    const jobs: [keyof LoadedModels, string, number][] = [
      ["car", "models/car/car.glb", 1.75],
      ["lamp", "models/streetlamp/street-light.glb", 5.2],
    ];
    jobs.forEach(([key, url, h]) => {
      loader.load(
        staticFile(url),
        (gltf) => {
          if (cancelled) return;
          out[key] = normalizeModel(gltf.scene, h);
          done += 1;
          if (done === jobs.length) {
            setModels(out);
            setTimeout(() => continueRender(handle), 2000);
          }
        },
        undefined,
        () => {
          if (cancelled) return;
          done += 1;
          if (done === jobs.length) {
            setModels(out);
            setTimeout(() => continueRender(handle), 1000);
          }
        }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  const activeSub = SUBTITLES.find((s) => frame >= s.start && frame < s.end);
  const titleOpacity = interpolate(frame, [0, 12, 155, 175], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#bae6fd", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Audio VO + Whoosh SFX */}
      <Audio src={staticFile("audio/tol-miring/vo_sami.mp3")} volume={1.0} />
      {[180, 360, 540, 900, 1380].map((f) => (
        <Sequence key={f} from={f} durationInFrames={30}>
          <Audio src={staticFile("audio/sfx_whoosh.mp3")} volume={0.35} />
        </Sequence>
      ))}

      {/* Full-bleed 3D Canvas */}
      {models && (
        <ThreeCanvas
          width={width}
          height={height}
          shadows
          style={{ width: "100%", height: "100%" }}
        >
          <HighwayWorld frame={frame} models={models} />
        </ThreeCanvas>
      )}

      {/* Floating Hero Title (Scene 1, NO box, mobile safe zone >= 150px) */}
      {titleOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 165,
            left: 72,
            right: 72,
            textAlign: "center",
            opacity: titleOpacity,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.12,
              textShadow: "0 6px 24px rgba(0,0,0,0.75), 0 0 8px rgba(0,0,0,0.9)",
              WebkitTextStroke: "2px rgba(15,23,42,0.85)",
            }}
          >
            Kenapa Jalan Tol di Tikungan Dimiringin?
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 34,
              fontWeight: 800,
              color: "#facc15",
              textShadow: "0 4px 16px rgba(0,0,0,0.85)",
            }}
          >
            Bukan biar mobil nggak ngantuk.
          </div>
        </div>
      )}

      {/* Scene 4 Floating Force Labels */}
      {frame >= 540 && frame < 900 && (
        <div style={{ position: "absolute", top: 210, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
          <div style={{ color: "#3b82f6", fontSize: 30, fontWeight: 900, textShadow: "0 4px 14px rgba(0,0,0,0.9)" }}>
            Gravitasi
          </div>
          <div style={{ color: "#f59e0b", fontSize: 30, fontWeight: 900, textShadow: "0 4px 14px rgba(0,0,0,0.9)" }}>
            Gaya Normal
          </div>
          <div style={{ color: "#22c55e", fontSize: 30, fontWeight: 900, textShadow: "0 4px 14px rgba(0,0,0,0.9)" }}>
            Sentripetal
          </div>
        </div>
      )}

      {/* Scene 5 Big Kinetic Stat (12% / 6.8 deg) */}
      {frame >= 1080 && frame < 1380 && (
        <div
          style={{
            position: "absolute",
            top: 190,
            left: 72,
            right: 72,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: "#f97316",
              lineHeight: 1,
              textShadow: "0 8px 28px rgba(0,0,0,0.7)",
              WebkitTextStroke: "3px #ffffff",
            }}
          >
            12%
          </div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 900,
              color: "#facc15",
              marginTop: 6,
              textShadow: "0 4px 18px rgba(0,0,0,0.85)",
            }}
          >
            6,8° Superelevasi Maksimal
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#ffffff",
              marginTop: 6,
              textShadow: "0 3px 10px rgba(0,0,0,0.85)",
            }}
          >
            Standar AASHTO Green Book
          </div>
        </div>
      )}

      {/* Floating Kinetic Subtitle (safe zone bottom >= 270px, NO card) */}
      {activeSub && (
        <div
          style={{
            position: "absolute",
            bottom: 270,
            left: 72,
            right: 72,
            textAlign: "center",
            fontSize: 44,
            fontWeight: 900,
            lineHeight: 1.28,
            color: "#ffffff",
            textShadow: "0 5px 18px rgba(0,0,0,0.92), 0 0 6px rgba(0,0,0,0.95)",
            WebkitTextStroke: "1.5px rgba(0,0,0,0.8)",
          }}
        >
          {activeSub.text.split(" ").map((word, idx) => {
            const isHi = word.toLowerCase().includes(activeSub.highlight.toLowerCase());
            return (
              <span
                key={idx}
                style={{
                  color: isHi ? "#facc15" : "#ffffff",
                  marginRight: 10,
                  display: "inline-block",
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      )}

      {/* Source citation in final 6 seconds */}
      {frame >= 1470 && (
        <div
          style={{
            position: "absolute",
            bottom: 215,
            left: 72,
            right: 72,
            textAlign: "center",
            fontSize: 24,
            fontWeight: 700,
            color: "#f8fafc",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          }}
        >
          Sumber: AASHTO Green Book / Fisika Mekanika
        </div>
      )}
    </AbsoluteFill>
  );
};
