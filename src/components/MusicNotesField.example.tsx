// src/components/MusicNotesField.tsx - EXAMPLE
'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function MusicNote({ position, color, symbol }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.01;
      ref.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.002;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Text ref={ref} position={position} fontSize={0.5} color={color} anchorX="center" anchorY="middle">
        {symbol}
      </Text>
    </Float>
  );
}

export function MusicNotesField() {
  const notes = useMemo(() => {
    const symbols = ['♪', '♫', '♬', '♩'];
    return Array.from({ length: 60 }, (_, i) => ({
      position: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 5],
      color: i % 3 === 0 ? '#0087FF' : i % 3 === 1 ? '#8AE8FF' : '#7800FF',
      symbol: symbols[i % symbols.length],
    }));
  }, []);

  return (
    <div style={{ width: 600, height: 600, position: 'absolute', top: -20, right: -40, zIndex: 1 }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#0087FF" />
        {notes.map((note, i) => (
          <MusicNote key={i} {...note} />
        ))}
      </Canvas>
    </div>
  );
}
