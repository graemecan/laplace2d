"use client";
import { useRef, useEffect } from "react";

interface Props {
  dataA: Float64Array;
  dataB: Float64Array;
  N: number;
  title: string;
}

// Red-white-blue diverging colormap for signed difference
function divergingColor(t: number): [number, number, number] {
  // t in [-1, 1]; negative=blue, zero=white, positive=red
  if (t >= 0) {
    t = Math.min(1, t);
    return [255, Math.round(255 * (1 - t)), Math.round(255 * (1 - t))];
  } else {
    t = Math.min(1, -t);
    return [Math.round(255 * (1 - t)), Math.round(255 * (1 - t)), 255];
  }
}

export default function DiffCanvas({ dataA, dataB, N, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dataA || !dataB) return;
    const size = N + 1;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(size, size);
    const pixels = imageData.data;

    // Find max abs diff for normalisation
    let maxDiff = 1e-10;
    for (let k = 0; k < size * size; k++) {
      const d = Math.abs(dataA[k] - dataB[k]);
      if (d > maxDiff) maxDiff = d;
    }

    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const diff = dataA[j * size + i] - dataB[j * size + i];
        const t = diff / maxDiff; // in [-1, 1]
        const [r, g, b] = divergingColor(t);
        const py = (N - j) * size * 4 + i * 4;
        pixels[py] = r;
        pixels[py + 1] = g;
        pixels[py + 2] = b;
        pixels[py + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [dataA, dataB, N]);

  return (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <canvas
        ref={canvasRef}
        className="w-64 h-64 border border-gray-300 rounded"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
