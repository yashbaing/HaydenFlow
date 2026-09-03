import type { CorrelationClassification, CorrelationResult } from '@nexora/shared';
import { CORRELATION_THRESHOLDS } from '@nexora/shared';

/**
 * CorrelationEngine
 *
 * Calculates Pearson correlation between two asset price series.
 * Architected to swap out mock price data for a real market-data provider.
 */

/**
 * Calculate percentage log returns from a price series.
 */
export function calculateLogReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  return prices.slice(1).map((price, i) => {
    const prev = prices[i]!;
    return prev > 0 ? Math.log(price / prev) : 0;
  });
}

/**
 * Calculate percentage returns from a price series.
 */
export function calculatePercentageReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  return prices.slice(1).map((price, i) => {
    const prev = prices[i]!;
    return prev > 0 ? (price - prev) / prev : 0;
  });
}

/**
 * Calculate Pearson correlation coefficient between two return series.
 * Returns a value between -1 and 1.
 */
export function calculatePearsonCorrelation(seriesA: number[], seriesB: number[]): number {
  const n = Math.min(seriesA.length, seriesB.length);
  if (n < 2) return 0;

  const a = seriesA.slice(0, n);
  const b = seriesB.slice(0, n);

  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA;
    const db = b[i]! - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  const denominator = Math.sqrt(denomA * denomB);
  return denominator === 0 ? 0 : Math.max(-1, Math.min(1, numerator / denominator));
}

/**
 * Classify correlation score into a human-readable category.
 */
export function classifyCorrelation(score: number): CorrelationClassification {
  const abs = Math.abs(score);
  if (abs >= CORRELATION_THRESHOLDS.EXTREME) return 'EXTREME';
  if (abs >= CORRELATION_THRESHOLDS.HIGH) return 'HIGH';
  if (abs >= CORRELATION_THRESHOLDS.MODERATE) return 'MODERATE';
  return 'LOW';
}

/**
 * Calculate rolling correlation (30-day window) over a longer price history.
 */
export function calculateRollingCorrelation(
  pricesA: number[],
  pricesB: number[],
  windowDays: number = 30
): { date: number; correlation: number }[] {
  const returnsA = calculateLogReturns(pricesA);
  const returnsB = calculateLogReturns(pricesB);
  const results: { date: number; correlation: number }[] = [];
  const n = Math.min(returnsA.length, returnsB.length);

  for (let i = windowDays - 1; i < n; i++) {
    const windowA = returnsA.slice(i - windowDays + 1, i + 1);
    const windowB = returnsB.slice(i - windowDays + 1, i + 1);
    results.push({
      date: i,
      correlation: calculatePearsonCorrelation(windowA, windowB),
    });
  }
  return results;
}

/**
 * Main correlation calculation entry point.
 * Accepts price arrays and returns a full CorrelationResult.
 */
export function computeCorrelation(
  symbolA: string,
  pricesA: number[],
  symbolB: string,
  pricesB: number[]
): CorrelationResult {
  const returnsA = calculateLogReturns(pricesA);
  const returnsB = calculateLogReturns(pricesB);
  const correlation = calculatePearsonCorrelation(returnsA, returnsB);
  const classification = classifyCorrelation(correlation);

  return {
    assetA: symbolA,
    assetB: symbolB,
    correlation: Math.round(correlation * 10000) / 10000,
    classification,
    dataPoints: Math.min(returnsA.length, returnsB.length),
    periodDays: Math.min(pricesA.length, pricesB.length),
    calculatedAt: new Date(),
  };
}

/**
 * Estimate correlation-adjusted LP risk.
 * Higher correlation = lower relative inventory risk.
 */
export function estimateLpRisk(correlation: number): string {
  const abs = Math.abs(correlation);
  if (abs >= 0.90) return 'VERY_LOW';
  if (abs >= 0.75) return 'LOW';
  if (abs >= 0.55) return 'MODERATE';
  if (abs >= 0.35) return 'HIGH';
  return 'VERY_HIGH';
}

/**
 * Suggest pool fee tier based on correlation.
 * More correlated = lower fee (tighter spreads expected).
 */
export function suggestFeeTier(correlation: number): { feeBps: number; label: string } {
  const abs = Math.abs(correlation);
  if (abs >= 0.90) return { feeBps: 5,  label: '0.05% — Ultra Correlated' };
  if (abs >= 0.75) return { feeBps: 20, label: '0.2% — Highly Correlated' };
  if (abs >= 0.50) return { feeBps: 30, label: '0.3% — Moderately Correlated' };
  return { feeBps: 100, label: '1.0% — Weakly Correlated / Uncorrelated' };
}
