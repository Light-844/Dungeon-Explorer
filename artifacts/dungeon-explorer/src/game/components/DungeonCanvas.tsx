import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import type { DungeonLevel, EnemyInstance, Tile } from '../types';

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
    case 'lockedDoor':
      return '#1a0a0a';
    case 'door':
      return '#6b3a2a';
    case 'lavaTile':
      return '#cc3300';
    case 'iceTile':
      return '#77ccee';
    case 'mudTile':
      return '#2e3d1a';
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
      {tiles.map(({ x, y, color, height, tile }) => {
        const isLava = tile.type === 'lavaTile';
        const isIce = tile.type === 'iceTile';
        return (
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
                    : tile.type === 'lockedDoor'
                      ? new THREE.Color('#cc1111')
                      : isLava
                        ? new THREE.Color('#ff2200')
                        : isIce
                          ? new THREE.Color('#44aaff')
                          : new THREE.Color('#000000')
              }
              emissiveIntensity={
                tile.type === 'stairsDown' ? 0.5
                : tile.type === 'chest' ? 0.3
                : tile.type === 'lockedDoor' ? 0.6
                : isLava ? 0.75
                : isIce ? 0.3
                : 0
              }
              roughness={isIce ? 0.15 : 0.85}
              metalness={isIce ? 0.3 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Per-enemy marker with smooth lerp movement
function EnemyMarker({
  enemy,
  logicalPos,
}: {
  enemy: EnemyInstance;
  logicalPos: { x: number; y: number };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const initialized = useRef(false);

  // Snap to starting position on first render so there's no lerp from (0,0,0)
  useEffect(() => {
    if (groupRef.current && !initialized.current) {
      groupRef.current.position.set(
        logicalPos.x * TILE_SIZE,
        0,
        logicalPos.y * TILE_SIZE,
      );
      initialized.current = true;
    }
  });

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!initialized.current) {
      groupRef.current.position.set(
        logicalPos.x * TILE_SIZE,
        0,
        logicalPos.y * TILE_SIZE,
      );
      initialized.current = true;
      return;
    }
    const tx = logicalPos.x * TILE_SIZE;
    const tz = logicalPos.y * TILE_SIZE;
    const f = 1 - Math.exp(-5 * delta);
    groupRef.current.position.x += (tx - groupRef.current.position.x) * f;
    groupRef.current.position.z += (tz - groupRef.current.position.z) * f;
  });

  const size = enemy.isBoss ? 0.85 : 0.5;

  return (
    <group ref={groupRef}>
      <mesh position={[0, size / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={enemy.color}
          emissive={enemy.color}
          emissiveIntensity={enemy.isBoss ? 0.5 : 0.2}
        />
      </mesh>
      <Html position={[0, size + 0.45, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div
          className={`pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-medium backdrop-blur-sm ${
            enemy.isBoss
              ? 'border-primary/60 bg-primary/20 text-primary-foreground'
              : 'border-white/15 bg-black/60 text-white'
          }`}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: enemy.color }}
          />
          <span>{enemy.name}</span>
          <span className="opacity-70">Lv.{enemy.level}</span>
        </div>
      </Html>
    </group>
  );
}

function EnemyMarkers({ dungeon }: { dungeon: DungeonLevel }) {
  // Build a map of instanceId → tile position
  const posMap = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    for (const row of dungeon.tiles) {
      for (const t of row) {
        if (t.enemyInstanceId) m[t.enemyInstanceId] = { x: t.x, y: t.y };
      }
    }
    return m;
  }, [dungeon]);

  return (
    <group>
      {Object.values(dungeon.enemies).map((enemy) => {
        const pos = posMap[enemy.instanceId];
        if (!pos) return null;
        return (
          <EnemyMarker key={enemy.instanceId} enemy={enemy} logicalPos={pos} />
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
      let angleDelta = (targetAngle - meshRef.current.rotation.y) % (Math.PI * 2);
      if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
      if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
      meshRef.current.rotation.y += angleDelta * rotFactor;
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
