"use client";

import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { ReactNode } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { useTheme } from '@/hooks/useTheme';

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	showBreadcrumbs?: boolean;
	meta?: Array<{
		label: string;
		value: string | number;
		helper?: string;
	}>;
}

export default function PageHeader({ title, description, actions, showBreadcrumbs = false, meta }: PageHeaderProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';

	return (
		<div className={`page-header-root ${isCompact ? 'mb-3' : 'mb-6'}`}>
			{showBreadcrumbs && (
				<div className={isCompact ? 'mb-1.5' : 'mb-3'}>
					<Breadcrumbs />
				</div>
			)}
			<JXBox
				surface="elevated"
				padding="none"
				className={`flex flex-col md:flex-row justify-between items-start md:items-center !bg-[var(--panel)] !border-[var(--border)] ${
					isCompact
						? 'gap-2.5 !rounded-[12px] px-3 py-2 md:px-3.5 md:py-2.5'
						: 'gap-4 !rounded-[16px] px-4 py-3.5 md:px-[18px] md:py-4'
				}`}
				style={{
					borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.3)',
					boxShadow: isCompact
						? '0 6px 18px rgba(var(--text-primary-rgb), 0.05)'
						: '0 14px 34px rgba(var(--text-primary-rgb), 0.08)',
					fontFamily: 'inherit',
				}}
			>
				<div className="flex min-w-0 shrink-0 flex-col gap-1">
					<h1
						className="text-[1.15rem] sm:text-[1.25rem] md:text-[1.4rem] font-semibold leading-[1.2] text-[var(--text-primary)]"
						style={{ overflowWrap: 'break-word' }}
					>
						{title}
					</h1>
					{description && (
						<p className="max-w-[680px] text-[0.82rem] sm:text-[0.88rem] text-[var(--text-secondary)]">
							{description}
						</p>
					)}
				</div>
				<div className="flex min-w-0 flex-wrap items-center justify-start md:justify-end gap-3">
					{meta && meta.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{meta.map((item) => (
								<JXBox
									key={item.label}
									surface="subtle"
									padding="none"
									className={`!bg-[var(--background)] !border-[var(--border)] !rounded-[10px] shadow-none ${
										isCompact ? 'min-w-[90px] px-2 py-1' : 'min-w-[110px] px-3 py-2'
									}`}
								>
									<p className="text-[0.65rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]">
										{item.label}
									</p>
									<p
										className={`font-semibold text-[var(--text-primary)] tabular-nums ${
											isCompact ? 'text-[0.875rem]' : 'text-[1rem]'
										}`}
									>
										{item.value}
									</p>
									{item.helper && (
										<p className="text-[0.7rem] text-[var(--text-secondary)]">
											{item.helper}
										</p>
									)}
								</JXBox>
							))}
						</div>
					)}
					{actions && <div className="flex min-w-0 flex-wrap gap-2">{actions}</div>}
				</div>
			</JXBox>
		</div>
	);
}
