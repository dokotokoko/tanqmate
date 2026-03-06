// LabRoom3D.tsx - Three.js ベースの3D部屋コンポーネント
// あつ森風アイソメトリックカメラ + プロシージャル壁・床 + GLBモデル読み込み対応
// 壁面パネルはすべてCanvasTexture描画（DOM干渉なし）

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════
const ROOM_W = 8;
const ROOM_D = 8;
const WALL_H = 3.5;

const CAM_ANGLE_X = -Math.PI / 5;
const CAM_ANGLE_Y = Math.PI / 4;
const CAM_ZOOM = 90;

const COLORS = {
  baseboard: '#6B5B3E',
  ceiling: '#8A7E6A',
  ambient: '#FFF8F0',
  directional: '#FFF4E0',
};

// ═══════════════════════════════════════════════════════
// Procedural Textures
// ═══════════════════════════════════════════════════════

function createBrickTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#C0B5A0';
  ctx.fillRect(0, 0, size, size);

  const brickW = size / 4;
  const brickH = size / 8;
  const mortar = 3;

  for (let row = 0; row < 8; row++) {
    const offsetX = row % 2 === 1 ? brickW / 2 : 0;
    for (let col = -1; col < 5; col++) {
      const x = col * brickW + offsetX + mortar;
      const y = row * brickH + mortar;
      const w = brickW - mortar * 2;
      const h = brickH - mortar * 2;

      const hash = Math.sin(row * 127.1 + col * 311.7) * 43758.5453;
      const t = hash - Math.floor(hash);
      const r = 210 + Math.round((t - 0.5) * 18);
      const g = 200 + Math.round((t - 0.5) * 16);
      const b = 182 + Math.round((t - 0.5) * 14);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, w, h);

      for (let py = 0; py < h; py += 4) {
        for (let px = 0; px < w; px += 4) {
          const n = Math.sin((row * 100 + py) * 127.1 + (col * 100 + px) * 311.7) * 43758.5453;
          const nt = n - Math.floor(n);
          ctx.fillStyle = `rgba(128,128,128,${nt * 0.06})`;
          ctx.fillRect(x + px, y + py, 4, 4);
        }
      }

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(x, y + h - 2, w, 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const plankH = 512 / 8;
  for (let i = 0; i < 8; i++) {
    const y = i * plankH;
    const hash = Math.sin(i * 73.1) * 43758.5453;
    const t = hash - Math.floor(hash);
    const r = 185 + Math.round((t - 0.5) * 20);
    const g = 155 + Math.round((t - 0.5) * 16);
    const b = 105 + Math.round((t - 0.5) * 12);

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, 512, plankH);

    for (let gy = 0; gy < plankH; gy++) {
      const wave = Math.sin(gy * 0.5 + Math.sin(gy * 0.2 + i) * 3) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(${r - 15},${g - 12},${b - 8},${0.15 + wave * 0.15})`;
      ctx.fillRect(0, y + gy, 512, 1);
    }

    ctx.fillStyle = 'rgba(60,40,15,0.2)';
    ctx.fillRect(0, y + plankH - 2, 512, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y, 512, 1);

    if (t > 0.6) {
      const kx = 100 + Math.round(t * 300);
      const ky = y + plankH / 2;
      const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, 10);
      grad.addColorStop(0, `rgba(${r - 40},${g - 35},${b - 25},0.3)`);
      grad.addColorStop(1, `rgba(${r - 40},${g - 35},${b - 25},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

// ═══════════════════════════════════════════════════════
// Wall Panel Textures (Canvas描画 → CanvasTexture)
// ═══════════════════════════════════════════════════════

function createMonitorTexture(pct: number, title: string): THREE.CanvasTexture {
  const W = 400, H = 260;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  // Monitor bezel
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, W, H);
  // Screen
  ctx.fillStyle = '#0C1A0C';
  ctx.fillRect(10, 10, W - 20, H - 40);

  // Title
  ctx.fillStyle = '#66BB6A';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('プロジェクト進捗', W / 2, 50);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px sans-serif';
  ctx.fillText(title || '', W / 2, 75);

  // Progress bar background
  const barX = 40, barY = 100, barW = W - 80, barH = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, barX, barY, barW, barH, 10);
  ctx.fill();

  // Progress bar fill
  ctx.fillStyle = '#4CAF50';
  const fillW = Math.max(10, barW * pct / 100);
  roundRect(ctx, barX, barY, fillW, barH, 10);
  ctx.fill();

  // Highlight on bar
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, barX, barY, fillW, barH / 2, 6);
  ctx.fill();

  // Percentage text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${pct}%`, W / 2, 165);

  // Hint
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '13px sans-serif';
  ctx.fillText('クリックで詳細', W / 2, 205);

  return new THREE.CanvasTexture(c);
}

function createCorkboardTexture(typeCode: string, typeName: string): THREE.CanvasTexture {
  const W = 240, H = 200;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  // Cork background
  ctx.fillStyle = '#C4A060';
  ctx.fillRect(0, 0, W, H);
  // Frame
  ctx.strokeStyle = '#A08040';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // Pins
  ctx.fillStyle = '#E53935';
  ctx.beginPath(); ctx.arc(30, 25, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#EF5350';
  ctx.beginPath(); ctx.arc(30, 24, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#43A047';
  ctx.beginPath(); ctx.arc(W - 30, 25, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#66BB6A';
  ctx.beginPath(); ctx.arc(W - 30, 24, 4, 0, Math.PI * 2); ctx.fill();

  // Memo paper
  ctx.save();
  ctx.translate(W / 2, H / 2 - 5);
  ctx.rotate(-0.04);
  ctx.fillStyle = '#FFFDE7';
  ctx.fillRect(-70, -40, 140, 80);
  ctx.strokeStyle = '#E0D0A0';
  ctx.lineWidth = 1;
  ctx.strokeRect(-70, -40, 140, 80);

  // Type code
  ctx.fillStyle = '#D84315';
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(typeCode, 0, 5);

  // Type name
  ctx.fillStyle = '#6D4C41';
  ctx.font = '13px sans-serif';
  ctx.fillText(typeName, 0, 30);
  ctx.restore();

  // Hint
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('クリックで詳細', W / 2, H - 15);

  return new THREE.CanvasTexture(c);
}

function createEffortTexture(totalChats: number, streakDays: number): THREE.CanvasTexture {
  const W = 200, H = 240;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  // Frame
  ctx.fillStyle = '#8B7755';
  ctx.fillRect(0, 0, W, H);
  // Inner canvas
  ctx.fillStyle = '#1a2520';
  ctx.fillRect(10, 10, W - 20, H - 20);

  // Title
  ctx.fillStyle = '#FF9800';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('努力の軌跡', W / 2, 45);

  // Count
  ctx.fillStyle = '#FFB74D';
  ctx.font = 'bold 48px monospace';
  ctx.fillText(`${totalChats}`, W / 2, 110);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px sans-serif';
  ctx.fillText('回', W / 2, 135);

  // Streak badge
  ctx.fillStyle = 'rgba(255,87,34,0.25)';
  roundRect(ctx, W / 2 - 45, 150, 90, 30, 15);
  ctx.fill();

  ctx.fillStyle = '#FF5722';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`🔥${streakDays}日`, W / 2, 172);

  // Hint
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '11px sans-serif';
  ctx.fillText('クリックで詳細', W / 2, H - 22);

  return new THREE.CanvasTexture(c);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════
// Room Shell
// ═══════════════════════════════════════════════════════

const Floor: React.FC<{ onClick: (point: THREE.Vector3) => void }> = ({ onClick }) => {
  const floorTex = useMemo(() => createWoodFloorTexture(), []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.point) onClick(e.point);
  };

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onClick={handleClick} receiveShadow>
      <planeGeometry args={[ROOM_W, ROOM_D]} />
      <meshStandardMaterial map={floorTex} roughness={0.8} />
    </mesh>
  );
};

const Walls: React.FC = () => {
  const brickTex = useMemo(() => createBrickTexture(), []);
  const brickTexLeft = useMemo(() => createBrickTexture(), []);

  return (
    <>
      <mesh position={[0, WALL_H / 2, -ROOM_D / 2]} receiveShadow>
        <planeGeometry args={[ROOM_W, WALL_H]} />
        <meshStandardMaterial map={brickTex} roughness={0.9} />
      </mesh>
      <mesh position={[-ROOM_W / 2, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial map={brickTexLeft} roughness={0.9} color="#E0D5C5" />
      </mesh>
      <mesh position={[ROOM_W / 2, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D, WALL_H]} />
        <meshStandardMaterial map={brickTex} roughness={0.9} color="#E8DDC8" />
      </mesh>
      <Baseboard position={[0, 0.1, -ROOM_D / 2 + 0.05]} width={ROOM_W} />
      <Baseboard position={[-ROOM_W / 2 + 0.05, 0.1, 0]} width={ROOM_D} rotation={[0, Math.PI / 2, 0]} />
      <Baseboard position={[ROOM_W / 2 - 0.05, 0.1, 0]} width={ROOM_D} rotation={[0, -Math.PI / 2, 0]} />
    </>
  );
};

const Baseboard: React.FC<{
  position: [number, number, number];
  width: number;
  rotation?: [number, number, number];
}> = ({ position, width, rotation = [0, 0, 0] }) => (
  <mesh position={position} rotation={rotation}>
    <boxGeometry args={[width, 0.2, 0.08]} />
    <meshStandardMaterial color={COLORS.baseboard} roughness={0.7} />
  </mesh>
);

const Ceiling: React.FC = () => (
  <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]}>
    <planeGeometry args={[ROOM_W, ROOM_D]} />
    <meshStandardMaterial color={COLORS.ceiling} roughness={1} />
  </mesh>
);

const Carpet: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]}>
    <planeGeometry args={[5, 4]} />
    <meshStandardMaterial color="#A89860" roughness={1} />
  </mesh>
);

