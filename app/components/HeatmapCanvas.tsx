"use client";
import { useRef, useEffect } from "react";

interface Props {
  data: Float64Array;
  N: number;
  title: string;
  minVal?: number;
  maxVal?: number;
}

// Viridis-like colormap: maps [0,1] -> RGB
function colormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  // Control points: [t, r, g, b]
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

export default function HeatmapCanvas({ data, N, title, minVal = 0, maxVal = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const size = N + 1;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(size, size);
    const pixels = imageData.data;
    const range = maxVal - minVal || 1;

    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const val = data[j * size + i];
        const t = (val - minVal) / range;
        const [r, g, b] = colormap(t);
        // Canvas y=0 is top; j=0 is bottom → flip j
        const py = (N - j) * size * 4 + i * 4;
        pixels[py] = r;
        pixels[py + 1] = g;
        pixels[py + 2] = b;
        pixels[py + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [data, N, minVal, maxVal]);

  return (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <canvas
        ref={canvasRef}
        className="w-64 h-64 border border-gray-300 rounded image-rendering-pixelated"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
