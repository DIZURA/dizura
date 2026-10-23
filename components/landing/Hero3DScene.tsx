"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CatmullRomCurve3, Vector3, type Group, type MeshBasicMaterial, type MeshStandardMaterial } from "three";

// Brand colours mirror the CSS tokens (three.js materials can't read CSS variables).
const MINT = "#00e599";
const MINT_DEEP = "#008f60";
const INK = "#0a0a0b";
const EMBER = "#ff7a1a";
const R = 1.35;

/** Points of one S-band of the DIZURA mark, wrapped onto the sphere's front face. */
function band(points: [number, number][], lift = 1.02) {
  const pts = points.map(([x, y]) => {
    const z = Math.sqrt(Math.max(0.02, 1 - x * x - y * y));
    return new Vector3(x, y, z).normalize().multiplyScalar(R * lift);
  });
  return new CatmullRomCurve3(pts);
}

function Globe() {
  const spin = useRef<Group>(null);
  const emblem = useRef<Group>(null);
  const ribbonA = useRef<MeshStandardMaterial>(null);
  const ribbonB = useRef<MeshStandardMaterial>(null);
  const halo = useRef<MeshBasicMaterial>(null);

  // The DIZURA mark: an upper hook (down the left edge, then sweeping right) and its
  // point-mirrored twin. Both live on the front face and stay facing the viewer.
  const upper = useMemo(
    () => band([[-0.42, 0.86], [-0.7, 0.55], [-0.74, 0.18], [-0.4, 0.1], [0.1, 0.12], [0.5, 0.05], [0.66, -0.1]]),
    [],
  );
  const lower = useMemo(
    () => band([[0.42, -0.86], [0.7, -0.55], [0.74, -0.18], [0.4, -0.1], [-0.1, -0.12], [-0.5, -0.05], [-0.66, 0.1]]),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (spin.current) spin.current.rotation.y += delta * 0.25;
    if (emblem.current) {
      emblem.current.rotation.y = Math.sin(t * 0.5) * 0.35;
      emblem.current.rotation.x = Math.sin(t * 0.35) * 0.08;
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    for (const m of [ribbonA.current, ribbonB.current]) if (m) m.emissiveIntensity = 0.7 + pulse * 0.9;
    if (halo.current) halo.current.opacity = 0.05 + pulse * 0.06;
  });

  return (
    <group rotation={[0.12, 0, -0.18]}>
      {/* dark core so back-facing wires read as depth */}
      <mesh>
        <sphereGeometry args={[R * 0.985, 48, 48]} />
        <meshStandardMaterial color={INK} roughness={0.75} metalness={0.15} />
      </mesh>
      <group ref={spin}>
        {/* latitude/longitude wireframe */}
        <mesh>
          <sphereGeometry args={[R, 28, 18]} />
          <meshBasicMaterial color={MINT} wireframe transparent opacity={0.22} />
        </mesh>
        {/* orbit ring */}
        <mesh rotation={[Math.PI / 2.2, 0.3, 0]}>
          <torusGeometry args={[R * 1.32, 0.006, 8, 160]} />
          <meshBasicMaterial color={MINT} transparent opacity={0.45} />
        </mesh>
      </group>
      {/* the S-bands of the logo */}
      <group ref={emblem}>
        {[upper, lower].map((curve, i) => (
          <mesh key={i}>
            <tubeGeometry args={[curve, 120, 0.058, 10, false]} />
            <meshStandardMaterial ref={i === 0 ? ribbonA : ribbonB} color={MINT} emissive={MINT} emissiveIntensity={1.2} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* soft halo */}
      <mesh scale={1.22}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial ref={halo} color={MINT_DEEP} transparent opacity={0.08} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Renders only while the globe is on screen and the tab is visible — otherwise it idles at 0 fps. */
function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), { threshold: 0 });
    io.observe(el);
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return [ref, inView && tabVisible] as const;
}

/** Slow, ambient motion looks identical at 30 fps — half the GPU/CPU work of the default loop. */
const FPS = 30;
function Ticker({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => invalidate(), 1000 / FPS);
    return () => window.clearInterval(id);
  }, [active, invalidate]);
  return null;
}

export default function Hero3DScene() {
  const [ref, active] = useOnScreen<HTMLDivElement>();
  return (
    <div ref={ref} className="size-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 42 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        aria-hidden
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 4]} intensity={18} color={MINT} />
        <pointLight position={[-4, -2, 2]} intensity={10} color={EMBER} />
        <Globe />
        <Ticker active={active} />
      </Canvas>
    </div>
  );
}
