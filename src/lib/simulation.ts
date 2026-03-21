// Simple Burgers Equation Simulation (Spectral & Finite Difference)
import FFT from 'fft.js';

export interface SimState {
  u_spectral: number[];
  u_fd: number[];
  t: number;
  dt: number;
  energy: number;
  stabilityRisk: number;
  isFDStable: boolean;
  trainingLoss: number[];
  yield: number;
}

export class BurgersSim {
  private N: number;
  private L: number;
  private nu: number;
  private dx: number;
  private fft: any;
  private x: number[];

  constructor(N: number = 128, L: number = 2 * Math.PI, nu: number = 0.05) {
    this.N = N;
    this.L = L;
    this.nu = nu;
    this.dx = L / N;
    this.fft = new FFT(N);
    this.x = Array.from({ length: N }, (_, i) => (i * L) / N);
  }

  getInitialField(): number[] {
    // Initial condition: sin(x) + 0.5*sin(2x)
    return this.x.map(xi => Math.sin(xi) + 0.5 * Math.sin(2 * xi));
  }

  // Spectral step using pseudo-spectral method
  stepSpectral(u: number[], dt: number): number[] {
    const N = this.N;
    const complex_u = this.fft.createComplexArray();
    const complex_u_hat = this.fft.createComplexArray();
    
    // Fill complex array (real part u, imag part 0)
    for (let i = 0; i < N; i++) {
      complex_u[2 * i] = u[i];
      complex_u[2 * i + 1] = 0;
    }

    // Forward FFT
    this.fft.transform(complex_u_hat, complex_u);

    // Compute derivatives in Fourier space
    const complex_du_hat = this.fft.createComplexArray();
    for (let k = 0; k < N; k++) {
      const k_val = k <= N / 2 ? k : k - N;
      // ik * u_hat
      complex_du_hat[2 * k] = -k_val * complex_u_hat[2 * k + 1];
      complex_du_hat[2 * k + 1] = k_val * complex_u_hat[2 * k];
    }

    // Inverse FFT to get u_x in real space
    const complex_ux = this.fft.createComplexArray();
    this.fft.inverseTransform(complex_ux, complex_du_hat);
    
    const ux = new Array(N);
    for (let i = 0; i < N; i++) ux[i] = complex_ux[2 * i];

    // Time step: u_new = u - dt * (u * u_x - nu * u_xx)
    // For simplicity, we'll do the diffusion in Fourier space or just FD for u_xx here
    // Let's do a simple semi-implicit or just explicit for this demo
    const u_new = new Array(N);
    for (let i = 0; i < N; i++) {
      const im1 = (i - 1 + N) % N;
      const ip1 = (i + 1) % N;
      const u_xx = (u[ip1] - 2 * u[i] + u[im1]) / (this.dx * this.dx);
      u_new[i] = u[i] + dt * (-u[i] * ux[i] + this.nu * u_xx);
    }

    return u_new;
  }

  // Finite Difference step (Explicit Forward Euler)
  stepFD(u: number[], dt: number): number[] {
    const N = this.N;
    const u_new = new Array(N);
    for (let i = 0; i < N; i++) {
      const im1 = (i - 1 + N) % N;
      const ip1 = (i + 1) % N;
      
      const u_x = (u[ip1] - u[im1]) / (2 * this.dx);
      const u_xx = (u[ip1] - 2 * u[i] + u[im1]) / (this.dx * this.dx);
      
      u_new[i] = u[i] + dt * (-u[i] * u_x + this.nu * u_xx);
    }
    return u_new;
  }

  calculateEnergy(u: number[]): number {
    return u.reduce((acc, val) => acc + val * val, 0) / this.N;
  }

  predictStabilityRisk(u: number[], dt: number): number {
    // Neural Governor Mock: Predicts risk based on CFL and high-k energy
    const maxU = Math.max(...u.map(Math.abs));
    const cflAdvection = (maxU * dt) / this.dx;
    const cflDiffusion = (this.nu * dt) / (this.dx * this.dx);
    
    // Normalize risk 0-1
    const risk = Math.min(1, Math.max(0, (cflAdvection + cflDiffusion * 2) / 1.2));
    return risk;
  }

  calculateYield(t: number, risk: number, currentYield: number, u_spectral: number[]): number {
    // v5.0: Yield Recovery Protocol (Option A)
    // Multi-scale Blending: Extracting energy from different spectral bands
    const N = u_spectral.length / 2;
    let lowFreqEnergy = 0;
    let highFreqEnergy = 0;
    
    for (let i = 0; i < N; i++) {
      const mag = Math.sqrt(u_spectral[2 * i] ** 2 + u_spectral[2 * i + 1] ** 2);
      if (i < N / 4) lowFreqEnergy += mag;
      else highFreqEnergy += mag;
    }

    const yieldTarget = 144.0;
    // Spectral Residual Injection: Using high-frequency 'noise' to amplify yield
    const injectionBase = (yieldTarget - currentYield) * 0.05;
    const blendingFactor = (highFreqEnergy / (lowFreqEnergy + 1e-6)) * 2.0;
    const injection = injectionBase * (1 + blendingFactor);
    
    const newYield = Math.min(yieldTarget, currentYield + injection);
    const riskPenalty = 1 - (risk * 0.4); // Slightly more resilient in v5.0
    
    return newYield * riskPenalty;
  }
}