// ═══════════════════════════════════════════════════════
// Placeholder furniture
// ═══════════════════════════════════════════════════════

const PlaceholderBox: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label?: string;
}> = ({ position, size, color, label }) => (
  <group position={position}>
    <mesh position={[0, size[1] / 2, 0]} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
    {label && (
      <Html position={[0, size[1] + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px',
          borderRadius: 8, fontSize: 11, whiteSpace: 'nowrap', fontFamily: 'sans-serif',
          pointerEvents: 'none',
        }}>
          {label}
        </div>
      </Html>
    )}
  </group>
);

// ═══════════════════════════════════════════════════════
// Window
// ═══════════════════════════════════════════════════════
const WindowObj: React.FC = () => (
  <group position={[ROOM_W / 2 - 0.01, WALL_H * 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
    <mesh>
      <planeGeometry args={[2.2, 1.8]} />
      <meshBasicMaterial color="#A0D4F0" />
    </mesh>
    {[[-1.1, 0], [1.1, 0], [0, -0.9], [0, 0.9]].map(([x, y], i) => (
      <mesh key={i} position={[x, y, 0.01]}>
        <boxGeometry args={[i < 2 ? 0.08 : 2.2, i < 2 ? 1.8 : 0.08, 0.05]} />
        <meshStandardMaterial color="#8B7355" roughness={0.5} />
      </mesh>
    ))}
    <mesh position={[0, 0, 0.01]}>
      <boxGeometry args={[2.2, 0.06, 0.04]} />
      <meshStandardMaterial color="#8B7355" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0, 0.01]}>
      <boxGeometry args={[0.06, 1.8, 0.04]} />
      <meshStandardMaterial color="#8B7355" roughness={0.5} />
    </mesh>
  </group>
);

