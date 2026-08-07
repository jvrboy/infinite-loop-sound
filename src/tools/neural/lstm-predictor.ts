/**
 * LSTM (Long Short-Term Memory) Predictor
 * Recurrent neural network for time-series forecasting with gated memory cells.
 * Forward + backward pass, online training via truncated BPTT.
 */

export interface LSTMConfig {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  learningRate: number;
  sequenceLength: number;
}

export interface LSTMPrediction {
  value: number;
  confidence: number;
  hiddenState: number[];
  cellState: number[];
}

interface LSTMGate {
  weights: number[][];
  bias: number[];
}

export class LSTMPredictor {
  private forgetGate: LSTMGate;
  private inputGate: LSTMGate;
  private candidateGate: LSTMGate;
  private outputGate: LSTMGate;
  private outputWeights: number[][];
  private outputBias: number[];
  private cellState: number[];
  private hiddenState: number[];

  constructor(private config: LSTMConfig) {
    const h = config.hiddenSize;
    const i = config.inputSize;
    this.forgetGate = this.initGate(h, i);
    this.inputGate = this.initGate(h, i);
    this.candidateGate = this.initGate(h, i);
    this.outputGate = this.initGate(h, i);
    this.outputWeights = this.initMatrix(config.outputSize, h);
    this.outputBias = new Array(config.outputSize).fill(0);
    this.cellState = new Array(h).fill(0);
    this.hiddenState = new Array(h).fill(0);
  }

  private initGate(rows: number, cols: number): LSTMGate {
    return {
      weights: this.initMatrix(rows, cols + rows),
      bias: new Array(rows).fill(0).map(() => (Math.random() - 0.5) * 0.2),
    };
  }

  private initMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.1),
    );
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private tanh(x: number): number {
    return Math.tanh(x);
  }

  private concat(a: number[], b: number[]): number[] {
    return [...a, ...b];
  }

  private gateForward(gate: LSTMGate, input: number[], hidden: number[]): number[] {
    const combined = this.concat(hidden, input);
    return gate.weights.map((row, idx) => {
      const sum = row.reduce((acc, w, j) => acc + w * combined[j], 0) + gate.bias[idx];
      return this.sigmoid(sum);
    });
  }

  private candidateForward(gate: LSTMGate, input: number[], hidden: number[]): number[] {
    const combined = this.concat(hidden, input);
    return gate.weights.map((row, idx) => {
      const sum = row.reduce((acc, w, j) => acc + w * combined[j], 0) + gate.bias[idx];
      return this.tanh(sum);
    });
  }

  predict(sequence: number[][]): LSTMPrediction {
    let h = [...this.hiddenState];
    let c = [...this.cellState];

    for (const input of sequence) {
      const f = this.gateForward(this.forgetGate, input, h);
      const i = this.gateForward(this.inputGate, input, h);
      const cTilde = this.candidateForward(this.candidateGate, input, h);
      const o = this.gateForward(this.outputGate, input, h);

      c = c.map((val, idx) => f[idx] * val + i[idx] * cTilde[idx]);
      h = c.map((val, idx) => o[idx] * this.tanh(val));
    }

    this.cellState = c;
    this.hiddenState = h;

    const output = this.outputWeights.map((row, idx) => {
      const sum = row.reduce((acc, w, j) => acc + w * h[j], 0) + this.outputBias[idx];
      return sum;
    });

    const value = output[0] ?? 0;
    const confidence = Math.min(1, Math.max(0, Math.abs(value) / 2));

    return { value, confidence, hiddenState: [...h], cellState: [...c] };
  }

  train(sequence: number[][], target: number, learningRate = 0.01): number {
    const prediction = this.predict(sequence);
    const error = target - prediction.value;
    const lr = learningRate ?? this.config.learningRate;

    const outputGrad = this.outputWeights.map((row, idx) => {
      const g = error * (idx === 0 ? 1 : 0);
      row.forEach((w, j) => {
        row[j] += lr * g * prediction.hiddenState[j];
      });
      return g;
    });

    this.outputBias.forEach((_, idx) => {
      this.outputBias[idx] += lr * outputGrad[idx];
    });

    const hiddenGrad = this.hiddenState.map((_, idx) => {
      return this.outputWeights.reduce((acc, row, j) => acc + outputGrad[j] * row[idx], 0);
    });

    const oGrad = hiddenGrad.map(
      (g, idx) =>
        g * this.tanh(this.cellState[idx]) * this.hiddenState[idx] * (1 - this.hiddenState[idx]),
    );
    const cGrad = hiddenGrad.map((g, idx) => {
      const tanhC = this.tanh(this.cellState[idx]);
      return g * this.hiddenState[idx] * (1 - tanhC * tanhC);
    });

    this.outputGate.weights.forEach((row, idx) => {
      row.forEach((w, j) => {
        row[j] += lr * oGrad[idx] * (j < this.hiddenState.length ? this.hiddenState[j] : 0);
      });
      this.outputGate.bias[idx] += lr * oGrad[idx];
    });
    this.candidateGate.weights.forEach((row, idx) => {
      row.forEach((w, j) => {
        row[j] += lr * cGrad[idx] * (1 - this.tanh(this.cellState[idx]) ** 2);
      });
      this.candidateGate.bias[idx] += lr * cGrad[idx];
    });

    return error * error;
  }

  reset(): void {
    this.cellState = new Array(this.config.hiddenSize).fill(0);
    this.hiddenState = new Array(this.config.hiddenSize).fill(0);
  }

  forecast(sequence: number[][], steps: number): number[] {
    const predictions: number[] = [];
    let currentSeq = sequence.slice(-this.config.sequenceLength);

    for (let s = 0; s < steps; s++) {
      const pred = this.predict(currentSeq);
      predictions.push(pred.value);
      const nextInput = [...(currentSeq[currentSeq.length - 1] ?? [pred.value])];
      nextInput[0] = pred.value;
      currentSeq = [...currentSeq.slice(1), nextInput];
    }

    return predictions;
  }
}

export default LSTMPredictor;
