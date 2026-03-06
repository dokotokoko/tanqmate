// LabRoomFurniture.tsx
// あつ森スタイルのアイソメトリック3D家具コンポーネント
// 全家具は「上面(明)・正面(中)・側面(暗)」の3面で立体感を表現

import React from 'react';

/** ランダムな色の揺らぎ (deterministic) */
function vary(base: number, range: number, i: number, j: number): number {
  const hash = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  const t = hash - Math.floor(hash);
  return Math.round(base + (t - 0.5) * range);
}

// ═══════════════════════════════════════════════════════
// Color helpers - 3面シェーディング
// ═══════════════════════════════════════════════════════
function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
}

// ═══════════════════════════════════════════════════════
// Isometric Box: 3面で描画する基本直方体
// top: 上面(平行四辺形), front: 正面, side: 右側面
// ═══════════════════════════════════════════════════════
interface IsoBoxProps {
  x: number; // 底面左下のX
  y: number; // 底面左下のY
  w: number; // 幅
  h: number; // 高さ（上方向）
  d: number; // 奥行き（アイソメトリック上方向）
  color: string; // 基本色(hex)
  topImg?: string; // テクスチャ(data URI)
  frontImg?: string;
  strokeW?: number;
}

export const IsoBox: React.FC<IsoBoxProps> = ({
  x, y, w, h, d, color, strokeW = 0.5,
}) => {
  // あつ森のアイソメトリック角度: 奥行きはY軸上向きで表現
  // d=奥行き → y座標を上にずらす
  const topColor = lighten(color, 25);
  const frontColor = color;
  const sideColor = darken(color, 20);
  const stroke = darken(color, 40);

  // 正面 (手前面)
  const frontPts = `${x},${y} ${x + w},${y} ${x + w},${y - h} ${x},${y - h}`;

  // 上面 (奥行きを表現)
  const topPts = `${x},${y - h} ${x + w},${y - h} ${x + w - d * 0.3},${y - h - d} ${x - d * 0.3},${y - h - d}`;

  // 右側面
  const sidePts = `${x + w},${y} ${x + w},${y - h} ${x + w - d * 0.3},${y - h - d} ${x + w - d * 0.3},${y - d}`;

  return (
    <g>
      {/* 正面 */}
      <polygon points={frontPts} fill={frontColor} stroke={stroke} strokeWidth={strokeW} />
      {/* 上面 */}
      <polygon points={topPts} fill={topColor} stroke={stroke} strokeWidth={strokeW} />
      {/* 右側面 */}
      <polygon points={sidePts} fill={sideColor} stroke={stroke} strokeWidth={strokeW} />
    </g>
  );
};

// ═══════════════════════════════════════════════════════
// デスク (あつ森風木製テーブル)
// ═══════════════════════════════════════════════════════
export const Desk: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const wood = '#C49A5A';
  const legColor = '#8B6B38';

  return (
    <g>
      {/* 脚 (4本) */}
      <IsoBox x={x + 5} y={y} w={5} h={35} d={3} color={legColor} />
      <IsoBox x={x + 130} y={y} w={5} h={35} d={3} color={legColor} />
      <IsoBox x={x + 5} y={y - 50} w={5} h={35} d={3} color={legColor} />
      <IsoBox x={x + 130} y={y - 50} w={5} h={35} d={3} color={legColor} />

      {/* 天板 */}
      <IsoBox x={x} y={y - 35} w={140} h={8} d={55} color={wood} />

      {/* 天板上ハイライト */}
      <polygon
        points={`${x},${y - 43} ${x + 140},${y - 43} ${x + 140 - 55 * 0.3},${y - 43 - 55} ${x - 55 * 0.3},${y - 43 - 55}`}
        fill="rgba(255,255,255,0.06)"
      />

      {/* ノートPC */}
      <IsoBox x={x + 30} y={y - 43 - 15} w={35} h={2} d={25} color="#444444" />
      {/* 画面 */}
      <polygon
        points={`${x + 32},${y - 45 - 15} ${x + 63},${y - 45 - 15} ${x + 63},${y - 45 - 15 - 22} ${x + 32},${y - 45 - 15 - 22}`}
        fill="#1A2A1A"
      />
      {/* 画面グロー */}
      <polygon
        points={`${x + 34},${y - 47 - 15} ${x + 61},${y - 47 - 15} ${x + 61},${y - 47 - 15 - 18} ${x + 34},${y - 47 - 15 - 18}`}
        fill="rgba(76,175,80,0.08)"
      />

      {/* メモ帳 */}
      <IsoBox x={x + 80} y={y - 43 - 18} w={15} h={1} d={20} color="#F5ECD7" />

      {/* マグカップ */}
      <ellipse cx={x + 110} cy={y - 43 - 22} rx={7} ry={4} fill="#795548" />
      <rect x={x + 103} y={y - 43 - 30} width={14} height={12} rx={2} fill="#8D6E63" />
      <ellipse cx={x + 110} cy={y - 43 - 30} rx={7} ry={4} fill="#6D4C41" />
      {/* 湯気 */}
      <path d={`M${x + 108},${y - 43 - 34} Q${x + 106},${y - 43 - 40} ${x + 109},${y - 43 - 44}`}
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" />
    </g>
  );
};

