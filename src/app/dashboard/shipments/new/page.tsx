'use client';

import { useSession } from 'next-auth/react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, X, Loader2, Package, User, FileText, CheckCircle, ArrowRight, Camera, Zap } from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Autocomplete, PageHeader, Button, FormField, Breadcrumbs, toast, MilestoneStepper } from '@/components/design-system';
import { shipmentSchema, type ShipmentFormData } from '@/lib/validations/shipment';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { AiDocumentAutoFillDropzone, type ExtractedShipmentData } from '@/components/shipments/AiDocumentAutoFillDropzone';
import AuctionSmartFillModal from '@/components/shipments/AuctionSmartFillModal';
import type { ParsedAuctionData } from '@/lib/auction-smart-parser';
import { compressImage, isValidImageFile, formatFileSize } from '@/lib/utils/image-compression';
import { decodeVIN as decodeVINService, getBestWeightEstimate } from '@/lib/services/vin-decoder';
import { buildCopartLotSummary, fetchCopartLotDataForShipment } from '@/lib/copart/lot-client';
import { buildIaaiLotSummary, fetchIaaiLotDataForShipment } from '@/lib/iaai/lot-client';
import { hasPermission } from '@/lib/rbac';


interface UserOption {
	id: string;
	name: string | null;
	email: string;
}

interface ContainerOption {
	id: string;
	containerNumber: string;
	status: string;
	currentCount: number;
	maxCapacity: number;
	destinationPort: string | null;
	trackingNumber?: string | null;
	shippingLine?: string | null;
	bookingNumber?: string | null;
	company?: {
		id: string;
		name: string;
		code: string;
	} | null;
}

interface CompanyOption {
	id: string;
	name: string;
	isActive: boolean;
}

const steps = [
	{ label: 'Vehicle Info', icon: Package },
	{ label: 'Photos', icon: Upload },
	{ label: 'Status', icon: CheckCircle },
	{ label: 'Customer', icon: User },
	{ label: 'Review', icon: FileText },
];

