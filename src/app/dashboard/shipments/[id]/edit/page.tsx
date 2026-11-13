'use client';

import { useEffect, useState, useMemo } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Loader2, Package, User, CheckCircle, Save, AlertCircle, Zap } from 'lucide-react';

import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Autocomplete, PageHeader, Button, FormField, Breadcrumbs, toast, EmptyState, FormPageSkeleton } from '@/components/design-system';
import ShipmentWorkflowStrip from '@/components/shipments/ShipmentWorkflowStrip';
import AuctionSmartFillModal from '@/components/shipments/AuctionSmartFillModal';
import type { ParsedAuctionData } from '@/lib/auction-smart-parser';
import { shipmentSchema, type ShipmentFormData } from '@/lib/validations/shipment';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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

interface TransitWorkflowContext {
  transitId: string;
  transitReference: string | null;
  transitStatus: string | null;
  shipmentStatus: string;
  containerId: string | null;
}

interface DispatchWorkflowContext {
  dispatchId: string;
  dispatchReference: string | null;
  dispatchStatus: string | null;
  shipmentStatus: string;
}

const MANUAL_WORKFLOW_STATUSES = new Set(['ON_HAND', 'IN_TRANSIT', 'RELEASED']);

function normalizeEditableStatus(status: string, containerId: string | null) {
  if (MANUAL_WORKFLOW_STATUSES.has(status)) {
    return status as 'ON_HAND' | 'IN_TRANSIT' | 'RELEASED';
  }

  return containerId ? 'RELEASED' : 'ON_HAND';
}

