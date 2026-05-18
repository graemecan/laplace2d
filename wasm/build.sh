#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

emcc laplace.cpp \
  -O2 \
  -s WASM=1 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall","HEAPF64"]' \
  -s EXPORTED_FUNCTIONS='["_init_solver","_iterate","_get_grid","_get_analytical","_get_N","_max_error","_malloc","_free"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="LaplaceModule" \
  -o ../public/laplace.js

echo "Build complete: public/laplace.js + public/laplace.wasm"