export default function NewShipmentPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [activeStep, setActiveStep] = useState(0);
	const [users, setUsers] = useState<UserOption[]>([]);
	const [containers, setContainers] = useState<ContainerOption[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [loadingContainers, setLoadingContainers] = useState(false);
	const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
	const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
	const [decodingVin, setDecodingVin] = useState(false);
	const [fetchingLotData, setFetchingLotData] = useState(false);
	const [lotFetchProgress, setLotFetchProgress] = useState(0);
	const [lotFetchStage, setLotFetchStage] = useState('');
	const [scannerOpen, setScannerOpen] = useState(false);
	const [smartFillOpen, setSmartFillOpen] = useState(false);

	const handleApplySmartParsedData = (data: ParsedAuctionData) => {
		const setVal = (field: Parameters<typeof setValue>[0], val: Parameters<typeof setValue>[1]) => {
			setValue(field, val, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
		};

		if (data.lotNumber) setVal('lotNumber', data.lotNumber);
		if (data.auctionName) setVal('auctionName', data.auctionName);
		if (data.vehicleMake) setVal('vehicleMake', data.vehicleMake);
		if (data.vehicleModel) setVal('vehicleModel', data.vehicleModel);
		if (data.vehicleYear) setVal('vehicleYear', data.vehicleYear);
		if (data.vehicleColor) setVal('vehicleColor', data.vehicleColor);
		if (data.vehicleType) setVal('vehicleType', data.vehicleType);
		if (data.vehicleVIN) setVal('vehicleVIN', data.vehicleVIN);
		if (typeof data.hasKey === 'boolean') setVal('hasKey', data.hasKey);
		if (typeof data.hasTitle === 'boolean') setVal('hasTitle', data.hasTitle);
		if (data.purchaseLocation && !formValues.purchaseLocation) setVal('purchaseLocation', data.purchaseLocation);
		if (data.purchasePrice && !formValues.purchasePrice) setVal('purchasePrice', data.purchasePrice.toString());
		if (data.internalNotes && !formValues.internalNotes) setVal('internalNotes', data.internalNotes);
		if (Array.isArray(data.vehiclePhotos) && data.vehiclePhotos.length > 0) {
			setVehiclePhotos(data.vehiclePhotos);
			setVal('vehiclePhotos', data.vehiclePhotos);
		}
	};

	const handleBarcodeScan = (scannedVin: string) => {
		setValue('vehicleVIN', scannedVin, { shouldValidate: true });
		toast.success(`VIN captured: ${scannedVin}`);
		if (scannedVin.length === 17) {
			void decodeVIN(scannedVin);
		}
	};

	const handleAiDocumentExtracted = (data: ExtractedShipmentData) => {
		if (data.vin) {
			setValue('vehicleVIN', data.vin, { shouldValidate: true });
			if (data.vin.length === 17) {
				void decodeVIN(data.vin);
			}
		}
		if (data.year) setValue('vehicleYear', String(data.year), { shouldValidate: true });
		if (data.make) setValue('vehicleMake', data.make, { shouldValidate: true });
		if (data.model) setValue('vehicleModel', data.model, { shouldValidate: true });
		if (data.color) setValue('vehicleColor', data.color, { shouldValidate: true });
		if (data.lotNumber) setValue('lotNumber', data.lotNumber, { shouldValidate: true });
		if (data.auctionName) setValue('auctionName', data.auctionName, { shouldValidate: true });
		if (data.hasKeys !== undefined) setValue('hasKey', data.hasKeys, { shouldValidate: true });
		if (data.hasTitle !== undefined) setValue('hasTitle', data.hasTitle, { shouldValidate: true });
		if (data.purchasePrice && data.purchasePrice > 0) {
			setValue('purchasePrice', String(data.purchasePrice), { shouldValidate: true });
		}
	};

	// Calculate overall upload progress
	const overallProgress = useMemo(() => {
		const progressValues = Object.values(uploadProgress);
		if (progressValues.length === 0) return 0;
		const sum = progressValues.reduce((acc, val) => acc + val, 0);
		return Math.round(sum / progressValues.length);
	}, [uploadProgress]);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
		trigger,
	} = useForm<ShipmentFormData>({
		resolver: zodResolver(shipmentSchema),
		mode: 'onBlur',
		defaultValues: {
			vehiclePhotos: [],
			status: 'ON_HAND',
			serviceType: 'SHIPPING_ONLY',
		},
	});

	const statusValue = watch('status');
	const vinValue = watch('vehicleVIN');
	const lotNumberValue = watch('lotNumber');
	const auctionNameValue = watch('auctionName');
	const dealerNameValue = watch('dealerName');
	const serviceTypeValue = watch('serviceType');
	const formValues = watch();

	useEffect(() => {
		if (serviceTypeValue !== 'PURCHASE_AND_SHIPPING') return;

		if (auctionNameValue && auctionNameValue !== 'Other') {
			setValue('dealerName', auctionNameValue, { shouldValidate: true });
			return;
		}

		if (auctionNameValue === 'Other' && (dealerNameValue === 'Copart' || dealerNameValue === 'IAAI')) {
			setValue('dealerName', '', { shouldValidate: true });
		}
	}, [auctionNameValue, dealerNameValue, serviceTypeValue, setValue]);

	// Fetch users
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				// Fetch all users by using a large pageSize
				const response = await fetch('/api/users?pageSize=1000');
				if (response.ok) {
					const data = await response.json();
					setUsers(data.users);
				}
			} catch (error) {
				console.error('Error fetching users:', error);
			} finally {
				setLoadingUsers(false);
			}
		};

		void fetchUsers();
	}, []);

	const [containerSearchInput, setContainerSearchInput] = useState('');

	const fetchContainers = async (searchTerm = '') => {
		setLoadingContainers(true);
		try {
			const query = new URLSearchParams({
				limit: '1000',
			});
			if (searchTerm.trim()) {
				query.set('search', searchTerm.trim());
			} else {
				query.set('status', 'active');
			}
			const response = await fetch(`/api/containers?${query.toString()}`);
			if (response.ok) {
				const data = await response.json();
				const incoming = (data.containers || []) as ContainerOption[];
				setContainers((prev) => {
					const selectedId = watch('containerId');
					const selectedContainer = prev.find((c) => c.id === selectedId);
					if (selectedContainer && !incoming.some((c) => c.id === selectedId)) {
						return [selectedContainer, ...incoming];
					}
					return incoming;
				});
			}
		} catch (error) {
			console.error('Error fetching containers:', error);
		} finally {
			setLoadingContainers(false);
		}
	};

	// Fetch containers when status changes to IN_TRANSIT
	useEffect(() => {
		if (statusValue === 'IN_TRANSIT') {
			void fetchContainers(containerSearchInput);
		}
	}, [statusValue]);

	// Debounced search for containers when typing
	useEffect(() => {
		if (statusValue !== 'IN_TRANSIT') return;
		if (!containerSearchInput.trim()) return;

		const timer = setTimeout(() => {
			void fetchContainers(containerSearchInput);
		}, 250);

		return () => clearTimeout(timer);
	}, [containerSearchInput, statusValue]);

	// VIN Decoder with enhanced data extraction
	const decodeVIN = async (vin: string) => {
		if (vin.length !== 17) return;

		setDecodingVin(true);
		try {
			const decodedData = await decodeVINService(vin);

			// Populate basic vehicle info
			if (decodedData.make) setValue('vehicleMake', decodedData.make);
			if (decodedData.model) setValue('vehicleModel', decodedData.model);
			if (decodedData.year) setValue('vehicleYear', decodedData.year);
			
			// Populate vehicle type if available
			if (decodedData.bodyClass && !watch('vehicleType')) {
				setValue('vehicleType', decodedData.bodyClass);
			}
			
			// Populate color if available from VIN (rare, but worth trying)
			if (decodedData.color) {
				setValue('vehicleColor', decodedData.color);
			}
			
			// Populate weight with best available estimate
			const weightEstimate = getBestWeightEstimate(decodedData);
			if (weightEstimate) {
				setValue('weight', weightEstimate.toString());
			}

			// Build success message with decoded info
			const decodedFields: string[] = [];
			if (decodedData.make && decodedData.model && decodedData.year) {
				decodedFields.push(`${decodedData.year} ${decodedData.make} ${decodedData.model}`);
			}
			if (weightEstimate) {
				decodedFields.push(`Weight: ~${weightEstimate.toLocaleString()} lbs`);
			}
			if (decodedData.color) {
				decodedFields.push(`Color: ${decodedData.color}`);
			}

			toast.success('VIN decoded successfully!', {
				description: decodedFields.join(' • ')
			});
		} catch (error) {
			console.error('Error decoding VIN:', error);
			toast.error('Failed to decode VIN', {
				description: 'Please check the VIN and try again'
			});
		} finally {
			setDecodingVin(false);
		}
	};

	const fetchAuctionLotData = async (rawLotNumber: string) => {
		if (!rawLotNumber?.trim()) return;

		let cleanedLotNumber = rawLotNumber.trim();
		let targetAuction: 'Copart' | 'IAAI' = auctionNameValue === 'IAAI' ? 'IAAI' : 'Copart';

		// Auto-detect and clean URLs
		if (/copart\.com/i.test(cleanedLotNumber)) {
			targetAuction = 'Copart';
			const match = cleanedLotNumber.match(/copart\.com\/lot\/(\d+)/i);
			if (match) cleanedLotNumber = match[1];
		} else if (/iaai\.com/i.test(cleanedLotNumber)) {
			targetAuction = 'IAAI';
			const match = cleanedLotNumber.match(/iaai\.com\/VehicleDetail\/([a-zA-Z0-9~-]+)/i);
			if (match) cleanedLotNumber = match[1];
		} else {
			// Strip common prefixes like #, Lot, Stock
			cleanedLotNumber = cleanedLotNumber.replace(/^(lot|stock)\s*(#|number|no|:)?\s*/i, '').replace(/^#\s*/, '').trim();
			if (cleanedLotNumber.includes('~') || /~[a-z]{2}$/i.test(cleanedLotNumber)) {
				targetAuction = 'IAAI';
			}
		}

		setFetchingLotData(true);
		setLotFetchProgress(15);
		setLotFetchStage(`Connecting to ${targetAuction}...`);

		const progressInterval = setInterval(() => {
			setLotFetchProgress((prev) => {
				if (prev < 35) {
					setLotFetchStage(`Querying ${targetAuction} lot details & vehicle specifications...`);
					return prev + 10;
				}
				if (prev < 65) {
					setLotFetchStage('Extracting vehicle color, keys, title & damage...');
					return prev + 8;
				}
				if (prev < 90) {
					setLotFetchStage('Retrieving high-resolution photo gallery...');
					return prev + 5;
				}
				return prev;
			});
		}, 800);

		try {
			const { lotData, lotSummary } = await (targetAuction === 'IAAI'
				? fetchIaaiLotDataForShipment(cleanedLotNumber).then((data) => ({
					lotData: data,
					lotSummary: buildIaaiLotSummary(data),
				}))
				: fetchCopartLotDataForShipment(cleanedLotNumber).then((data) => ({
					lotData: data,
					lotSummary: buildCopartLotSummary(data),
				})));

			clearInterval(progressInterval);
			setLotFetchProgress(100);
			setLotFetchStage('Vehicle data & photos loaded!');

			const setFetchedValue = (field: Parameters<typeof setValue>[0], value: Parameters<typeof setValue>[1]) => {
				setValue(field, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
			};

			setFetchedValue('lotNumber', lotData.lotNumber);
			setFetchedValue('auctionName', lotData.auctionName || targetAuction);
			if (lotData.vehicleMake) setFetchedValue('vehicleMake', lotData.vehicleMake);
			if (lotData.vehicleModel) setFetchedValue('vehicleModel', lotData.vehicleModel);
			if (lotData.vehicleYear) setFetchedValue('vehicleYear', lotData.vehicleYear);
			if (lotData.vehicleColor) setFetchedValue('vehicleColor', lotData.vehicleColor);
			if (lotData.vehicleType) setFetchedValue('vehicleType', lotData.vehicleType);
			if (lotData.vehicleVIN) setFetchedValue('vehicleVIN', lotData.vehicleVIN);
			if (typeof lotData.hasKey === 'boolean') setFetchedValue('hasKey', lotData.hasKey);
			if (typeof lotData.hasTitle === 'boolean') setFetchedValue('hasTitle', lotData.hasTitle);
			if (lotData.purchaseDate && !formValues.purchaseDate) setFetchedValue('purchaseDate', lotData.purchaseDate);
			if (lotData.purchaseLocation && !formValues.purchaseLocation) setFetchedValue('purchaseLocation', lotData.purchaseLocation);
			if (lotData.internalNotes && !formValues.internalNotes) setFetchedValue('internalNotes', lotData.internalNotes);
			if (Array.isArray(lotData.vehiclePhotos) && lotData.vehiclePhotos.length > 0) {
				setVehiclePhotos(lotData.vehiclePhotos);
				setValue('vehiclePhotos', lotData.vehiclePhotos, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
			}

			// If an unmasked 17-character VIN is present and weight is unset, decode weight in background
			if (lotData.vehicleVIN && lotData.vehicleVIN.length === 17 && !lotData.vehicleVIN.includes('*') && !formValues.weight) {
				decodeVINService(lotData.vehicleVIN)
					.then((decoded) => {
						const weightEst = getBestWeightEstimate(decoded);
						if (weightEst) setFetchedValue('weight', weightEst.toString());
					})
					.catch(() => {});
			}

			toast.success(`${targetAuction} lot data fetched`, {
				description: lotSummary,
			});
		} catch (error) {
			clearInterval(progressInterval);
			console.error(`Error fetching ${targetAuction} lot data:`, error);
			toast.error(`Failed to fetch ${targetAuction} lot data`, {
				description: error instanceof Error ? error.message : 'Please verify the lot number and try again',
			});
		} finally {
			clearInterval(progressInterval);
			setTimeout(() => {
				setFetchingLotData(false);
				setLotFetchProgress(0);
				setLotFetchStage('');
			}, 500);
		}
	};

	// Photo upload with compression and progress tracking
	const handlePhotoUpload = async (file: File, fileId: string) => {
		// Validate file type
		if (!isValidImageFile(file)) {
			toast.error('Invalid file type', {
				description: 'Please upload JPEG, PNG, or WebP images only'
			});
			return null;
		}

		// Validate file size (max 10MB before compression)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			toast.error('File too large', {
				description: `File size must be less than ${formatFileSize(maxSize)}`
			});
			return null;
		}

		setUploadingFiles((prev) => new Set(prev).add(fileId));
		setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

		try {
			// Compress image
			setUploadProgress((prev) => ({ ...prev, [fileId]: 10 }));
			const compressedFile = await compressImage(file, 1920, 1920, 0.8);
			setUploadProgress((prev) => ({ ...prev, [fileId]: 30 }));

			// Upload compressed file
			const formData = new FormData();
			formData.append('file', compressedFile);

			const xhr = new XMLHttpRequest();

			// Track upload progress
			xhr.upload.addEventListener('progress', (e) => {
				if (e.lengthComputable) {
					const percentComplete = 30 + (e.loaded / e.total) * 60; // 30-90%
					setUploadProgress((prev) => ({ ...prev, [fileId]: percentComplete }));
				}
			});

			const uploadPromise = new Promise<string>((resolve, reject) => {
				xhr.addEventListener('load', () => {
					if (xhr.status === 200) {
						try {
							const result = JSON.parse(xhr.responseText);
							setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
							resolve(result.url);
						} catch (error) {
							reject(new Error('Failed to parse response'));
						}
					} else {
						reject(new Error('Upload failed'));
					}
				});

				xhr.addEventListener('error', () => {
					reject(new Error('Upload failed'));
				});

				xhr.open('POST', '/api/upload');
				xhr.send(formData);
			});

			const url = await uploadPromise;

			// Update photos state
			setVehiclePhotos((prev) => {
				const newPhotos = [...prev, url];
				setValue('vehiclePhotos', newPhotos);
				return newPhotos;
			});

			// Clean up progress tracking after a delay
			setTimeout(() => {
				setUploadProgress((prev) => {
					const newProgress = { ...prev };
					delete newProgress[fileId];
					return newProgress;
				});
				setUploadingFiles((prev) => {
					const newSet = new Set(prev);
					newSet.delete(fileId);
					return newSet;
				});
			}, 500);

			return url;
		} catch (error) {
			console.error('Error uploading photo:', error);
			toast.error('Failed to upload photo', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
			
			// Clean up on error
			setUploadProgress((prev) => {
				const newProgress = { ...prev };
				delete newProgress[fileId];
				return newProgress;
			});
			setUploadingFiles((prev) => {
				const newSet = new Set(prev);
				newSet.delete(fileId);
				return newSet;
			});
			
			return null;
		} finally {
			setUploading(false);
		}
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setUploading(true);

		// Process all files in parallel
		const uploadPromises = Array.from(files).map((file, index) => {
			const fileId = `${Date.now()}-${index}-${file.name}`;
			return handlePhotoUpload(file, fileId);
		});

		await Promise.all(uploadPromises);

		e.target.value = '';
		setUploading(false);
	};

	const removePhoto = (index: number) => {
		const newPhotos = vehiclePhotos.filter((_, i) => i !== index);
		setVehiclePhotos(newPhotos);
		setValue('vehiclePhotos', newPhotos);
	};

	// Form submission
	const onSubmit = async (data: ShipmentFormData) => {
		try {
			const response = await fetch('/api/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (response.ok) {
				toast.success('Shipment created successfully!');
				setTimeout(() => {
					router.push('/dashboard/shipments');
				}, 1500);
			} else {
				toast.error(result.message || 'Failed to create shipment', {
					description: 'Please check your inputs and try again'
				});
			}
		} catch (error) {
			console.error('Error creating shipment:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		}
	};

	const handleNext = async () => {
		let fieldsToValidate: (keyof ShipmentFormData)[] = [];

		switch (activeStep) {
			case 0: // Vehicle Info
				fieldsToValidate = ['vehicleType', 'vehicleVIN', 'vehicleMake', 'vehicleModel', 'vehicleYear'];
				break;
			case 1: // Photos - optional, can skip
				break;
			case 2: // Status
				fieldsToValidate = ['status'];
				if (statusValue === 'IN_TRANSIT') {
					fieldsToValidate.push('containerId');
				}
				break;
			case 3: // Customer
				fieldsToValidate = ['userId'];
				break;
		}

		if (fieldsToValidate.length > 0) {
			const isValid = await trigger(fieldsToValidate);
			if (!isValid) return;
		}

		setActiveStep((prev) => prev + 1);
	};

	const handleBack = () => {
		setActiveStep((prev) => prev - 1);
	};

	if (!hasPermission(session?.user?.role, 'shipments:manage')) {
		return (
			<ProtectedRoute>
				<DashboardSurface>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, textAlign: 'center', paddingTop: '96px', paddingBottom: '96px'}}>
						<h4 className="text-lg font-semibold leading-snug" style={{fontWeight: 700, color: 'var(--text-primary)'}}>
							Access Denied
						</h4>
						<p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)', marginTop: '16px'}}>
							You do not have permission to create shipments.
						</p>
					</JXBox>
				</DashboardSurface>
			</ProtectedRoute>
		);
	}

	return (
		<ProtectedRoute>
			<DashboardSurface>
				{/* Breadcrumbs */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
					<Breadcrumbs />
				</JXBox>
				
				<PageHeader
					title="Create New Shipment"
					description="Add vehicle information with guided steps"
					actions={
						<Button href="/dashboard/shipments" variant="outline" icon={<ArrowLeft className="w-4 h-4" />} iconPosition="start" size="sm">
							Back
						</Button>
					}
				/>

				{/* Stepper */}
				<DashboardPanel>
					<MilestoneStepper steps={steps.map((step, index) => ({ id: String(index), label: step.label }))} currentStepId={String(activeStep)} />
				</DashboardPanel>

				{/* Form Content */}
				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Step 0: Vehicle Information */}
					{activeStep === 0 && (
						<DashboardPanel title="Vehicle Information" description="Enter basic vehicle details">
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
								{/* Smart AI Document Ingest Dropzone */}
								<AiDocumentAutoFillDropzone onExtracted={handleAiDocumentExtracted} />

								{/* Service Type - NEW */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<label className="text-sm leading-relaxed" htmlFor="serviceType" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
										Service Type *
									</label>
									<select
										id="serviceType"
										{...register('serviceType')}
										style={{
											width: '100%',
											padding: '10px 12px',
											borderRadius: '16px',
											border: errors.serviceType ? '2px solid var(--error)' : '1px solid rgba(var(--border-rgb), 0.9)',
											backgroundColor: 'var(--background)',
											color: 'var(--text-primary)',
											fontSize: '0.875rem',
										}}
									>
										<option value="SHIPPING_ONLY">Shipping Only (Customer owns vehicle)</option>
										<option value="PURCHASE_AND_SHIPPING">Purchase + Shipping (We buy for customer)</option>
									</select>
									{errors.serviceType && (
										<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--error)', marginTop: '4px'}}>
											{errors.serviceType.message}
										</p>
									)}
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
										{serviceTypeValue === 'PURCHASE_AND_SHIPPING' 
											? '📦 Purchase + Shipping: We buy the vehicle from auction/dealer and ship it'
											: '🚚 Shipping Only: Customer already owns the vehicle, we just handle shipping'}
									</p>
								</JXBox>

								{/* VIN */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '16px', alignItems: 'flex-end'}} className="flex-wrap sm:flex-nowrap">
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}} className="min-w-full sm:min-w-[0px]">
											<FormField
												id="vehicleVIN"
												label="VIN (Vehicle Identification Number)"
												placeholder="VIN or vehicle identifier"
												error={!!errors.vehicleVIN}
												helperText={errors.vehicleVIN?.message}
												{...register('vehicleVIN')}
											/>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px'}}>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setScannerOpen(true)}
												className="shrink-0 text-xs"
											>
												<Camera className="w-3.5 h-3.5 mr-1 text-[var(--accent-gold)]" />
												Scan
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => vinValue && decodeVIN(vinValue)}
												disabled={!vinValue || vinValue.length !== 17 || decodingVin}
												loading={decodingVin}
												className="shrink-0 text-xs"
											>
												{decodingVin ? 'Decoding...' : 'Decode'}
											</Button>
										</JXBox>
									</JXBox>
								</JXBox>

								{/* Vehicle Type */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<label className="text-sm leading-relaxed" htmlFor="vehicleType" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
										Vehicle Type *
									</label>
									<select
										id="vehicleType"
										{...register('vehicleType')}
										style={{
											width: '100%',
											padding: '10px 12px',
											borderRadius: '16px',
											border: errors.vehicleType ? '2px solid var(--error)' : '1px solid rgba(var(--border-rgb), 0.9)',
											backgroundColor: 'var(--background)',
											color: 'var(--text-primary)',
											fontSize: '0.875rem',
										}}
									>
										<option value="">Select type</option>
										<option value="sedan">Sedan</option>
										<option value="suv">SUV</option>
										<option value="truck">Truck</option>
										<option value="motorcycle">Motorcycle</option>
										<option value="van">Van</option>
										<option value="coupe">Coupe</option>
										<option value="convertible">Convertible</option>
										<option value="wagon">Wagon</option>
										<option value="other">Other</option>
									</select>
									{errors.vehicleType && (
										<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--error)', marginTop: '4px'}}>
											{errors.vehicleType.message}
										</p>
									)}
								</JXBox>

								{/* Make, Model, Year */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
									<FormField
										id="vehicleMake"
										label="Make"
										placeholder="e.g., Toyota"
										{...register('vehicleMake')}
									/>
									<FormField
										id="vehicleModel"
										label="Model"
										placeholder="e.g., Camry"
										{...register('vehicleModel')}
									/>
									<FormField
										id="vehicleYear"
										label="Year"
										type="number"
										placeholder="e.g., 2022"
										error={!!errors.vehicleYear}
										helperText={errors.vehicleYear?.message}
										{...register('vehicleYear')}
									/>
								</JXBox>

								{/* Color, Auction, Lot Number */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
									<FormField
										id="vehicleColor"
										label="Color"
										placeholder="e.g., Blue"
										{...register('vehicleColor')}
									/>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<label className="text-sm leading-relaxed" htmlFor="auctionName" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
											Auction
										</label>
										<select
											id="auctionName"
											{...register('auctionName')}
											style={{
												width: '100%',
												padding: '10px 12px',
												borderRadius: '16px',
												border: '1px solid rgba(var(--border-rgb), 0.9)',
												backgroundColor: 'var(--background)',
												color: 'var(--text-primary)',
												fontSize: '0.875rem',
											}}
										>
											<option value="">Select auction</option>
											<option value="Copart">Copart</option>
											<option value="IAAI">IAAI</option>
											<option value="Other">Other</option>
										</select>
									</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '12px', alignItems: 'flex-end'}} className="flex-wrap sm:flex-nowrap">
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}} className="min-w-full sm:min-w-[0px]">
												<FormField
													id="lotNumber"
													label="Lot Number"
													placeholder="Auction lot #"
													{...register('lotNumber')}
												/>
											</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px'}}>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => setSmartFillOpen(true)}
													className="shrink-0 text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
												>
													<Zap className="w-3.5 h-3.5 mr-1 fill-amber-400" />
													Smart Paste
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => lotNumberValue && fetchAuctionLotData(lotNumberValue)}
													disabled={!lotNumberValue || fetchingLotData}
													loading={fetchingLotData}
													className="shrink-0 text-xs"
												>
													{fetchingLotData ? 'Fetching...' : 'Fetch'}
												</Button>
											</JXBox>
										</JXBox>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px'}}>
											Use <strong className="text-amber-400 font-semibold">Smart Paste</strong> to auto-fill without proxies or Oxylabs, or enter a lot number to fetch.
										</p>
									</JXBox>
								</JXBox>

								{/* Auction Lot Fetching Loading Bar */}
								{fetchingLotData && (
									<JXBox padding="none" border={false} style={{padding: '18px', borderRadius: '16px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', border: '1px solid rgba(var(--accent-gold-rgb), 0.35)', display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.2s ease'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
												<Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
												<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{lotFetchStage || `Fetching ${auctionNameValue || 'Auction'} Lot Data...`}
												</p>
											</JXBox>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
												{lotFetchProgress}%
											</p>
										</JXBox>
										<div role="progressbar" aria-valuenow={lotFetchProgress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]" style={{height: '8px', borderRadius: '32px', backgroundColor: 'rgba(var(--border-rgb), 0.25)'}}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${lotFetchProgress}%`, backgroundColor: 'var(--accent-gold)' }} /></div>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
											Retrieving vehicle specifications, color, keys, damage, and high-resolution photo gallery
										</p>
									</JXBox>
								)}

								{/* Weight, Dimensions */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-2">
									<FormField
										id="weight"
										label="Weight (lbs)"
										type="number"
										placeholder="Vehicle weight"
										error={!!errors.weight}
										helperText={errors.weight?.message}
										{...register('weight')}
									/>
									<FormField
										id="dimensions"
										label="Dimensions"
										placeholder="L x W x H"
										error={!!errors.dimensions}
										helperText={errors.dimensions?.message}
										{...register('dimensions')}
									/>
								</JXBox>

								{/* Has Key, Has Title */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px'}} className="grid-cols-1 sm:grid-cols-2">
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '16px'}}>
										<input
											id="hasKey"
											type="checkbox"
											{...register('hasKey')}
											style={{
												width: '20px',
												height: '20px',
												borderRadius: '4px',
												border: '1px solid var(--border)',
												cursor: 'pointer',
											}}
										/>
										<label className="text-sm leading-relaxed" htmlFor="hasKey" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer'}}>
											Has Key
										</label>
									</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '16px'}}>
										<input
											id="hasTitle"
											type="checkbox"
											{...register('hasTitle')}
											style={{
												width: '20px',
												height: '20px',
												borderRadius: '4px',
												border: '1px solid var(--border)',
												cursor: 'pointer',
											}}
										/>
										<label className="text-sm leading-relaxed" htmlFor="hasTitle" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer'}}>
											Has Title
										</label>
									</JXBox>
								</JXBox>

								{/* Title Status */}
								{watch('hasTitle') && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<label className="text-sm leading-relaxed" htmlFor="titleStatus" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
											Title Status
										</label>
										<select
											id="titleStatus"
											{...register('titleStatus')}
											style={{
												width: '100%',
												padding: '10px 12px',
												borderRadius: '16px',
												border: '1px solid rgba(var(--border-rgb), 0.9)',
												backgroundColor: 'var(--background)',
												color: 'var(--text-primary)',
												fontSize: '0.875rem',
											}}
										>
											<option value="">Select status</option>
											<option value="PENDING">Pending</option>
											<option value="DELIVERED">Delivered</option>
										</select>
									</JXBox>
								)}

								{/* Purchase Information - Only shown for PURCHASE_AND_SHIPPING */}
								{serviceTypeValue === 'PURCHASE_AND_SHIPPING' && (
									<>
										<JXBox padding="none" border={false} style={{marginTop: '24px', padding: '24px', borderRadius: '12px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.05)', border: '1px solid rgba(var(--accent-gold-rgb), 0.2)'}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
												💰 Purchase Information
											</p>

											{/* Purchase Price and Date */}
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px', marginBottom: '16px'}} className="grid-cols-1 sm:grid-cols-2">
												<FormField
													id="purchasePrice"
													label="Purchase Price *"
													type="number"
													placeholder="Amount paid for vehicle"
													error={!!errors.purchasePrice}
													helperText={errors.purchasePrice?.message || 'Price company paid for the vehicle'}
													{...register('purchasePrice')}
													required
												/>
												<FormField
													id="purchaseDate"
													label="Purchase Date"
													type="date"
													error={!!errors.purchaseDate}
													helperText={errors.purchaseDate?.message}
													{...register('purchaseDate')}
												/>
											</JXBox>

											{/* Dealer/Auction Information */}
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px', marginBottom: '16px'}} className="grid-cols-1 sm:grid-cols-2">
												{auctionNameValue === 'Other' ? (
													<FormField
														id="dealerName"
														label="Auction / Dealer Name"
														placeholder="Enter auction or dealer name"
														error={!!errors.dealerName}
														helperText={errors.dealerName?.message}
														{...register('dealerName')}
													/>
												) : (
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
														<input type="hidden" {...register('dealerName')} />
														<label className="text-sm leading-relaxed" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
															Selected Auction
														</label>
														<JXBox padding="none" border={false} style={{minHeight: '42px', display: 'flex', alignItems: 'center', paddingLeft: '12px', paddingRight: '12px', borderRadius: '16px', border: '1px solid rgba(var(--border-rgb), 0.9)', backgroundColor: 'var(--background)', color: auctionNameValue ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.875rem'}}>
															{auctionNameValue || 'Select auction above'}
														</JXBox>
													</JXBox>
												)}
												<FormField
													id="purchaseLocation"
													label="Purchase Location"
													placeholder="City, State"
													error={!!errors.purchaseLocation}
													helperText={errors.purchaseLocation?.message}
													{...register('purchaseLocation')}
												/>
											</JXBox>

											{/* Purchase Notes */}
											<FormField
												id="purchaseNotes"
												label="Purchase Notes"
												placeholder="Additional details about the purchase..."
												error={!!errors.purchaseNotes}
												helperText={errors.purchaseNotes?.message}
												{...register('purchaseNotes')}
												multiline
												rows={3}
											/>
										</JXBox>
									</>
								)}

								{/* Vehicle Photos Quick Preview (when fetched from auction or uploaded) */}
								{vehiclePhotos.length > 0 && (
									<JXBox padding="none" border={false} style={{marginTop: '24px', padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.05)', border: '1px solid rgba(var(--accent-gold-rgb), 0.25)'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
												<Camera className="w-5 h-5 text-amber-400" />
												<p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													Vehicle Photos ({vehiclePhotos.length} loaded from {auctionNameValue || 'Auction'})
												</p>
											</JXBox>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setActiveStep(1)}
												className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
											>
												Manage in Photos Step &rarr;
											</Button>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', paddingTop: '4px'}}>
											{vehiclePhotos.slice(0, 10).map((photo, index) => (
												<JXBox padding="none" border={false} key={index} style={{position: 'relative', width: '88px', height: '88px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(var(--border-rgb), 0.8)', backgroundColor: 'var(--background)'}}>
													<Image
														src={photo}
														alt={`Vehicle photo ${index + 1}`}
														fill
														className="object-cover"
														unoptimized
													/>
												</JXBox>
											))}
											{vehiclePhotos.length > 10 && (
												<JXBox padding="none" border={false} onClick={() => setActiveStep(1)} style={{width: '88px', height: '88px', flexShrink: 0, borderRadius: '12px', border: '1px dashed rgba(var(--accent-gold-rgb), 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.05)', transition: 'all 0.2s ease'}}>
													<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
														+{vehiclePhotos.length - 10}
													</p>
													<p className="text-sm leading-relaxed" style={{fontSize: '0.65rem', color: 'var(--text-secondary)'}}>
														more
													</p>
												</JXBox>
											)}
										</JXBox>
									</JXBox>
								)}
							</JXBox>
						</DashboardPanel>
					)}

					{/* Step 1: Photos */}
					{activeStep === 1 && (
						<DashboardPanel title="Vehicle Photos" description="Upload images of the vehicle">
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
								<label
									htmlFor="photos"
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										width: '100%',
										minHeight: '200px',
										border: '2px dashed var(--border)',
										borderRadius: '16px',
										cursor: uploading ? 'not-allowed' : 'pointer',
										transition: 'all 0.2s ease',
										backgroundColor: 'var(--background)',
									}}
									onMouseEnter={(e) => {
										if (!uploading) {
											e.currentTarget.style.borderColor = 'var(--accent-gold)';
											e.currentTarget.style.backgroundColor = 'rgba(var(--accent-gold-rgb), 0.05)';
										}
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.borderColor = 'var(--border)';
										e.currentTarget.style.backgroundColor = 'var(--background)';
									}}
								>
									<input
										id="photos"
										type="file"
										multiple
										accept="image/*"
										onChange={handleFileSelect}
										style={{ display: 'none' }}
										disabled={uploading}
									/>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '32px', paddingBottom: '32px'}}>
										{uploadingFiles.size > 0 ? (
											<>
												<Loader2 style={{ fontSize: 40, color: 'var(--accent-gold)' }} className="animate-spin" />
												<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
													Uploading {uploadingFiles.size} photo{uploadingFiles.size !== 1 ? 's' : ''}...
												</p>
											</>
										) : (
											<>
												<Upload style={{ fontSize: 40, color: 'var(--accent-gold)' }} />
												<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)'}}>
													Click to upload vehicle photos
												</p>
												<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
													PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
												</p>
											</>
										)}
									</JXBox>
								</label>

								{/* Upload Progress Indicator */}
								{Object.keys(uploadProgress).length > 0 && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '8px'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)'}}>
												Uploading {Object.keys(uploadProgress).length} photo{Object.keys(uploadProgress).length !== 1 ? 's' : ''}...
											</p>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)'}}>
												{overallProgress}%
											</p>
										</JXBox>
										<div role="progressbar" aria-valuenow={overallProgress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]" style={{height: '8px', borderRadius: '32px', backgroundColor: 'rgba(var(--border-rgb), 0.2)'}}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${overallProgress}%`, backgroundColor: 'var(--accent-gold)' }} /></div>
									</JXBox>
								)}

								{vehiclePhotos.length > 0 && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-2 sm:grid-cols-4">
										{vehiclePhotos.map((photo, index) => (
											<JXBox padding="none" border={false} key={index} style={{backgroundColor: 'transparent', position: 'relative', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)'}}>
												<Image
													src={photo}
													alt={`Vehicle photo ${index + 1}`}
													fill
													className="object-cover"
													unoptimized
												/>
												<button type="button" onClick={() => removePhoto(index)} style={{position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(239, 68, 68, 0.9)', borderRadius: '50%', padding: '4px', opacity: 0, transition: 'opacity 0.2s ease', cursor: 'pointer', border: 'none', zIndex: 1}} className="remove-button">
													<X style={{ fontSize: 16, color: 'white' }} />
												</button>
											</JXBox>
										))}
									</JXBox>
								)}
							</JXBox>
						</DashboardPanel>
					)}

					{/* Step 2: Status & Container */}
					{activeStep === 2 && (
						<DashboardPanel title="Status & Container" description="Set shipment status and assign to container">
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
								{/* Status */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<label className="text-sm leading-relaxed" htmlFor="status" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
										Shipment Status *
									</label>
									<select
										id="status"
										{...register('status')}
										style={{
											width: '100%',
											padding: '10px 12px',
											borderRadius: '16px',
											border: errors.status ? '2px solid var(--error)' : '1px solid rgba(var(--border-rgb), 0.9)',
											backgroundColor: 'var(--background)',
											color: 'var(--text-primary)',
											fontSize: '0.875rem',
										}}
									>
										<option value="ON_HAND">On Hand</option>
										<option value="IN_TRANSIT">In Transit</option>
										<option value="RELEASED">Released</option>
									</select>
									{errors.status && (
										<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--error)', marginTop: '4px'}}>
											{errors.status.message}
										</p>
									)}
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
										{statusValue === 'ON_HAND'
											? 'Vehicle is currently on hand, not yet assigned to a container'
											: statusValue === 'IN_TRANSIT'
											? 'Vehicle is in transit - must be assigned to a container'
											: 'Vehicle is released and ready for transit assignment'}
									</p>
								</JXBox>

								{/* Container Selection - Only shown when IN_TRANSIT */}
								{statusValue === 'IN_TRANSIT' && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<label className="text-sm leading-relaxed" htmlFor="containerId" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
											Container *
										</label>
										{loadingContainers ? (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)'}}>
												<Loader2 style={{ fontSize: 18 }} className="animate-spin" />
												<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem'}}>Loading containers...</p>
											</JXBox>
										) : (
											<>
																								<Autocomplete
												  options={containers.map((c) => ({
												    id: c.id,
												    label: `${c.containerNumber || ''}${c.destinationPort ? ` - ${c.destinationPort}` : ''} (${c.currentCount ?? 0}/${c.maxCapacity ?? 0})`,
												    subtitle: [c.destinationPort ? `Port: ${c.destinationPort}` : '', c.shippingLine, c.company?.name].filter(Boolean).join(' • '),
												    searchText: [c.containerNumber, c.destinationPort, c.trackingNumber, c.shippingLine, c.company?.name, c.bookingNumber].filter(Boolean).join(' '),
												  }))}
												  inputValue={containerSearchInput}
												  onInputChange={(v, reason) => { if (reason === 'input' || reason === 'clear') setContainerSearchInput(v); }}
												  value={watch('containerId') || null}
												  onChange={(id) => setValue('containerId', (id as string | null) || '', { shouldValidate: true })}
												  loading={loadingContainers}
												  placeholder="Search by container #, tracking #, line, or port..."
												  error={!!errors.containerId}
												  helperText={errors.containerId?.message}
												/>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px'}}>
													<Button href="/dashboard/containers/new" target="_blank" variant="outline" size="sm">
														Create New Container
													</Button>
												</JXBox>
											</>
										)}
									</JXBox>
								)}
							</JXBox>
						</DashboardPanel>
					)}

					{/* Step 3: Customer & Financial */}
					{activeStep === 3 && (
						<DashboardPanel title="Customer & Financial" description="Select customer and enter pricing">
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
								{/* Customer Selection */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<label className="text-sm leading-relaxed" htmlFor="userId" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
										Select Customer *
									</label>
									{loadingUsers ? (
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)'}}>
											<Loader2 style={{ fontSize: 18 }} className="animate-spin" />
											<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem'}}>Loading customers...</p>
										</JXBox>
									) : (
																				<Autocomplete
										  options={users.map((u) => ({ id: u.id, label: u.name || u.email }))}
										  value={watch('userId') || null}
										  onChange={(id) => setValue('userId', (id as string | null) || '', { shouldValidate: true })}
										  placeholder="Select customer"
										  error={!!errors.userId}
										  helperText={errors.userId?.message}
										/>
									)}
								</JXBox>
								{/* Payment Mode */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<p className="text-sm leading-relaxed" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px'}}>
										Payment Mode
									</p>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
										<JXBox padding="none" border={false} component="label" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', border: watch('paymentMode') === 'CASH' ? '2px solid var(--accent-gold)' : '1px solid var(--border)', borderRadius: '16px', backgroundColor: watch('paymentMode') === 'CASH' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)', cursor: 'pointer', transition: 'all 0.2s ease'}}>
											<input
												type="radio"
												value="CASH"
												{...register('paymentMode')}
												style={{ display: 'none' }}
											/>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
												Cash
											</p>
										</JXBox>
										<JXBox padding="none" border={false} component="label" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', border: watch('paymentMode') === 'DUE' ? '2px solid var(--accent-gold)' : '1px solid var(--border)', borderRadius: '16px', backgroundColor: watch('paymentMode') === 'DUE' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)', cursor: 'pointer', transition: 'all 0.2s ease'}}>
											<input
												type="radio"
												value="DUE"
												{...register('paymentMode')}
												style={{ display: 'none' }}
											/>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
												Due
											</p>
										</JXBox>
									</JXBox>
								</JXBox>
							</JXBox>
						</DashboardPanel>
					)}

					{/* Step 4: Review & Submit */}
					{activeStep === 4 && (
						<DashboardPanel title="Review & Submit" description="Verify all details before creating">
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
								{/* Summary */}
								<JXBox padding="none" border={false} style={{padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
									<p className="text-sm leading-relaxed" style={{fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px'}}>
										Shipment Summary
									</p>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-2">
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
												Service Type
											</p>
											<JXBox padding="none" border={false} style={{display: 'inline-block', paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px', borderRadius: '8px', backgroundColor: formValues.serviceType === 'PURCHASE_AND_SHIPPING' ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'rgba(99, 102, 241, 0.15)', color: formValues.serviceType === 'PURCHASE_AND_SHIPPING' ? 'var(--accent-gold)' : 'rgb(99, 102, 241)', fontSize: '0.75rem', fontWeight: 600}}>
												{formValues.serviceType === 'PURCHASE_AND_SHIPPING' ? '📦 Purchase + Shipping' : '🚚 Shipping Only'}
											</JXBox>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
												Vehicle
											</p>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
												{formValues.vehicleYear} {formValues.vehicleMake} {formValues.vehicleModel}
											</p>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
												VIN
											</p>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace'}}>
												{formValues.vehicleVIN || 'N/A'}
											</p>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
												Type
											</p>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize'}}>
												{formValues.vehicleType}
											</p>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
												Status
											</p>
											<JXBox padding="none" border={false} style={{display: 'inline-block', paddingLeft: '12px', paddingRight: '12px', paddingTop: '4px', paddingBottom: '4px', borderRadius: '8px', backgroundColor: formValues.status === 'IN_TRANSIT' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(156, 163, 175, 0.15)', color: formValues.status === 'IN_TRANSIT' ? 'rgb(99, 102, 241)' : 'rgb(156, 163, 175)', fontSize: '0.75rem', fontWeight: 600}}>
												{formValues.status === 'IN_TRANSIT' ? 'In Transit' : 'On Hand'}
											</JXBox>
										</JXBox>
										{formValues.serviceType === 'PURCHASE_AND_SHIPPING' && formValues.purchasePrice && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
												<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
													Purchase Price
												</p>
												<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-gold)'}}>
													${parseFloat(formValues.purchasePrice).toLocaleString()}
												</p>
											</JXBox>
										)}
									</JXBox>

									{/* Purchase Information Summary */}
									{formValues.serviceType === 'PURCHASE_AND_SHIPPING' && (formValues.dealerName || formValues.purchaseLocation || formValues.purchaseDate) && (
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)'}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px'}}>
												💰 Purchase Details
											</p>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-2">
												{formValues.dealerName && (
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
														<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
															Dealer/Auction
														</p>
														<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
															{formValues.dealerName}
														</p>
													</JXBox>
												)}
												{formValues.purchaseLocation && (
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
														<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
															Location
														</p>
														<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
															{formValues.purchaseLocation}
														</p>
													</JXBox>
												)}
												{formValues.purchaseDate && (
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
														<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
															Purchase Date
														</p>
														<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
															{new Date(formValues.purchaseDate).toLocaleDateString()}
														</p>
													</JXBox>
												)}
											</JXBox>
											{formValues.purchaseNotes && (
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px'}}>
													<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>
														Purchase Notes
													</p>
													<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
														{formValues.purchaseNotes}
													</p>
												</JXBox>
											)}
										</JXBox>
									)}

									{vehiclePhotos.length > 0 && (
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)'}}>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px'}}>
												Photos Uploaded
											</p>
											<p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
												{vehiclePhotos.length} photo{vehiclePhotos.length !== 1 ? 's' : ''}
											</p>
										</JXBox>
									)}
								</JXBox>

								{/* Internal Notes */}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<FormField
										id="internalNotes"
										label="Internal Notes (Optional)"
										placeholder="Add any internal notes about this shipment..."
										multiline
										rows={4}
										error={!!errors.internalNotes}
										helperText={errors.internalNotes?.message}
										{...register('internalNotes')}
									/>
								</JXBox>
							</JXBox>
						</DashboardPanel>
					)}

					{/* Navigation Buttons */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', marginTop: '24px'}}>
						<Button
							type="button"
							variant="outline"
							onClick={handleBack}
							disabled={activeStep === 0}
							icon={<ArrowLeft className="w-4 h-4" />}
						>
							Back
						</Button>

						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '16px'}}>
							<Button href="/dashboard/shipments" variant="ghost">
								Cancel
							</Button>
							
							{activeStep === steps.length - 1 ? (
								<Button
									type="submit"
									variant="primary"
									disabled={isSubmitting}
									icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
								>
									{isSubmitting ? 'Creating...' : 'Create Shipment'}
								</Button>
							) : (
								<Button
									type="button"
									variant="primary"
									onClick={handleNext}
									icon={<ArrowRight className="w-4 h-4" />}
									iconPosition="end"
								>
									Next
								</Button>
							)}
						</JXBox>
					</JXBox>
				</form>

				<BarcodeScannerModal
					open={scannerOpen}
					onClose={() => setScannerOpen(false)}
					onScan={handleBarcodeScan}
					title="Scan Vehicle VIN Barcode"
					description="Point your camera at the VIN barcode on the door jamb, title, or windshield"
				/>

				<AuctionSmartFillModal
					isOpen={smartFillOpen}
					onClose={() => setSmartFillOpen(false)}
					onApply={handleApplySmartParsedData}
					initialLotNumber={lotNumberValue}
					initialAuctionName={auctionNameValue}
				/>
			</DashboardSurface>
		</ProtectedRoute>
	);
}
