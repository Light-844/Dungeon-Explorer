import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import type { DungeonLevel, Tile } from '../types';

const TILE_SIZE = 1;

function tileColor(tile: Tile, dungeon: DungeonLevel): string {
  switch (tile.type) {
    case 'wall':
      return dungeon.theme.wallColor;
    case 'chest':
      return '#e0b23c';
    case 'openedChest':
      return dungeon.theme.floorColor;
    case 'stairsDown':
      return dungeon.theme.accentColor;
    case 'shop':
      return '#c98fd6';
    case 'trap':
    case 'triggeredTrap':
      return dungeon.theme.floorColor;
    case 'start':
      return dungeon.theme.floorColor;
    default:
      return dungeon.theme.floorColor;
  }
}

function Floor({ dungeon }: { dungeon: DungeonLevel }) {
  const tiles = useMemo(() => {
    const result: { x: number; y: number; color: string; height: number; tile: Tile }[] = [];
    for (const row of dungeon.tiles) {
      for (const tile of row) {
        const isWall = tile.type === 'wall';
        result.push({
          x: tile.x,
          y: tile.y,
          color: tileColor(tile, dungeon),
          height: isWall ? 1.4 : 0.2,
          tile,
        });
      }
    }
    return result;
  }, [dungeon]);

  return (
    <group>
      {tiles.map(({ x, y, color, height, tile }) => (
        <mesh
          key={`${x}-${y}`}
          position={[x * TILE_SIZE, height / 2 - 0.1, y * TILE_SIZE]}
          castShadow={height > 0.3}
          receiveShadow
        >
          <boxGeometry args={[TILE_SIZE * 0.96, height, TILE_SIZE * 0.96]} />
          <meshStandardMaterial
            color={color}
            emissive={
              tile.type === 'stairsDown'
                ? new THREE.Color(dungeon.theme.accentColor)
                : tile.type === 'chest'
                  ? new THREE.Color('#8a6512')
                  : new THREE.Color('#000000')
            }
            emissiveIntensity={tile.type === 'stairsDown' ? 0.5 : tile.type === 'chest' ? 0.3 : 0}
            roughness={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

function EnemyMarkers({ dungeon }: { dungeon: DungeonLevel }) {
  const enemies = Object.values(dungeon.enemies);
  return (
    <group>
      {enemies.map((enemy) => {
        let pos: { x: number; y: number } | null = null;
        for (const row of dungeon.tiles) {
          for (const t of row) {
            if (t.enemyInstanceId === enemy.instanceId) pos = { x: t.x, y: t.y };
          }
        }
        if (!pos) return null;
        const size = enemy.isBoss ? 0.85 : 0.5;
        return (
          <mesh
            key={enemy.instanceId}
            position={[pos.x * TILE_SIZE, size / 2 + 0.1, pos.y * TILE_SIZE]}
            castShadow
          >
            <boxGeometry args={[size, size, size]} />
            <meshStandardMaterial
              color={enemy.color}
              emissive={enemy.color}
              emissiveIntensity={enemy.isBoss ? 0.5 : 0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

const FACING_ANGLE: Record<string, number> = {
  up: Math.PI,
  down: 0,
  left: Math.PI / 2,
  right: -Math.PI / 2,
};

// Frame-rate-independent smoothing: converges toward `target` at a fixed
// "speed" regardless of the current FPS, so motion glides instead of
// snapping in bigger steps at high refresh rates.
function smoothFactor(speed: number, delta: number) {
  return 1 - Math.exp(-speed * delta);
}

function PlayerToken() {
  const meshRef = useRef<THREE.Mesh>(null);
  const target = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const { playerPos, facing } = useGameStore.getState();
    target.current.set(playerPos.x * TILE_SIZE, 0.4, playerPos.y * TILE_SIZE);
    if (meshRef.current) {
      const f = smoothFactor(6, delta);
      meshRef.current.position.lerp(target.current, f);
      const targetAngle = FACING_ANGLE[facing] ?? 0;
      const rotFactor = smoothFactor(10, delta);
      meshRef.current.rotation.y += (targetAngle - meshRef.current.rotation.y) * rotFactor;
    }
  });

  return (
    <mesh ref={meshRef} castShadow position={[0, 0.4, 0]}>
      <boxGeometry args={[0.55, 0.7, 0.55]} />
      <meshStandardMaterial color="#f4c356" emissive="#f4c356" emissiveIntensity={0.35} />
    </mesh>
  );
}

function CameraRig() {
  // The camera itself is smoothed, but if the look-at point snaps straight
  // to the (grid-stepped) player position every frame, the view direction
  // still jumps each tile-step, which reads as "shaking". So the look-at
  // point is smoothed too, at the same rate as the camera position.
  const lookTarget = useRef<THREE.Vector3 | null>(null);

  useFrame(({ camera }, delta) => {
    const { playerPos } = useGameStore.getState();
    const targetX = playerPos.x * TILE_SIZE;
    const targetY = playerPos.y * TILE_SIZE;

    if (!lookTarget.current) {
      lookTarget.current = new THREE.Vector3(targetX, 0, targetY);
      camera.position.set(targetX, 8.5, targetY + 7);
    }

    const f = smoothFactor(4, delta);
    lookTarget.current.x += (targetX - lookTarget.current.x) * f;
    lookTarget.current.z += (targetY - lookTarget.current.z) * f;

    camera.position.x = lookTarget.current.x;
    camera.position.z = lookTarget.current.z + 7;
    camera.position.y = 8.5;
    camera.lookAt(lookTarget.current.x, 0, lookTarget.current.z);
  });
  return null;
}

export function DungeonCanvas({ dungeon }: { dungeon: DungeonLevel }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8.5, 7], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[dungeon.theme.fogColor]} />
      <fog attach="fog" args={[dungeon.theme.fogColor, 8, 22]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 3, 0]} intensity={0.6} color={dungeon.theme.accentColor} distance={9} />
      <Floor dungeon={dungeon} />
      <EnemyMarkers dungeon={dungeon} />
      <PlayerToken />
      <CameraRig />
    </Canvas>
  );
}
