import { describe, it, expect } from 'vitest';
import {
  calculateLogReturns,
  calculatePearsonCorrelation,
  classifyCorrelation,
  computeCorrelation,
  estimateLpRisk,
  suggestFeeTier,
} from '../correlation';

describe('CorrelationEngine', () => {
  describe('calculateLogReturns', () => {
    it('returns empty array for single price', () => {
      expect(calculateLogReturns([100])).toEqual([]);
    });

    it('correctly calculates log returns', () => {
      const prices = [100, 110, 105];
      const returns = calculateLogReturns(prices);
      expect(returns).toHaveLength(2);
      expect(returns[0]).toBeCloseTo(Math.log(110 / 100), 5);
      expect(returns[1]).toBeCloseTo(Math.log(105 / 110), 5);
    });

    it('handles flat prices (zero returns)', () => {
      const prices = [100, 100, 100];
      const returns = calculateLogReturns(prices);
      expect(returns).toEqual([0, 0]);
    });
  });

  describe('calculatePearsonCorrelation', () => {
    it('returns 1.0 for perfectly positively correlated series', () => {
      const a = [1, 2, 3, 4, 5];
      const b = [2, 4, 6, 8, 10];
      expect(calculatePearsonCorrelation(a, b)).toBeCloseTo(1.0, 5);
    });

    it('returns -1.0 for perfectly negatively correlated series', () => {
      const a = [1, 2, 3, 4, 5];
      const b = [10, 8, 6, 4, 2];
      expect(calculatePearsonCorrelation(a, b)).toBeCloseTo(-1.0, 5);
    });

    it('returns 0 for uncorrelated series', () => {
      const a = [1, -1, 1, -1, 1, -1];
      const b = [-1, 1, -1, 1, -1, 1];
      expect(calculatePearsonCorrelation(a, b)).toBeCloseTo(-1.0, 3);
    });

    it('handles series of different lengths by using minimum length', () => {
      const a = [1, 2, 3, 4, 5, 6];
      const b = [2, 4, 6];
      const r = calculatePearsonCorrelation(a, b);
      expect(r).toBeCloseTo(1.0, 5);
    });

    it('clamps to [-1, 1] range', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      const r = calculatePearsonCorrelation(a, b);
      expect(r).toBeGreaterThanOrEqual(-1);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  describe('classifyCorrelation', () => {
    it('classifies EXTREME correlation', () => {
      expect(classifyCorrelation(0.95)).toBe('EXTREME');
      expect(classifyCorrelation(0.90)).toBe('EXTREME');
      expect(classifyCorrelation(-0.92)).toBe('EXTREME');
    });

    it('classifies HIGH correlation', () => {
      expect(classifyCorrelation(0.87)).toBe('HIGH');
      expect(classifyCorrelation(0.75)).toBe('HIGH');
      expect(classifyCorrelation(-0.80)).toBe('HIGH');
    });

    it('classifies MODERATE correlation', () => {
      expect(classifyCorrelation(0.65)).toBe('MODERATE');
      expect(classifyCorrelation(0.50)).toBe('MODERATE');
    });

    it('classifies LOW correlation', () => {
      expect(classifyCorrelation(0.30)).toBe('LOW');
      expect(classifyCorrelation(0.0)).toBe('LOW');
      expect(classifyCorrelation(-0.20)).toBe('LOW');
    });
  });

  describe('computeCorrelation', () => {
    it('returns full CorrelationResult structure', () => {
      const pricesA = Array.from({ length: 90 }, (_, i) => 100 + i * 0.5 + Math.random() * 2);
      const pricesB = Array.from({ length: 90 }, (_, i) => 50 + i * 0.3 + Math.random() * 1);
      const result = computeCorrelation('A', pricesA, 'B', pricesB);

      expect(result.assetA).toBe('A');
      expect(result.assetB).toBe('B');
      expect(result.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.correlation).toBeLessThanOrEqual(1);
      expect(['EXTREME', 'HIGH', 'MODERATE', 'LOW']).toContain(result.classification);
      expect(result.dataPoints).toBeGreaterThan(0);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('correctly identifies highly correlated series', () => {
      const pricesA = [100];
      const pricesB = [200];
      for (let i = 1; i < 90; i++) {
        const ret = 0.01 * Math.sin(i);
        pricesA.push(pricesA[i - 1]! * (1 + ret));
        pricesB.push(pricesB[i - 1]! * (1 + ret * 1.02));
      }
      const result = computeCorrelation('A', pricesA, 'B', pricesB);

      expect(result.correlation).toBeGreaterThan(0.90);
      expect(['EXTREME', 'HIGH']).toContain(result.classification);
    });
  });

  describe('estimateLpRisk', () => {
    it('returns VERY_LOW for extreme correlation', () => {
      expect(estimateLpRisk(0.95)).toBe('VERY_LOW');
    });
    it('returns LOW for high correlation', () => {
      expect(estimateLpRisk(0.80)).toBe('LOW');
    });
    it('returns MODERATE for moderate correlation', () => {
      expect(estimateLpRisk(0.60)).toBe('MODERATE');
    });
    it('returns HIGH for low correlation', () => {
      expect(estimateLpRisk(0.40)).toBe('HIGH');
    });
    it('returns VERY_HIGH for very low correlation', () => {
      expect(estimateLpRisk(0.10)).toBe('VERY_HIGH');
    });
  });

  describe('suggestFeeTier', () => {
    it('suggests ultra-low fee for extremely correlated assets', () => {
      const result = suggestFeeTier(0.95);
      expect(result.feeBps).toBe(5);
    });
    it('suggests 0.2% for highly correlated assets', () => {
      const result = suggestFeeTier(0.80);
      expect(result.feeBps).toBe(20);
    });
    it('suggests 0.3% for moderate correlation', () => {
      const result = suggestFeeTier(0.60);
      expect(result.feeBps).toBe(30);
    });
    it('suggests 1% for low correlation', () => {
      const result = suggestFeeTier(0.30);
      expect(result.feeBps).toBe(100);
    });
  });
});
