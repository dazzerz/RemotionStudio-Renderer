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
          mat.roughness = 0.35;
          mat.metalness = 0.25;
        }
        m.material = mat;
      }
    }
  });
  return clone;
}

// Road centerline: straight for z > -30, then curves right smoothly
function roadX(z: number): number {
  if (z >= -20) return 0;
  const t = (-20 - z) / 80;
  return 28 * t * t;
}

function roadYaw(z: number): number {
  const dx = roadX(z - 0.5) - roadX(z + 0.5);
  return Math.atan2(dx, -1);
}

function roadBank(z: number, enableBank: boolean): number {
  if (!enableBank || z >= -15) return 0;
  const t = Math.min(1, (-15 - z) / 25);
  return 0.14 * t; // ~8 deg visual banking
}

const CameraRig: React.FC<{
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
}> = ({ pos, lookAt, fov = 45 }) => {
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
      <cylinderGeometry args={[0.14, 0.14, length, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.3} />
    </mesh>
    <mesh position={[0, length + 0.35, 0]} castShadow>
      <coneGeometry args={[0.38, 0.75, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.3} />
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

  // Car travels along negative Z smoothly
  const carZ = interpolate(frame, [0, TOL_MIRING_V2_FRAMES], [18, -110], {
    extrapolateRight: "clamp",
  });
  const cx = roadX(carZ);
  const cyaw = roadYaw(carZ);
  const cbank = roadBank(carZ, enableBank);
  const skidOffset = isFlatSkidScene
    ? interpolate(frame, [380, 520], [0, -2.4], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;
  const skidYaw = isFlatSkidScene
    ? interpolate(frame, [380, 520], [0, -0.22], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // Subtle suspension bounce
  const bounceY = Math.sin(tSec * 14) * 0.03;

  // Build road segments
  const roadSegments = useMemo(() => {
    const segs: { z: number; x: number; yaw: number; bank: number; idx: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const z = 30 - i * 3;
      segs.push({
        z,
        x: roadX(z),
        yaw: roadYaw(z),
        bank: roadBank(z, enableBank),
        idx: i,
      });
    }
    return segs;
  }, [enableBank]);

  // Traffic cars in opposite/adjacent lane
  const traffic1Z = 5 - ((frame * 0.24) % 130);
  const traffic2Z = -35 - ((frame * 0.19) % 100);

  const heroCar = useMemo(
    () => (models.car ? tintCar(models.car, "#f97316") : null),
    [models.car]
  );
  const trafficCar1 = useMemo(
    () => (models.car ? tintCar(models.car, "#38bdf8") : null),
    [models.car]
  );
  const trafficCar2 = useMemo(
    () => (models.car ? tintCar(models.car, "#e2e8f0") : null),
    [models.car]
  );

  // Dynamic camera choreography across 6 scenes
  let camPos: [number, number, number] = [cx, 4.2, carZ + 10.5];
  let camLook: [number, number, number] = [cx, 1.3, carZ - 8];
  let fov = 45;

  if (frame < 180) {
    // Scene 1: Low-angle dynamic chase push-in
    const p = frame / 180;
    camPos = [cx + Math.sin(p * 1.5) * 1.2, 3.6 - p * 0.5, carZ + 9.5 - p * 1.2];
    camLook = [cx, 1.4, carZ - 12];
    fov = 46;
  } else if (frame < 360) {
    // Scene 2: Side-tracking shot showing curve vs straight tendency
    camPos = [cx - 8.5, 3.2, carZ + 3.5];
    camLook = [cx + 0.5, 1.2, carZ - 2.5];
    fov = 42;
  } else if (frame < 540) {
    // Scene 3: Elevated 3/4 overhead skid demo
    camPos = [cx - 4.5, 11.5, carZ + 9.0];
    camLook = [cx, 0.5, carZ - 2.0];
    fov = 44;
  } else if (frame < 930) {
    // Scene 4: Close-up rear 3/4 with 3D force vectors on banked road
    const p = (frame - 540) / 390;
    camPos = [cx - 3.2 + p * 1.8, 3.3, carZ + 8.0];
    camLook = [cx + 0.5, 1.6, carZ - 2.0];
    fov = 44;
  } else if (frame < 1290) {
    // Scene 5: Sweeping drone orbit for 12% / 6.8 deg stat
    const a = interpolate(frame, [930, 1290], [0.3, 1.15]);
    camPos = [cx - Math.sin(a) * 13, 9.5, carZ + Math.cos(a) * 13];
    camLook = [cx, 1.0, carZ - 3];
    fov = 42;
  } else {
    // Scene 6: Elevated sunset hero follow cam
    const p = (frame - 1290) / (TOL_MIRING_V2_FRAMES - 1290);
    camPos = [cx + 5.5, 6.2 + p * 2.5, carZ + 11.5];
    camLook = [cx, 1.2, carZ - 8];
    fov = 45;
  }

  return (
    <>
      <color attach="background" args={["#cfe7ff"]} />
      <fog attach="fog" args={["#cfe7ff", 40, 145]} />

      <CameraRig pos={camPos} lookAt={camLook} fov={fov} />

      {/* Golden-hour warm sunlight + sky hemisphere light */}
      <hemisphereLight args={["#e0f2fe", "#4d7c0f", 0.95]} />
      <directionalLight
        position={[35, 55, 25]}
        intensity={1.7}
        color="#fff7ed"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Ground plane + layered rolling hills */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, -0.2, -45]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#65a30d" roughness={0.95} />
      </mesh>
      {[
        [-45, -1, -60, 26, "#4d7c0f"],
        [55, -2, -85, 34, "#3f6212"],
        [-25, -2, -135, 42, "#365314"],
        [75, -1, -35, 22, "#4d7c0f"],
      ].map(([x, y, z, r, col], idx) => (
        <mesh key={idx} position={[x as number, y as number, z as number]} scale={[1.6, 0.55, 1.4]}>
          <sphereGeometry args={[r as number, 20, 14]} />
          <meshStandardMaterial color={col as string} roughness={0.95} />
        </mesh>
      ))}

      {/* Drifting fluffy clouds */}
      {[
        [-18, 22, -40],
        [24, 26, -70],
        [-8, 24, -105],
        [38, 28, -120],
      ].map(([x, y, z], i) => (
        <group key={i} position={[(x as number) + tSec * 0.35, y as number, z as number]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[3.2, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
          <mesh position={[2.6, -0.4, 0.3]}>
            <sphereGeometry args={[2.4, 12, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={1} />
          </mesh>
          <mesh position={[-2.5, -0.5, -0.2]}>
            <sphereGeometry args={[2.2, 12, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* Banked multi-lane highway segments + guardrails + streetlamps + trees */}
      {roadSegments.map((seg) => (
        <group
          key={seg.idx}
          position={[seg.x, 0, seg.z]}
          rotation={[0, seg.yaw, seg.bank]}
        >
          {/* Dark asphalt deck */}
          <mesh position={[0, 0, 0]} receiveShadow>
            <boxGeometry args={[10.5, 0.35, 3.25]} />
            <meshStandardMaterial color="#334155" roughness={0.88} />
          </mesh>
          {/* Yellow shoulder lines */}
          <mesh position={[-4.5, 0.19, 0]}>
            <boxGeometry args={[0.16, 0.02, 3.25]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          <mesh position={[4.5, 0.19, 0]}>
            <boxGeometry args={[0.16, 0.02, 3.25]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {/* Dashed center white line */}
          {seg.idx % 2 === 0 && (
            <mesh position={[0, 0.19, 0]}>
              <boxGeometry args={[0.18, 0.02, 1.8]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          )}
          {/* Left & Right metallic guardrails */}
          <mesh position={[-5.1, 0.7, 0]} castShadow>
            <boxGeometry args={[0.16, 0.28, 3.25]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[5.1, 0.7, 0]} castShadow>
            <boxGeometry args={[0.16, 0.28, 3.25]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
          </mesh>
          {seg.idx % 2 === 0 && (
            <>
              <mesh position={[-5.1, 0.4, 0]}>
                <boxGeometry args={[0.14, 0.7, 0.14]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
              <mesh position={[5.1, 0.4, 0]}>
                <boxGeometry args={[0.14, 0.7, 0.14]} />
                <meshStandardMaterial color="#64748b" />
              </mesh>
            </>
          )}
          {/* Real 3D Streetlamps every 5 segments */}
          {models.lamp && seg.idx % 5 === 0 && (
            <primitive
              object={models.lamp.clone(true)}
              position={[5.7, 0.1, 0]}
              rotation={[0, -Math.PI / 2, 0]}
            />
          )}
          {/* Layered stylized pine trees along roadside */}
          {seg.idx % 3 === 0 && (
            <group position={[-8.8 - (seg.idx % 4) * 1.4, 0, 0]}>
              <mesh position={[0, 1.0, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.3, 2.0, 8]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
              <mesh position={[0, 2.8, 0]} castShadow>
                <coneGeometry args={[1.35, 2.6, 10]} />
                <meshStandardMaterial color="#15803d" />
              </mesh>
              <mesh position={[0, 4.1, 0]} castShadow>
                <coneGeometry args={[0.95, 2.0, 10]} />
                <meshStandardMaterial color="#16a34a" />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Hero Car (Real GLB) */}
      <group
        position={[cx + 2.1 + skidOffset, 0.22 + bounceY, carZ]}
        rotation={[0, cyaw + Math.PI + skidYaw, cbank]}
      >
        {heroCar ? (
          <primitive object={heroCar} />
        ) : (
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[1.9, 1.2, 4.0]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
        )}

        {/* Scene 2: Red inertia arrow pointing straight ahead */}
        {frame >= 180 && frame < 360 && (
          <ForceArrow3D
            position={[0, 1.6, 2.0]}
            rotation={[Math.PI / 2, 0, 0]}
            length={3.2}
            color="#ef4444"
          />
        )}

        {/* Scene 4: 3D Force Vectors (Normal, Gravity, Centripetal) */}
        {frame >= 540 && frame < 930 && (
          <>
            {/* Gaya Normal (tilted inward with road) */}
            <ForceArrow3D
              position={[0, 2.0, 0]}
              rotation={[0, 0, -0.22]}
              length={3.4}
              color="#f59e0b"
            />
            {/* Gravitasi (straight down) */}
            <ForceArrow3D
              position={[-1.4, 2.2, 0]}
              rotation={[0, 0, Math.PI]}
              length={2.5}
              color="#3b82f6"
            />
            {/* Gaya Sentripetal (inward toward curve center) */}
            <ForceArrow3D
              position={[1.3, 1.5, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              length={3.0}
              color="#22c55e"
            />
          </>
        )}
      </group>

      {/* Skid marks + smoke puffs in Scene 3 */}
      {isFlatSkidScene && (
        <group position={[cx + 2.1, 0.2, carZ + 3.0]} rotation={[0, cyaw, 0]}>
          {[-0.7, 0.7].map((lx, i) => (
            <mesh key={i} position={[lx, 0.02, 0]}>
              <boxGeometry args={[0.28, 0.02, 6.5]} />
              <meshStandardMaterial color="#0f172a" transparent opacity={0.75} />
            </mesh>
          ))}
        </group>
      )}

      {/* Traffic cars in left lane for a living highway */}
      {trafficCar1 && (
        <group
          position={[roadX(traffic1Z) - 2.2, 0.22, traffic1Z]}
          rotation={[0, roadYaw(traffic1Z) + Math.PI, roadBank(traffic1Z, enableBank)]}
        >
          <primitive object={trafficCar1} />
        </group>
      )}
      {trafficCar2 && (
        <group
          position={[roadX(traffic2Z) - 2.2, 0.22, traffic2Z]}
          rotation={[0, roadYaw(traffic2Z) + Math.PI, roadBank(traffic2Z, enableBank)]}
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
  { start: 0, end: 180, text: "Jalan tol lurus, mobil normal. Begitu masuk tikungan, kenapa jalannya dibikin miring?", highlight: "miring?" },
  { start: 180, end: 360, text: "Soalnya mobil cenderung terus lurus, padahal jalan membelok.", highlight: "lurus," },
  { start: 360, end: 540, text: "Di jalan datar, yang nahan mobil biar nggak selip keluar cuma gesekan ban.", highlight: "gesekan" },
  { start: 540, end: 720, text: "Makanya jalan tol dimiringin, disebut superelevasi.", highlight: "superelevasi." },
  { start: 720, end: 930, text: "Miringnya bikin gaya dari jalan ikut mendorong mobil ke tengah tikungan.", highlight: "tengah" },
  { start: 930, end: 1110, text: "Pada kecepatan yang dirancang, gesekan ban hampir nggak kepakai.", highlight: "hampir" },
  { start: 1110, end: 1290, text: "Maksimal dua belas persen, atau sekitar enam koma delapan derajat.", highlight: "persen," },
  { start: 1290, end: 1470, text: "Jadi jalan datar bikin gampang selip, jalan miring bikin mobil tetap stabil.", highlight: "stabil." },
  { start: 1470, end: 1665, text: "Tikungan paling miring yang pernah lo lewatin di mana?", highlight: "mana?" },
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
    <AbsoluteFill style={{ backgroundColor: "#cfe7ff", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Audio VO + Whoosh SFX at scene transitions */}
      <Audio src={staticFile("audio/tol-miring/vo_sami.mp3")} volume={1.0} />
      {[180, 360, 540, 930, 1290].map((f) => (
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
      {frame >= 540 && frame < 930 && (
        <div style={{ position: "absolute", top: 210, left: 72, right: 72, display: "flex", justifyContent: "space-between" }}>
          <div style={{ color: "#f59e0b", fontSize: 32, fontWeight: 900, textShadow: "0 4px 14px rgba(0,0,0,0.85)" }}>
            Gaya Normal
          </div>
          <div style={{ color: "#22c55e", fontSize: 32, fontWeight: 900, textShadow: "0 4px 14px rgba(0,0,0,0.85)" }}>
            Gaya Sentripetal
          </div>
        </div>
      )}

      {/* Scene 5 Big Kinetic Stat (12% / 6.8 deg) */}
      {frame >= 1080 && frame < 1290 && (
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
              fontSize: 56,
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

      {/* Floating Kinetic Subtitle (safe zone bottom >= 250px, NO card) */}
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
            color: "#e2e8f0",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          }}
        >
          Sumber: AASHTO Green Book / Fisika Mekanika
        </div>
      )}
    </AbsoluteFill>
  );
};
