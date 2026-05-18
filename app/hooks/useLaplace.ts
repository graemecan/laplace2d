"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export type BCType = 0 | 1 | 2 | 3 | 4;
export const BC_LABELS: Record<BCType, string> = {
  0: "Constant (f = 1)",
  1: "Linear (f = x)",
  2: "Sine (f = sin(πx))",
  3: "Third harmonic (f = sin(3πx))",
  4: "Parabolic (f = 4x(1−x))",
};

interface LaplaceModule {
  _init_solver(N: number, bc_type: number): void;
  _iterate(iters: number): number;
  _get_grid(ptr: number): void;
  _get_analytical(ptr: number): void;
  _get_N(): number;
  _max_error(): number;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPF64: Float64Array;
}

declare global {
  interface Window {
    LaplaceModule: (opts?: object) => Promise<LaplaceModule>;
  }
}

export interface SolverState {
  iterGrid: Float64Array | null;
  analyticalGrid: Float64Array | null;
  N: number;
  iteration: number;
  maxChange: number;
  maxError: number;
  running: boolean;
  ready: boolean;
}

const GRID_N = 64;

export function useLaplace(bcType: BCType) {
  const modRef = useRef<LaplaceModule | null>(null);
  const ptrIterRef = useRef<number>(0);
  const ptrAnRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const iterCountRef = useRef(0);
  const maxChangeRef = useRef(1);

  const [state, setState] = useState<SolverState>({
    iterGrid: null,
    analyticalGrid: null,
    N: GRID_N,
    iteration: 0,
    maxChange: 1,
    maxError: 1,
    running: false,
    ready: false,
  });

  const allocBuffers = useCallback((mod: LaplaceModule, N: number) => {
    if (ptrIterRef.current) mod._free(ptrIterRef.current);
    if (ptrAnRef.current) mod._free(ptrAnRef.current);
    const size = (N + 1) * (N + 1) * 8; // float64
    ptrIterRef.current = mod._malloc(size);
    ptrAnRef.current = mod._malloc(size);
  }, []);

  const readGrids = useCallback((mod: LaplaceModule, N: number) => {
    mod._get_grid(ptrIterRef.current);
    mod._get_analytical(ptrAnRef.current);
    const len = (N + 1) * (N + 1);
    const iterGrid = new Float64Array(mod.HEAPF64.buffer, ptrIterRef.current, len).slice();
    const analyticalGrid = new Float64Array(mod.HEAPF64.buffer, ptrAnRef.current, len).slice();
    return { iterGrid, analyticalGrid };
  }, []);

  // Load WASM module once
  useEffect(() => {
    let cancelled = false;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const script = document.createElement("script");
    script.src = `${basePath}/laplace.js`;
    script.onload = async () => {
      if (cancelled) return;
      const mod = await window.LaplaceModule();
      if (cancelled) return;
      modRef.current = mod;
      allocBuffers(mod, GRID_N);
      mod._init_solver(GRID_N, bcType);
      const { iterGrid, analyticalGrid } = readGrids(mod, GRID_N);
      iterCountRef.current = 0;
      maxChangeRef.current = 1;
      setState({
        iterGrid,
        analyticalGrid,
        N: GRID_N,
        iteration: 0,
        maxChange: 1,
        maxError: mod._max_error(),
        running: false,
        ready: true,
      });
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      document.head.removeChild(script);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reinitialise when bc changes (after module loaded)
  const bcRef = useRef(bcType);
  useEffect(() => {
    if (bcRef.current === bcType) return;
    bcRef.current = bcType;
    const mod = modRef.current;
    if (!mod) return;
    cancelAnimationFrame(rafRef.current);
    mod._init_solver(GRID_N, bcType);
    const { iterGrid, analyticalGrid } = readGrids(mod, GRID_N);
    iterCountRef.current = 0;
    maxChangeRef.current = 1;
    setState(s => ({
      ...s,
      iterGrid,
      analyticalGrid,
      iteration: 0,
      maxChange: 1,
      maxError: mod._max_error(),
      running: false,
    }));
  }, [bcType, readGrids]);

  const step = useCallback((itersPerFrame = 20) => {
    const mod = modRef.current;
    if (!mod) return;
    const change = mod._iterate(itersPerFrame);
    iterCountRef.current += itersPerFrame;
    maxChangeRef.current = change;
    const { iterGrid, analyticalGrid } = readGrids(mod, GRID_N);
    setState(s => ({
      ...s,
      iterGrid,
      analyticalGrid,
      iteration: iterCountRef.current,
      maxChange: change,
      maxError: mod._max_error(),
    }));
  }, [readGrids]);

  const startLoop = useCallback(() => {
    setState(s => ({ ...s, running: true }));
    const loop = () => {
      step(20);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [step]);

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setState(s => ({ ...s, running: false }));
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const mod = modRef.current;
    if (!mod) return;
    mod._init_solver(GRID_N, bcRef.current);
    const { iterGrid, analyticalGrid } = readGrids(mod, GRID_N);
    iterCountRef.current = 0;
    setState(s => ({
      ...s,
      iterGrid,
      analyticalGrid,
      iteration: 0,
      maxChange: 1,
      maxError: mod._max_error(),
      running: false,
    }));
  }, [readGrids]);

  return { state, step, startLoop, stopLoop, reset };
}
