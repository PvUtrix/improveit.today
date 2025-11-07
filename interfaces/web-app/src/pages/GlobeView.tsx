import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Suspense } from 'react';

function Earth() {
  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        color="#2196F3"
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function GlobeView() {
  return (
    <div className="globe-container">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />
          <Earth />
          <OrbitControls enableZoom={true} enablePan={false} />
        </Suspense>
      </Canvas>

      <div style={{
        position: 'absolute',
        top: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        textAlign: 'center',
        zIndex: 100,
      }}>
        <h2 style={{ fontSize: '32px', marginBottom: '16px' }}>🌍 Global Impact</h2>
        <p>Interactive 3D globe visualization coming soon!</p>
        <p style={{ marginTop: '8px', fontSize: '14px', opacity: 0.8 }}>
          Problems will appear as glowing spikes. Height = vote count.
        </p>
      </div>
    </div>
  );
}

export default GlobeView;
