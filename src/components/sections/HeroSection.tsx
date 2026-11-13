'use client';

import { ArrowRight, TruckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/design-system';

export default function HeroSection() {
	return (
		<section className="relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden">
			{/* Background Image */}
			<div className="absolute inset-0">
				<div
					className="w-full h-full bg-cover bg-center bg-no-repeat"
					style={{
						backgroundImage: `linear-gradient(to right, rgba(var(--panel-rgb), 0.95) 0%, rgba(var(--panel-rgb), 0.85) 40%, rgba(var(--panel-rgb), 0.3) 70%, transparent 100%), url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2070&auto=format&fit=crop')`,
					}}
				/>
			</div>

			<div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 md:py-28 w-full">
				<div className="max-w-2xl">
					{/* Headline */}
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 mb-6">
							Reliable Vehicle Shipping<br />
							From USA & Canada to Afghanistan
						</h1>
					</motion.div>

					{/* Subheadline */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.8, delay: 0.2 }}
					>
						<p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed">
							Fast, secure logistics through the Mersin route<br />
							or the UAE route for cars, SUVs, and heavy vehicles.
						</p>
					</motion.div>

					{/* CTA Buttons */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.8, delay: 0.4 }}
					>
						<div className="flex flex-col sm:flex-row gap-4">
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.6, delay: 0.6 }}
							>
								<Button
									onClick={() => window.location.href = '/auth/signin'}
									variant="primary"
									size="lg"
									icon={<ArrowRight className="w-5 h-5" />}
									iconPosition="end"
									className="shadow-[0_10px_15px_-3px_rgb(var(--text-primary-rgb)/0.1)] hover:scale-[1.05] active:scale-95"
								>
									Calculate Shipping
								</Button>
							</motion.div>
							<motion.div
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.6, delay: 0.7 }}
							>
								<Button
									onClick={() => window.location.href = '/tracking'}
									variant="outline"
									size="lg"
									icon={<TruckIcon className="w-5 h-5" />}
									iconPosition="start"
									className="shadow-[0_4px_6px_-1px_rgb(var(--text-primary-rgb)/0.1)] hover:scale-[1.05] active:scale-95"
								>
									Track Shipment
								</Button>
							</motion.div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
