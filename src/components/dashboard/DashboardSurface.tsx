"use client";

import { ReactNode } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { cn } from '@/lib/utils';

type DashboardSurfaceProps = {
	children: ReactNode;
	className?: string;
	noPadding?: boolean;
};

export function DashboardSurface({ children, className, noPadding = false }: DashboardSurfaceProps) {
	return (
		<JXBox
			padding="none"
			border={false}
			className={cn(
				'dashboard-surface relative mx-auto flex w-full max-w-[1380px] flex-col gap-6 px-4 pt-4 pb-24 sm:px-5 lg:px-8 lg:pb-4',
				'text-[var(--text-primary)]',
				'min-w-0 overflow-hidden',
				'animate-fade-in-up',
				noPadding && 'px-0 sm:px-0',
				className,
			)}
			style={{ backgroundColor: 'var(--background)', fontFamily: 'inherit' }}
		>
			{children}
		</JXBox>
	);
}

type DashboardHeaderMeta = {
	label: string;
	value: string | number;
	helper?: string;
	intent?: 'default' | 'positive' | 'warning' | 'critical';
};

interface DashboardHeaderProps {
	title: string;
	description?: string;
	meta?: DashboardHeaderMeta[];
	actions?: ReactNode;
	className?: string;
}

export function DashboardHeader({ title, description, meta, actions, className }: DashboardHeaderProps) {
	return (
		<JXBox
			surface="elevated"
			padding="none"
			className={cn(
				'dashboard-header flex flex-col gap-3 !rounded-2xl border px-4 py-4 text-[var(--text-primary)]',
				'sm:flex-row sm:items-center sm:justify-between',
				'glass-gold',
				className,
			)}
			style={{
				borderColor: 'var(--border)',
				borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.3)',
				boxShadow: '0 12px 30px rgba(var(--text-primary-rgb),0.08)',
				fontFamily: 'inherit',
			}}
		>
			<div className="flex flex-col gap-1">
				<h1 className="text-[1.05rem] font-semibold leading-tight text-[var(--text-primary)] md:text-[1.25rem]">
					{title}
				</h1>
				{description && <p className="text-[0.9rem] text-[var(--text-secondary)]">{description}</p>}
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
				{meta && meta.length > 0 && (
					<div className="flex flex-wrap gap-2 text-sm text-[var(--text-secondary)]">
						{meta.map((item) => (
							<JXBox
								key={`${item.label}-${item.value}`}
								surface="subtle"
								padding="none"
								className={cn(
									'min-w-[110px] !rounded-xl border px-3 py-2 shadow-none',
									item.intent === 'critical' ? 'text-[var(--error)]' : 'text-[var(--text-primary)]',
								)}
								style={{
									borderColor: 'var(--border)',
									backgroundColor: 'var(--background)',
									fontFamily: 'inherit',
								}}
							>
								<p className="text-[0.65rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">{item.label}</p>
								<p className="text-[1rem] font-semibold">{item.value}</p>
								{item.helper && <p className="text-[0.7rem] text-[var(--text-secondary)]">{item.helper}</p>}
							</JXBox>
						))}
					</div>
				)}
				{actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
			</div>
		</JXBox>
	);
}

interface DashboardPanelProps {
	title?: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	actions?: ReactNode;
	className?: string;
	bodyClassName?: string;
	noHeaderBorder?: boolean;
	noBodyPadding?: boolean;
	fullHeight?: boolean;
	footer?: ReactNode;
}

export function DashboardPanel({
	title,
	description,
	children,
	actions,
	className,
	bodyClassName,
	noHeaderBorder = false,
	noBodyPadding = false,
	fullHeight = false,
	footer,
}: DashboardPanelProps) {
	return (
		<JXBox
			component="section"
			surface="elevated"
			padding="none"
			className={cn(
				'dashboard-panel relative flex flex-col !rounded-2xl !border-[var(--border)] !bg-[var(--panel)] text-[var(--text-primary)]',
				'min-w-0 overflow-hidden',
				fullHeight && 'h-full',
				className,
			)}
			style={{
				borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.3)',
				boxShadow: '0 20px 48px rgba(var(--text-primary-rgb), 0.10)',
				maxWidth: '100%',
				fontFamily: 'inherit',
			}}
		>
			{(title || description || actions) && (
				<header
					className={cn(
						'flex flex-col gap-1 px-4 pt-4 text-[var(--text-primary)] sm:flex-row sm:items-center sm:justify-between',
						'min-w-0 overflow-hidden',
						noHeaderBorder ? 'pb-1' : 'border-b pb-3',
					)}
					style={!noHeaderBorder ? { borderColor: 'var(--border)' } : undefined}
				>
					<div className="flex flex-col gap-0.5 min-w-0 overflow-hidden">
						{title && (
							<div className="text-[0.95rem] font-semibold tracking-tight text-[var(--text-primary)] overflow-hidden text-ellipsis">{title}</div>
						)}
						{description && <div className="text-[0.8rem] text-[var(--text-secondary)] overflow-hidden text-ellipsis">{description}</div>}
					</div>
					{actions && <div className="flex flex-shrink-0 items-center gap-2 text-[0.8rem]">{actions}</div>}
				</header>
			)}
			<div
				className={cn('flex-1 min-w-0', noBodyPadding ? '' : 'px-4 pb-4 pt-3', bodyClassName)}
				style={{ color: 'var(--text-primary)' }}
			>
				{children}
			</div>
			{footer && (
				<footer
					className="border-t px-4 py-3 text-[0.75rem]"
					style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
				>
					{footer}
				</footer>
			)}
		</JXBox>
	);
}

interface DashboardGridProps {
	children: ReactNode;
	className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
	return (
		<JXBox
			padding="none"
			border={false}
			className={cn('dashboard-grid grid gap-6 items-stretch !rounded-none !bg-transparent', className)}
			style={{ fontFamily: 'inherit' }}
		>
			{children}
		</JXBox>
	);
}
