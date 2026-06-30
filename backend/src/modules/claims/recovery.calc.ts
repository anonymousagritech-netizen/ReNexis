import { Contract } from '@prisma/client';

/**
 * Calculates the recoverable amount from a reinsurance layer for a given gross incurred loss.
 * This is the centralized, auditable calculation referenced in the blueprint —
 * treaty math lives here, not scattered across routes.
 */
export function calculateLayerRecovery(
  grossIncurred: number,
  contract: Pick<Contract, 'treatyType' | 'retention' | 'limit' | 'reinstatements'>
): number {
  const retention = Number(contract.retention ?? 0);
  const limit = contract.limit ? Number(contract.limit) : Infinity;

  switch (contract.treatyType) {
    case 'QUOTA_SHARE':
    case 'FACULTATIVE_PROPORTIONAL': {
      // retention here represents the cedent's retained % (0-100); reinsurer takes the rest
      const cededPct = retention > 0 && retention <= 100 ? (100 - retention) / 100 : 1;
      return round2(grossIncurred * cededPct);
    }
    case 'SURPLUS_SHARE': {
      // amount above retention, capped at limit
      const excess = Math.max(0, grossIncurred - retention);
      return round2(Math.min(excess, limit));
    }
    case 'EXCESS_OF_LOSS':
    case 'CATASTROPHE_XL':
    case 'STOP_LOSS':
    case 'FACULTATIVE_NON_PROPORTIONAL': {
      // layer attaches above retention up to retention+limit
      const layerTop = retention + limit;
      const recoverable = Math.max(0, Math.min(grossIncurred, layerTop) - retention);
      return round2(recoverable);
    }
    default:
      return 0;
  }
}

/**
 * Reinstatement premium due when a layer is eroded by a loss recovery,
 * per the treaty's reinstatementPremiumPct term.
 */
export function calculateReinstatementPremium(
  recoveryAmount: number,
  layerLimit: number,
  originalPremium: number,
  reinstatementPremiumPct: number | null | undefined
): number {
  if (!reinstatementPremiumPct || layerLimit <= 0) return 0;
  const proportionOfLimit = Math.min(1, recoveryAmount / layerLimit);
  return round2(originalPremium * proportionOfLimit * (Number(reinstatementPremiumPct) / 100));
}

/**
 * Sliding-scale / profit commission calculation based on loss ratio.
 */
export function calculateCommission(
  premium: number,
  lossRatioPct: number,
  commissionType: string | null | undefined,
  flatPct: number | null | undefined,
  scale: { lossRatioFrom: number; lossRatioTo: number; commissionPct: number }[] | null | undefined
): number {
  if (commissionType === 'FLAT' && flatPct) {
    return round2(premium * (Number(flatPct) / 100));
  }
  if (commissionType === 'SLIDING_SCALE' && scale?.length) {
    const band = scale.find((b) => lossRatioPct >= b.lossRatioFrom && lossRatioPct < b.lossRatioTo);
    if (band) return round2(premium * (band.commissionPct / 100));
    // fall back to the closest band if loss ratio is outside defined range
    const sorted = [...scale].sort((a, b) => a.lossRatioFrom - b.lossRatioFrom);
    const fallback = lossRatioPct < sorted[0].lossRatioFrom ? sorted[0] : sorted[sorted.length - 1];
    return round2(premium * (fallback.commissionPct / 100));
  }
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