// ═══════════════════════════════════════════════════════
// Avatar
// ═══════════════════════════════════════════════════════
const Avatar: React.FC<{
  position: [number, number, number];
  username: string;
  isWalking: boolean;
}> = ({ position, username, isWalking }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerp(
      new THREE.Vector3(position[0], position[1], position[2]),
      0.08,
    );
    if (isWalking) {
      groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.015) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.2} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.35, 8, 16]} />
        <meshStandardMaterial color="#80D8FF" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#FFCC80" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.1, -0.03]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, -0.05]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#5D4037" roughness={0.9} />
      </mesh>
      <mesh position={[-0.07, 0.95, 0.2]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[0.07, 0.95, 0.2]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[-0.12, 0.88, 0.17]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#FFAB91" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.12, 0.88, 0.17]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#FFAB91" transparent opacity={0.5} />
      </mesh>
      <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.55)', color: '#FFB74D', padding: '2px 10px',
          borderRadius: 10, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          fontFamily: 'sans-serif', border: '1px solid rgba(255,183,77,0.3)',
          pointerEvents: 'none',
        }}>
          {username}
        </div>
      </Html>
    </group>
  );
};

// ═══════════════════════════════════════════════════════
// Wall Panel (CanvasTexture版 - DOM干渉なし)
// ═══════════════════════════════════════════════════════

interface TexturePanelProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
  texture: THREE.CanvasTexture;
  onClick: () => void;
  glowColor?: string;
}

const TexturePanel: React.FC<TexturePanelProps> = ({
  position, rotation = [0, 0, 0], size, texture, onClick, glowColor = '#FFB74D',
}) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <group position={position} rotation={rotation}>
      {/* Panel mesh with canvas texture */}
      <mesh
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <planeGeometry args={[size[0], size[1]]} />
        <meshStandardMaterial
          map={texture}
          emissive={hovered ? glowColor : '#000000'}
          emissiveIntensity={hovered ? 0.15 : 0}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════
