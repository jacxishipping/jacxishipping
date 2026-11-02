import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import {
  VinSearchResult,
  ContainerSearchResult,
  TrackingResult,
  ShippingStats,
  CustomerSearchResult,
  DispatchSearchResult,
  QuoteEstimateResult,
  TransitSearchResult,
  CustomerLedgerResult,
  InvoiceSearchResult,
  DocumentSearchResult,
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
    googleOAuthEnabled: boolean;
    googleClientId: string;
    googleClientSecret: string;
    allowedGoogleDomains: string;
    requireExistingUser: boolean;
  }> {
    const defaultKey =
      process.env.MCP_API_KEY ||
      process.env.JACXI_API_KEY ||
      'jx_mcp_e123d9017e0693f76939ee0b6bb2ea7f8f5d920d348f9f42';
    const envGoogleClientId = process.env.GOOGLE_CLIENT_ID || '';
    const envGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const record = await prisma.aiProviderSettings.findUnique({
          where: { scope: 'mcp-gateway' },
        });
        if (record) {
          let extra: {
            googleOAuthEnabled?: boolean;
            googleClientId?: string;
            googleClientSecret?: string;
            allowedGoogleDomains?: string;
            requireExistingUser?: boolean;
          } = {};
          if (record.chatCompletionsUrl && record.chatCompletionsUrl.startsWith('{')) {
            try {
              extra = JSON.parse(record.chatCompletionsUrl);
            } catch {
              // ignore
            }
          }
          return {
            enabled: record.enabled,
            apiKey: record.apiKey || defaultKey,
            authMode: record.provider === 'optional' ? 'optional' : 'required',
            dataSource: 'database',
            googleOAuthEnabled:
              extra.googleOAuthEnabled !== undefined
                ? extra.googleOAuthEnabled
                : true,
            googleClientId: extra.googleClientId || envGoogleClientId,
            googleClientSecret:
              extra.googleClientSecret || envGoogleClientSecret,
            allowedGoogleDomains: extra.allowedGoogleDomains || '*',
            requireExistingUser: Boolean(extra.requireExistingUser),
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
      googleOAuthEnabled: true,
      googleClientId: envGoogleClientId,
      googleClientSecret: envGoogleClientSecret,
      allowedGoogleDomains: '*',
      requireExistingUser: false,
    };
  }

  async saveMcpGatewaySettings(input: {
    enabled?: boolean;
    apiKey?: string;
    authMode?: 'required' | 'optional';
    googleOAuthEnabled?: boolean;
    googleClientId?: string;
    googleClientSecret?: string;
    allowedGoogleDomains?: string;
    requireExistingUser?: boolean;
  }) {
    const current = await this.getMcpGatewaySettings();
    const updated = {
      enabled: input.enabled !== undefined ? input.enabled : current.enabled,
      apiKey: input.apiKey ? input.apiKey.trim() : current.apiKey,
      authMode: input.authMode || current.authMode,
      googleOAuthEnabled:
        input.googleOAuthEnabled !== undefined
          ? input.googleOAuthEnabled
          : current.googleOAuthEnabled,
      googleClientId:
        input.googleClientId !== undefined
          ? input.googleClientId.trim()
          : current.googleClientId,
      googleClientSecret:
        input.googleClientSecret !== undefined
          ? input.googleClientSecret.trim()
          : current.googleClientSecret,
      allowedGoogleDomains:
        input.allowedGoogleDomains !== undefined
          ? input.allowedGoogleDomains.trim() || '*'
          : current.allowedGoogleDomains,
      requireExistingUser:
        input.requireExistingUser !== undefined
          ? input.requireExistingUser
          : current.requireExistingUser,
    };

    // Update process.env in memory for immediate effect
    process.env.MCP_API_KEY = updated.apiKey;
    if (updated.googleClientId) {
      process.env.GOOGLE_CLIENT_ID = updated.googleClientId;
    }
    if (updated.googleClientSecret) {
      process.env.GOOGLE_CLIENT_SECRET = updated.googleClientSecret;
    }

    const extraJson = JSON.stringify({
      googleOAuthEnabled: updated.googleOAuthEnabled,
      googleClientId: updated.googleClientId,
      googleClientSecret: updated.googleClientSecret,
      allowedGoogleDomains: updated.allowedGoogleDomains,
      requireExistingUser: updated.requireExistingUser,
    });

    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        await prisma.aiProviderSettings.upsert({
          where: { scope: 'mcp-gateway' },
          update: {
            enabled: updated.enabled,
            apiKey: updated.apiKey,
            provider: updated.authMode,
            chatCompletionsUrl: extraJson,
          },
          create: {
            scope: 'mcp-gateway',
            enabled: updated.enabled,
            apiKey: updated.apiKey,
            provider: updated.authMode,
            model: 'mcp-v1',
            chatCompletionsUrl: extraJson,
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

  // =========================================================================
  // 1. WRITE / MUTATION TOOLS (SHIPMENTS, CONTAINERS, DISPATCHES, TRANSITS, CUSTOMERS)
  // =========================================================================

  async createShipment(input: {
    vehicleVIN: string;
    vehicleYear?: number;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    vehicleType?: string;
    lotNumber?: string;
    auctionName?: string;
    customerQuery?: string;
    price?: number;
    purchasePrice?: number;
    serviceType?: 'SHIPPING_ONLY' | 'PURCHASE_AND_SHIPPING';
    hasKey?: boolean;
    hasTitle?: boolean;
    status?: string;
    containerNumber?: string;
  }) {
    const prisma = await this.getPrisma();
    if (!prisma) {
      throw new Error('Database connection required to create a shipment.');
    }

    const cleanVin = input.vehicleVIN.trim().toUpperCase();
    // Resolve customer or fall back to first user/admin
    let user: any = null;
    if (input.customerQuery) {
      const q = input.customerQuery.trim();
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: q },
            { email: { equals: q, mode: 'insensitive' } },
            { loginCode: { equals: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (!user) {
      user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    }
    if (!user) {
      throw new Error('No customer user found in database to assign shipment.');
    }

    let containerId: string | undefined;
    if (input.containerNumber) {
      const c = await prisma.container.findFirst({
        where: {
          containerNumber: {
            equals: input.containerNumber.trim(),
            mode: 'insensitive',
          },
        },
      });
      if (c) containerId = c.id;
    }

    const created = await prisma.shipment.create({
      data: {
        vehicleVIN: cleanVin,
        vehicleYear: input.vehicleYear || null,
        vehicleMake: input.vehicleMake || null,
        vehicleModel: input.vehicleModel || null,
        vehicleColor: input.vehicleColor || null,
        vehicleType: input.vehicleType || 'SEDAN',
        lotNumber: input.lotNumber || null,
        auctionName: input.auctionName || null,
        userId: user.id,
        containerId: containerId || null,
        price: input.price ?? null,
        purchasePrice: input.purchasePrice ?? null,
        serviceType: input.serviceType || 'SHIPPING_ONLY',
        hasKey: input.hasKey ?? null,
        hasTitle: input.hasTitle ?? null,
        status: (input.status as any) || 'ON_HAND',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        container: { select: { id: true, containerNumber: true } },
      },
    });

    await this.logMcpActivity({
      tool: 'create_shipment',
      query: cleanVin,
      entityType: 'SHIPMENT',
      entityId: created.id,
      responseSummary: `Created shipment ${cleanVin} for ${user.name || user.email}`,
    });

    return {
      success: true,
      message: `Created vehicle shipment ${cleanVin} (${[created.vehicleYear, created.vehicleMake, created.vehicleModel].filter(Boolean).join(' ')})`,
      shipment: created,
      webAppUrl: `${APP_URL}/dashboard/shipments/${created.id}`,
    };
  }

  async updateShipment(input: {
    vinOrId: string;
    status?: string;
    containerNumber?: string;
    price?: number;
    paymentStatus?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
    hasKey?: boolean;
    hasTitle?: boolean;
    internalNotes?: string;
  }) {
    const prisma = await this.getPrisma();
    if (!prisma) {
      throw new Error('Database connection required to update a shipment.');
    }

    const q = input.vinOrId.trim();
    const existing = await prisma.shipment.findFirst({
      where: {
        OR: [
          { id: q },
          { vehicleVIN: { equals: q, mode: 'insensitive' } },
          { lotNumber: { equals: q, mode: 'insensitive' } },
        ],
      },
    });

    if (!existing) {
      return {
        success: false,
        error: `No shipment found matching "${q}".`,
      };
    }

    const data: Record<string, any> = {};
    if (input.status) data.status = input.status;
    if (input.price !== undefined) data.price = input.price;
    if (input.paymentStatus) data.paymentStatus = input.paymentStatus;
    if (input.hasKey !== undefined) data.hasKey = input.hasKey;
    if (input.hasTitle !== undefined) data.hasTitle = input.hasTitle;
    if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;

    if (input.containerNumber !== undefined) {
      if (!input.containerNumber.trim()) {
        data.containerId = null;
      } else {
        const container = await prisma.container.findFirst({
          where: {
            containerNumber: {
              equals: input.containerNumber.trim(),
              mode: 'insensitive',
            },
          },
        });
        if (!container) {
          return {
            success: false,
            error: `Container "${input.containerNumber}" not found.`,
          };
        }
        data.containerId = container.id;
      }
    }

    const updated = await prisma.shipment.update({
      where: { id: existing.id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        container: { select: { id: true, containerNumber: true, status: true } },
      },
    });

    await this.logMcpActivity({
      tool: 'update_shipment',
      query: q,
      entityType: 'SHIPMENT',
      entityId: updated.id,
      responseSummary: `Updated shipment ${updated.vehicleVIN || updated.id} (status=${updated.status})`,
    });

    return {
      success: true,
      message: `Updated shipment ${updated.vehicleVIN || updated.id}`,
      shipment: updated,
      webAppUrl: `${APP_URL}/dashboard/shipments/${updated.id}`,
    };
  }

  async createContainer(input: {
    containerNumber: string;
    bookingNumber?: string;
    shippingLine?: string;
    vesselName?: string;
    voyageNumber?: string;
    loadingPort?: string;
    destinationPort?: string;
    estimatedArrival?: string;
    maxCapacity?: number;
    status?: string;
    notes?: string;
  }) {
    const prisma = await this.getPrisma();
    if (!prisma) {
      throw new Error('Database connection required to create a container.');
    }

    const cleanNum = input.containerNumber.trim().toUpperCase();
    const created = await prisma.container.create({
      data: {
        containerNumber: cleanNum,
        bookingNumber: input.bookingNumber || null,
        trackingNumber: cleanNum,
        shippingLine: input.shippingLine || null,
        vesselName: input.vesselName || null,
        voyageNumber: input.voyageNumber || null,
        loadingPort: input.loadingPort || null,
        destinationPort: input.destinationPort || null,
        estimatedArrival: input.estimatedArrival
          ? new Date(input.estimatedArrival)
          : null,
        maxCapacity: input.maxCapacity || 4,
        status: (input.status as any) || 'CREATED',
        notes: input.notes || null,
      },
    });

    await this.logMcpActivity({
      tool: 'create_container',
      query: cleanNum,
      entityType: 'CONTAINER',
      entityId: created.id,
      responseSummary: `Created container ${cleanNum} (${created.shippingLine || 'N/A'})`,
    });

    return {
      success: true,
      message: `Created ocean container ${cleanNum}`,
      container: created,
      webAppUrl: `${APP_URL}/dashboard/containers/${created.id}`,
    };
  }

  async updateContainerAndTracking(input: {
    containerNumber: string;
    status?: string;
    currentLocation?: string;
    vesselName?: string;
    voyageNumber?: string;
    estimatedArrival?: string;
    progress?: number;
    milestoneStatus?: string;
    milestoneLocation?: string;
    milestoneDescription?: string;
  }) {
    const prisma = await this.getPrisma();
    if (!prisma) {
      throw new Error('Database connection required to update container.');
    }

    const q = input.containerNumber.trim();
    const existing = await prisma.container.findFirst({
      where: {
        OR: [
          { id: q },
          { containerNumber: { equals: q, mode: 'insensitive' } },
          { bookingNumber: { equals: q, mode: 'insensitive' } },
        ],
      },
    });

    if (!existing) {
      return {
        success: false,
        error: `Container "${q}" not found.`,
      };
    }

    const data: Record<string, any> = {};
    if (input.status) data.status = input.status;
    if (input.currentLocation !== undefined) {
      data.currentLocation = input.currentLocation;
      data.lastLocationUpdate = new Date();
    }
    if (input.vesselName !== undefined) data.vesselName = input.vesselName;
    if (input.voyageNumber !== undefined) data.voyageNumber = input.voyageNumber;
    if (input.estimatedArrival) {
      data.estimatedArrival = new Date(input.estimatedArrival);
    }
    if (input.progress !== undefined) data.progress = input.progress;

    const updated = await prisma.container.update({
      where: { id: existing.id },
      data,
    });

    let createdMilestone: any = null;
    if (input.milestoneStatus) {
      createdMilestone = await prisma.containerTrackingEvent.create({
        data: {
          containerId: existing.id,
          status: input.milestoneStatus,
          location: input.milestoneLocation || input.currentLocation || null,
          vesselName: input.vesselName || updated.vesselName || null,
          description: input.milestoneDescription || input.milestoneStatus,
          eventDate: new Date(),
          source: 'MCP_AI_AGENT',
          completed: true,
        },
      });
    }

    await this.logMcpActivity({
      tool: 'update_container_and_tracking',
      query: updated.containerNumber,
      entityType: 'CONTAINER',
      entityId: updated.id,
      responseSummary: `Updated container ${updated.containerNumber}${createdMilestone ? ` + added milestone "${input.milestoneStatus}"` : ''}`,
    });

    return {
      success: true,
      message: `Updated container ${updated.containerNumber}`,
      container: updated,
      addedMilestone: createdMilestone,
      webAppUrl: `${APP_URL}/dashboard/containers/${updated.id}`,
    };
  }

  async createDispatch(input: {
    referenceNumber?: string;
    origin: string;
    destination: string;
    companyQuery?: string;
    cost?: number;
    status?: string;
    notes?: string;
    vins?: string[];
  }) {
    const prisma = await this.getPrisma();
    if (!prisma) {
      throw new Error('Database connection required to create a dispatch.');
    }

    let company: any = null;
    if (input.companyQuery) {
      company = await prisma.company.findFirst({
        where: {
          OR: [
            { id: input.companyQuery },
            { name: { contains: input.companyQuery, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (!company) {
      company = await prisma.company.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: input.companyQuery || 'Jacxi Inland Dispatch Carrier',
          isDispatch: true,
        },
      });
    }

    const refNum =
      input.referenceNumber?.trim() ||
      `DSP-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;

    const dispatch = await prisma.dispatch.create({
      data: {
        referenceNumber: refNum,
        companyId: company.id,
        origin: input.origin,
        destination: input.destination,
        cost: input.cost ?? null,
        status: (input.status as any) || 'PENDING',
        dispatchDate: new Date(),
        notes: input.notes || null,
        createdBy: 'mcp-agent',
      },
    });

    if (input.vins && input.vins.length > 0) {
      await prisma.shipment.updateMany({
        where: {
          vehicleVIN: { in: input.vins.map((v) => v.trim().toUpperCase()) },
        },
        data: { dispatchId: dispatch.id },
      });
    }

    await this.logMcpActivity({
      tool: 'create_dispatch',
      query: refNum,
      entityType: 'DISPATCH',
      entityId: dispatch.id,
      responseSummary: `Created inland dispatch ${refNum} (${input.origin} -> ${input.destination})`,
    });

    return {
      success: true,
      message: `Created inland dispatch ${refNum}`,
      dispatch,
    };
  }

  // =========================================================================
  // 2. OVERLAND TRANSITS (MERSIN / DUBAI -> HERAT / KABUL AFGHANISTAN)
  // =========================================================================

  async listAndManageTransits(input: {
    action?: 'list' | 'create' | 'add_event';
    search?: string;
    status?: string;
    referenceNumber?: string;
    origin?: string;
    destination?: string;
    cost?: number;
    eventStatus?: string;
    eventLocation?: string;
    eventDescription?: string;
    vins?: string[];
    limit?: number;
  }): Promise<{
    action: string;
    transits?: TransitSearchResult[];
    createdTransit?: any;
    createdEvent?: any;
  }> {
    const action = input.action || 'list';
    const prisma = await this.getPrisma();

    if (action === 'create' && prisma) {
      const refNum =
        input.referenceNumber?.trim() ||
        `TRN-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;

      const company = await prisma.company.findFirst({
        where: { isTransit: true },
      });

      const created = await prisma.transit.create({
        data: {
          referenceNumber: refNum,
          companyId: company?.id || null,
          origin: input.origin || 'Mersin / Dubai',
          destination: input.destination || 'Herat / Kabul, Afghanistan',
          status: (input.status as any) || 'PENDING',
          dispatchDate: new Date(),
          cost: input.cost ?? null,
          createdBy: 'mcp-agent',
        },
      });

      if (input.vins && input.vins.length > 0) {
        await prisma.shipment.updateMany({
          where: {
            vehicleVIN: { in: input.vins.map((v) => v.trim().toUpperCase()) },
          },
          data: { transitId: created.id },
        });
      }

      return {
        action: 'create',
        createdTransit: created,
      };
    }

    if (action === 'add_event' && prisma && input.referenceNumber) {
      const transit = await prisma.transit.findFirst({
        where: {
          OR: [
            { id: input.referenceNumber },
            {
              referenceNumber: {
                equals: input.referenceNumber.trim(),
                mode: 'insensitive',
              },
            },
          ],
        },
      });
      if (!transit) {
        throw new Error(`Transit "${input.referenceNumber}" not found.`);
      }
      let companyId = transit.companyId;
      if (!companyId) {
        const anyCompany = await prisma.company.findFirst();
        companyId = anyCompany?.id || null;
      }
      if (!companyId) {
        throw new Error('No transit company found to record transit event.');
      }

      const ev = await prisma.transitEvent.create({
        data: {
          transitId: transit.id,
          companyId,
          origin: transit.origin,
          destination: transit.destination,
          status: input.eventStatus || 'IN_TRANSIT',
          location: input.eventLocation || null,
          description: input.eventDescription || input.eventStatus || 'Transit milestone update',
          eventDate: new Date(),
          createdBy: 'mcp-agent',
        },
      });

      return {
        action: 'add_event',
        createdEvent: ev,
      };
    }

    // Default: list transits
    if (prisma) {
      try {
        const where: any = {};
        if (input.status) where.status = input.status;
        if (input.search) {
          where.OR = [
            { referenceNumber: { contains: input.search, mode: 'insensitive' } },
            { origin: { contains: input.search, mode: 'insensitive' } },
            { destination: { contains: input.search, mode: 'insensitive' } },
          ];
        }

        const rows = await prisma.transit.findMany({
          where,
          include: {
            company: { select: { name: true } },
            shipments: {
              select: {
                id: true,
                vehicleVIN: true,
                vehicleYear: true,
                vehicleMake: true,
                vehicleModel: true,
                status: true,
              },
            },
            events: {
              orderBy: { eventDate: 'desc' },
              take: 10,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Math.min(input.limit || 15, 50),
        });

        return {
          action: 'list',
          transits: rows.map((t: any) => ({
            id: t.id,
            referenceNumber: t.referenceNumber,
            status: t.status,
            origin: t.origin,
            destination: t.destination,
            companyName: t.company?.name || null,
            dispatchDate: t.dispatchDate ? new Date(t.dispatchDate).toISOString() : null,
            estimatedDelivery: t.estimatedDelivery
              ? new Date(t.estimatedDelivery).toISOString()
              : null,
            actualDelivery: t.actualDelivery
              ? new Date(t.actualDelivery).toISOString()
              : null,
            cost: t.cost ?? null,
            shipmentCount: (t.shipments || []).length,
            vehicles: (t.shipments || []).map((s: any) => ({
              id: s.id,
              vin: s.vehicleVIN || null,
              vehicle:
                [s.vehicleYear, s.vehicleMake, s.vehicleModel]
                  .filter(Boolean)
                  .join(' ') || 'Vehicle',
              status: s.status,
            })),
            events: (t.events || []).map((e: any) => ({
              id: e.id,
              status: e.status,
              location: e.location || null,
              description: e.description || null,
              eventDate: new Date(e.eventDate).toISOString(),
            })),
            dataSource: 'database',
          })),
        };
      } catch {
        // Fallback to snapshot
      }
    }

    const snap = this.snapshotData;
    const list = (snap?.transits || []).slice(0, input.limit || 15).map((t: any) => ({
      id: t.id,
      referenceNumber: t.referenceNumber,
      status: t.status,
      origin: t.origin,
      destination: t.destination,
      companyName: null,
      dispatchDate: t.dispatchDate || null,
      estimatedDelivery: t.estimatedDelivery || null,
      actualDelivery: t.actualDelivery || null,
      cost: t.cost ?? null,
      shipmentCount: 0,
      vehicles: [],
      events: [],
      dataSource: 'snapshot' as const,
    }));

    return {
      action: 'list',
      transits: list,
    };
  }

  async manageCustomer(input: {
    action: 'create' | 'reset_login_code';
    customerQuery?: string;
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
  }) {
    const prisma = await this.getPrisma();
    if (!prisma) {
      throw new Error('Database connection required to manage customers.');
    }

    const generateLoginCode = () =>
      randomBytes(4).toString('hex').toUpperCase();

    if (input.action === 'create') {
      if (!input.email) {
        throw new Error('Customer email is required to create a customer.');
      }
      const code = generateLoginCode();
      const created = await prisma.user.create({
        data: {
          name: input.name || input.email.split('@')[0],
          email: input.email.trim().toLowerCase(),
          phone: input.phone || null,
          city: input.city || null,
          country: input.country || null,
          role: 'user',
          loginCode: code,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          country: true,
          loginCode: true,
          role: true,
        },
      });
      return {
        success: true,
        message: `Created customer ${created.name} (${created.email}) with loginCode ${created.loginCode}`,
        customer: created,
      };
    }

    // reset_login_code
    const q = (input.customerQuery || input.email || '').trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: q },
          { email: { equals: q, mode: 'insensitive' } },
          { loginCode: { equals: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
    });
    if (!user) {
      return {
        success: false,
        error: `Customer "${q}" not found.`,
      };
    }

    const newCode = generateLoginCode();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { loginCode: newCode },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        loginCode: true,
      },
    });

    return {
      success: true,
      message: `Reset 8-character loginCode for ${updated.name || updated.email} to ${updated.loginCode}`,
      customer: updated,
    };
  }

  // =========================================================================
  // 3. ACCOUNTING, LEDGERS, INVOICING & EXPENSES
  // =========================================================================

  async getCustomerLedgerAndBalance(
    query: string
  ): Promise<CustomerLedgerResult | null> {
    const clean = query.trim();
    const prisma = await this.getPrisma();

    if (prisma) {
      try {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: clean },
              { email: { equals: clean, mode: 'insensitive' } },
              { loginCode: { equals: clean, mode: 'insensitive' } },
              { name: { contains: clean, mode: 'insensitive' } },
            ],
          },
          include: {
            ledgerEntries: {
              include: { shipment: { select: { vehicleVIN: true } } },
              orderBy: { transactionDate: 'desc' },
              take: 25,
            },
            invoices: {
              orderBy: { issueDate: 'desc' },
              take: 20,
            },
          },
        });

        if (user) {
          let totalDebits = 0;
          let totalCredits = 0;
          for (const entry of user.ledgerEntries) {
            if (entry.type === 'DEBIT') totalDebits += entry.amount;
            else totalCredits += entry.amount;
          }
          const latestBalance =
            user.ledgerEntries[0]?.balance ?? totalDebits - totalCredits;

          const unpaidInvoices = user.invoices.filter(
            (inv: any) => inv.status !== 'PAID' && inv.status !== 'VOID'
          );
          const unpaidAmount = unpaidInvoices.reduce(
            (sum: number, inv: any) => sum + (inv.amountRemaining || 0),
            0
          );

          return {
            customerId: user.id,
            customerName: user.name,
            customerEmail: user.email,
            loginCode: user.loginCode,
            collectionStatus: String(user.collectionStatus || 'CURRENT'),
            promiseToPayDate: user.promiseToPayDate
              ? new Date(user.promiseToPayDate).toISOString()
              : null,
            currentBalance: latestBalance,
            totalDebits,
            totalCredits,
            unpaidInvoicesCount: unpaidInvoices.length,
            unpaidInvoicesAmount: unpaidAmount,
            recentEntries: user.ledgerEntries.map((e: any) => ({
              id: e.id,
              transactionDate: new Date(e.transactionDate).toISOString(),
              description: e.description,
              type: String(e.type),
              amount: e.amount,
              balance: e.balance,
              shipmentVin: e.shipment?.vehicleVIN || null,
            })),
            invoices: user.invoices.map((inv: any) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              status: String(inv.status),
              total: inv.total,
              amountPaid: inv.amountPaid,
              amountRemaining: inv.amountRemaining,
              issueDate: new Date(inv.issueDate).toISOString(),
              dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
            })),
            dataSource: 'database',
          };
        }
      } catch {
        // Fallback to snapshot
      }
    }

    const snap = this.snapshotData;
    const user = (snap?.users || []).find(
      (u: any) =>
        u.id === clean ||
        (u.email && u.email.toLowerCase() === clean.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(clean.toLowerCase())) ||
        (u.loginCode && u.loginCode.toLowerCase() === clean.toLowerCase())
    );
    if (!user) return null;

    const entries = (snap?.ledgerEntries || []).filter(
      (e: any) => e.userId === user.id
    );
    const totalDebits = entries
      .filter((e: any) => e.type === 'DEBIT')
      .reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
    const totalCredits = entries
      .filter((e: any) => e.type === 'CREDIT')
      .reduce((acc: number, e: any) => acc + (e.amount || 0), 0);

    return {
      customerId: user.id,
      customerName: user.name || null,
      customerEmail: user.email,
      loginCode: user.loginCode || null,
      collectionStatus: user.collectionStatus || 'CURRENT',
      promiseToPayDate: null,
      currentBalance: totalDebits - totalCredits,
      totalDebits,
      totalCredits,
      unpaidInvoicesCount: 0,
      unpaidInvoicesAmount: 0,
      recentEntries: entries.slice(0, 20).map((e: any) => ({
        id: e.id,
        transactionDate: e.transactionDate,
        description: e.description,
        type: e.type,
        amount: e.amount,
        balance: e.balance,
      })),
      invoices: [],
      dataSource: 'snapshot',
    };
  }

  async listAndSearchInvoices(input: {
    query?: string;
    status?: string;
    limit?: number;
  }): Promise<InvoiceSearchResult[]> {
    const prisma = await this.getPrisma();
    const limit = Math.min(input.limit || 15, 50);

    if (prisma) {
      try {
        const where: any = {};
        if (input.status) where.status = input.status;
        if (input.query) {
          const q = input.query.trim();
          where.OR = [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { shipment: { vehicleVIN: { contains: q, mode: 'insensitive' } } },
            { container: { containerNumber: { contains: q, mode: 'insensitive' } } },
          ];
        }

        const invoices = await prisma.userInvoice.findMany({
          where,
          include: {
            user: { select: { name: true, email: true } },
            container: { select: { containerNumber: true } },
            shipment: { select: { vehicleVIN: true } },
            lineItems: true,
          },
          orderBy: { issueDate: 'desc' },
          take: limit,
        });

        return invoices.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: String(inv.status),
          customerName: inv.user?.name || null,
          customerEmail: inv.user?.email || null,
          containerNumber: inv.container?.containerNumber || null,
          shipmentVin: inv.shipment?.vehicleVIN || null,
          subtotal: inv.subtotal,
          tax: inv.tax,
          discount: inv.discount,
          total: inv.total,
          amountPaid: inv.amountPaid,
          amountRemaining: inv.amountRemaining,
          currency: inv.currency || 'USD',
          issueDate: new Date(inv.issueDate).toISOString(),
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
          paidDate: inv.paidDate ? new Date(inv.paidDate).toISOString() : null,
          lineItems: (inv.lineItems || []).map((li: any) => ({
            description: li.description,
            type: String(li.type),
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            amount: li.amount,
          })),
          dataSource: 'database',
        }));
      } catch {
        // Fallback
      }
    }

    const snap = this.snapshotData;
    return (snap?.userInvoices || []).slice(0, limit).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      customerName: null,
      customerEmail: null,
      containerNumber: null,
      shipmentVin: null,
      subtotal: inv.subtotal || 0,
      tax: inv.tax || 0,
      discount: inv.discount || 0,
      total: inv.total || 0,
      amountPaid: inv.amountPaid || 0,
      amountRemaining: inv.amountRemaining || 0,
      currency: inv.currency || 'USD',
      issueDate: inv.issueDate,
      dueDate: inv.dueDate || null,
      paidDate: inv.paidDate || null,
      lineItems: [],
      dataSource: 'snapshot' as const,
    }));
  }

  async getFinancialAndExpenseSummary(input?: {
    containerNumber?: string;
    limit?: number;
  }) {
    const prisma = await this.getPrisma();
    if (prisma) {
      try {
        const [
          invoiceAgg,
          paymentAgg,
          containerExpenseAgg,
          dispatchExpenseAgg,
          recentContainerExpenses,
        ] = await Promise.all([
          prisma.userInvoice.aggregate({
            _sum: {
              total: true,
              amountPaid: true,
              amountRemaining: true,
            },
            _count: { id: true },
          }),
          prisma.payment.aggregate({
            _sum: { amount: true },
            _count: { id: true },
          }),
          prisma.containerExpense.aggregate({
            _sum: { amount: true },
            _count: { id: true },
          }),
          prisma.dispatchExpense.aggregate({
            _sum: { amount: true },
            _count: { id: true },
          }),
          prisma.containerExpense.findMany({
            where: input?.containerNumber
              ? {
                  container: {
                    containerNumber: {
                      contains: input.containerNumber.trim(),
                      mode: 'insensitive',
                    },
                  },
                }
              : undefined,
            include: {
              container: { select: { containerNumber: true } },
            },
            orderBy: { date: 'desc' },
            take: Math.min(input?.limit || 15, 40),
          }),
        ]);

        return {
          invoicing: {
            totalInvoices: invoiceAgg._count.id || 0,
            totalBilledUsd: invoiceAgg._sum.total || 0,
            totalCollectedUsd: invoiceAgg._sum.amountPaid || 0,
            totalOutstandingReceivablesUsd:
              invoiceAgg._sum.amountRemaining || 0,
          },
          payments: {
            totalPaymentsCount: paymentAgg._count.id || 0,
            totalPaymentsAmountUsd: paymentAgg._sum.amount || 0,
          },
          operationalExpenses: {
            containerExpensesCount: containerExpenseAgg._count.id || 0,
            containerExpensesTotalUsd: containerExpenseAgg._sum.amount || 0,
            dispatchExpensesCount: dispatchExpenseAgg._count.id || 0,
            dispatchExpensesTotalUsd: dispatchExpenseAgg._sum.amount || 0,
          },
          recentContainerExpenses: recentContainerExpenses.map((e: any) => ({
            id: e.id,
            containerNumber: e.container?.containerNumber || null,
            type: e.type,
            amount: e.amount,
            currency: e.currency,
            vendor: e.vendor,
            date: new Date(e.date).toISOString(),
            notes: e.notes,
          })),
          dataSource: 'database',
        };
      } catch {
        // Fallback
      }
    }

    const snap = this.snapshotData;
    const expenses = snap?.containerExpenses || [];
    const totalExp = expenses.reduce(
      (acc: number, e: any) => acc + (e.amount || 0),
      0
    );

    return {
      invoicing: {
        totalInvoices: (snap?.userInvoices || []).length,
        totalBilledUsd: 0,
        totalCollectedUsd: 0,
        totalOutstandingReceivablesUsd: 0,
      },
      payments: {
        totalPaymentsCount: (snap?.payments || []).length,
        totalPaymentsAmountUsd: 0,
      },
      operationalExpenses: {
        containerExpensesCount: expenses.length,
        containerExpensesTotalUsd: totalExp,
        dispatchExpensesCount: (snap?.dispatchExpenses || []).length,
        dispatchExpensesTotalUsd: 0,
      },
      recentContainerExpenses: expenses.slice(0, 10),
      dataSource: 'snapshot',
    };
  }

  // =========================================================================
  // 4. LIVE AUCTION LOT SCRAPER (COPART / IAAI) & LIVE CARRIER AIS SYNC
  // =========================================================================

  async fetchAuctionLot(lotOrVin: string) {
    const clean = lotOrVin.trim();

    // 1. Check if already in Jacxi database first
    const existingVinMatches = await this.searchVin(clean, false);

    // 2. If numeric lot number, try live Copart scraper (`fetchCopartLotVehicleData`)
    let liveCopartData: any = null;
    let scraperError: string | null = null;
    if (/^\d{6,10}$/.test(clean)) {
      try {
        const mod = await import('../../../src/lib/copart/lot-scraper');
        if (mod && typeof mod.fetchCopartLotVehicleData === 'function') {
          liveCopartData = await mod.fetchCopartLotVehicleData(clean);
        }
      } catch (err: any) {
        scraperError = err?.message || 'Live Copart scraper unavailable';
      }
    }

    return {
      query: clean,
      liveAuctionData: liveCopartData,
      existingShipmentsInJacxi: existingVinMatches,
      scraperNote: scraperError,
    };
  }

  async syncLiveContainerTracking(containerNumber: string) {
    const clean = containerNumber.trim().toUpperCase();
    const prisma = await this.getPrisma();

    let syncResult: any = null;
    if (prisma) {
      try {
        const container = await prisma.container.findFirst({
          where: {
            OR: [
              { id: clean },
              { containerNumber: { equals: clean, mode: 'insensitive' } },
              { bookingNumber: { equals: clean, mode: 'insensitive' } },
            ],
          },
        });

        if (container) {
          const syncMod = await import('../../../src/lib/services/tracking-sync');
          if (syncMod && syncMod.trackingSync) {
            syncResult = await syncMod.trackingSync.syncContainerTracking(
              container.id,
              { force: true }
            );
          }
        }
      } catch (err: any) {
        syncResult = {
          success: false,
          error: err?.message || 'Live carrier sync unavailable',
        };
      }
    }

    const latestTracking = await this.track(clean);

    return {
      containerNumber: clean,
      carrierSyncResult: syncResult,
      latestTracking,
    };
  }

  // =========================================================================
  // 5. DOCUMENTS, GATE PASSES & OUTBOUND NOTIFICATIONS
  // =========================================================================

  async listAndGenerateDocuments(input: {
    action?: 'list' | 'generate_gate_pass';
    query?: string;
    category?: string;
    limit?: number;
  }): Promise<{
    action: string;
    documents?: DocumentSearchResult[];
    gatePass?: any;
  }> {
    const action = input.action || 'list';
    const prisma = await this.getPrisma();

    if (action === 'generate_gate_pass' && prisma && input.query) {
      const q = input.query.trim();
      const shipment = await prisma.shipment.findFirst({
        where: {
          OR: [
            { id: q },
            { vehicleVIN: { equals: q, mode: 'insensitive' } },
            { lotNumber: { equals: q, mode: 'insensitive' } },
          ],
        },
        include: {
          user: { select: { name: true, email: true } },
          container: { select: { containerNumber: true } },
        },
      });

      if (!shipment) {
        throw new Error(`Shipment "${q}" not found to generate Gate Pass.`);
      }

      const token =
        shipment.releaseToken ||
        `GP-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;

      const updated = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          releaseToken: token,
          releaseTokenCreatedAt: new Date(),
          companyGatePassRequested: true,
          companyGatePassRequestedAt: new Date(),
        },
      });

      return {
        action: 'generate_gate_pass',
        gatePass: {
          shipmentId: updated.id,
          vin: updated.vehicleVIN,
          vehicle: [
            updated.vehicleYear,
            updated.vehicleMake,
            updated.vehicleModel,
          ]
            .filter(Boolean)
            .join(' '),
          customerName: shipment.user?.name || null,
          containerNumber: shipment.container?.containerNumber || null,
          releaseToken: token,
          issuedAt: new Date().toISOString(),
          paymentStatus: updated.paymentStatus,
          gatePassVerifyUrl: `${APP_URL}/dashboard/shipments/${updated.id}`,
        },
      };
    }

    // Default: list documents (both shipment Document and ContainerDocument)
    if (prisma) {
      try {
        const q = (input.query || '').trim();
        const [shipmentDocs, containerDocs] = await Promise.all([
          prisma.document.findMany({
            where: q
              ? {
                  OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    {
                      shipment: {
                        vehicleVIN: { contains: q, mode: 'insensitive' },
                      },
                    },
                  ],
                }
              : undefined,
            include: { shipment: { select: { vehicleVIN: true } } },
            orderBy: { createdAt: 'desc' },
            take: Math.min(input.limit || 15, 40),
          }),
          prisma.containerDocument.findMany({
            where: q
              ? {
                  OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    {
                      container: {
                        containerNumber: { contains: q, mode: 'insensitive' },
                      },
                    },
                  ],
                }
              : undefined,
            include: { container: { select: { containerNumber: true } } },
            orderBy: { uploadedAt: 'desc' },
            take: Math.min(input.limit || 15, 40),
          }),
        ]);

        const combined: DocumentSearchResult[] = [
          ...shipmentDocs.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: String(d.category),
            fileUrl: d.fileUrl,
            fileType: d.fileType,
            shipmentVin: d.shipment?.vehicleVIN || null,
            containerNumber: null,
            uploadedBy: d.uploadedBy,
            createdAt: new Date(d.createdAt).toISOString(),
          })),
          ...containerDocs.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.type,
            fileUrl: d.fileUrl,
            fileType: d.fileType,
            shipmentVin: null,
            containerNumber: d.container?.containerNumber || null,
            uploadedBy: d.uploadedBy,
            createdAt: new Date(d.uploadedAt).toISOString(),
          })),
        ];

        return {
          action: 'list',
          documents: combined.slice(0, input.limit || 20),
        };
      } catch {
        // Fallback
      }
    }

    return {
      action: 'list',
      documents: [],
    };
  }

  async sendCustomerNotification(input: {
    customerQuery: string;
    title: string;
    description: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    link?: string;
  }) {
    const prisma = await this.getPrisma();
    if (!prisma) {
      throw new Error('Database connection required to send notifications.');
    }

    const q = input.customerQuery.trim();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: q },
          { email: { equals: q, mode: 'insensitive' } },
          { loginCode: { equals: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    }
    if (!user) {
      throw new Error(`No user found matching "${q}".`);
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: input.title,
        description: input.description,
        type: (input.type as any) || 'INFO',
        link: input.link || null,
      },
    });

    await this.logMcpActivity({
      tool: 'send_customer_notification',
      query: `${user.email}: ${input.title}`,
      entityType: 'NOTIFICATION',
      entityId: notification.id,
      responseSummary: `Sent notification "${input.title}" to ${user.name || user.email}`,
    });

    return {
      success: true,
      message: `Notification "${input.title}" sent to ${user.name || user.email}`,
      notification,
    };
  }
}

