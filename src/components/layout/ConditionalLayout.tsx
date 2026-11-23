"use client";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex-1">
			{children}
		</div>
	);
}

