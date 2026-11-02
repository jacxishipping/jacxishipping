import fs from 'fs';
import path from 'path';
import {
  VinSearchResult,
  ContainerSearchResult,
  TrackingResult,
  ShippingStats,
  CustomerSearchResult,
  DispatchSearchResult,
  QuoteEstimateResult,
} from './types';

// In-memory activity ring buffer fallback when DB is read-only or offline
const memoryLogs: Array<{
  id: string;
  feature: string;
  entityType: string | null;
  entityId: string | null;
  provider: string;
  model: string | null;
  prompt: string;
  response: string | null;
  requestPayload: unknown;
  responsePayload: unknown;
  status: string;
  createdAt: string;
}> = [];

// Web App base URL (defaults to localhost:3000)
const APP_URL = (
  process.env.JACXISHIPPING_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

// Try loading environment from project root .env
function loadRootEnv() {
  const rootEnvPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(rootEnvPath)) {
    try {
      const content = fs.readFileSync(rootEnvPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key] && val) {
            process.env[key] = val;
          }
        }
      }
    } catch {
      // Ignore env read errors
    }
  }
}

loadRootEnv();

export class JacxiDataProvider {
  private prismaInstance: any = null;
  private prismaChecked = false;
  private snapshotData: any = null;

  constructor() {
    this.initSnapshot();
  }

  /**
   * Lazily attempt to initialize Prisma Client if DATABASE_URL exists.
   */
  private async getPrisma(): Promise<any> {
    if (this.prismaChecked) {
      return this.prismaInstance;
    }
    this.prismaChecked = true;

    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.jacxi_DATABASE_URL ||
      process.env.jacxi_PRISMA_DATABASE_URL ||
      process.env.jacxi_POSTGRES_URL;

    if (!dbUrl) {
      return null;
    }

    try {
      // Dynamic import to avoid hard crash if prisma client isn't configured
      const { PrismaClient } = await import('@prisma/client');
      const client = new PrismaClient({
        datasourceUrl: dbUrl,
      });
      // Quick ping test
      await client.$queryRaw`SELECT 1`;
      this.prismaInstance = client;
      return this.prismaInstance;
    } catch (err) {
      // Database not reachable, fallback will be used
      this.prismaInstance = null;
      return null;
    }
  }