function formatWorkflowStatus(status: string | null | undefined) {
  if (!status) {
    return 'Unknown';
  }

  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


export default function EditShipmentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [decodingVin, setDecodingVin] = useState(false);
  const [fetchingLotData, setFetchingLotData] = useState(false);
  const [lotFetchProgress, setLotFetchProgress] = useState(0);
  const [lotFetchStage, setLotFetchStage] = useState('');
  const [smartFillOpen, setSmartFillOpen] = useState(false);
  const [transitWorkflowContext, setTransitWorkflowContext] = useState<TransitWorkflowContext | null>(null);
  const [dispatchWorkflowContext, setDispatchWorkflowContext] = useState<DispatchWorkflowContext | null>(null);

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
    if (data.purchaseLocation && !watch('purchaseLocation')) setVal('purchaseLocation', data.purchaseLocation);
    if (data.purchasePrice && !watch('purchasePrice')) setVal('purchasePrice', data.purchasePrice.toString());
    if (data.internalNotes && !watch('internalNotes')) setVal('internalNotes', data.internalNotes);
    if (Array.isArray(data.vehiclePhotos) && data.vehiclePhotos.length > 0) {
      setVehiclePhotos(data.vehiclePhotos);
      setVal('vehiclePhotos', data.vehiclePhotos);
    }
  };

  const canManageShipments = useMemo(() => hasPermission(session?.user?.role, 'shipments:manage'), [session]);

  // Calculate overall upload progress for vehicle photos
  const vehiclePhotosProgress = useMemo(() => {
    const vehicleProgress = Object.entries(uploadProgress)
      .filter(([fileId]) => !fileId.includes('arrival'))
      .map(([, progress]) => progress);
    if (vehicleProgress.length === 0) return 0;
    const sum = vehicleProgress.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / vehicleProgress.length);
  }, [uploadProgress]);

  // Calculate overall upload progress for arrival photos
  const arrivalPhotosProgress = useMemo(() => {
    const arrivalProgress = Object.entries(uploadProgress)
      .filter(([fileId]) => fileId.includes('arrival'))
      .map(([, progress]) => progress);
    if (arrivalProgress.length === 0) return 0;
    const sum = arrivalProgress.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / arrivalProgress.length);
  }, [uploadProgress]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    mode: 'onBlur',
    defaultValues: {
      vehiclePhotos: [],
      status: 'ON_HAND',
    },
  });

  const statusValue = watch('status');
  const serviceTypeValue = watch('serviceType');
  const vinValue = watch('vehicleVIN');
  const lotNumberValue = watch('lotNumber');
  const isTransitManaged = Boolean(transitWorkflowContext?.transitId);
  const isDispatchManaged = Boolean(dispatchWorkflowContext?.dispatchId);

  // Fetch initial data
  useEffect(() => {
    if (!canManageShipments || status === 'loading') return;

    const fetchData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch users - fetch all users by using a large pageSize
        const usersResponse = await fetch('/api/users?pageSize=1000');
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          setUsers(data.users || []);
        }
        setLoadingUsers(false);

        // Fetch shipment
        const shipmentResponse = await fetch(`/api/shipments/${params.id}`, { cache: 'no-store' });
        if (shipmentResponse.ok) {
          const data = await shipmentResponse.json();
          const shipment = data.shipment;
          const editableStatus = normalizeEditableStatus(shipment.status, shipment.containerId || null);

          setTransitWorkflowContext(
            shipment.transitId
              ? {
                  transitId: shipment.transitId,
                  transitReference: shipment.transit?.referenceNumber || null,
                  transitStatus: shipment.transit?.status || null,
                  shipmentStatus: shipment.status,
                  containerId: shipment.containerId || null,
                }
              : null
          );
          setDispatchWorkflowContext(
            shipment.dispatchId
              ? {
                  dispatchId: shipment.dispatchId,
                  dispatchReference: shipment.dispatch?.referenceNumber || null,
                  dispatchStatus: shipment.dispatch?.status || null,
                  shipmentStatus: shipment.status,
                }
              : null
          );
          
          // Populate form
          reset({
            userId: shipment.userId,
            serviceType: shipment.serviceType || 'SHIPPING_ONLY',
            vehicleType: shipment.vehicleType,
            vehicleMake: shipment.vehicleMake || '',
            vehicleModel: shipment.vehicleModel || '',
            vehicleYear: shipment.vehicleYear?.toString() || '',
            vehicleVIN: shipment.vehicleVIN || '',
            vehicleColor: shipment.vehicleColor || '',
            lotNumber: shipment.lotNumber || '',
            auctionName: shipment.auctionName || '',
            weight: shipment.weight?.toString() || '',
            dimensions: shipment.dimensions || '',
            purchasePrice: shipment.purchasePrice?.toString() || '',
            hasKey: shipment.hasKey,
            hasTitle: shipment.hasTitle,
            titleStatus: shipment.titleStatus || undefined,
            paymentMode: shipment.paymentMode || undefined,
            status: editableStatus,
            containerId: shipment.containerId || '',
            internalNotes: shipment.internalNotes || '',
            vehiclePhotos: shipment.vehiclePhotos || [],
          });

          setVehiclePhotos(shipment.vehiclePhotos || []);
          setArrivalPhotos(shipment.arrivalPhotos || []);

          // If in transit, fetch containers
          if (shipment.status === 'IN_TRANSIT') {
            fetchContainers();
          }
        } else {
          toast.error('Failed to load shipment details');
          router.push('/dashboard/shipments');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('An error occurred while loading data');
      } finally {
        setLoadingUsers(false);
        setLoadingData(false);
      }
    };

    fetchData();
  }, [params.id, canManageShipments, status, reset, router]);

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
      const response = await fetch(`/api/containers?${query.toString()}`, { cache: 'no-store' });
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

  // Watch status changes to fetch containers if needed
  useEffect(() => {
    if (statusValue === 'IN_TRANSIT') {
      fetchContainers(containerSearchInput);
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
    if (!vin || vin.length !== 17) return;

    setDecodingVin(true);
    try {
      const decodedData = await decodeVINService(vin);

      // Populate basic vehicle info
      if (decodedData.make) setValue('vehicleMake', decodedData.make);
      if (decodedData.model) setValue('vehicleModel', decodedData.model);
      if (decodedData.year) setValue('vehicleYear', decodedData.year);
      
      // Populate vehicle type if available and not already set
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
      toast.error('Failed to decode VIN');
    } finally {
      setDecodingVin(false);
    }
  };

  const fetchAuctionLotData = async (rawLotNumber: string) => {
    if (!rawLotNumber?.trim()) return;

    let cleanedLotNumber = rawLotNumber.trim();
    let targetAuction: 'Copart' | 'IAAI' = watch('auctionName') === 'IAAI' ? 'IAAI' : 'Copart';

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

      setValue('lotNumber', lotData.lotNumber);
      setValue('auctionName', lotData.auctionName || targetAuction);
      if (lotData.vehicleMake) setValue('vehicleMake', lotData.vehicleMake);
      if (lotData.vehicleModel) setValue('vehicleModel', lotData.vehicleModel);
      if (lotData.vehicleYear) setValue('vehicleYear', lotData.vehicleYear);
      if (lotData.vehicleColor) setValue('vehicleColor', lotData.vehicleColor);
      if (lotData.vehicleType) setValue('vehicleType', lotData.vehicleType);
      if (lotData.vehicleVIN) setValue('vehicleVIN', lotData.vehicleVIN);
      if (typeof lotData.hasKey === 'boolean') setValue('hasKey', lotData.hasKey);
      if (typeof lotData.hasTitle === 'boolean') setValue('hasTitle', lotData.hasTitle);
      if (lotData.purchaseDate && !watch('purchaseDate')) setValue('purchaseDate', lotData.purchaseDate);
      if (lotData.purchaseLocation && !watch('purchaseLocation')) setValue('purchaseLocation', lotData.purchaseLocation);
      if (lotData.internalNotes && !watch('internalNotes')) setValue('internalNotes', lotData.internalNotes);
      if (Array.isArray(lotData.vehiclePhotos) && lotData.vehiclePhotos.length > 0) {
        setVehiclePhotos(lotData.vehiclePhotos);
        setValue('vehiclePhotos', lotData.vehiclePhotos, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      }

      // If an unmasked 17-character VIN is present and weight is unset, decode weight in background
      if (lotData.vehicleVIN && lotData.vehicleVIN.length === 17 && !lotData.vehicleVIN.includes('*') && !watch('weight')) {
        decodeVINService(lotData.vehicleVIN)
          .then((decoded) => {
            const weightEst = getBestWeightEstimate(decoded);
            if (weightEst) setValue('weight', weightEst.toString());
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
  const handlePhotoUpload = async (file: File, fileId: string, isArrival: boolean = false) => {
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
      if (isArrival) {
        setArrivalPhotos((prev) => [...prev, url]);
      } else {
        setVehiclePhotos((prev) => {
          const newPhotos = [...prev, url];
          setValue('vehiclePhotos', newPhotos);
          return newPhotos;
        });
      }

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isArrival: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    // Process all files in parallel
    const uploadPromises = Array.from(files).map((file, index) => {
      const fileId = `${Date.now()}-${index}-${file.name}-${isArrival ? 'arrival' : 'vehicle'}`;
      return handlePhotoUpload(file, fileId, isArrival);
    });

    await Promise.all(uploadPromises);

    e.target.value = '';
    setUploading(false);
  };

  const removePhoto = (index: number, isArrival: boolean = false) => {
    if (isArrival) {
        const newPhotos = arrivalPhotos.filter((_, i) => i !== index);
        setArrivalPhotos(newPhotos);
    } else {
        const newPhotos = vehiclePhotos.filter((_, i) => i !== index);
        setVehiclePhotos(newPhotos);
        setValue('vehiclePhotos', newPhotos);
    }
  };

  const onSubmit = async (data: ShipmentFormData) => {
    try {
      const payload: Record<string, unknown> = {
        ...data,
        arrivalPhotos,
        replaceArrivalPhotos: true,
      };

      if (isTransitManaged || isDispatchManaged) {
        delete payload.status;
        delete payload.containerId;
      }

      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Shipment updated successfully!');
        router.push(`/dashboard/shipments/${params.id}`);
      } else {
        toast.error(result.message || 'Failed to update shipment');
      }
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error('An error occurred while updating');
    }
  };

  if (status === 'loading' || loadingData) {
    return (
        <ProtectedRoute>
            <FormPageSkeleton />
        </ProtectedRoute>
    );
  }

  if (!canManageShipments) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <EmptyState
            icon={<AlertCircle className="w-12 h-12" />}
            title="Access Restricted"
            description="You do not have permission to modify shipment details"
            action={
              <Button href={`/dashboard/shipments/${params.id}`} variant="primary">Back to Shipment</Button>
            }
          />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
          <Breadcrumbs />
        </JXBox>

        <PageHeader
          title="Edit Shipment"
          description="Update shipment details, status, and documents"
          actions={
            <Button href={`/dashboard/shipments/${params.id}`} variant="outline" icon={<ArrowLeft className="w-4 h-4" />} size="sm">
              Cancel
            </Button>
          }
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px'}}>
            
            {/* 1. Vehicle Information */}
            <DashboardPanel title="Vehicle Information" description="Basic vehicle details and identification">
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '16px', alignItems: 'flex-end'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}}>
                            <FormField
                                id="vehicleVIN"
                                label="VIN (Vehicle Identification Number)"
                              placeholder="VIN or vehicle identifier"
                                error={!!errors.vehicleVIN}
                                helperText={errors.vehicleVIN?.message}
                                {...register('vehicleVIN')}
                            />
                        </JXBox>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => vinValue && decodeVIN(vinValue)}
                            disabled={!vinValue || vinValue.length !== 17 || decodingVin}
                            loading={decodingVin}
                        >
                            {decodingVin ? 'Decoding...' : 'Decode'}
                        </Button>
                    </JXBox>
                </JXBox>

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
                    <option value="SHIPPING_ONLY">Shipping Only</option>
                    <option value="PURCHASE_AND_SHIPPING">Purchase + Shipping</option>
                  </select>
                  {errors.serviceType && (
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--error)', marginTop: '4px'}}>
                      {errors.serviceType.message}
                    </p>
                  )}
                </JXBox>

                {serviceTypeValue === 'PURCHASE_AND_SHIPPING' && (
                  <FormField
                    id="purchasePrice"
                    label="Purchase Price (USD) *"
                    type="number"
                    inputProps={{ step: '0.01' }}
                    error={!!errors.purchasePrice}
                    helperText={errors.purchasePrice?.message}
                    {...register('purchasePrice')}
                  />
                )}

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

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
                  <FormField id="vehicleMake" label="Make" {...register('vehicleMake')} />
                  <FormField id="vehicleModel" label="Model" {...register('vehicleModel')} />
                  <FormField 
                    id="vehicleYear" 
                    label="Year" 
                    type="number" 
                    error={!!errors.vehicleYear}
                    helperText={errors.vehicleYear?.message}
                    {...register('vehicleYear')} 
                  />
                </JXBox>

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
                  <FormField id="vehicleColor" label="Color" {...register('vehicleColor')} />
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '12px', alignItems: 'flex-end'}} className="flex-wrap sm:flex-nowrap">
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}} className="min-w-full sm:min-w-[0px]">
                        <FormField id="lotNumber" label="Lot Number" placeholder="Auction lot #" {...register('lotNumber')} />
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
                      Use <strong className="text-amber-400 font-semibold">Smart Paste</strong> for instant proxy-free fill, or enter a lot number.
                    </p>
                  </JXBox>
                  <FormField id="auctionName" label="Auction Name" {...register('auctionName')} />
                </JXBox>

                {/* Auction Lot Fetching Loading Bar */}
                {fetchingLotData && (
                  <JXBox padding="none" border={false} style={{padding: '18px', borderRadius: '16px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', border: '1px solid rgba(var(--accent-gold-rgb), 0.35)', display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.2s ease'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                          {lotFetchStage || `Fetching ${watch('auctionName') || 'Auction'} Lot Data...`}
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
                
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-2">
                    <FormField
                        id="weight"
                        label="Weight (lbs)"
                        type="number"
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
              </JXBox>
            </DashboardPanel>

            {/* 2. Status & Assignment */}
            <DashboardPanel title="Status & Assignment" description="Customer assignment and shipment status">
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
                <ShipmentWorkflowStrip
                  shipmentStatus={isTransitManaged ? transitWorkflowContext?.shipmentStatus : isDispatchManaged ? dispatchWorkflowContext?.shipmentStatus : statusValue}
                  dispatchId={dispatchWorkflowContext?.dispatchId || null}
                  dispatchReference={dispatchWorkflowContext?.dispatchReference || null}
                  containerId={transitWorkflowContext?.containerId || watch('containerId') || null}
                  containerLabel={transitWorkflowContext?.containerId || watch('containerId') || null}
                  transitId={transitWorkflowContext?.transitId || null}
                  transitReference={transitWorkflowContext?.transitReference || null}
                />

                {isDispatchManaged && dispatchWorkflowContext && (
                  <JXBox padding="none" border={false} style={{borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.3)', backgroundColor: 'rgba(234, 179, 8, 0.08)', padding: '16px'}}>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px'}}>
                      Workflow Controlled By Dispatch
                    </p>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px'}}>
                      This shipment is currently assigned to dispatch, so status and container assignment are read-only here until the port handoff is completed.
                    </p>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em'}}>
                          Shipment Status
                        </p>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                          {formatWorkflowStatus(dispatchWorkflowContext.shipmentStatus)}
                        </p>
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em'}}>
                          Dispatch Reference
                        </p>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                          {dispatchWorkflowContext.dispatchReference || dispatchWorkflowContext.dispatchId}
                        </p>
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em'}}>
                          Dispatch Status
                        </p>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                          {formatWorkflowStatus(dispatchWorkflowContext.dispatchStatus)}
                        </p>
                      </JXBox>
                    </JXBox>
                  </JXBox>
                )}

                {isTransitManaged && transitWorkflowContext && (
                  <JXBox padding="none" border={false} style={{borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.28)', backgroundColor: 'rgba(99, 102, 241, 0.08)', padding: '16px'}}>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px'}}>
                      Workflow Controlled By Transit
                    </p>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px'}}>
                      This shipment is already assigned to a transit, so status and container assignment are read-only here.
                    </p>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em'}}>
                          Shipment Status
                        </p>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                          {formatWorkflowStatus(transitWorkflowContext.shipmentStatus)}
                        </p>
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em'}}>
                          Transit Reference
                        </p>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                          {transitWorkflowContext.transitReference || transitWorkflowContext.transitId}
                        </p>
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em'}}>
                          Transit Status
                        </p>
                        <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                          {formatWorkflowStatus(transitWorkflowContext.transitStatus)}
                        </p>
                      </JXBox>
                    </JXBox>
                  </JXBox>
                )}

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <label className="text-sm leading-relaxed" htmlFor="userId" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
                    Select Customer *
                  </label>
                  {loadingUsers ? (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <Loader2 className="animate-spin w-4 h-4" />
                        <p className="text-sm leading-relaxed">Loading customers...</p>
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

                {!isTransitManaged && !isDispatchManaged && (
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
                  </JXBox>
                )}

                {!isTransitManaged && !isDispatchManaged && statusValue === 'IN_TRANSIT' && (
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                    <label className="text-sm leading-relaxed" htmlFor="containerId" style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px'}}>
                      Container *
                    </label>
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
                  </JXBox>
                )}
              </JXBox>
            </DashboardPanel>
            
            {/* 3. Photos */}
            <DashboardPanel title="Photos" description="Vehicle condition photos">
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '32px'}}>
                    {/* Vehicle Photos */}
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontWeight: 600, marginBottom: '16px'}}>Vehicle Photos</p>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
                            <label
                                htmlFor="vehicle-photos"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    minHeight: '150px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '16px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: 'var(--background)',
                                }}
                            >
                                <input
                                    id="vehicle-photos"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, false)}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '32px', paddingBottom: '32px'}}>
                                    {Array.from(uploadingFiles).some(id => !id.includes('arrival')) ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                                            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                                                Uploading {Array.from(uploadingFiles).filter(id => !id.includes('arrival')).length} photo{Array.from(uploadingFiles).filter(id => !id.includes('arrival')).length !== 1 ? 's' : ''}...
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
                                            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                                                Click to upload vehicle photos
                                            </p>
                                            <span className="text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]" style={{fontSize: '0.7rem'}}>
                                                PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
                                            </span>
                                        </>
                                    )}
                                </JXBox>
                            </label>

                            {/* Upload Progress Indicator */}
                            {Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length > 0 && (
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                                        <p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)'}}>
                                            Uploading {Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length} photo{Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length !== 1 ? 's' : ''}...
                                        </p>
                                        <p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)'}}>
                                            {vehiclePhotosProgress}%
                                        </p>
                                    </JXBox>
                                    <div role="progressbar" aria-valuenow={vehiclePhotosProgress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]" style={{height: '8px', borderRadius: '32px', backgroundColor: 'rgba(var(--border-rgb), 0.2)'}}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${vehiclePhotosProgress}%`, backgroundColor: 'var(--accent-gold)' }} /></div>
                                </JXBox>
                            )}

                            {vehiclePhotos.length > 0 && (
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-2 sm:grid-cols-4 md:grid-cols-5">
                                    {vehiclePhotos.map((photo, index) => (
                                        <JXBox padding="none" border={false} key={index} style={{backgroundColor: 'transparent', position: 'relative', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)'}}>
                                            <Image src={photo} alt={`Vehicle ${index + 1}`} fill className="object-cover" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, false)}
                                                className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </JXBox>
                                    ))}
                                </JXBox>
                            )}
                        </JXBox>
                    </JXBox>

                    {/* Arrival Photos */}
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <p className="text-sm leading-relaxed" style={{fontWeight: 600, marginBottom: '16px'}}>Arrival Photos (Optional)</p>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
                            <label
                                htmlFor="arrival-photos"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    minHeight: '150px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '16px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: 'var(--background)',
                                }}
                            >
                                <input
                                    id="arrival-photos"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, true)}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '32px', paddingBottom: '32px'}}>
                                    {Array.from(uploadingFiles).some(id => id.includes('arrival')) ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                                            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                                                Uploading {Array.from(uploadingFiles).filter(id => id.includes('arrival')).length} photo{Array.from(uploadingFiles).filter(id => id.includes('arrival')).length !== 1 ? 's' : ''}...
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
                                            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                                                Click to upload arrival photos
                                            </p>
                                            <span className="text-xs text-[var(--text-secondary)] text-[var(--text-secondary)]" style={{fontSize: '0.7rem'}}>
                                                PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
                                            </span>
                                        </>
                                    )}
                                </JXBox>
                            </label>

                            {/* Upload Progress Indicator for Arrival Photos */}
                            {Object.keys(uploadProgress).filter(id => id.includes('arrival')).length > 0 && (
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                                        <p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)'}}>
                                            Uploading {Object.keys(uploadProgress).filter(id => id.includes('arrival')).length} photo{Object.keys(uploadProgress).filter(id => id.includes('arrival')).length !== 1 ? 's' : ''}...
                                        </p>
                                        <p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)'}}>
                                            {arrivalPhotosProgress}%
                                        </p>
                                    </JXBox>
                                    <div role="progressbar" aria-valuenow={arrivalPhotosProgress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]" style={{height: '8px', borderRadius: '32px', backgroundColor: 'rgba(var(--border-rgb), 0.2)'}}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${arrivalPhotosProgress}%`, backgroundColor: 'var(--accent-gold)' }} /></div>
                                </JXBox>
                            )}

                            {arrivalPhotos.length > 0 && (
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-2 sm:grid-cols-4 md:grid-cols-5">
                                    {arrivalPhotos.map((photo, index) => (
                                        <JXBox padding="none" border={false} key={index} style={{backgroundColor: 'transparent', position: 'relative', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)'}}>
                                            <Image src={photo} alt={`Arrival ${index + 1}`} fill className="object-cover" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, true)}
                                                className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </JXBox>
                                    ))}
                                </JXBox>
                            )}
                        </JXBox>
                    </JXBox>
                </JXBox>
            </DashboardPanel>


            {/* 5. Internal Notes */}
            <DashboardPanel title="Internal Notes" description="Private notes for staff">
                <FormField
                    id="internalNotes"
                    label="Internal Notes"
                    placeholder="Add any internal notes..."
                    multiline
                    rows={4}
                    error={!!errors.internalNotes}
                    helperText={errors.internalNotes?.message}
                    {...register('internalNotes')}
                />
            </DashboardPanel>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '16px'}}>
                <Button href={`/dashboard/shipments/${params.id}`} variant="ghost" type="button">Cancel</Button>
                <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={isSubmitting}
                    icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </Button>
            </JXBox>
          </JXBox>
        </form>

        <AuctionSmartFillModal
          isOpen={smartFillOpen}
          onClose={() => setSmartFillOpen(false)}
          onApply={handleApplySmartParsedData}
          initialLotNumber={watch('lotNumber')}
          initialAuctionName={watch('auctionName')}
        />
      </DashboardSurface>
    </ProtectedRoute>
  );
}