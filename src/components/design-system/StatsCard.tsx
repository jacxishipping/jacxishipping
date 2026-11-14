"use client";

import { motion } from 'framer-motion';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { ReactNode, useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * StatsCard Component
 * 
 * Display key metrics with icons, values, and optional trends.
 * Now uses design tokens for consistent styling.
 */

interface StatsCardProps {
	icon: ReactNode;
	title: string;
	value: ReactNode;
	subtitle?: string;
	compactValue?: string | number;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
	size?: 'sm' | 'md' | 'lg';
	delay?: number;
}

export default function StatsCard({
	icon,
	title,
	value,
	subtitle,
	compactValue,
	trend,
	variant = 'default',
	size = 'md',
	delay = 0,
}: StatsCardProps) {
	const { density } = useTheme();
	const isCompact = density === 'compact';
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(true);
		}, delay * 1000);
		return () => clearTimeout(timer);
	}, [delay]);

	// Variant colors
	const variantConfig = {
		default: {
			iconColor: 'var(--accent-gold-text)',
			iconBg: 'rgba(var(--accent-gold-rgb), 0.15)',
		},
		secondary: {
			iconColor: 'var(--text-primary)',
			iconBg: 'rgba(var(--text-secondary-rgb), 0.12)',
		},
		success: {
			iconColor: 'var(--success)',
			iconBg: 'rgba(var(--success-rgb), 0.15)',
		},
		warning: {
			iconColor: 'var(--warning)',
			iconBg: 'rgba(var(--warning-rgb), 0.15)',
		},
		error: {
			iconColor: 'var(--error)',
			iconBg: 'rgba(var(--error-rgb), 0.15)',
		},
		info: {
			iconColor: 'var(--info)',
			iconBg: 'rgba(var(--info-rgb), 0.15)',
		},
	};

	const sizeConfig = isCompact
		? {
				sm: { iconSize: 26, padding: 1, fontSize: '0.95rem' },
				md: { iconSize: 32, padding: 1.25, fontSize: '1.15rem' },
				lg: { iconSize: 38, padding: 1.5, fontSize: '1.3rem' },
		  }
		: {
				sm: { iconSize: 36, padding: 1.5, fontSize: '1.125rem' },
				md: { iconSize: 48, padding: 2, fontSize: '1.5rem' },
				lg: { iconSize: 56, padding: 2.5, fontSize: '1.75rem' },
		  };

	const colors = variantConfig[variant];
	const sizes = sizeConfig[size];
	const isNeutralTrend = trend?.value === 0;
	const trendColor = isNeutralTrend
		? 'var(--text-secondary)'
		: trend?.isPositive
			? 'var(--success-dark)'
			: 'var(--error-dark)';
	const trendBorderColor = isNeutralTrend
		? 'var(--border)'
		: trend?.isPositive
			? 'rgba(var(--success-rgb), 0.3)'
			: 'rgba(var(--error-rgb), 0.3)';
	const trendBackground = isNeutralTrend
		? 'var(--panel)'
		: trend?.isPositive
			? 'rgba(var(--success-rgb), 0.12)'
			: 'rgba(var(--error-rgb), 0.12)';
	const trendPrefix = isNeutralTrend ? '' : trend?.isPositive ? '+' : '−';

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: isVisible ? 1 : 0 }}
			transition={{ duration: 0.6 }}
		>
			<JXBox
				component="article"
				surface="elevated"
				padding="none"
				className="stats-card relative z-[1] hover:z-[2] flex h-full w-full min-w-0 flex-wrap items-center overflow-hidden !bg-[var(--panel)] !border-[var(--border)] hover:!border-[rgba(var(--accent-gold-rgb),0.35)] jx-elevation-1"
				style={{
					borderRadius: isCompact ? '12px' : '16px',
					padding: `${sizes.padding * 8}px`,
					gap: isCompact ? '8px' : '12px',
					transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
					fontFamily: 'inherit',
				}}
			>
				<div
					className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)]"
					style={{
						width: sizes.iconSize,
						height: sizes.iconSize,
						background: colors.iconBg,
						color: colors.iconColor,
					}}
				>
					<span className="relative z-[1] flex items-center justify-center">{icon}</span>
				</div>
				<div className="min-w-0 flex-1 overflow-hidden">
					<p className="mb-0.5 line-clamp-2 break-words text-[0.65rem] font-medium leading-snug text-[var(--text-secondary)] sm:text-[0.68rem] md:text-[0.7rem]">
						{title}
					</p>
					<span
						title={typeof value === 'string' && value.length > 12 ? value : undefined}
						className="block w-full overflow-hidden text-ellipsis whitespace-nowrap font-semibold tabular-nums leading-[1.25] tracking-[-0.02em] text-[var(--text-primary)]"
						style={{ fontSize: sizes.fontSize }}
					>
						{compactValue || value}
					</span>
					{subtitle && (
						<p className="mt-0.5 line-clamp-3 text-[0.7rem] leading-snug text-[var(--text-secondary)] sm:text-[0.75rem] md:text-[0.8rem]">
							{subtitle}
						</p>
					)}
				</div>
				{/* A 0% trend carries no information — a "no change" pill on
				    every card reads as placeholder data, so omit it. */}
				{trend && trend.value !== 0 && (
					<span
						aria-label={`Trend: ${trendPrefix}${Math.abs(trend.value)}% ${
							isNeutralTrend ? 'no change' : trend.isPositive ? 'increase' : 'decrease'
						}`}
						className="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold tabular-nums sm:text-[0.7rem] md:text-[0.75rem]"
						style={{
							color: trendColor,
							border: `1px solid ${trendBorderColor}`,
							background: trendBackground,
						}}
					>
						{trendPrefix}
						{Math.abs(trend.value)}%
					</span>
				)}
			</JXBox>
		</motion.div>
	);
}