// ═══════════════════════════════════════════════════════
// 椅子 (あつ森風木製椅子)
// ═══════════════════════════════════════════════════════
export const Chair: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const green = '#5A8040';
  const leg = '#6B5530';

  return (
    <g>
      {/* 脚 */}
      <IsoBox x={x} y={y} w={4} h={22} d={2} color={leg} />
      <IsoBox x={x + 28} y={y} w={4} h={22} d={2} color={leg} />
      <IsoBox x={x} y={y - 18} w={4} h={22} d={2} color={leg} />
      <IsoBox x={x + 28} y={y - 18} w={4} h={22} d={2} color={leg} />

      {/* 座面 (クッション) */}
      <IsoBox x={x - 2} y={y - 22} w={36} h={5} d={22} color={green} />

      {/* 背もたれ */}
      <IsoBox x={x} y={y - 22 - 22} w={32} h={30} d={3} color={green} />
      {/* 背もたれの横桟 */}
      <rect x={x + 3} y={y - 22 - 22 - 25} width={26} height={3} rx={1}
        fill={lighten(green, 15)} />
      <rect x={x + 3} y={y - 22 - 22 - 15} width={26} height={3} rx={1}
        fill={lighten(green, 15)} />
    </g>
  );
};

// ═══════════════════════════════════════════════════════
// 本棚 (あつ森風 3段棚)
// ═══════════════════════════════════════════════════════
export const Bookshelf: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const wood = '#A07848';
  const bookColors = [
    '#C62828', '#1565C0', '#2E7D32', '#E65100', '#6A1B9A',
    '#00695C', '#AD1457', '#0277BD', '#558B2F', '#BF360C',
  ];

  return (
    <g>
      {/* 外枠 */}
      <IsoBox x={x} y={y} w={70} h={90} d={25} color={wood} />

      {/* 内部背面（暗い） */}
      <rect x={x + 4} y={y - 88} width={62} height={84} fill="#5A4530" />

      {/* 棚板 */}
      {[28, 56].map((shelfY, i) => (
        <IsoBox key={i} x={x + 3} y={y - shelfY} w={64} h={3} d={22} color={darken(wood, 5)} />
      ))}

      {/* 本 (上段) */}
      {[0, 11, 20, 30, 42, 52].map((bx, i) => (
        <rect key={`t${i}`}
          x={x + 6 + bx} y={y - 56 - vary(22, 6, i, 0)}
          width={vary(9, 3, i, 1)} height={vary(24, 6, i, 0)}
          rx={1} fill={bookColors[i % bookColors.length]}
        />
      ))}

      {/* 本 (中段) */}
      {[0, 12, 22, 33, 45].map((bx, i) => (
        <rect key={`m${i}`}
          x={x + 6 + bx} y={y - 28 - vary(20, 5, i + 6, 0)}
          width={vary(10, 3, i + 6, 1)} height={vary(22, 5, i + 6, 0)}
          rx={1} fill={bookColors[(i + 5) % bookColors.length]}
        />
      ))}

      {/* 下段: 植木鉢 + 小物 */}
      <rect x={x + 10} y={y - 20} width={16} height={16} rx={4} fill="#8D6E63" />
      <ellipse cx={x + 18} cy={y - 22} rx={12} ry={8} fill="#5A8040" />
      <ellipse cx={x + 15} cy={y - 26} rx={5} ry={3} fill="#7AAA55" />

      {/* 小さいフィギュア */}
      <circle cx={x + 50} cy={y - 12} r={5} fill="#FFE082" />
      <rect x={x + 45} y={y - 8} width={10} height={6} rx={2} fill="#FFE082" />
      <circle cx={x + 48} cy={y - 13} r={1} fill="#333" />
      <circle cx={x + 52} cy={y - 13} r={1} fill="#333" />
    </g>
  );
};

// ═══════════════════════════════════════════════════════
// サイドテーブル + 植物
// ═══════════════════════════════════════════════════════
export const SideTable: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const wood = '#B08850';

  return (
    <g>
      {/* テーブル脚 (中央1本) */}
      <IsoBox x={x + 10} y={y} w={8} h={28} d={5} color={darken(wood, 15)} />

      {/* 天板 (丸型を多角形で近似) */}
      <IsoBox x={x - 5} y={y - 28} w={38} h={4} d={30} color={wood} />

      {/* 天板上の植木鉢 */}
      <polygon
        points={`${x + 6},${y - 32 - 15} ${x + 10},${y - 32 - 3} ${x + 22},${y - 32 - 3} ${x + 26},${y - 32 - 15}`}
        fill="#8D6E63"
      />
      {/* 鉢の縁 */}
      <ellipse cx={x + 16} cy={y - 32 - 15} rx={11} ry={5} fill="#A1887F" />
      <ellipse cx={x + 16} cy={y - 32 - 16} rx={9} ry={4} fill="#6D4C41" />

      {/* 植物 */}
      <ellipse cx={x + 16} cy={y - 32 - 24} rx={16} ry={11} fill="#4A7A35" />
      <ellipse cx={x + 12} cy={y - 32 - 28} rx={7} ry={4} fill="#5A8040"
        transform={`rotate(-15 ${x + 12} ${y - 32 - 28})`} />
      <ellipse cx={x + 22} cy={y - 32 - 26} rx={6} ry={4} fill="#6B9B4D"
        transform={`rotate(10 ${x + 22} ${y - 32 - 26})`} />

      {/* 花 */}
      <circle cx={x + 18} cy={y - 32 - 34} r={3.5} fill="#FFCC80" />
      <circle cx={x + 18} cy={y - 32 - 34} r={1.8} fill="#FF8F00" />
      <circle cx={x + 10} cy={y - 32 - 30} r={2.5} fill="#FFB74D" />
      <circle cx={x + 10} cy={y - 32 - 30} r={1.2} fill="#E65100" />
    </g>
  );
};

