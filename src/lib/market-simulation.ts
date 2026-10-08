import { simulatedPrices, type Asset } from "./brand";

type Tick = { time: number; price: number };

export class MarketSimulationService {
  private readonly prices = new Map<string, number>(Object.entries(simulatedPrices));
  private readonly history = new Map<string, Tick[]>();
  private seed: number;

  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    for (const key of this.prices.keys()) {
      const price = this.prices.get(key)!;
      this.history.set(key, Array.from({ length: 80 }, (_, index) => ({
        time: Date.now() - (79 - index) * 15000,
        price: price * (1 + Math.sin(index / 6) * 0.0018),
      })));
    }
  }

  private random(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  getPrice(asset: Asset): number {
    if (!this.prices.has(asset)) throw new Error("Unsupported asset");
    const current = this.prices.get(asset)!;
    const next = current * (1 + (this.random() - 0.5) * 0.0007);
    this.prices.set(asset, next);
    const ticks = this.history.get(asset)!;
    ticks.push({ time: Date.now(), price: next });
    if (ticks.length > 360) ticks.shift();
    return next;
  }

  snapshot(asset: Asset): { asset: Asset; price: number; history: Tick[]; simulated: true } {
    const price = this.getPrice(asset);
    return { asset, price, history: [...this.history.get(asset)!], simulated: true };
  }

  getHistory(asset: Asset): Tick[] {
    if (!this.history.has(asset)) throw new Error("Unsupported asset");
    return [...this.history.get(asset)!];
  }
}

export const marketSimulation = new MarketSimulationService();
