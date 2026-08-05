/**
 * Autoencoder - Unsupervised neural network for dimensionality reduction and anomaly detection
 * Compresses input through a bottleneck then reconstructs it, learning latent representations.
 */

export interface AutoencoderConfig {
  inputSize: number;
  hiddenLayers: number[];
  latentSize: number;
  learningRate: number;
  sparsity: number;
}

export interface AutoencoderResult {
  reconstruction: number[];
  latent: number[];
  reconstructionError: number;
}

export class Autoencoder {
  private encoderWeights: number[][][] = [];
  private encoderBias: number[][] = [];
  private decoderWeights: number[][][] = [];
  private decoderBias: number[][] = [];

  constructor(private config: AutoencoderConfig) {
    const encoderDims = [config.inputSize, ...config.hiddenLayers, config.latentSize];
    const decoderDims = [config.latentSize, ...[...config.hiddenLayers].reverse(), config.inputSize];

    for (let l = 0; l < encoderDims.length - 1; l++) {
      this.encoderWeights.push(this.initMatrix(encoderDims[l + 1], encoderDims[l]));
      this.encoderBias.push(new Array(encoderDims[l + 1]).fill(0).map(() => (Math.random() - 0.5) * 0.1));
    }
    for (let l = 0; l < decoderDims.length - 1; l++) {
      this.decoderWeights.push(this.initMatrix(decoderDims[l + 1], decoderDims[l]));
      this.decoderBias.push(new Array(decoderDims[l + 1]).fill(0).map(() => (Math.random() - 0.5) * 0.1));
    }
  }

  private initMatrix(rows: number, cols: number): number[][] {
    const scale = Math.sqrt(2 / cols);
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.1 * scale),
    );
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  private matVec(matrix: number[][], vec: number[], bias: number[]): number[] {
    return matrix.map((row, i) => row.reduce((acc, w, j) => acc + w * vec[j], 0) + bias[i]);
  }

  encode(input: number[]): number[] {
    let current = input;
    for (let l = 0; l < this.encoderWeights.length; l++) {
      const z = this.matVec(this.encoderWeights[l], current, this.encoderBias[l]);
      current = l === this.encoderWeights.length - 1 ? z.map((v) => v) : z.map((v) => this.relu(v));
    }
    return current;
  }

  decode(latent: number[]): number[] {
    let current = latent;
    for (let l = 0; l < this.decoderWeights.length; l++) {
      const z = this.matVec(this.decoderWeights[l], current, this.decoderBias[l]);
      current = l === this.decoderWeights.length - 1 ? z : z.map((v) => this.relu(v));
    }
    return current;
  }

  reconstruct(input: number[]): AutoencoderResult {
    const latent = this.encode(input);
    const reconstruction = this.decode(latent);
    const reconstructionError = input.reduce((sum, v, i) => sum + (v - reconstruction[i]) ** 2, 0) / input.length;
    return { reconstruction, latent, reconstructionError };
  }

  train(input: number[], learningRate = 0.01): number {
    const lr = learningRate ?? this.config.learningRate;

    const encoderActivations: number[][] = [input];
    let current = input;
    for (let l = 0; l < this.encoderWeights.length; l++) {
      const z = this.matVec(this.encoderWeights[l], current, this.encoderBias[l]);
      current = l === this.encoderWeights.length - 1 ? z : z.map((v) => this.relu(v));
      encoderActivations.push(current);
    }
    const latent = current;

    const decoderActivations: number[][] = [latent];
    for (let l = 0; l < this.decoderWeights.length; l++) {
      const z = this.matVec(this.decoderWeights[l], current, this.decoderBias[l]);
      current = l === this.decoderWeights.length - 1 ? z : z.map((v) => this.relu(v));
      decoderActivations.push(current);
    }
    const reconstruction = current;

    const error = input.map((v, i) => v - reconstruction[i]);
    const loss = error.reduce((s, e) => s + e * e, 0) / input.length;

    let grad = error;
    for (let l = this.decoderWeights.length - 1; l >= 0; l--) {
      const prevAct = decoderActivations[l];
      for (let i = 0; i < this.decoderWeights[l].length; i++) {
        for (let j = 0; j < this.decoderWeights[l][i].length; j++) {
          this.decoderWeights[l][i][j] += lr * grad[i] * prevAct[j];
        }
        this.decoderBias[l][i] += lr * grad[i];
      }
      grad = this.decoderWeights[l][0].map((_, j) =>
        this.decoderWeights[l].reduce((s, row) => s + row[j] * grad[row === this.decoderWeights[l][0] ? 0 : 0], 0),
      );
    }

    for (let l = this.encoderWeights.length - 1; l >= 0; l--) {
      const prevAct = encoderActivations[l];
      for (let i = 0; i < this.encoderWeights[l].length; i++) {
        for (let j = 0; j < this.encoderWeights[l][i].length; j++) {
          this.encoderWeights[l][i][j] += lr * grad[i] * prevAct[j];
        }
        this.encoderBias[l][i] += lr * grad[i];
      }
      if (l > 0) {
        grad = this.encoderWeights[l][0].map((_, j) =>
          grad.reduce((s, _, i) => s + this.encoderWeights[l][i][j] * grad[i], 0),
        );
      }
    }

    return loss;
  }

  isAnomaly(input: number[], threshold: number): boolean {
    return this.reconstruct(input).reconstructionError > threshold;
  }
}

export default Autoencoder;