// ═══════════════════════════════════════════════════════
// 丸太スツール
// ═══════════════════════════════════════════════════════
export const LogStool: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  return (
    <g>
      {/* 胴体 */}
      <IsoBox x={x} y={y} w={30} h={20} d={20} color="#A07848" />

      {/* 年輪 (上面に描画) */}
      <ellipse cx={x + 15 - 20 * 0.15} cy={y - 20 - 10} rx={13} ry={8}
        fill="none" stroke="#8B6B38" strokeWidth="1" opacity="0.4" />
      <ellipse cx={x + 15 - 20 * 0.15} cy={y - 20 - 10} rx={8} ry={5}
        fill="none" stroke="#8B6B38" strokeWidth="0.8" opacity="0.3" />
      <ellipse cx={x + 15 - 20 * 0.15} cy={y - 20 - 10} rx={3} ry={2}
        fill="#7A5B30" opacity="0.4" />
    </g>
  );
};

// ═══════════════════════════════════════════════════════
// ソファ / 長椅子 (あつ森風)
// ═══════════════════════════════════════════════════════
export const Sofa: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const fabric = '#7B8B4A'; // オリーブグリーン
  const wood = '#8B6B38';

  return (
    <g>
      {/* 脚 */}
      <IsoBox x={x + 2} y={y} w={5} h={8} d={3} color={wood} />
      <IsoBox x={x + 80} y={y} w={5} h={8} d={3} color={wood} />

      {/* 座面 */}
      <IsoBox x={x} y={y - 8} w={90} h={15} d={40} color={fabric} />

      {/* 背もたれ */}
      <IsoBox x={x} y={y - 8 - 40} w={90} h={30} d={8} color={darken(fabric, 10)} />

      {/* クッションのステッチ表現 */}
      <line x1={x + 30} y1={y - 23} x2={x + 30} y2={y - 23 - 27}
        stroke={darken(fabric, 25)} strokeWidth="1" opacity="0.4" />
      <line x1={x + 60} y1={y - 23} x2={x + 60} y2={y - 23 - 27}
        stroke={darken(fabric, 25)} strokeWidth="1" opacity="0.4" />

      {/* 肘掛け */}
      <IsoBox x={x - 5} y={y - 8} w={8} h={22} d={40} color={darken(fabric, 5)} />
      <IsoBox x={x + 87} y={y - 8} w={8} h={22} d={40} color={darken(fabric, 5)} />
    </g>
  );
};

// ═══════════════════════════════════════════════════════
// 大きな植木鉢 (床置き)
// ═══════════════════════════════════════════════════════
export const FloorPlant: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  return (
    <g>
      {/* 鉢 */}
      <polygon
        points={`${x},${y - 25} ${x + 5},${y} ${x + 30},${y} ${x + 35},${y - 25}`}
        fill="#8D6E63"
      />
      <polygon
        points={`${x},${y - 25} ${x + 35},${y - 25} ${x + 32},${y - 28} ${x + 3},${y - 28}`}
        fill="#A1887F"
      />

      {/* 葉っぱ (大きめ、あつ森風) */}
      <ellipse cx={x + 17} cy={y - 38} rx={22} ry={16} fill="#4A7A35" />
      <ellipse cx={x + 10} cy={y - 45} rx={12} ry={7} fill="#5A8040"
        transform={`rotate(-25 ${x + 10} ${y - 45})`} />
      <ellipse cx={x + 26} cy={y - 42} rx={10} ry={6} fill="#6B9B4D"
        transform={`rotate(20 ${x + 26} ${y - 42})`} />
      <ellipse cx={x + 17} cy={y - 50} rx={8} ry={5} fill="#7AAA55"
        transform={`rotate(-5 ${x + 17} ${y - 50})`} />
      <ellipse cx={x + 5} cy={y - 36} rx={9} ry={5} fill="#5A8040"
        transform={`rotate(-40 ${x + 5} ${y - 36})`} />
      <ellipse cx={x + 30} cy={y - 35} rx={8} ry={4} fill="#6B9B4D"
        transform={`rotate(30 ${x + 30} ${y - 35})`} />
    </g>
  );
};
