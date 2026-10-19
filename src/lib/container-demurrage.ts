export type DemurrageRiskLevel = 'none' | 'approaching' | 'safe' | 'warning' | 'critical';

export interface DemurrageInfo {
  level: DemurrageRiskLevel;
  daysRemaining: number;
  daysAtPort: number;
  estimatedChargeUSD: number;
  badgeLabel: string;
  tooltipText: string;
  colorClass: string;
  isActionRequired: boolean;
}

export const STANDARD_FREE_TIME_DAYS = 5;
export const DAILY_DEMURRAGE_RATE_ESTIMATE = 150; // $150/day standard terminal storage estimate

export function getContainerDemurrageInfo(container: {
  status: string;
  estimatedArrival?: string | null;
  actualArrival?: string | null;
  destinationPort?: string | null;
}): DemurrageInfo {
  const isAtPortOrCustoms = ['ARRIVED_PORT', 'CUSTOMS_CLEARANCE'].includes(container.status);
  const isClosedOrReleased = ['RELEASED', 'CLOSED'].includes(container.status);

  if (isClosedOrReleased) {
    return {
      level: 'none',
      daysRemaining: 0,
      daysAtPort: 0,
      estimatedChargeUSD: 0,
      badgeLabel: 'Released (Demurrage Safe)',
      tooltipText: 'Container has been released or closed. No demurrage fees apply.',
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      isActionRequired: false,
    };
  }

  const arrivalDateStr = container.actualArrival || (isAtPortOrCustoms ? container.estimatedArrival : null);
  const now = new Date();

  if (isAtPortOrCustoms && arrivalDateStr) {
    const arrivalDate = new Date(arrivalDateStr);
    const msDiff = now.getTime() - arrivalDate.getTime();
    const daysAtPort = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
    const daysRemaining = STANDARD_FREE_TIME_DAYS - daysAtPort;

    if (daysRemaining <= 0) {
      const overdueDays = Math.abs(daysRemaining) + 1;
      const charge = overdueDays * DAILY_DEMURRAGE_RATE_ESTIMATE;
      return {
        level: 'critical',
        daysRemaining,
        daysAtPort,
        estimatedChargeUSD: charge,
        badgeLabel: `Demurrage Active (${overdueDays}d overdue • est. ~$${charge.toLocaleString()})`,
        tooltipText: `Exceeded ${STANDARD_FREE_TIME_DAYS} days free time! Daily port storage fee is accumulating (~$${DAILY_DEMURRAGE_RATE_ESTIMATE}/day). Immediate customs release required.`,
        colorClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse',
        isActionRequired: true,
      };
    }

    if (daysRemaining <= 2) {
      return {
        level: 'warning',
        daysRemaining,
        daysAtPort,
        estimatedChargeUSD: 0,
        badgeLabel: `Free Time: ${daysRemaining}d left (Action Required)`,
        tooltipText: `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining of standard port free storage. Clear customs to avoid demurrage penalties.`,
        colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium',
        isActionRequired: true,
      };
    }

    return {
      level: 'safe',
      daysRemaining,
      daysAtPort,
      estimatedChargeUSD: 0,
      badgeLabel: `Free Time: ${daysRemaining}d remaining`,
      tooltipText: `${daysRemaining} of ${STANDARD_FREE_TIME_DAYS} days free storage remaining at ${container.destinationPort || 'port'}.`,
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      isActionRequired: false,
    };
  }

  // If in transit and approaching ETA (within 3 days)
  if (container.status === 'IN_TRANSIT' && container.estimatedArrival) {
    const etaDate = new Date(container.estimatedArrival);
    const msUntilEta = etaDate.getTime() - now.getTime();
    const daysUntilEta = Math.ceil(msUntilEta / (1000 * 60 * 60 * 24));

    if (daysUntilEta >= 0 && daysUntilEta <= 3) {
      return {
        level: 'approaching',
        daysRemaining: STANDARD_FREE_TIME_DAYS,
        daysAtPort: 0,
        estimatedChargeUSD: 0,
        badgeLabel: `Port Arrival in ${daysUntilEta === 0 ? 'Today' : `${daysUntilEta}d`} (5d free time)`,
        tooltipText: `Vessel berthing soon. ${STANDARD_FREE_TIME_DAYS} days port free time starts upon container discharge.`,
        colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        isActionRequired: false,
      };
    }
  }

  return {
    level: 'none',
    daysRemaining: STANDARD_FREE_TIME_DAYS,
    daysAtPort: 0,
    estimatedChargeUSD: 0,
    badgeLabel: '',
    tooltipText: '',
    colorClass: '',
    isActionRequired: false,
  };
}