// Lighting
// ═══════════════════════════════════════════════════════
const RoomLighting: React.FC = () => (
  <>
    <ambientLight intensity={0.4} color={COLORS.ambient} />
    <directionalLight
      position={[ROOM_W / 2, WALL_H, 0]}
      intensity={0.8}
      color={COLORS.directional}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-near={0.1}
      shadow-camera-far={20}
      shadow-camera-left={-6}
      shadow-camera-right={6}
      shadow-camera-top={6}
      shadow-camera-bottom={-6}
    />
    <directionalLight position={[0, 2, ROOM_D / 2]} intensity={0.15} color="#E8F0FF" />
    <pointLight position={[0, 0.3, 0]} intensity={0.1} color="#D4C0A0" distance={8} />
  </>
);

// ═══════════════════════════════════════════════════════
// Camera
// ═══════════════════════════════════════════════════════
const IsometricCamera: React.FC = () => {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);

  React.useEffect(() => {
    if (cameraRef.current) {
      const dist = 12;
      cameraRef.current.position.set(
        dist * Math.sin(CAM_ANGLE_Y) * Math.cos(CAM_ANGLE_X),
        dist * Math.sin(-CAM_ANGLE_X),
        dist * Math.cos(CAM_ANGLE_Y) * Math.cos(CAM_ANGLE_X),
      );
      cameraRef.current.lookAt(0, 0.5, 0);
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  return (
    <OrthographicCamera ref={cameraRef} makeDefault zoom={CAM_ZOOM} near={0.1} far={100} />
  );
};

// ═══════════════════════════════════════════════════════
// Scene
// ═══════════════════════════════════════════════════════

export interface LabRoom3DProps {
  username: string;
  avatarPos: [number, number, number];
  isWalking: boolean;
  onFloorClick: (point: THREE.Vector3) => void;
  onMonitorClick: () => void;
  onCorkboardClick: () => void;
  onFrameClick: () => void;
  progressPct: number;
  progressTitle: string;
  typeCode: string;
  typeName: string;
  totalChats: number;
  streakDays: number;
}

const LabRoom3DScene: React.FC<LabRoom3DProps> = (props) => {
  // Generate panel textures (regenerate when data changes)
  const monitorTex = useMemo(
    () => createMonitorTexture(props.progressPct, props.progressTitle),
    [props.progressPct, props.progressTitle],
  );
  const corkTex = useMemo(
    () => createCorkboardTexture(props.typeCode, props.typeName),
    [props.typeCode, props.typeName],
  );
  const effortTex = useMemo(
    () => createEffortTexture(props.totalChats, props.streakDays),
    [props.totalChats, props.streakDays],
  );

  return (
    <>
      <IsometricCamera />
      <RoomLighting />

      <Floor onClick={props.onFloorClick} />
      <Walls />
      <Ceiling />
      <Carpet />
      <WindowObj />

      {/* Wall panels - pure Three.js meshes, fully clickable */}
      <TexturePanel
        position={[0.5, WALL_H * 0.55, -ROOM_D / 2 + 0.04]}
        size={[2.0, 1.3]}
        texture={monitorTex}
        onClick={props.onMonitorClick}
        glowColor="#4CAF50"
      />
      <TexturePanel
        position={[2.8, WALL_H * 0.55, -ROOM_D / 2 + 0.04]}
        size={[1.2, 1.0]}
        texture={corkTex}
        onClick={props.onCorkboardClick}
        glowColor="#FF9800"
      />
      <TexturePanel
        position={[-ROOM_W / 2 + 0.04, WALL_H * 0.5, -1]}
        rotation={[0, Math.PI / 2, 0]}
        size={[1.0, 1.2]}
        texture={effortTex}
        onClick={props.onFrameClick}
        glowColor="#42A5F5"
      />

      {/* Placeholder furniture */}
      <PlaceholderBox position={[2.5, 0, 1]} size={[1.8, 0.75, 0.9]} color="#B08850" label="デスク" />
      <PlaceholderBox position={[2.5, 0, 2]} size={[0.5, 0.8, 0.5]} color="#5A8040" label="椅子" />
      <PlaceholderBox position={[-2.8, 0, -1.5]} size={[0.8, 1.2, 0.4]} color="#A07848" label="本棚" />
      <PlaceholderBox position={[-1, 0, 1.5]} size={[0.5, 0.5, 0.5]} color="#B08850" label="テーブル" />
      <PlaceholderBox position={[3.2, 0, -2.5]} size={[0.4, 0.8, 0.4]} color="#5A8040" label="植物" />

      <Avatar position={props.avatarPos} username={props.username} isWalking={props.isWalking} />
    </>
  );
};

// ═══════════════════════════════════════════════════════
// Canvas wrapper
// ═══════════════════════════════════════════════════════
export const LabRoom3DCanvas: React.FC<LabRoom3DProps> = (props) => {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#5C7A4A');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
      }}
    >
      <Suspense fallback={null}>
        <LabRoom3DScene {...props} />
      </Suspense>
    </Canvas>
  );
};

export default LabRoom3DCanvas;
