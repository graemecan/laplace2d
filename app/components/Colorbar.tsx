"use client";
import { useRef, useEffect } from "react";

interface Props {
  minVal: number;
  maxVal: number;
}

function colormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const pts: [number, number, number, number][] = [
    [0.0,   68,   1,  84],
    [0.2,   59,  82, 139],
    [0.4,   33, 145, 140],
    [0.6,   94, 201,  98],
    [0.8,  253, 231,  37],
    [1.0,  253, 231,  37],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, r0, g0, b0] = pts[i];
    const [t1, r1, g1, b1] = pts[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        Math.round(r0 + f * (r1 - r0)),
        Math.round(g0 + f * (g1 - g0)),
        Math.round(b0 + f * (b1 - b0)),
      ];
    }
  }
  return [253, 231, 37];
}

export default function Colorbar({ minVal, maxVal }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 20, H = 256;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(W, H);
    for (let row = 0; row < H; row++) {
      const t = 1 - row / (H - 1);
      const [r, g, b] = colormap(t);
      for (let col = 0; col < W; col++) {
        const idx = (row * W + col) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 ml-2">
      <span className="text-xs text-gray-500">{maxVal.toFixed(2)}</span>
      <canvas ref={canvasRef} className="w-5 h-64 border border-gray-200" style={{ imageRendering: "pixelated" }} />
      <span className="text-xs text-gray-500">{minVal.toFixed(2)}</span>
    </div>
  );
}