  /**
   * Loads the latest backup snapshot from backups/ directory as offline fallback.
   */
  private initSnapshot() {
    try {
      const backupsDir = path.resolve(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) return;

      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.startsWith('jacxi-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const file of files) {
        const filePath = path.join(backupsDir, file);
        try {
          const raw = fs.readFileSync(filePath, 'utf8');
          const json = JSON.parse(raw);
          if (json.data && (json.data.shipments || json.data.containers)) {
            this.snapshotData = json.data;
            break;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Snapshot load failure is non-fatal
    }
  }

  // =========================================================================
  // VIN SEARCH
  // =========================================================================

  async searchVin(
    vinQuery: string,
    includeTracking = true
  ): Promise<VinSearchResult[]> {
    const cleanVin = vinQuery.trim();
    if (!cleanVin) return [];

    // 1. Try Prisma Database
    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const shipments = await prisma.shipment.findMany({
          where: {
            OR: [
              { vehicleVIN: { contains: cleanVin, mode: 'insensitive' } },
              { lotNumber: { contains: cleanVin, mode: 'insensitive' } },
              { id: cleanVin },
            ],
          },
          include: {
            container: {
              include: {
                company: true,
                trackingEvents: { orderBy: { eventDate: 'desc' } },
              },
            },
            dispatch: {
              include: {
                company: true,
              },
            },
            transit: {
              include: {
                company: true,
              },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
            auditLogs: {
              where: {
                action: 'DISPATCH_COMPLETED',
                description: { contains: 'received to yard', mode: 'insensitive' },
              },
              take: 1,
            },
          },
          take: 10,
        });

        if (shipments && shipments.length > 0) {
          return shipments.map((s: any) => this.mapPrismaShipment(s, includeTracking));
        }
      } catch (e) {
        // Fall through to API / snapshot
      }
    }

    // 2. Try Web App API
    const apiResults = await this.queryWebApiVin(cleanVin);
    if (apiResults && apiResults.length > 0) {
      return apiResults;
    }

    // 3. Try Offline Snapshot
    return this.searchSnapshotVin(cleanVin, includeTracking);
  }

  // =========================================================================
  // CONTAINER SEARCH
  // =========================================================================

  async searchContainer(
    containerQuery: string,
    includeShipments = true
  ): Promise<ContainerSearchResult[]> {
    const cleanQuery = containerQuery.trim();
    if (!cleanQuery) return [];

    // 1. Try Prisma Database
    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const containers = await prisma.container.findMany({
          where: {
            OR: [
              { containerNumber: { contains: cleanQuery, mode: 'insensitive' } },
              { trackingNumber: { contains: cleanQuery, mode: 'insensitive' } },
              { bookingNumber: { contains: cleanQuery, mode: 'insensitive' } },
              { id: cleanQuery },
            ],
          },
          include: {
            company: true,
            trackingEvents: { orderBy: { eventDate: 'desc' } },
            shipments: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
          take: 10,
        });

        if (containers && containers.length > 0) {
          return containers.map((c: any) =>
            this.mapPrismaContainer(c, includeShipments)
          );
        }
      } catch (e) {
        // Fall through to API / snapshot
      }
    }

    // 2. Try Web App API
    const apiResults = await this.queryWebApiContainer(cleanQuery);
    if (apiResults && apiResults.length > 0) {
      return apiResults;
    }

    // 3. Try Offline Snapshot
    return this.searchSnapshotContainer(cleanQuery, includeShipments);
  }

  // =========================================================================
  // UNIVERSAL TRACKING
  // =========================================================================

  async track(trackingNumber: string): Promise<TrackingResult | null> {
    const cleanNumber = trackingNumber.trim();
    if (!cleanNumber) return null;

    // 1. Try Web App Tracking API (public endpoint /api/tracking)
    try {
      const res = await fetch(`${APP_URL}/api/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackNumber: cleanNumber }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tracking) {
          return {
            requestedNumber: cleanNumber,
            resolvedType: data.tracking.isContainerAssigned
              ? 'VIN_SHIPMENT'
              : 'CONTAINER',
            containerNumber: data.tracking.containerNumber,
            containerType: data.tracking.containerType,
            shipmentStatus: data.tracking.shipmentStatus,
            origin: data.tracking.origin,
            originDate: data.tracking.originDate,
            pol: data.tracking.pol,
            polDate: data.tracking.polDate,
            destination: data.tracking.destination,
            destinationDate: data.tracking.destinationDate,
            pod: data.tracking.pod,
            podDate: data.tracking.podDate,
            estimatedDeparture: data.tracking.estimatedDeparture,
            estimatedArrival: data.tracking.estimatedArrival,
            company: data.tracking.company,
            currentLocation: data.tracking.currentLocation,
            lastUpdated: data.tracking.lastUpdated,
            progress: data.tracking.progress,
            webAppUrl: `${APP_URL}/track?q=${encodeURIComponent(cleanNumber)}`,
            events: (data.tracking.events || []).map((e: any) => ({
              id: e.id,
              status: e.status,
              location: e.location,
              timestamp: e.timestamp,
              actual: Boolean(e.actual),
              vessel: e.vessel,
              voyage: e.voyage,
              description: e.description,
            })),
            dataSource: 'api',
          };
        }
      }
    } catch {
      // API not available
    }

    // 2. Try finding in VIN or Container search
    const vinResults = await this.searchVin(cleanNumber, true);
    if (vinResults.length > 0) {
      const v = vinResults[0];
      const vehicleDesc = [v.year, v.make, v.model].filter(Boolean).join(' ');
      return {
        requestedNumber: cleanNumber,
        resolvedType: 'VIN_SHIPMENT',
        containerNumber: v.container?.containerNumber || 'Unassigned',
        containerType: `${vehicleDesc} (VIN: ${v.vin})`,
        shipmentStatus: v.status,
        origin: v.dispatch?.origin || 'Export Port',
        pol: v.container?.loadingPort || undefined,
        polDate: v.container?.departureDate || undefined,
        destination: v.container?.destinationPort || v.transit?.destination || 'Destination Port',
        destinationDate: v.container?.estimatedArrival || undefined,
        pod: v.container?.destinationPort || undefined,
        podDate: v.container?.estimatedArrival || undefined,
        estimatedArrival: v.container?.estimatedArrival || undefined,
        company: v.container?.shippingLine ? { name: v.container.shippingLine } : undefined,
        currentLocation: v.currentLocation || v.container?.currentLocation || 'In Transit',
        progress: v.container?.progress ?? (v.status === 'DELIVERED' ? 100 : 50),
        webAppUrl: `${APP_URL}/track?q=${encodeURIComponent(cleanNumber)}`,
        events: (v.trackingEvents || []).map((e, idx) => ({
          id: `evt-${idx}`,
          status: e.status,
          location: e.location,
          timestamp: e.timestamp,
          actual: e.actual,
          description: e.description,
        })),
        dataSource: v.dataSource,
      };
    }

    const containerResults = await this.searchContainer(cleanNumber, true);
    if (containerResults.length > 0) {
      const c = containerResults[0];
      return {
        requestedNumber: cleanNumber,
        resolvedType: 'CONTAINER',
        containerNumber: c.containerNumber,
        containerType: 'Ocean Freight Container',
        shipmentStatus: c.status,
        origin: c.loadingPort || 'Export Port',
        pol: c.loadingPort || undefined,
        polDate: c.departureDate || c.loadingDate || undefined,
        destination: c.destinationPort || 'Destination Port',
        destinationDate: c.estimatedArrival || undefined,
        pod: c.destinationPort || undefined,
        podDate: c.estimatedArrival || undefined,
        estimatedArrival: c.estimatedArrival || undefined,
        company: c.shippingLine ? { name: c.shippingLine } : undefined,
        currentLocation: c.currentLocation || c.destinationPort || 'At Sea',
        progress: c.progress ?? 50,
        webAppUrl: `${APP_URL}/track?q=${encodeURIComponent(cleanNumber)}`,
        events: (c.trackingEvents || []).map((e, idx) => ({
          id: `evt-${idx}`,
          status: e.status,
          location: e.location,
          timestamp: e.timestamp,
          actual: e.actual,
          description: e.description,
        })),
        dataSource: c.dataSource,
      };
    }

    return null;
  }

  // =========================================================================
  // LIST CONTAINERS
  // =========================================================================

  async listContainers(options: {
    status?: string;
    destinationPort?: string;
    search?: string;
    limit?: number;
  }): Promise<ContainerSearchResult[]> {
    const limit = Math.min(options.limit || 20, 50);

    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const where: any = {};
        if (options.status) {
          if (options.status === 'active') {
            where.status = { in: ['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT'] };
          } else {
            where.status = options.status;
          }
        }
        if (options.destinationPort) {
          where.destinationPort = { contains: options.destinationPort, mode: 'insensitive' };
        }
        if (options.search) {
          where.OR = [
            { containerNumber: { contains: options.search, mode: 'insensitive' } },
            { bookingNumber: { contains: options.search, mode: 'insensitive' } },
            { vesselName: { contains: options.search, mode: 'insensitive' } },
          ];
        }

        const containers = await prisma.container.findMany({
          where,
          include: {
            company: true,
            trackingEvents: { orderBy: { eventDate: 'desc' } },
            shipments: {
              include: { user: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        if (containers.length > 0) {
          return containers.map((c: any) => this.mapPrismaContainer(c, true));
        }
      } catch {
        // Fallback
      }
    }

    // Snapshot fallback
    if (this.snapshotData?.containers) {
      let list = [...this.snapshotData.containers];
      if (options.status) {
        if (options.status === 'active') {
          list = list.filter((c) =>
            ['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT'].includes(c.status)
          );
        } else {
          list = list.filter((c) => c.status === options.status);
        }
      }
      if (options.destinationPort) {
        const dp = options.destinationPort.toLowerCase();
        list = list.filter((c) => (c.destinationPort || '').toLowerCase().includes(dp));
      }
      if (options.search) {
        const q = options.search.toLowerCase();
        list = list.filter(
          (c) =>
            (c.containerNumber || '').toLowerCase().includes(q) ||
            (c.bookingNumber || '').toLowerCase().includes(q) ||
            (c.vesselName || '').toLowerCase().includes(q)
        );
      }

      return list.slice(0, limit).map((c) => this.mapSnapshotContainer(c, true));
    }

    return [];
  }

  // =========================================================================
  // LIST SHIPMENTS
  // =========================================================================

  async listShipments(options: {
    status?: string;
    search?: string;
    containerNumber?: string;
    limit?: number;
  }): Promise<VinSearchResult[]> {
    const limit = Math.min(options.limit || 20, 50);

    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const where: any = {};
        if (options.status) {
          where.status = options.status;
        }
        if (options.containerNumber) {
          where.container = {
            containerNumber: { contains: options.containerNumber, mode: 'insensitive' },
          };
        }
        if (options.search) {
          const q = options.search;
          where.OR = [
            { vehicleVIN: { contains: q, mode: 'insensitive' } },
            { vehicleMake: { contains: q, mode: 'insensitive' } },
            { vehicleModel: { contains: q, mode: 'insensitive' } },
            { lotNumber: { contains: q, mode: 'insensitive' } },
          ];
        }

        const shipments = await prisma.shipment.findMany({
          where,
          include: {
            container: true,
            dispatch: { include: { company: true } },
            transit: { include: { company: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        if (shipments.length > 0) {
          return shipments.map((s: any) => this.mapPrismaShipment(s, false));
        }
      } catch {
        // Fallback
      }
    }

    // Snapshot fallback
    if (this.snapshotData?.shipments) {
      let list = [...this.snapshotData.shipments];
      if (options.status) {
        list = list.filter((s) => s.status === options.status);
      }
      if (options.search) {
        const q = options.search.toLowerCase();
        list = list.filter(
          (s) =>
            (s.vehicleVIN || '').toLowerCase().includes(q) ||
            (s.vehicleMake || '').toLowerCase().includes(q) ||
            (s.vehicleModel || '').toLowerCase().includes(q) ||
            (s.lotNumber || '').toLowerCase().includes(q)
        );
      }
      if (options.containerNumber) {
        const cNum = options.containerNumber.toLowerCase();
        const matchedContainers = (this.snapshotData.containers || []).filter(
          (c: any) => (c.containerNumber || '').toLowerCase().includes(cNum)
        );
        const containerIds = new Set(matchedContainers.map((c: any) => c.id));
        list = list.filter((s) => s.containerId && containerIds.has(s.containerId));
      }

      return list.slice(0, limit).map((s) => this.mapSnapshotShipment(s, false));
    }

    return [];
  }

  // =========================================================================
  // OVERVIEW STATS
  // =========================================================================

  async getStats(): Promise<ShippingStats> {
    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const [shipmentsCount, containersCount, shipmentsByStatusRaw, containersByStatusRaw] =
          await Promise.all([
            prisma.shipment.count(),
            prisma.container.count(),
            prisma.shipment.groupBy({
              by: ['status'],
              _count: { status: true },
            }),
            prisma.container.groupBy({
              by: ['status'],
              _count: { status: true },
            }),
          ]);

        const shipmentsByStatus: Record<string, number> = {};
        for (const item of shipmentsByStatusRaw) {
          shipmentsByStatus[item.status] = item._count.status;
        }

        const containersByStatus: Record<string, number> = {};
        for (const item of containersByStatusRaw) {
          containersByStatus[item.status] = item._count.status;
        }

        return {
          totalShipments: shipmentsCount,
          totalContainers: containersCount,
          shipmentsByStatus,
          containersByStatus,
          activeOceanContainers:
            (containersByStatus['IN_TRANSIT'] || 0) +
            (containersByStatus['LOADED'] || 0),
          yardOnHandShipments: shipmentsByStatus['ON_HAND'] || 0,
          dataSource: 'database',
        };
      } catch {
        // Fallback
      }
    }

    // Snapshot stats
    if (this.snapshotData) {
      const shipments = this.snapshotData.shipments || [];
      const containers = this.snapshotData.containers || [];

      const shipmentsByStatus: Record<string, number> = {};
      for (const s of shipments) {
        shipmentsByStatus[s.status] = (shipmentsByStatus[s.status] || 0) + 1;
      }

      const containersByStatus: Record<string, number> = {};
      for (const c of containers) {
        containersByStatus[c.status] = (containersByStatus[c.status] || 0) + 1;
      }

      return {
        totalShipments: shipments.length,
        totalContainers: containers.length,
        shipmentsByStatus,
        containersByStatus,
        activeOceanContainers:
          (containersByStatus['IN_TRANSIT'] || 0) +
          (containersByStatus['LOADED'] || 0),
        yardOnHandShipments: shipmentsByStatus['ON_HAND'] || 0,
        dataSource: 'snapshot',
      };
    }

    return {
      totalShipments: 0,
      totalContainers: 0,
      shipmentsByStatus: {},
      containersByStatus: {},
      activeOceanContainers: 0,
      yardOnHandShipments: 0,
      dataSource: 'snapshot',
    };
  }

  // =========================================================================
  // INTERNAL MAPPERS & FALLBACKS
  // =========================================================================

  private mapPrismaShipment(s: any, includeTracking: boolean): VinSearchResult {
    const events = (s.container?.trackingEvents || []).map((e: any) => ({
      timestamp: e.eventDate ? new Date(e.eventDate).toISOString() : undefined,
      status: e.status,
      location: e.location || s.container?.currentLocation || undefined,
      description: e.description || undefined,
      actual: Boolean(e.completed),
    }));

    return {
      id: s.id,
      vin: s.vehicleVIN || 'N/A',
      year: s.vehicleYear,
      make: s.vehicleMake,
      model: s.vehicleModel,
      color: s.vehicleColor,
      vehicleType: s.vehicleType,
      lotNumber: s.lotNumber,
      auctionName: s.auctionName,
      hasKey: s.hasKey,
      hasTitle: s.hasTitle,
      titleStatus: s.titleStatus,
      status: s.status,
      currentLocation: s.container?.currentLocation || s.dispatch?.origin || null,
      customer: s.user ? { id: s.user.id, name: s.user.name, email: s.user.email } : undefined,
      container: s.container
        ? {
            id: s.container.id,
            containerNumber: s.container.containerNumber,
            bookingNumber: s.container.bookingNumber,
            shippingLine: s.container.shippingLine || s.container.company?.name,
            vesselName: s.container.vesselName,
            voyageNumber: s.container.voyageNumber,
            loadingPort: s.container.loadingPort,
            destinationPort: s.container.destinationPort,
            loadingDate: s.container.loadingDate ? new Date(s.container.loadingDate).toISOString() : null,
            departureDate: s.container.departureDate ? new Date(s.container.departureDate).toISOString() : null,
            estimatedArrival: s.container.estimatedArrival ? new Date(s.container.estimatedArrival).toISOString() : null,
            actualArrival: s.container.actualArrival ? new Date(s.container.actualArrival).toISOString() : null,
            status: s.container.status,
            currentLocation: s.container.currentLocation,
            progress: s.container.progress,
          }
        : null,
      dispatch: s.dispatch
        ? {
            id: s.dispatch.id,
            referenceNumber: s.dispatch.referenceNumber,
            origin: s.dispatch.origin,
            destination: s.dispatch.destination,
            carrier: s.dispatch.company?.name,
            status: s.dispatch.status,
            dispatchDate: s.dispatch.dispatchDate ? new Date(s.dispatch.dispatchDate).toISOString() : null,
          }
        : null,
      transit: s.transit
        ? {
            id: s.transit.id,
            referenceNumber: s.transit.referenceNumber,
            origin: s.transit.origin,
            destination: s.transit.destination,
            carrier: s.transit.company?.name,
            status: s.transit.status,
            dispatchDate: s.transit.dispatchDate ? new Date(s.transit.dispatchDate).toISOString() : null,
            actualDelivery: s.transit.actualDelivery ? new Date(s.transit.actualDelivery).toISOString() : null,
          }
        : null,
      photos: {
        vehiclePhotosCount: Array.isArray(s.vehiclePhotos) ? s.vehiclePhotos.length : 0,
        arrivalPhotosCount: Array.isArray(s.arrivalPhotos) ? s.arrivalPhotos.length : 0,
        previewUrl: Array.isArray(s.vehiclePhotos) && s.vehiclePhotos[0] ? s.vehiclePhotos[0] : null,
      },
      financials: {
        price: s.price,
        purchasePrice: s.purchasePrice,
        paymentStatus: s.paymentStatus,
      },
      createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : undefined,
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : undefined,
      webAppUrl: `${APP_URL}/dashboard/shipments/${s.id}`,
      trackingEvents: includeTracking ? events : undefined,
      dataSource: 'database',
    };
  }

  private mapPrismaContainer(c: any, includeShipments: boolean): ContainerSearchResult {
    const shipments = (c.shipments || []).map((s: any) => ({
      id: s.id,
      vin: s.vehicleVIN,
      vehicle: [s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Vehicle',
      lotNumber: s.lotNumber,
      status: s.status,
      customerName: s.user?.name || null,
    }));

    const events = (c.trackingEvents || []).map((e: any) => ({
      timestamp: e.eventDate ? new Date(e.eventDate).toISOString() : undefined,
      status: e.status,
      location: e.location || c.currentLocation || undefined,
      description: e.description || undefined,
      actual: Boolean(e.completed),
    }));

    return {
      id: c.id,
      containerNumber: c.containerNumber,
      bookingNumber: c.bookingNumber,
      trackingNumber: c.trackingNumber,
      shippingLine: c.shippingLine || c.company?.name,
      vesselName: c.vesselName,
      voyageNumber: c.voyageNumber,
      status: c.status,
      loadingPort: c.loadingPort,
      destinationPort: c.destinationPort,
      transshipmentPorts: c.transshipmentPorts || [],
      loadingDate: c.loadingDate ? new Date(c.loadingDate).toISOString() : null,
      departureDate: c.departureDate ? new Date(c.departureDate).toISOString() : null,
      estimatedArrival: c.estimatedArrival ? new Date(c.estimatedArrival).toISOString() : null,
      actualArrival: c.actualArrival ? new Date(c.actualArrival).toISOString() : null,
      currentLocation: c.currentLocation,
      progress: c.progress,
      maxCapacity: c.maxCapacity,
      shipmentCount: shipments.length,
      shipments: includeShipments ? shipments : [],
      webAppUrl: `${APP_URL}/dashboard/containers/${c.id}`,
      trackingEvents: events,
      dataSource: 'database',
    };
  }

  private async queryWebApiVin(vin: string): Promise<VinSearchResult[]> {
    try {
      const res = await fetch(`${APP_URL}/api/search?q=${encodeURIComponent(vin)}&type=shipments`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.shipments || !Array.isArray(data.shipments)) return [];

      return data.shipments.map((s: any) => ({
        id: s.id,
        vin: s.vehicleVIN || 'N/A',
        year: s.vehicleYear,
        make: s.vehicleMake,
        model: s.vehicleModel,
        color: s.vehicleColor,
        vehicleType: s.vehicleType,
        lotNumber: s.lotNumber,
        auctionName: s.auctionName,
        status: s.status,
        customer: s.user ? { name: s.user.name, email: s.user.email } : undefined,
        container: s.container
          ? {
              id: s.container.id,
              containerNumber: s.container.containerNumber,
              shippingLine: s.container.shippingLine,
              loadingPort: s.container.loadingPort,
              destinationPort: s.container.destinationPort,
              status: s.container.status,
              estimatedArrival: s.container.estimatedArrival,
              progress: s.container.progress,
            }
          : null,
        webAppUrl: `${APP_URL}/dashboard/shipments/${s.id}`,
        dataSource: 'api' as const,
      }));
    } catch {
      return [];
    }
  }

  private async queryWebApiContainer(query: string): Promise<ContainerSearchResult[]> {
    try {
      const res = await fetch(`${APP_URL}/api/containers?search=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.containers || (Array.isArray(data) ? data : []);

      return list.map((c: any) => ({
        id: c.id,
        containerNumber: c.containerNumber,
        bookingNumber: c.bookingNumber,
        shippingLine: c.shippingLine,
        vesselName: c.vesselName,
        voyageNumber: c.voyageNumber,
        status: c.status,
        loadingPort: c.loadingPort,
        destinationPort: c.destinationPort,
        loadingDate: c.loadingDate,
        departureDate: c.departureDate,
        estimatedArrival: c.estimatedArrival,
        shipmentCount: c.currentCount || (c.shipments ? c.shipments.length : 0),
        shipments: (c.shipments || []).map((s: any) => ({
          id: s.id,
          vin: s.vehicleVIN,
          vehicle: `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim(),
          lotNumber: s.lotNumber,
          status: s.status,
        })),
        webAppUrl: `${APP_URL}/dashboard/containers/${c.id}`,
        dataSource: 'api' as const,
      }));
    } catch {
      return [];
    }
  }

  private searchSnapshotVin(vinQuery: string, includeTracking: boolean): VinSearchResult[] {
    if (!this.snapshotData?.shipments) return [];
    const q = vinQuery.toLowerCase();

    const matches = this.snapshotData.shipments.filter((s: any) => {
      const vin = (s.vehicleVIN || '').toLowerCase();
      const lot = (s.lotNumber || '').toLowerCase();
      const id = (s.id || '').toLowerCase();
      return vin.includes(q) || lot.includes(q) || id === q;
    });

    return matches.slice(0, 10).map((s: any) => this.mapSnapshotShipment(s, includeTracking));
  }

  private searchSnapshotContainer(query: string, includeShipments: boolean): ContainerSearchResult[] {
    if (!this.snapshotData?.containers) return [];
    const q = query.toLowerCase();

    const matches = this.snapshotData.containers.filter((c: any) => {
      const num = (c.containerNumber || '').toLowerCase();
      const booking = (c.bookingNumber || '').toLowerCase();
      const tracking = (c.trackingNumber || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      return num.includes(q) || booking.includes(q) || tracking.includes(q) || id === q;
    });

    return matches.slice(0, 10).map((c: any) => this.mapSnapshotContainer(c, includeShipments));
  }

  private mapSnapshotShipment(s: any, includeTracking: boolean): VinSearchResult {
    const container = s.containerId && this.snapshotData.containers
      ? this.snapshotData.containers.find((c: any) => c.id === s.containerId)
      : null;

    const dispatch = s.dispatchId && this.snapshotData.dispatches
      ? this.snapshotData.dispatches.find((d: any) => d.id === s.dispatchId)
      : null;

    const transit = s.transitId && this.snapshotData.transits
      ? this.snapshotData.transits.find((t: any) => t.id === s.transitId)
      : null;

    const user = s.userId && this.snapshotData.users
      ? this.snapshotData.users.find((u: any) => u.id === s.userId)
      : null;

    const carrierCompany = dispatch?.companyId && this.snapshotData.companies
      ? this.snapshotData.companies.find((co: any) => co.id === dispatch.companyId)
      : null;

    const events: Array<{
      timestamp?: string;
      status: string;
      location?: string;
      description?: string;
      actual: boolean;
    }> = [];

    if (s.createdAt) {
      events.push({
        timestamp: s.createdAt,
        status: 'Shipment Created',
        location: s.purchaseLocation || 'USA Hub',
        description: `Shipment booked for ${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`,
        actual: true,
      });
    }

    if (dispatch?.dispatchDate) {
      events.push({
        timestamp: dispatch.dispatchDate,
        status: 'Inland Transport Dispatched',
        location: dispatch.origin,
        description: `Dispatched with carrier ${carrierCompany?.name || 'Inland Towing'}`,
        actual: true,
      });
    }

    if (container?.loadingDate) {
      events.push({
        timestamp: container.loadingDate,
        status: 'Container Loaded',
        location: container.loadingPort,
        description: `Loaded into container ${container.containerNumber}`,
        actual: true,
      });
    }

    if (container?.departureDate) {
      events.push({
        timestamp: container.departureDate,
        status: 'Vessel Departed',
        location: container.loadingPort,
        description: `Departed aboard ${container.vesselName || 'Ocean Vessel'}`,
        actual: true,
      });
    }

    if (container?.estimatedArrival) {
      events.push({
        timestamp: container.estimatedArrival,
        status: container.actualArrival ? 'Vessel Arrived' : 'Estimated Arrival',
        location: container.destinationPort,
        description: `Destination port: ${container.destinationPort}`,
        actual: Boolean(container.actualArrival),
      });
    }

    return {
      id: s.id,
      vin: s.vehicleVIN || 'N/A',
      year: s.vehicleYear,
      make: s.vehicleMake,
      model: s.vehicleModel,
      color: s.vehicleColor,
      vehicleType: s.vehicleType,
      lotNumber: s.lotNumber,
      auctionName: s.auctionName,
      hasKey: s.hasKey,
      hasTitle: s.hasTitle,
      titleStatus: s.titleStatus,
      status: s.status,
      currentLocation: container?.currentLocation || dispatch?.origin || null,
      customer: user ? { id: user.id, name: user.name, email: user.email } : undefined,
      container: container
        ? {
            id: container.id,
            containerNumber: container.containerNumber,
            bookingNumber: container.bookingNumber,
            shippingLine: container.shippingLine,
            vesselName: container.vesselName,
            voyageNumber: container.voyageNumber,
            loadingPort: container.loadingPort,
            destinationPort: container.destinationPort,
            loadingDate: container.loadingDate,
            departureDate: container.departureDate,
            estimatedArrival: container.estimatedArrival,
            actualArrival: container.actualArrival,
            status: container.status,
            currentLocation: container.currentLocation,
            progress: container.progress,
          }
        : null,
      dispatch: dispatch
        ? {
            id: dispatch.id,
            referenceNumber: dispatch.referenceNumber,
            origin: dispatch.origin,
            destination: dispatch.destination,
            carrier: carrierCompany?.name,
            status: dispatch.status,
            dispatchDate: dispatch.dispatchDate,
          }
        : null,
      transit: transit
        ? {
            id: transit.id,
            referenceNumber: transit.referenceNumber,
            origin: transit.origin,
            destination: transit.destination,
            status: transit.status,
            dispatchDate: transit.dispatchDate,
            actualDelivery: transit.actualDelivery,
          }
        : null,
      photos: {
        vehiclePhotosCount: Array.isArray(s.vehiclePhotos) ? s.vehiclePhotos.length : 0,
        arrivalPhotosCount: Array.isArray(s.arrivalPhotos) ? s.arrivalPhotos.length : 0,
        previewUrl: Array.isArray(s.vehiclePhotos) && s.vehiclePhotos[0] ? s.vehiclePhotos[0] : null,
      },
      financials: {
        price: s.price,
        purchasePrice: s.purchasePrice,
        paymentStatus: s.paymentStatus,
      },
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      webAppUrl: `${APP_URL}/dashboard/shipments/${s.id}`,
      trackingEvents: includeTracking ? events : undefined,
      dataSource: 'snapshot',
    };
  }

  private mapSnapshotContainer(c: any, includeShipments: boolean): ContainerSearchResult {
    const loadedShipments = (this.snapshotData?.shipments || [])
      .filter((s: any) => s.containerId === c.id)
      .map((s: any) => {
        const user = s.userId && this.snapshotData.users
          ? this.snapshotData.users.find((u: any) => u.id === s.userId)
          : null;
        return {
          id: s.id,
          vin: s.vehicleVIN,
          vehicle: `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || 'Vehicle',
          lotNumber: s.lotNumber,
          status: s.status,
          customerName: user?.name || null,
        };
      });

    return {
      id: c.id,
      containerNumber: c.containerNumber,
      bookingNumber: c.bookingNumber,
      trackingNumber: c.trackingNumber,
      shippingLine: c.shippingLine,
      vesselName: c.vesselName,
      voyageNumber: c.voyageNumber,
      status: c.status,
      loadingPort: c.loadingPort,
      destinationPort: c.destinationPort,
      transshipmentPorts: c.transshipmentPorts || [],
      loadingDate: c.loadingDate,
      departureDate: c.departureDate,
      estimatedArrival: c.estimatedArrival,
      actualArrival: c.actualArrival,
      currentLocation: c.currentLocation,
      progress: c.progress,
      maxCapacity: c.maxCapacity,
      shipmentCount: loadedShipments.length,
      shipments: includeShipments ? loadedShipments : [],
      webAppUrl: `${APP_URL}/dashboard/containers/${c.id}`,
      dataSource: 'snapshot',
    };
  }

  // =========================================================================
  // CUSTOMER SEARCH
  // =========================================================================

  async searchCustomers(query: string, limit = 10): Promise<CustomerSearchResult[]> {
    const clean = query.trim();
    const prisma = await this.getPrisma();

    if (prisma) {
      try {
        const where: any = clean
          ? {
              OR: [
                { name: { contains: clean, mode: 'insensitive' } },
                { email: { contains: clean, mode: 'insensitive' } },
                { phone: { contains: clean, mode: 'insensitive' } },
                { loginCode: { contains: clean, mode: 'insensitive' } },
                { id: clean },
              ],
            }
          : {};

        const users = await prisma.user.findMany({
          where,
          include: {
            shipments: {
              include: { container: { select: { containerNumber: true } } },
              take: 15,
            },
          },
          take: Math.min(limit, 30),
        });

        if (users.length > 0) {
          return users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            city: u.city,
            country: u.country,
            loginCode: u.loginCode || null,
            role: u.role,
            shipmentCount: (u.shipments || []).length,
            shipments: (u.shipments || []).map((s: any) => ({
              id: s.id,
              vin: s.vehicleVIN || null,
              vehicle: [s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Vehicle',
              status: s.status,
              containerNumber: s.container?.containerNumber || null,
            })),
            dataSource: 'database' as const,
          }));
        }
      } catch {
        // Fallback
      }
    }

    // Snapshot fallback
    if (this.snapshotData?.users) {
      const q = clean.toLowerCase();
      const matched = this.snapshotData.users.filter((u: any) => {
        if (!q) return true;
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q) ||
          (u.loginCode || '').toLowerCase().includes(q) ||
          u.id === clean
        );
      });

      return matched.slice(0, limit).map((u: any) => {
        const userShipments = (this.snapshotData.shipments || []).filter(
          (s: any) => s.userId === u.id
        );
        return {
          id: u.id,
          name: u.name || null,
          email: u.email,
          phone: u.phone || null,
          city: u.city || null,
          country: u.country || null,
          loginCode: u.loginCode || null,
          role: u.role || 'user',
          shipmentCount: userShipments.length,
          shipments: userShipments.slice(0, 15).map((s: any) => {
            const c = s.containerId
              ? (this.snapshotData.containers || []).find((x: any) => x.id === s.containerId)
              : null;
            return {
              id: s.id,
              vin: s.vehicleVIN || null,
              vehicle: `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || 'Vehicle',
              status: s.status,
              containerNumber: c?.containerNumber || null,
            };
          }),
          dataSource: 'snapshot' as const,
        };
      });
    }

    return [];
  }

  // =========================================================================
  // LIST DISPATCHES (INLAND TOWING)
  // =========================================================================

  async listDispatches(options: {
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<DispatchSearchResult[]> {
    const limit = Math.min(options.limit || 15, 50);
    const prisma = await this.getPrisma();

    if (prisma) {
      try {
        const where: any = {};
        if (options.status) where.status = options.status;
        if (options.search) {
          const q = options.search;
          where.OR = [
            { referenceNumber: { contains: q, mode: 'insensitive' } },
            { origin: { contains: q, mode: 'insensitive' } },
            { destination: { contains: q, mode: 'insensitive' } },
          ];
        }

        const dispatches = await prisma.dispatch.findMany({
          where,
          include: {
            company: true,
            shipments: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });

        if (dispatches.length > 0) {
          return dispatches.map((d: any) => ({
            id: d.id,
            referenceNumber: d.referenceNumber,
            status: d.status,
            origin: d.origin,
            destination: d.destination,
            carrierName: d.company?.name || null,
            dispatchDate: d.dispatchDate ? new Date(d.dispatchDate).toISOString() : null,
            estimatedArrival: d.estimatedArrival ? new Date(d.estimatedArrival).toISOString() : null,
            shipmentCount: (d.shipments || []).length,
            vehicles: (d.shipments || []).map((s: any) => ({
              id: s.id,
              vin: s.vehicleVIN || null,
              vehicle: [s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Vehicle',
              lotNumber: s.lotNumber || null,
              status: s.status,
            })),
            dataSource: 'database' as const,
          }));
        }
      } catch {
        // Fallback
      }
    }

    // Snapshot fallback
    if (this.snapshotData?.dispatches) {
      let list = [...this.snapshotData.dispatches];
      if (options.status) {
        list = list.filter((d) => d.status === options.status);
      }
      if (options.search) {
        const q = options.search.toLowerCase();
        list = list.filter(
          (d) =>
            (d.referenceNumber || '').toLowerCase().includes(q) ||
            (d.origin || '').toLowerCase().includes(q) ||
            (d.destination || '').toLowerCase().includes(q)
        );
      }

      return list.slice(0, limit).map((d: any) => {
        const company = d.companyId
          ? (this.snapshotData.companies || []).find((c: any) => c.id === d.companyId)
          : null;
        const vehicles = (this.snapshotData.shipments || []).filter(
          (s: any) => s.dispatchId === d.id
        );

        return {
          id: d.id,
          referenceNumber: d.referenceNumber || d.id,
          status: d.status || 'PENDING',
          origin: d.origin || 'Auction Yard',
          destination: d.destination || 'Export Port',
          carrierName: company?.name || null,
          dispatchDate: d.dispatchDate || null,
          estimatedArrival: d.estimatedArrival || null,
          shipmentCount: vehicles.length,
          vehicles: vehicles.map((s: any) => ({
            id: s.id,
            vin: s.vehicleVIN || null,
            vehicle: `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || 'Vehicle',
            lotNumber: s.lotNumber || null,
            status: s.status,
          })),
          dataSource: 'snapshot' as const,
        };
      });
    }

    return [];
  }

  // =========================================================================
  // CALCULATE SHIPPING QUOTE ESTIMATE
  // =========================================================================

  calculateQuote(options: {
    vehicleType?: string;
    originPort?: string;
    destination?: string;
  }): QuoteEstimateResult {
    const vType = (options.vehicleType || 'sedan').toLowerCase();
    const origin = options.originPort || 'Savannah, GA / Houston, TX';
    const dest = options.destination || 'Mersin -> Islam Qala / Herat';

    const isSuvOrTruck =
      vType.includes('suv') ||
      vType.includes('truck') ||
      vType.includes('pickup') ||
      vType.includes('van');

    const oceanFreightUsd = isSuvOrTruck ? 1650 : 1350;
    const inlandTowingEstimateUsd = 450;
    const isAfghanistan =
      dest.toLowerCase().includes('islam qala') ||
      dest.toLowerCase().includes('herat') ||
      dest.toLowerCase().includes('kabul') ||
      dest.toLowerCase().includes('afg');

    const customsAndTransitUsd = isAfghanistan ? 950 : 350;
    const totalEstimatedUsd =
      oceanFreightUsd + inlandTowingEstimateUsd + customsAndTransitUsd;

    return {
      vehicleType: options.vehicleType || 'Standard Sedan',
      originPort: origin,
      destination: dest,
      oceanFreightUsd,
      inlandTowingEstimateUsd,
      customsAndTransitUsd,
      totalEstimatedUsd,
      estimatedTransitDays: isAfghanistan ? '42 - 55 days' : '28 - 38 days',
      notes: [
        'Includes export customs clearance, container loading, and bracing at US port terminal.',
        isAfghanistan
          ? 'Includes Mersin port handling and overland transit corridor to Islam Qala / Herat.'
          : 'Port-to-port ocean container freight rate (4-car consolidation basis).',
        'Exact inland towing rate varies by Copart / IAAI auction sublot distance.',
      ],
    };
  }

  // =========================================================================
  // MCP GATEWAY SETTINGS & ACTIVITY LOGGING
  // =========================================================================

  async getMcpGatewaySettings(): Promise<{
    enabled: boolean;
    apiKey: string;
    authMode: 'required' | 'optional';
    dataSource: 'database' | 'snapshot';
  }> {
    const defaultKey =
      process.env.MCP_API_KEY ||
      process.env.JACXI_API_KEY ||
      'jx_mcp_e123d9017e0693f76939ee0b6bb2ea7f8f5d920d348f9f42';

    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const record = await prisma.aiProviderSettings.findUnique({
          where: { scope: 'mcp-gateway' },
        });
        if (record) {
          return {
            enabled: record.enabled,
            apiKey: record.apiKey || defaultKey,
            authMode: record.provider === 'optional' ? 'optional' : 'required',
            dataSource: 'database',
          };
        }
      } catch {
        // Fallback
      }
    }

    return {
      enabled: true,
      apiKey: defaultKey,
      authMode: 'required',
      dataSource: prisma ? 'database' : 'snapshot',
    };
  }

  async saveMcpGatewaySettings(input: {
    enabled?: boolean;
    apiKey?: string;
    authMode?: 'required' | 'optional';
  }) {
    const current = await this.getMcpGatewaySettings();
    const updated = {
      enabled: input.enabled !== undefined ? input.enabled : current.enabled,
      apiKey: input.apiKey ? input.apiKey.trim() : current.apiKey,
      authMode: input.authMode || current.authMode,
    };

    // Update process.env in memory for immediate effect
    process.env.MCP_API_KEY = updated.apiKey;

    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        await prisma.aiProviderSettings.upsert({
          where: { scope: 'mcp-gateway' },
          update: {
            enabled: updated.enabled,
            apiKey: updated.apiKey,
            provider: updated.authMode,
          },
          create: {
            scope: 'mcp-gateway',
            enabled: updated.enabled,
            apiKey: updated.apiKey,
            provider: updated.authMode,
            model: 'mcp-v1',
          },
        });
      } catch {
        // Ignore if DB is read-only
      }
    }

