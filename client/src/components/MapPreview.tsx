'use client';

import { useRef, useEffect } from 'react';
import { TILE_SIZE } from '@/shared/constants';

interface Wall { x: number; y: number; w: number; h: number }

function parseWalls(mapGrid: string[]): { walls: Wall[]; mapW: number; mapH: number } {
  const rows = mapGrid.length;
  const cols = mapGrid[0].length;
  const grid: number[][] = [];
  const walls: Wall[] = [];

  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) grid[y][x] = mapGrid[y][x] === '#' ? 1 : 0;
  }

  const visited: boolean[][] = Array(rows).fill(0).map(() => Array(cols).fill(false));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 1 && !visited[y][x]) {
        let w = 1;
        while (x + w < cols && grid[y][x + w] === 1 && !visited[y][x + w]) w++;
        let h = 1;
        let valid = true;
        while (y + h < rows && valid) {
          for (let i = 0; i < w; i++) {
            if (grid[y + h][x + i] !== 1 || visited[y + h][x + i]) { valid = false; break; }
          }
          if (valid) h++;
        }
        for (let i = 0; i < h; i++)
          for (let j = 0; j < w; j++) visited[y + i][x + j] = true;
        walls.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, w: w * TILE_SIZE, h: h * TILE_SIZE });
      }
    }
  }

  return { walls, mapW: cols * TILE_SIZE, mapH: rows * TILE_SIZE };
}

interface MapPreviewProps {
  grid: string[];
  width?: number;
  height?: number;
  className?: string;
}

export function MapPreview({ grid, width = 200, height = 120, className = '' }: MapPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { walls, mapW, mapH } = parseWalls(grid);
    const sx = canvas.width / mapW;
    const sy = canvas.height / mapH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(74,85,104,0.7)';
    for (const w of walls) {
      ctx.fillRect(w.x * sx, w.y * sy, w.w * sx, w.h * sy);
    }
  }, [grid]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={`rounded-lg bg-gray-900/80 border border-gray-700 ${className}`}
    />
  );
}
