#include <emscripten.h>
#include <cmath>
#include <cstring>
#include <vector>

// Grid is (N+1)x(N+1), indices 0..N inclusive
// x goes left to right, y goes bottom to top
// Boundary: left=0, right=0, bottom=0, top=f(x)

static const int MAX_N = 256;
static double grid[MAX_N + 1][MAX_N + 1];
static double analytical[MAX_N + 1][MAX_N + 1];
static int gN = 64;

// Boundary condition types
// 0: constant f(x)=1
// 1: f(x)=x
// 2: f(x)=sin(pi*x)
// 3: f(x)=sin(3*pi*x)
// 4: f(x)=x*(1-x)*4   (parabolic)

static double boundary_value(int bc_type, double x) {
    switch (bc_type) {
        case 0: return 1.0;
        case 1: return x;
        case 2: return sin(M_PI * x);
        case 3: return sin(3.0 * M_PI * x);
        case 4: return 4.0 * x * (1.0 - x);
        default: return 0.0;
    }
}

// Analytical series solution for Laplace on [0,1]x[0,1]
// u=0 on left/right/bottom, u=f(x) on top
// u(x,y) = sum_{n=1}^{N_terms} b_n * sin(n*pi*x) * sinh(n*pi*y) / sinh(n*pi)
// where b_n = 2 * integral_0^1 f(x)*sin(n*pi*x) dx

static const int N_TERMS = 50;
static const int N_QUAD = 1000;

static double compute_bn(int bc_type, int n) {
    // Numerical integration via Simpson's rule
    double h = 1.0 / N_QUAD;
    double sum = 0.0;
    for (int k = 0; k <= N_QUAD; k++) {
        double x = k * h;
        double w = (k == 0 || k == N_QUAD) ? 1.0 : (k % 2 == 0 ? 2.0 : 4.0);
        sum += w * boundary_value(bc_type, x) * sin(n * M_PI * x);
    }
    return 2.0 * (h / 3.0) * sum;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
void init_solver(int N, int bc_type) {
    if (N > MAX_N) N = MAX_N;
    if (N < 4) N = 4;
    gN = N;
    double h = 1.0 / N;

    // Initialise grid to zero (interior + boundaries)
    for (int j = 0; j <= N; j++)
        for (int i = 0; i <= N; i++)
            grid[j][i] = 0.0;

    // Set top boundary (j = N)
    for (int i = 0; i <= N; i++) {
        double x = i * h;
        grid[N][i] = boundary_value(bc_type, x);
    }

    // Precompute analytical solution
    // Precompute b_n coefficients
    std::vector<double> bn(N_TERMS + 1);
    for (int n = 1; n <= N_TERMS; n++)
        bn[n] = compute_bn(bc_type, n);

    for (int j = 0; j <= N; j++) {
        double y = j * h;
        for (int i = 0; i <= N; i++) {
            double x = i * h;
            // Boundary points
            if (i == 0 || i == N || j == 0) {
                analytical[j][i] = 0.0;
                continue;
            }
            if (j == N) {
                analytical[j][i] = boundary_value(bc_type, x);
                continue;
            }
            double val = 0.0;
            for (int n = 1; n <= N_TERMS; n++) {
                double snpi = sinh(n * M_PI);
                if (snpi < 1e-300) continue;
                val += bn[n] * sin(n * M_PI * x) * sinh(n * M_PI * y) / snpi;
            }
            analytical[j][i] = val;
        }
    }
}

// Run `iters` Gauss-Seidel sweeps; returns max change
EMSCRIPTEN_KEEPALIVE
double iterate(int iters) {
    int N = gN;
    double max_change = 0.0;
    for (int it = 0; it < iters; it++) {
        max_change = 0.0;
        for (int j = 1; j < N; j++) {
            for (int i = 1; i < N; i++) {
                double old_val = grid[j][i];
                double new_val = 0.25 * (grid[j][i-1] + grid[j][i+1] +
                                         grid[j-1][i] + grid[j+1][i]);
                grid[j][i] = new_val;
                double diff = fabs(new_val - old_val);
                if (diff > max_change) max_change = diff;
            }
        }
    }
    return max_change;
}

// Write grid values into caller-provided flat array (row-major, j=0 at index 0)
// Array size must be (N+1)*(N+1)
EMSCRIPTEN_KEEPALIVE
void get_grid(double* out) {
    int N = gN;
    for (int j = 0; j <= N; j++)
        for (int i = 0; i <= N; i++)
            out[j * (N + 1) + i] = grid[j][i];
}

EMSCRIPTEN_KEEPALIVE
void get_analytical(double* out) {
    int N = gN;
    for (int j = 0; j <= N; j++)
        for (int i = 0; i <= N; i++)
            out[j * (N + 1) + i] = analytical[j][i];
}

EMSCRIPTEN_KEEPALIVE
int get_N() { return gN; }

// Max absolute error between current grid and analytical
EMSCRIPTEN_KEEPALIVE
double max_error() {
    int N = gN;
    double err = 0.0;
    for (int j = 0; j <= N; j++)
        for (int i = 0; i <= N; i++) {
            double d = fabs(grid[j][i] - analytical[j][i]);
            if (d > err) err = d;
        }
    return err;
}

} // extern "C"
