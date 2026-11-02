export interface VinSearchResult {
  id: string;
  vin: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  vehicleType?: string | null;
  lotNumber?: string | null;
  auctionName?: string | null;
  hasKey?: boolean | null;
  hasTitle?: boolean | null;
  titleStatus?: string | null;
  status: string;
  workflowStage?: string;
  currentLocation?: string | null;
  customer?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
  container?: {
    id?: string;
    containerNumber: string;
    bookingNumber?: string | null;
    shippingLine?: string | null;
    vesselName?: string | null;
    voyageNumber?: string | null;
    loadingPort?: string | null;
    destinationPort?: string | null;
    loadingDate?: string | null;
    departureDate?: string | null;
    estimatedArrival?: string | null;
    actualArrival?: string | null;
    status?: string | null;
    currentLocation?: string | null;
    progress?: number | null;
  } | null;
  dispatch?: {
    id?: string;
    referenceNumber?: string | null;
    origin?: string | null;
    destination?: string | null;
    carrier?: string | null;
    status?: string | null;
    dispatchDate?: string | null;
  } | null;
  transit?: {
    id?: string;
    referenceNumber?: string | null;
    origin?: string | null;
    destination?: string | null;
    carrier?: string | null;
    status?: string | null;
    dispatchDate?: string | null;
    actualDelivery?: string | null;
  } | null;
  photos?: {
    vehiclePhotosCount: number;
    arrivalPhotosCount: number;
    previewUrl?: string | null;
  };
  financials?: {
    price?: number | null;
    purchasePrice?: number | null;
    paymentStatus?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
  webAppUrl: string;
  trackingEvents?: Array<{
    timestamp?: string;
    status: string;
    location?: string;
    description?: string;
    actual: boolean;
  }>;
  dataSource: 'database' | 'api' | 'snapshot';
}

export interface ContainerSearchResult {
  id: string;
  containerNumber: string;
  bookingNumber?: string | null;
  trackingNumber?: string | null;
  shippingLine?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  status: string;
  loadingPort?: string | null;
  destinationPort?: string | null;
  transshipmentPorts?: string[];
  loadingDate?: string | null;
  departureDate?: string | null;
  estimatedArrival?: string | null;
  actualArrival?: string | null;
  currentLocation?: string | null;
  progress?: number | null;
  maxCapacity?: number | null;
  shipmentCount: number;
  shipments: Array<{
    id: string;
    vin?: string | null;
    vehicle: string;
    lotNumber?: string | null;
    status: string;
    customerName?: string | null;
  }>;
  webAppUrl: string;
  trackingEvents?: Array<{
    timestamp?: string;
    status: string;
    location?: string;
    description?: string;
    actual: boolean;
  }>;
  dataSource: 'database' | 'api' | 'snapshot';
}

export interface TrackingResult {
  requestedNumber: string;
  resolvedType: 'VIN_SHIPMENT' | 'CONTAINER' | 'UNKNOWN';
  containerNumber?: string;
  containerType?: string;
  shipmentStatus?: string;
  origin?: string;
  originDate?: string;
  pol?: string;
  polDate?: string;
  destination?: string;
  destinationDate?: string;
  pod?: string;
  podDate?: string;
  estimatedDeparture?: string;
  estimatedArrival?: string;
  company?: { name?: string; url?: string | null };
  currentLocation?: string;
  lastUpdated?: string;
  progress?: number | null;
  webAppUrl?: string;
  events: Array<{
    id: string;
    status: string;
    location?: string;
    timestamp?: string;
    actual: boolean;
    vessel?: string;
    voyage?: string;
    description?: string;
  }>;
  dataSource: 'database' | 'api' | 'snapshot';
}

export interface ShippingStats {
  totalShipments: number;
  totalContainers: number;
  shipmentsByStatus: Record<string, number>;
  containersByStatus: Record<string, number>;
  activeOceanContainers: number;
  yardOnHandShipments: number;
  dataSource: 'database' | 'api' | 'snapshot';
}

