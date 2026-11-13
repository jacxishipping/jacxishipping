"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { FileText, Package, Plus, Search, type LucideIcon } from 'lucide-react';

const actions = [
	{
		icon: Plus,
		title: 'New Shipment',
		description: 'Create a new shipping request',
		href: '/dashboard/shipments/new',
		color: 'cyan',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
	{
		icon: Search,
		title: 'Track Shipment',
		description: 'Track an existing shipment',
		href: '/dashboard/tracking',
		color: 'blue',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
	{
		icon: Package,
		title: 'All Shipments',
		description: 'View all your shipments',
		href: '/dashboard/shipments',
		color: 'purple',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
	{
		icon: FileText,
		title: 'Documents',
		description: 'Manage shipping documents',
		href: '/dashboard/documents',
		color: 'green',
		colorValues: {
			border: 'rgba(var(--accent-gold-rgb), 0.4)',
			borderHover: 'rgba(var(--accent-gold-rgb), 0.8)',
			text: 'var(--accent-gold)',
			bgHover: 'rgba(var(--accent-gold-rgb), 0.15)',
			glow: 'rgba(var(--accent-gold-rgb), 0.3)',
		},
	},
];

type QuickActionsProps = {
	showHeading?: boolean;
};

export default function QuickActions({ showHeading = false }: QuickActionsProps = {}) {
	return (
		<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
			<div>
				{showHeading && (
					<div className="mb-2">
						<span className="block text-[0.8rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
							Action Center
						</span>
						<span className="block text-[0.85rem] font-semibold text-[var(--text-primary)]">
							Start a workflow
						</span>
					</div>
				)}
				<div className="grid grid-cols-2 gap-2">
					{actions.map((action) => (
						<ActionCard key={action.title} {...action} />
					))}
				</div>
			</div>
		</motion.div>
	);
}

interface ActionCardProps {
	icon: LucideIcon;
	title: string;
	description: string;
	href: string;
	color: string;
	colorValues: {
		border: string;
		borderHover: string;
		text: string;
		bgHover: string;
		glow: string;
	};
}

function ActionCard({ icon: Icon, title, description, href, colorValues }: ActionCardProps) {
	return (
		<Link href={href} style={{ textDecoration: 'none' }}>
			<JXBox
				surface="elevated"
				padding="none"
				className="flex min-h-[92px] flex-col gap-1 !rounded-lg p-2 transition-all duration-200 hover:-translate-y-0.5 hover:!border-[rgba(var(--accent-gold-rgb),0.8)]"
				style={{
					borderColor: colorValues.border,
					backgroundColor: 'var(--panel)',
					boxShadow: '0 12px 24px rgba(var(--text-primary-rgb), 0.08)',
					fontFamily: 'inherit',
				}}
			>
				<div className="flex items-center gap-1.5">
					<div
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
						style={{
							border: `1px solid ${colorValues.border}`,
							background: 'rgba(var(--text-secondary-rgb), 0.15)',
						}}
					>
						<Icon className="h-4 w-4" style={{ color: colorValues.text }}/>
					</div>
					<span className="truncate text-[0.78rem] font-semibold text-[var(--text-primary)]">
						{title}
					</span>
				</div>
				<span className="flex-1 text-[0.68rem] leading-[1.4] text-[var(--text-secondary)]">
					{description}
				</span>
			</JXBox>
		</Link>
	);
}
