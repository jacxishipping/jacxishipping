'use client';

import { FileText, Anchor, Ship, Truck, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
	{
		icon: FileText,
		title: 'Book',
		description: 'Get a quote for USA or Canada to Afghanistan through Mersin or UAE',
	},
	{
		icon: Truck,
		title: 'USA / Canada Pickup',
		description: 'Vehicle collected and prepared for export from the origin lane',
	},
	{
		icon: Ship,
		title: 'Mersin or UAE Route',
		description: 'Shipment moves through one selected route option, not both',
	},
	{
		icon: Anchor,
		title: 'To Afghanistan',
		description: 'Customs and destination transport are coordinated into Afghanistan',
	},
	{
		icon: CheckCircle,
		title: 'Final Delivery',
		description: 'Distribution to Herat or any Afghan province',
	},
];

export default function ProcessSection() {
	return (
		<section className="py-24 bg-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.8 }}
					className="text-center mb-16"
				>
						<h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
							The <span className="text-[rgb(var(--jacxi-blue))]">Journey</span>
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							From the USA or Canada through either Mersin or UAE to Afghanistan - here is what happens after you book
						</p>
				</motion.div>

				<div className="relative">
					{/* Timeline Line */}
					<div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-[rgb(var(--jacxi-blue))]/20 via-[rgb(var(--jacxi-blue))] to-[rgb(var(--jacxi-blue))]/20" />

					{/* Steps */}
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
						{steps.map((step, index) => {
							const Icon = step.icon;
							return (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 24 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, delay: index * 0.1 }}
								>
									<div
										className="relative p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-md hover:shadow-2xl hover:border-blue-300 hover:-translate-y-2 transition-all duration-300"
									>
										<div className="flex flex-col items-center text-center group">
											{/* Icon Circle */}
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
												className="relative mb-6"
											>
													<div className="w-20 h-20 rounded-full bg-gradient-to-br from-[rgb(var(--jacxi-blue))] to-[rgb(var(--jacxi-blue))]/80 flex items-center justify-center text-white shadow-xl shadow-[rgb(var(--jacxi-blue))]/30 group-hover:scale-110 transition-all duration-300 relative z-10">
														<Icon className="w-10 h-10" />
													</div>
													{/* Step Number */}
													<div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[rgb(var(--uae-gold))] text-white text-sm font-bold flex items-center justify-center shadow-lg z-20">
														{index + 1}
													</div>
													{/* Glow Effect */}
													<div className="absolute inset-0 bg-[rgb(var(--jacxi-blue))]/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
											</motion.div>

											{/* Content */}
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
											>
													<h3 className="text-lg font-bold text-gray-900 mb-2">
														{step.title}
													</h3>
													<p className="text-sm text-gray-600">
														{step.description}
													</p>
											</motion.div>
										</div>
									</div>
								</motion.div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
