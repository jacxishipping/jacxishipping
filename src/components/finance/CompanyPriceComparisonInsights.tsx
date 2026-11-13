'use client';

import { Trophy, TrendingUp } from 'lucide-react';
import type { CompanyPriceSnapshot, CompanyScorecard, ComparisonInsight } from '@/lib/company-price-comparison';

type CompanyPriceComparisonInsightsProps = {
  visibleCompanies: CompanyPriceSnapshot[];
  scorecards: CompanyScorecard[];
  insights: ComparisonInsight;
  formatCurrency: (amount: number) => string;
};

export default function CompanyPriceComparisonInsights({
  visibleCompanies,
  scorecards,
  insights,
  formatCurrency,
}: CompanyPriceComparisonInsightsProps) {
  const maxWins = Math.max(...scorecards.map((item) => item.wins), 1);
  const maxSpread = insights.maxSpread || 1;

  return (
    <div style={{display: 'grid', gap: '12px', marginBottom: '16px', gridTemplateColumns: '1fr'}}>
      <div style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px'}}>
          <Trophy className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
          <div style={{fontWeight: 700}}>Company Scorecard</div>
        </div>
        <div style={{display: 'grid', gap: '8px'}}>
          {scorecards.map((scorecard, index) => {
            const company = visibleCompanies.find((item) => item.id === scorecard.companyId);
            if (!company) return null;

            const isLeader = scorecard.companyId === insights.leader?.companyId;
            const winPercent = Math.round((scorecard.wins / maxWins) * 100);

            return (
              <div key={scorecard.companyId} style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto auto', gap: '12px', alignItems: 'center', padding: '10px', borderRadius: '12px', border: isLeader ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border)', background: isLeader ? 'rgba(34, 197, 94, 0.06)' : 'var(--background)', transition: 'transform 0.15s ease'}}>
                <div style={{minWidth: 0}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <div style={{width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, backgroundColor: isLeader ? 'rgba(34, 197, 94, 0.15)' : 'rgba(var(--text-secondary-rgb), 0.1)', color: isLeader ? 'rgb(22, 163, 74)' : 'var(--text-secondary)'}}>
                      {index + 1}
                    </div>
                    <div style={{minWidth: 0}}>
                      <div style={{fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {company.name}
                        {isLeader && (
                          <span style={{marginLeft: '6px', fontSize: '0.65rem', color: 'rgb(22, 163, 74)', fontWeight: 700}}>
                            LEADER
                          </span>
                        )}
                      </div>
                      <div style={{fontSize: '0.72rem', color: 'var(--text-secondary)'}}>{company.destinationLabel}</div>
                    </div>
                  </div>
                  <div style={{marginTop: '6px', height: 4, borderRadius: '7992px', backgroundColor: 'rgba(var(--border-rgb), 0.35)', overflow: 'hidden'}}>
                    <div style={{width: `${winPercent}%`, height: '100%', borderRadius: '7992px', background: isLeader
                          ? 'linear-gradient(90deg, rgb(22, 163, 74), rgb(34, 197, 94))'
                          : 'linear-gradient(90deg, rgba(var(--accent-gold-rgb), 0.5), var(--accent-gold))'}} />
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Wins</div>
                  <div style={{fontWeight: 700, color: isLeader ? 'rgb(22, 163, 74)' : 'var(--text-primary)'}}>{scorecard.wins}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Coverage</div>
                  <div style={{fontWeight: 700}}>{scorecard.coveragePercent}%</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>Avg Rate</div>
                  <div style={{fontWeight: 700}}>{scorecard.averageRate ? formatCurrency(scorecard.averageRate) : '—'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px'}}>
          <TrendingUp className="w-4 h-4" style={{ color: 'rgb(220, 38, 38)' }} />
          <div style={{fontWeight: 700}}>Biggest Price Gaps</div>
        </div>
        {insights.topSpreads.length > 0 ? (
          <div style={{display: 'grid', gap: '4px'}}>
            {insights.topSpreads.map((row, index) => {
              const spreadPercent = row.spread ? Math.round((row.spread / maxSpread) * 100) : 0;

              return (
                <div key={row.key} style={{paddingTop: '6.8px', paddingBottom: '6.8px', borderBottom: index < insights.topSpreads.length - 1 ? '1px solid var(--border)' : 'none'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px'}}>
                    <div style={{minWidth: 0}}>
                      <div style={{fontWeight: 600, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {row.label}
                      </div>
                      <div style={{fontSize: '0.72rem', color: 'var(--text-secondary)'}}>
                        {row.coverageCount}/{visibleCompanies.length} companies priced
                      </div>
                    </div>
                    <div style={{fontWeight: 700, color: 'rgb(220, 38, 38)', whiteSpace: 'nowrap'}}>
                      {row.spread ? formatCurrency(row.spread) : '—'}
                    </div>
                  </div>
                  <div style={{height: 4, borderRadius: '7992px', backgroundColor: 'rgba(var(--border-rgb), 0.35)', overflow: 'hidden'}}>
                    <div style={{width: `${spreadPercent}%`, height: '100%', borderRadius: '7992px', background: 'linear-gradient(90deg, rgba(220, 38, 38, 0.45), rgb(220, 38, 38))'}} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{color: 'var(--text-secondary)', fontSize: '0.84rem', paddingTop: '16px', paddingBottom: '16px', textAlign: 'center'}}>
            No price differences in the current view.
          </div>
        )}
      </div>
    </div>
  );
}