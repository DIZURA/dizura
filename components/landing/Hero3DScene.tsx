"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

function Core() {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.25;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.25;
  });
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial color="#ff7a1a" emissive="#b84a06" emissiveIntensity={0.6} roughness={0.25} metalness={0.6} flatShading />
      </mesh>
      <mesh scale={1.75}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshBasicMaterial color="#ff9446" wireframe transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

export default function Hero3DScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} aria-hidden>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#ffd2ad" />
      <pointLight position={[-4, -2, -3]} intensity={30} color="#ff7a1a" />
      <Core />
    </Canvas>
  );
}
