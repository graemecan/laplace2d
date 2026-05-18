"use client";
import { useState } from "react";
import { useLaplace, BCType, BC_LABELS } from "./hooks/useLaplace";
import HeatmapCanvas from "./components/HeatmapCanvas";
import DiffCanvas from "./components/DiffCanvas";
import Colorbar from "./components/Colorbar";

export default function Home() {
  const [bcType, setBcType] = useState<BCType>(0);
  const { state, step, startLoop, stopLoop, reset } = useLaplace(bcType);

  const { iterGrid, analyticalGrid, N, iteration, maxChange, maxError, running, ready } = state;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 gap-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">2D Laplace Equation Visualizer</h1>
        <p className="mt-2 text-gray-500 max-w-2xl text-sm">
          Solves ∇²u = 0 on the unit square with u = 0 on left, right, and bottom edges.
          The chosen boundary condition is applied to the <strong>top</strong> edge.
          The iterative (Gauss-Seidel) solution is compared to the truncated Fourier series.
        </p>
      </header>

      {/* Controls */}
      <section className="flex flex-wrap gap-4 items-center justify-center bg-white rounded-xl shadow p-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Top boundary condition
          </label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={bcType}
            onChange={e => setBcType(Number(e.target.value) as BCType)}
            disabled={!ready}
          >
            {(Object.entries(BC_LABELS) as [string, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-end">
          <button
            onClick={running ? stopLoop : startLoop}
            disabled={!ready}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors
              ${running
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-40`}
          >
            {running ? "Pause" : "Run"}
          </button>
          <button
            onClick={() => step(20)}
            disabled={!ready || running}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800 disabled:opacity-40"
          >
            Step ×20
          </button>
          <button
            onClick={reset}
            disabled={!ready}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-6 text-center">
        <Stat label="Iterations" value={iteration.toLocaleString()} />
        <Stat label="Max Δu (this step)" value={maxChange < 1e-10 ? "< 1e-10" : maxChange.toExponential(3)} />
        <Stat label="Max |iter − series|" value={maxError < 1e-10 ? "< 1e-10" : maxError.toExponential(3)} />
      </section>

      {!ready && (
        <p className="text-gray-400 text-sm animate-pulse">Loading WebAssembly module…</p>
      )}

      {/* Heatmaps */}
      {iterGrid && analyticalGrid && (
        <section className="flex flex-wrap gap-8 justify-center items-start">
          <div className="flex items-start">
            <HeatmapCanvas data={iterGrid} N={N} title="Iterative (Gauss-Seidel)" />
            <Colorbar minVal={0} maxVal={1} />
          </div>
          <div className="flex items-start">
            <HeatmapCanvas data={analyticalGrid} N={N} title="Analytical (Fourier series, 50 terms)" />
            <Colorbar minVal={0} maxVal={1} />
          </div>
          <DiffCanvas dataA={iterGrid} dataB={analyticalGrid} N={N} title="Difference (iter − series)" />
        </section>
      )}

      {/* Math explanation */}
      <section className="max-w-2xl bg-white rounded-xl shadow p-6 text-sm text-gray-700 space-y-3">
        <h2 className="font-semibold text-gray-900 text-base">How it works</h2>
        <p>
          The Laplace equation ∇²u = u<sub>xx</sub> + u<sub>yy</sub> = 0 is discretised on an {"{N+1}"}×{"{N+1}"}
          uniform grid (N = 64). Interior values are updated by the{" "}
          <strong>Gauss-Seidel</strong> iteration:
        </p>
        <code className="block bg-gray-100 rounded p-2 text-xs">
          u[i,j] = ¼ (u[i−1,j] + u[i+1,j] + u[i,j−1] + u[i,j+1])
        </code>
        <p>
          The <strong>analytical solution</strong> is given by the Fourier sine series:
        </p>
        <code className="block bg-gray-100 rounded p-2 text-xs whitespace-pre-wrap">
{`u(x,y) = Σ bₙ sin(nπx) sinh(nπy) / sinh(nπ)
bₙ = 2 ∫₀¹ f(x) sin(nπx) dx   (50 terms used)`}
        </code>
        <p>
          The difference panel uses a red-white-blue colourmap where{" "}
          <span className="text-red-600">red = iterative higher</span> and{" "}
          <span className="text-blue-600">blue = series higher</span>.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow px-6 py-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-lg font-mono font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
