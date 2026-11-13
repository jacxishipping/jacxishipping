'use client';

import Link from 'next/link';
import { ArrowLeftRight, GitCompareArrows, Trophy } from 'lucide-react';
import { EmptyState, Select } from '@/components/design-system';
import type { CompanyPriceSnapshot, ComparisonSortKey } from '@/lib/company-price-comparison';
import {
  buildSideBySideRows,
  buildSideBySideSummary,
  type SideBySideRow,
} from '@/lib/company-price-comparison-side-by-side';
import type { SideBySideRateType } from '@/lib/company-price-comparison-presets';

type SideBySideCompany = CompanyPriceSnapshot & {
  activePriceList?: {
    sourceFileName?: string;
    name?: string;
  } | null;
};

type CompanyPriceComparisonSideBySideProps = {
  companies: SideBySideCompany[];
  leftCompanyId: string;
  rightCompanyId: string;
  rateType: SideBySideRateType;
  onLeftCompanyChange: (companyId: string) => void;
  onRightCompanyChange: (companyId: string) => void;
  onRateTypeChange: (rateType: SideBySideRateType) => void;
  search: string;
  stateFilter: string;
  differencesOnly: boolean;
  completeCoverageOnly: boolean;
  minSpread: string;
  sortBy: ComparisonSortKey;
  vehicleMultiplier: number;
  formatCurrency: (amount: number) => string;
  formatSignedCurrency: (amount: number) => string;
};