    return updated;
  }

  async logMcpActivity(entry: {
    tool: string;
    query: string;
    provider?: string;
    entityType?: string;
    entityId?: string;
    status?: 'SUCCESS' | 'ERROR';
    responseSummary?: string;
    requestPayload?: any;
    responsePayload?: any;
  }) {
    const logItem = {
      id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      feature: `mcp-${entry.tool.replace(/_/g, '-')}`,
      entityType: entry.entityType || 'MCP_TOOL',
      entityId: entry.entityId || entry.query || null,
      provider: entry.provider || 'mcp-gateway',
      model: entry.tool,
      prompt: entry.query || entry.tool,
      response: entry.responseSummary || 'Completed',
      requestPayload: entry.requestPayload || {},
      responsePayload: entry.responsePayload || {},
      status: entry.status || 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    memoryLogs.unshift(logItem);
    if (memoryLogs.length > 50) memoryLogs.pop();

    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        await prisma.aiInteractionLog.create({
          data: {
            feature: logItem.feature,
            entityType: logItem.entityType,
            entityId: logItem.entityId,
            provider: logItem.provider,
            model: logItem.model,
            prompt: logItem.prompt,
            response: logItem.response,
            requestPayload: logItem.requestPayload,
            responsePayload: logItem.responsePayload,
            status: logItem.status,
          },
        });
      } catch {
        // Non-fatal
      }
    }
  }

  async getRecentMcpLogs(limit = 25) {
    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const dbLogs = await prisma.aiInteractionLog.findMany({
          where: {
            OR: [
              { feature: { startsWith: 'mcp-' } },
              { provider: { contains: 'mcp' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        });
        if (dbLogs.length > 0) {
          return dbLogs;
        }
      } catch {
        // Fallback to memory logs
      }
    }
    return memoryLogs.slice(0, limit);
  }
}

