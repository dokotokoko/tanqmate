// LabRoomTextures.ts
// Canvas2Dでピクセルレベルのテクスチャタイルを生成し、data URIとして返す
// あつ森の壁・床テクスチャを忠実に再現する

/** ランダムな色の揺らぎ (deterministic seed-like) */
function vary(base: number, range: number, i: number, j: number): number {
  const hash = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  const t = hash - Math.floor(hash); // 0..1
  return Math.round(base + (t - 0.5) * range);
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)},${a})`;
}

// ═══════════════════════════════════════════════════════
// Brick Wall Texture (cream/white stone bricks like AC)
// ═══════════════════════════════════════════════════════
export function generateBrickTexture(
  tileW = 128,
  tileH = 64,
): string {
  const c = document.createElement('canvas');
  c.width = tileW;
  c.height = tileH;
  const ctx = c.getContext('2d')!;

  const brickW = tileW / 2;
  const brickH = tileH / 2;
  const mortarSize = 2;

  // Mortar/grout base color
  ctx.fillStyle = '#C8BDA5';
  ctx.fillRect(0, 0, tileW, tileH);

  // Draw bricks in offset pattern
  for (let row = 0; row < 2; row++) {
    const offsetX = row % 2 === 1 ? brickW / 2 : 0;
    const y = row * brickH;

    for (let col = -1; col < 3; col++) {
      const x = col * brickW + offsetX;

      // Base brick color with variation
      const br = vary(215, 16, row, col);
      const bg = vary(205, 14, row, col + 10);
      const bb = vary(188, 12, row, col + 20);

      // Brick body
      const bx = x + mortarSize;
      const by = y + mortarSize;
      const bw = brickW - mortarSize * 2;
      const bh = brickH - mortarSize * 2;

      // Main fill
      ctx.fillStyle = rgba(br, bg, bb, 1);
      ctx.fillRect(bx, by, bw, bh);

      // Subtle surface noise (pixel-level variation)
      for (let py = 0; py < bh; py += 2) {
        for (let px = 0; px < bw; px += 2) {
          const noise = vary(0, 10, row * 100 + py, col * 100 + px);
          ctx.fillStyle = rgba(128 + noise, 128 + noise, 128 + noise, 0.04);
          ctx.fillRect(bx + px, by + py, 2, 2);
        }
      }

      // Top edge highlight (light from above)
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(bx, by, bw, 2);

      // Left edge highlight
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(bx, by, 2, bh);

      // Bottom edge shadow
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(bx, by + bh - 2, bw, 2);

      // Right edge shadow
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(bx + bw - 2, by, 2, bh);

      // Occasional scuff/stain
      if (vary(0, 100, row * 7, col * 13) > 40) {
        const sx = bx + vary(bw / 2, bw / 3, row, col * 3);
        const sy = by + vary(bh / 2, bh / 3, row * 3, col);
        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        ctx.beginPath();
        ctx.arc(sx, sy, vary(4, 3, row, col), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Mortar line shadows (depth effect)
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  // Horizontal mortar
  ctx.beginPath();
  ctx.moveTo(0, brickH);
  ctx.lineTo(tileW, brickH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(tileW, 0);
  ctx.stroke();

  return c.toDataURL();
}

// ═══════════════════════════════════════════════════════
// Wood Floor Texture (warm honey-toned planks)
// ═══════════════════════════════════════════════════════
export function generateWoodTexture(
  tileW = 160,
  tileH = 40,
): string {
  const c = document.createElement('canvas');
  c.width = tileW;
  c.height = tileH;
  const ctx = c.getContext('2d')!;

  // Base wood color
  const baseR = 185, baseG = 155, baseB = 105;
  ctx.fillStyle = rgba(baseR, baseG, baseB, 1);
  ctx.fillRect(0, 0, tileW, tileH);

  // Wood grain lines (horizontal, subtle)
  for (let y = 0; y < tileH; y++) {
    const grainStrength = Math.sin(y * 0.8 + Math.sin(y * 0.3) * 2) * 0.5 + 0.5;
    const r = baseR + vary(-5, 8, y, 0);
    const g = baseG + vary(-5, 6, y, 1);
    const b = baseB + vary(-3, 5, y, 2);

    ctx.fillStyle = rgba(r, g, b, 0.3 + grainStrength * 0.3);
    ctx.fillRect(0, y, tileW, 1);
  }

  // Knot (occasionally)
  const kx = vary(tileW / 2, tileW / 3, 42, 17);
  const ky = vary(tileH / 2, tileH / 4, 23, 31);
  const gradient = ctx.createRadialGradient(kx, ky, 0, kx, ky, 8);
  gradient.addColorStop(0, 'rgba(120,90,50,0.3)');
  gradient.addColorStop(0.5, 'rgba(140,105,60,0.15)');
  gradient.addColorStop(1, 'rgba(140,105,60,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(kx, ky, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Plank seam at bottom (dark line)
  ctx.fillStyle = 'rgba(80,55,25,0.2)';
  ctx.fillRect(0, tileH - 2, tileW, 2);

  // Plank seam highlight just above
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, tileH - 3, tileW, 1);

  // Very subtle shine/reflection
  const shineGrad = ctx.createLinearGradient(0, 0, tileW, 0);
  shineGrad.addColorStop(0, 'rgba(255,255,255,0)');
  shineGrad.addColorStop(0.3, 'rgba(255,255,255,0.03)');
  shineGrad.addColorStop(0.7, 'rgba(255,255,255,0)');
  shineGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
  ctx.fillStyle = shineGrad;
  ctx.fillRect(0, 0, tileW, tileH);

  return c.toDataURL();
}

// ═══════════════════════════════════════════════════════
// Carpet Texture (ornate geometric like AC)
// ═══════════════════════════════════════════════════════
export function generateCarpetTexture(
  tileW = 64,
  tileH = 64,
): string {
  const c = document.createElement('canvas');
  c.width = tileW;
  c.height = tileH;
  const ctx = c.getContext('2d')!;

  // Base color (warm gold/olive)
  ctx.fillStyle = '#B5A46A';
  ctx.fillRect(0, 0, tileW, tileH);

  // Woven texture base (tiny checkerboard)
  for (let y = 0; y < tileH; y += 2) {
    for (let x = 0; x < tileW; x += 2) {
      if ((x + y) % 4 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  const cx = tileW / 2;
  const cy = tileH / 2;

  // Diamond pattern (center)
  ctx.strokeStyle = '#8B7B4A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx + 20, cy);
  ctx.lineTo(cx, cy + 20);
  ctx.lineTo(cx - 20, cy);
  ctx.closePath();
  ctx.stroke();

  // Inner diamond
  ctx.strokeStyle = '#9A8B55';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx + 12, cy);
  ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx - 12, cy);
  ctx.closePath();
  ctx.stroke();

  // Center flower/dot
  ctx.fillStyle = '#C4A050';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#A08838';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  // Corner accents (quarter diamonds at each corner)
  const corners = [[0, 0], [tileW, 0], [0, tileH], [tileW, tileH]];
  corners.forEach(([cornerX, cornerY]) => {
    ctx.fillStyle = 'rgba(100,85,50,0.15)';
    ctx.beginPath();
    ctx.moveTo(cornerX, cornerY);
    ctx.lineTo(cornerX + (cornerX === 0 ? 10 : -10), cornerY);
    ctx.lineTo(cornerX, cornerY + (cornerY === 0 ? 10 : -10));
    ctx.closePath();
    ctx.fill();
  });

  // Subtle color bands
  ctx.fillStyle = 'rgba(140,120,70,0.08)';
  ctx.fillRect(0, tileH / 4, tileW, 2);
  ctx.fillRect(0, tileH * 3 / 4, tileW, 2);
  ctx.fillRect(tileW / 4, 0, 2, tileH);
  ctx.fillRect(tileW * 3 / 4, 0, 2, tileH);

  return c.toDataURL();
}

// ═══════════════════════════════════════════════════════
// Carpet Border Strip
// ═══════════════════════════════════════════════════════
export function generateCarpetBorderTexture(
  tileW = 32,
  tileH = 16,
): string {
  const c = document.createElement('canvas');
  c.width = tileW;
  c.height = tileH;
  const ctx = c.getContext('2d')!;

  // Border base
  ctx.fillStyle = '#7A6B42';
  ctx.fillRect(0, 0, tileW, tileH);

  // Zigzag/chevron pattern
  ctx.strokeStyle = '#998855';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, tileH / 2);
  ctx.lineTo(tileW / 4, 3);
  ctx.lineTo(tileW / 2, tileH / 2);
  ctx.lineTo(tileW * 3 / 4, 3);
  ctx.lineTo(tileW, tileH / 2);
  ctx.stroke();

  ctx.strokeStyle = '#6B5D3A';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, tileH / 2);
  ctx.lineTo(tileW / 4, tileH - 3);
  ctx.lineTo(tileW / 2, tileH / 2);
  ctx.lineTo(tileW * 3 / 4, tileH - 3);
  ctx.lineTo(tileW, tileH / 2);
  ctx.stroke();

  return c.toDataURL();
}

// ═══════════════════════════════════════════════════════
// Wood Surface Texture (for furniture tops)
// ═══════════════════════════════════════════════════════
export function generateFurnitureWoodTexture(
  tileW = 80,
  tileH = 40,
  hue: 'light' | 'medium' | 'dark' = 'medium',
): string {
  const c = document.createElement('canvas');
  c.width = tileW;
  c.height = tileH;
  const ctx = c.getContext('2d')!;

  const bases = {
    light:  { r: 210, g: 185, b: 140 },
    medium: { r: 175, g: 140, b: 90 },
    dark:   { r: 130, g: 100, b: 60 },
  };
  const base = bases[hue];

  ctx.fillStyle = rgba(base.r, base.g, base.b, 1);
  ctx.fillRect(0, 0, tileW, tileH);

  // Grain
  for (let y = 0; y < tileH; y++) {
    const wave = Math.sin(y * 0.5 + Math.sin(y * 0.2) * 3);
    const brightness = wave * 4;
    ctx.fillStyle = rgba(
      base.r + brightness, base.g + brightness, base.b + brightness, 0.4,
    );
    ctx.fillRect(0, y, tileW, 1);
  }

  return c.toDataURL();
}

// ═══════════════════════════════════════════════════════
// All textures bundled
// ═══════════════════════════════════════════════════════
export interface RoomTextures {
  brick: string;
  wood: string;
  carpet: string;
  carpetBorder: string;
  furnitureLight: string;
  furnitureMedium: string;
  furnitureDark: string;
}

export function generateAllTextures(): RoomTextures {
  return {
    brick: generateBrickTexture(),
    wood: generateWoodTexture(),
    carpet: generateCarpetTexture(),
    carpetBorder: generateCarpetBorderTexture(),
    furnitureLight: generateFurnitureWoodTexture(80, 40, 'light'),
    furnitureMedium: generateFurnitureWoodTexture(80, 40, 'medium'),
    furnitureDark: generateFurnitureWoodTexture(80, 40, 'dark'),
  };
}