function CompanyHeader({
  company,
  align,
  highlight,
}: {
  company: SideBySideCompany;
  align: 'left' | 'right';
  highlight?: boolean;
}) {
  return (
    <div style={{padding: '12px', borderRadius: '16px', border: highlight ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border)', background: highlight ? 'rgba(34, 197, 94, 0.08)' : 'var(--panel)', textAlign: align}}>
      <Link href={`/dashboard/finance/companies/${company.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
        <div style={{fontWeight: 700, fontSize: '1rem'}}>{company.name}</div>
        <div style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px'}}>{company.destinationLabel}</div>
        {company.activePriceList?.sourceFileName && (
          <div style={{fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px'}}>
            {company.activePriceList.sourceFileName}
          </div>
        )}
      </Link>
    </div>
  );
}

function SideBySideCard({
  row,
  leftCompany,
  rightCompany,
  formatCurrency,
  formatSignedCurrency,
}: {
  row: SideBySideRow;
  leftCompany: SideBySideCompany;
  rightCompany: SideBySideCompany;
  formatCurrency: (amount: number) => string;
  formatSignedCurrency: (amount: number) => string;
}) {
  const leftWins = row.winner === 'left' || row.winner === 'right-only';
  const rightWins = row.winner === 'right' || row.winner === 'left-only';

  return (
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px minmax(0, 1fr)', gap: '8px', padding: '10px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--background)', alignItems: 'center'}}>
      <div style={{padding: '10px', borderRadius: '12px', border: leftWins ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid transparent', background: leftWins ? 'rgba(34, 197, 94, 0.06)' : 'transparent'}}>
        <div style={{fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
          {leftCompany.name}
        </div>
        <div style={{fontWeight: 700, fontSize: '1.1rem', marginTop: '2px'}}>
          {row.leftRate === null ? '—' : formatCurrency(row.leftRate)}
        </div>
      </div>

      <div style={{textAlign: 'center', paddingLeft: '4px', paddingRight: '4px'}}>
        <div style={{fontWeight: 700, fontSize: '0.82rem'}}>{row.label}</div>
        {row.delta !== null && row.leftRate !== null && row.rightRate !== null ? (
          <div style={{marginTop: '4px', fontWeight: 700, fontSize: '0.84rem', color: row.delta < 0 ? 'rgb(22, 163, 74)' : row.delta > 0 ? 'rgb(220, 38, 38)' : 'var(--text-secondary)'}}>
            {formatSignedCurrency(row.delta)}
          </div>
        ) : (
          <div style={{marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)'}}>
            {row.winner === 'left-only' ? 'Left only' : row.winner === 'right-only' ? 'Right only' : 'No overlap'}
          </div>
        )}
        {row.spread ? (
          <div style={{marginTop: '2px', fontSize: '0.72rem', color: 'var(--text-secondary)'}}>
            Spread {formatCurrency(row.spread)}
          </div>
        ) : null}
      </div>

      <div style={{padding: '10px', borderRadius: '12px', border: rightWins ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid transparent', background: rightWins ? 'rgba(34, 197, 94, 0.06)' : 'transparent', textAlign: 'right'}}>
        <div style={{fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
          {rightCompany.name}
        </div>
        <div style={{fontWeight: 700, fontSize: '1.1rem', marginTop: '2px'}}>
          {row.rightRate === null ? '—' : formatCurrency(row.rightRate)}
        </div>
      </div>
    </div>
  );
}

export default function CompanyPriceComparisonSideBySide({
  companies,
  leftCompanyId,
  rightCompanyId,
  rateType,
  onLeftCompanyChange,
  onRightCompanyChange,
  onRateTypeChange,
  search,
  stateFilter,
  differencesOnly,
  completeCoverageOnly,
  minSpread,
  sortBy,
  vehicleMultiplier,
  formatCurrency,
  formatSignedCurrency,
}: CompanyPriceComparisonSideBySideProps) {
  const leftCompany = companies.find((company) => company.id === leftCompanyId);
  const rightCompany = companies.find((company) => company.id === rightCompanyId);

  if (!leftCompany || !rightCompany) {
    return (
      <EmptyState
        icon={<GitCompareArrows />}
        title="Choose two companies"
        description="Select a left and right carrier to run a head-to-head price comparison."
      />
    );
  }

  if (leftCompanyId === rightCompanyId) {
    return (
      <EmptyState
        icon={<ArrowLeftRight />}
        title="Pick different companies"
        description="Side-by-side comparison needs two distinct carriers to compare rates."
      />
    );
  }

  const rows = buildSideBySideRows(leftCompany, rightCompany, rateType, {
    search,
    differencesOnly,
    stateCode: stateFilter,
    completeCoverageOnly,
    minSpread: Number(minSpread) > 0 ? Number(minSpread) : undefined,
    sortBy,
    vehicleMultiplier,
  });

  const summary = buildSideBySideSummary(rows);
  const leftLeads = summary.leftWins > summary.rightWins;
  const rightLeads = summary.rightWins > summary.leftWins;

  return (
    <div style={{display: 'grid', gap: '16px'}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px'}}>
        <Select label="Left company" value={leftCompanyId} onChange={(val) => onLeftCompanyChange(String(val))} size="small" options={companies.map((company) => ({ value: company.id, label: company.name, disabled: company.id === rightCompanyId }))} />
        <Select label="Compare" value={rateType} onChange={(val) => onRateTypeChange(String(val) as SideBySideRateType)} size="small" options={[{ value: "state", label: 'State rates' }, { value: "lane", label: 'Branch / city lanes' }]} />
        <Select label="Right company" value={rightCompanyId} onChange={(val) => onRightCompanyChange(String(val))} size="small" options={companies.map((company) => ({ value: company.id, label: company.name, disabled: company.id === leftCompanyId }))} />
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '12px', alignItems: 'stretch'}}>
        <CompanyHeader company={leftCompany} align="left" highlight={leftLeads} />
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>
          <ArrowLeftRight className="w-5 h-5" />
        </div>
        <CompanyHeader company={rightCompany} align="right" highlight={rightLeads} />
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px'}}>
        {[
          { label: 'Left wins', value: summary.leftWins, highlight: leftLeads, color: 'rgb(22, 163, 74)' },
          { label: 'Right wins', value: summary.rightWins, highlight: rightLeads, color: 'rgb(22, 163, 74)' },
          { label: 'Ties', value: summary.ties, highlight: false, color: 'var(--text-primary)' },
          {
            label: 'Avg delta',
            value: summary.averageDelta === null ? '—' : formatSignedCurrency(summary.averageDelta),
            highlight: false,
            color: summary.averageDelta && summary.averageDelta < 0 ? 'rgb(22, 163, 74)' : summary.averageDelta && summary.averageDelta > 0 ? 'rgb(220, 38, 38)' : 'var(--text-primary)',
          },
        ].map((stat) => (
          <div key={stat.label} style={{padding: '10px', borderRadius: '16px', border: stat.highlight ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border)', background: stat.highlight ? 'rgba(34, 197, 94, 0.06)' : 'var(--panel)', transition: 'transform 0.15s ease'}}>
            <div style={{fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>{stat.label}</div>
            <div style={{fontWeight: 700, fontSize: '1.1rem', color: stat.color}}>{stat.value}</div>
          </div>
        ))}
        <div style={{padding: '10px', borderRadius: '16px', border: '1px solid rgba(var(--accent-gold-rgb), 0.35)', background: 'rgba(var(--accent-gold-rgb), 0.08)', gridColumn: 'auto'}}>
          <div style={{fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px'}}>
            <Trophy className="w-3.5 h-3.5" /> Leader
          </div>
          <div style={{fontWeight: 700, fontSize: '0.95rem'}}>
            {leftLeads ? leftCompany.name : rightLeads ? rightCompany.name : 'Even'}
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <div style={{display: 'grid', gap: '8px', maxHeight: 620, overflow: 'auto', paddingRight: '4px'}}>
          {rows.map((row) => (
            <SideBySideCard
              key={row.key}
              row={row}
              leftCompany={leftCompany}
              rightCompany={rightCompany}
              formatCurrency={formatCurrency}
              formatSignedCurrency={formatSignedCurrency}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GitCompareArrows />}
          title="No matching rows"
          description="Try another rate type, select different companies, or loosen your filters to find overlapping prices."
        />
      )}
    </div>
  );
}