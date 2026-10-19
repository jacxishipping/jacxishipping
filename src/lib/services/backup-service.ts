/**
 * Database Backup and Restore Service
 * Provides comprehensive snapshotting and selective restoration
 * of all JACXI Shipping database models with dependency preservation.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

export interface BackupCategory {
  id: string;
  name: string;
  description: string;
  models: string[];
}

export const BACKUP_CATEGORIES: BackupCategory[] = [
  {
    id: 'shipments',
    name: 'Shipments & Vehicles',
    description: 'Vehicle data, VINs, photos, charges, and shipment audit trails',
    models: ['shipments', 'shipmentAuditLogs', 'shipmentCharges'],
  },
  {
    id: 'containers',
    name: 'Containers & Tracking',
    description: 'Containers, loading data, expenses, damages, and tracking events',
    models: [
      'containers',
      'containerExpenses',
      'containerDamages',
      'containerInvoices',
      'containerDocuments',
      'containerTrackingEvents',
      'containerAuditLogs',
    ],
  },
  {
    id: 'companies',
    name: 'Companies & Rates',
    description: 'Shipping lines, dispatchers, transit partners, and price lists',
    models: ['companies', 'companyPriceLists', 'companyLedgerEntries'],
  },
  {
    id: 'financials',
    name: 'Invoices & Ledger',
    description: 'Customer invoices, line items, payments, allocations, and ledger entries',
    models: ['userInvoices', 'invoiceLineItems', 'payments', 'paymentAllocations', 'ledgerEntries'],
  },
  {
    id: 'logistics',
    name: 'Dispatch & Transit',
    description: 'Port dispatch orders, transits to Afghanistan/UAE, events and expenses',
    models: ['dispatches', 'dispatchEvents', 'dispatchExpenses', 'transits', 'transitEvents', 'transitExpenses'],
  },
  {
    id: 'partners',
    name: 'Partner Portals',
    description: 'Partner portal accounts, customer memberships, and partner records',
    models: [
      'partnerPortals',
      'partnerPortalMemberships',
      'partnerCustomers',
      'partnerShipmentAssignments',
      'partnerPortalPaymentRecords',
      'partnerPortalLedgerEntries',
    ],
  },
  {
    id: 'settings',
    name: 'System Configurations',
    description: 'User settings, communication keys, AI provider configs, and call agents',
    models: ['userSettings', 'callAgentSettings', 'aiProviderSettings', 'communicationProviderSettings'],
  },
  {
    id: 'users',
    name: 'Users & Content',
    description: 'User profiles, customer accounts, quotes, newsletters, and contacts',
    models: ['users', 'quotes', 'testimonials', 'blogPosts', 'contacts', 'newsletters'],
  },
];

const BACKUP_DIR = path.join(process.cwd(), 'backups');

function getBackupDirs(): string[] {
  const dirs: string[] = [];
  const primary = path.join(process.cwd(), 'backups');
  dirs.push(primary);

  try {
    const tmpDir = path.join(os.tmpdir(), 'backups');
    if (!dirs.includes(tmpDir)) {
      dirs.push(tmpDir);
    }
  } catch {
    // Ignore tmpdir error
  }
  return dirs;
}

async function getWritableBackupDir(): Promise<string | null> {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.cwd().startsWith('/var/task')
  );

  const candidates = isServerless
    ? [path.join(os.tmpdir(), 'backups'), path.join(process.cwd(), 'backups')]
    : [path.join(process.cwd(), 'backups'), path.join(os.tmpdir(), 'backups')];

  for (const dir of candidates) {
    try {
      await fs.mkdir(dir, { recursive: true });
      const testFile = path.join(dir, `.write-test-${Date.now()}`);
      await fs.writeFile(testFile, 'ok', 'utf-8');
      await fs.unlink(testFile).catch(() => {});
      return dir;
    } catch {
      // Directory is not writable, try next
    }
  }
  return null;
}

export interface StoredBackupInfo {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  timestamp: string;
  version: string;
  scope: 'full' | 'custom';
  categories: string[];
  totalRecords: number;
}

export interface BackupPayload {
  version: string;
  timestamp: string;
  initiatedBy?: string;
  scope: 'full' | 'custom';
  selectedCategories: string[];
  stats: Record<string, number>;
  totalRecords: number;
  data: Record<string, any[]>;
}

export interface RestoreResult {
  success: boolean;
  totalRestored: number;
  restoredCounts: Record<string, number>;
  errorsCount: number;
  errors?: string[];
  message: string;
}

// Known scalar array fields that should NOT be stripped from records
const SCALAR_ARRAY_FIELDS = new Set([
  'arrivalPhotos',
  'vehiclePhotos',
  'containerPhotos',
  'transshipmentPorts',
]);

const MODEL_INFO = new Map<string, {
  name: string;
  fields: Map<string, any>;
}>();

const ENUM_VALUES = new Map<string, Set<string>>();

try {
  if (Prisma.dmmf?.datamodel?.enums) {
    for (const e of Prisma.dmmf.datamodel.enums) {
      ENUM_VALUES.set(e.name, new Set(e.values.map((v) => v.name)));
    }
  }

  if (Prisma.dmmf?.datamodel?.models) {
    for (const m of Prisma.dmmf.datamodel.models) {
      const fields = new Map<string, any>();
      for (const f of m.fields) {
        if (f.kind === 'scalar' || f.kind === 'enum') {
          fields.set(f.name, f);
        }
      }
      MODEL_INFO.set(m.name, { name: m.name, fields });
    }
  }
} catch {
  // DMMF introspection fallback
}

const MODEL_NAME_MAP: Record<string, string> = {
  users: 'User',
  quotes: 'Quote',
  testimonials: 'Testimonial',
  blogPosts: 'BlogPost',
  contacts: 'Contact',
  newsletters: 'Newsletter',

  companies: 'Company',
  companyPriceLists: 'CompanyPriceList',
  companyLedgerEntries: 'CompanyLedgerEntry',

  containers: 'Container',
  containerExpenses: 'ContainerExpense',
  containerDamages: 'ContainerDamage',
  containerInvoices: 'ContainerInvoice',
  containerDocuments: 'ContainerDocument',
  containerTrackingEvents: 'ContainerTrackingEvent',
  containerAuditLogs: 'ContainerAuditLog',

  dispatches: 'Dispatch',
  dispatchEvents: 'DispatchEvent',
  dispatchExpenses: 'DispatchExpense',
  transits: 'Transit',
  transitEvents: 'TransitEvent',
  transitExpenses: 'TransitExpense',

  shipments: 'Shipment',
  shipmentCharges: 'ShipmentCharge',
  shipmentAuditLogs: 'ShipmentAuditLog',

  userInvoices: 'UserInvoice',
  invoiceLineItems: 'InvoiceLineItem',
  payments: 'Payment',
  paymentAllocations: 'PaymentAllocation',
  ledgerEntries: 'LedgerEntry',

  partnerPortals: 'PartnerPortal',
  partnerPortalMemberships: 'PartnerPortalMembership',
  partnerCustomers: 'PartnerCustomer',
  partnerShipmentAssignments: 'PartnerShipmentAssignment',
  partnerPortalPaymentRecords: 'PartnerPortalPaymentRecord',
  partnerPortalLedgerEntries: 'PartnerPortalLedgerEntry',

  userSettings: 'UserSettings',
  callAgentSettings: 'CallAgentSettings',
  aiProviderSettings: 'AiProviderSettings',
  communicationProviderSettings: 'CommunicationProviderSettings',
};

function getModelDelegate(modelKey: string): any {
  switch (modelKey) {
    case 'users': return prisma.user;
    case 'quotes': return prisma.quote;
    case 'testimonials': return prisma.testimonial;
    case 'blogPosts': return prisma.blogPost;
    case 'contacts': return prisma.contact;
    case 'newsletters': return prisma.newsletter;

    case 'companies': return prisma.company;
    case 'companyPriceLists': return prisma.companyPriceList;
    case 'companyLedgerEntries': return prisma.companyLedgerEntry;

    case 'containers': return prisma.container;
    case 'containerExpenses': return prisma.containerExpense;
    case 'containerDamages': return prisma.containerDamage;
    case 'containerInvoices': return prisma.containerInvoice;
    case 'containerDocuments': return prisma.containerDocument;
    case 'containerTrackingEvents': return prisma.containerTrackingEvent;
    case 'containerAuditLogs': return prisma.containerAuditLog;

    case 'dispatches': return prisma.dispatch;
    case 'dispatchEvents': return prisma.dispatchEvent;
    case 'dispatchExpenses': return prisma.dispatchExpense;
    case 'transits': return prisma.transit;
    case 'transitEvents': return prisma.transitEvent;
    case 'transitExpenses': return prisma.transitExpense;

    case 'shipments': return prisma.shipment;
    case 'shipmentCharges': return prisma.shipmentCharge;
    case 'shipmentAuditLogs': return prisma.shipmentAuditLog;

    case 'userInvoices': return prisma.userInvoice;
    case 'invoiceLineItems': return prisma.invoiceLineItem;
    case 'payments': return prisma.payment;
    case 'paymentAllocations': return prisma.paymentAllocation;
    case 'ledgerEntries': return prisma.ledgerEntry;

    case 'partnerPortals': return prisma.partnerPortal;
    case 'partnerPortalMemberships': return prisma.partnerPortalMembership;
    case 'partnerCustomers': return prisma.partnerCustomer;
    case 'partnerShipmentAssignments': return prisma.partnerShipmentAssignment;
    case 'partnerPortalPaymentRecords': return prisma.partnerPortalPaymentRecord;
    case 'partnerPortalLedgerEntries': return prisma.partnerPortalLedgerEntry;

    case 'userSettings': return prisma.userSettings;
    case 'callAgentSettings': return prisma.callAgentSettings;
    case 'aiProviderSettings': return prisma.aiProviderSettings;
    case 'communicationProviderSettings': return prisma.communicationProviderSettings;

    default: return (prisma as any)[modelKey];
  }
}

/**
 * Basic sanitize for plain JS object without DMMF
 */
function sanitizeRecordData(record: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      if (SCALAR_ARRAY_FIELDS.has(key)) {
        sanitized[key] = value;
      } else if (value.length > 0 && typeof value[0] !== 'object') {
        sanitized[key] = value;
      }
      continue;
    }

    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Smart clean record using Prisma DMMF:
 * - Drops unknown/removed columns from older backup schemas
 * - Converts ISO date strings to Date objects
 * - Validates enums against current valid values
 * - Provides sensible defaults for non-null required fields
 */
function cleanRecord(modelName: string, item: Record<string, any>): Record<string, any> {
  const meta = MODEL_INFO.get(modelName);
  if (!meta) {
    return sanitizeRecordData(item);
  }

  const clean: Record<string, any> = {};

  for (const [key, val] of Object.entries(item)) {
    if (val === undefined) continue;
    const f = meta.fields.get(key);
    if (!f) continue; // Drop deprecated / unknown fields from older backups!

    // Skip nested relation objects (unless explicitly typed Json)
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if (f.type !== 'Json') {
        continue;
      }
    }

    // Convert DateTime strings to Date
    if (f.type === 'DateTime') {
      if (val === null) {
        clean[key] = null;
      } else if (typeof val === 'string' || typeof val === 'number') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          clean[key] = d;
        }
      } else if (val instanceof Date) {
        clean[key] = val;
      }
      continue;
    }

    // Validate enum values
    if (f.kind === 'enum') {
      if (val === null) {
        clean[key] = null;
      } else if (typeof val === 'string') {
        const validVals = ENUM_VALUES.get(f.type);
        if (validVals && validVals.has(val)) {
          clean[key] = val;
        }
      }
      continue;
    }

    clean[key] = val;
  }

  // Supply safe fallbacks for required fields with no defaults that are missing/null
  for (const [name, f] of meta.fields) {
    if (f.isRequired && !f.hasDefaultValue && (clean[name] === undefined || clean[name] === null)) {
      if (f.type === 'String') clean[name] = '';
      else if (f.type === 'Int' || f.type === 'Float') clean[name] = 0;
      else if (f.type === 'Boolean') clean[name] = false;
      else if (f.type === 'DateTime') clean[name] = new Date();
      else if (f.type === 'Json') clean[name] = {};
    }
  }

  return clean;
}

/**
 * Process items in concurrent batches for high restore performance and resilience
 */
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<boolean>
): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(chunk.map((item) => processor(item)));
    for (let j = 0; j < results.length; j++) {
      const res = results[j];
      if (res.status === 'fulfilled' && res.value) {
        successCount++;
      } else if (res.status === 'rejected') {
        const item: any = chunk[j];
        const msg = res.reason?.message || 'Restore error';
        errors.push(`[ID ${item?.id || 'unknown'}]: ${msg}`);
      }
    }
  }

  return { successCount, errors };
}

async function restoreUserRecord(item: Record<string, any>): Promise<boolean> {
  const clean = cleanRecord('User', item);
  if (!clean.id && !clean.email) return false;

  let existing = await prisma.user.findFirst({
    where: {
      OR: [
        clean.id ? { id: clean.id } : undefined,
        clean.email ? { email: clean.email } : undefined,
      ].filter(Boolean) as any,
    },
  });

  if (existing) {
    const { passwordHash, ...updateData } = clean;
    const dataToUpdate = passwordHash ? clean : updateData;
    await prisma.user.update({
      where: { id: existing.id },
      data: dataToUpdate as any,
    });
  } else {
    if (!clean.passwordHash) {
      clean.passwordHash = '$2a$12$e80yqZ0fQ3/p7tV567890eWxyzPlaceholderHash';
    }
    await prisma.user.create({
      data: clean as any,
    });
  }
  return true;
}

async function restoreShipmentRecord(item: Record<string, any>): Promise<boolean> {
  const clean = cleanRecord('Shipment', item);
  if (!clean.id) return false;

  // Ensure valid userId
  if (clean.userId) {
    const userExists = await prisma.user.findUnique({ where: { id: clean.userId }, select: { id: true } });
    if (!userExists) {
      const anyUser = await prisma.user.findFirst({ select: { id: true } });
      if (anyUser) clean.userId = anyUser.id;
    }
  } else {
    const anyUser = await prisma.user.findFirst({ select: { id: true } });
    if (anyUser) clean.userId = anyUser.id;
  }

  // Relations verification
  if (clean.containerId) {
    const cExists = await prisma.container.findUnique({ where: { id: clean.containerId }, select: { id: true } });
    if (!cExists) clean.containerId = null;
  }
  if (clean.dispatchId) {
    const dExists = await prisma.dispatch.findUnique({ where: { id: clean.dispatchId }, select: { id: true } });
    if (!dExists) clean.dispatchId = null;
  }
  if (clean.shippingCompanyId) {
    const compExists = await prisma.company.findUnique({ where: { id: clean.shippingCompanyId }, select: { id: true } });
    if (!compExists) clean.shippingCompanyId = null;
  }

  // Find existing by ID or unique vehicleVIN
  let existingShipment = await prisma.shipment.findUnique({ where: { id: clean.id } });
  if (!existingShipment && clean.vehicleVIN) {
    existingShipment = await prisma.shipment.findUnique({ where: { vehicleVIN: clean.vehicleVIN } });
  }

  // Enforce Postgres check constraint: Shipment_transit_workflow_check
  // - If transitId is set, status MUST be IN_TRANSIT_TO_DESTINATION or DELIVERED.
  // - If transitId is null, status CANNOT be IN_TRANSIT_TO_DESTINATION.
  const effectiveTransitId = ('transitId' in clean && clean.transitId !== undefined)
    ? clean.transitId
    : existingShipment?.transitId;

  if (effectiveTransitId) {
    const transitExists = await prisma.transit.findUnique({
      where: { id: effectiveTransitId },
      select: { id: true },
    });
    if (!transitExists) {
      clean.transitId = null;
      if (clean.status === 'IN_TRANSIT_TO_DESTINATION') {
        clean.status = 'IN_TRANSIT';
      }
    } else {
      if (clean.status !== 'IN_TRANSIT_TO_DESTINATION' && clean.status !== 'DELIVERED') {
        clean.status = 'IN_TRANSIT_TO_DESTINATION';
      }
    }
  } else {
    if (clean.status === 'IN_TRANSIT_TO_DESTINATION') {
      clean.status = 'IN_TRANSIT';
    }
  }

  if (existingShipment) {
    await prisma.shipment.update({
      where: { id: existingShipment.id },
      data: clean as any,
    });
  } else {
    await prisma.shipment.create({
      data: clean as any,
    });
  }
  return true;
}

async function restoreContainerRecord(item: Record<string, any>): Promise<boolean> {
  const clean = cleanRecord('Container', item);
  if (!clean.id) return false;

  if (clean.companyId) {
    const cExists = await prisma.company.findUnique({ where: { id: clean.companyId }, select: { id: true } });
    if (!cExists) clean.companyId = null;
  }

  let existing = await prisma.container.findUnique({ where: { id: clean.id } });
  if (!existing && clean.containerNumber) {
    existing = await prisma.container.findUnique({ where: { containerNumber: clean.containerNumber } });
  }

  if (existing) {
    await prisma.container.update({
      where: { id: existing.id },
      data: clean as any,
    });
  } else {
    await prisma.container.create({
      data: clean as any,
    });
  }
  return true;
}

async function restoreCompanyRecord(item: Record<string, any>): Promise<boolean> {
  const clean = cleanRecord('Company', item);
  if (!clean.id) return false;

  let existing = await prisma.company.findUnique({ where: { id: clean.id } });
  if (!existing && clean.name) {
    existing = await prisma.company.findFirst({ where: { name: clean.name } });
  }

  if (existing) {
    await prisma.company.update({
      where: { id: existing.id },
      data: clean as any,
    });
  } else {
    await prisma.company.create({
      data: clean as any,
    });
  }
  return true;
}

async function restoreQuoteRecord(item: Record<string, any>): Promise<boolean> {
  const clean = cleanRecord('Quote', item);
  if (!clean.id) return false;

  await prisma.quote.upsert({
    where: { id: clean.id },
    create: clean as any,
    update: clean as any,
  });
  return true;
}

async function restoreGenericRecord(modelKey: string, item: Record<string, any>): Promise<boolean> {
  const prismaModelName = MODEL_NAME_MAP[modelKey];
  const delegate = getModelDelegate(modelKey);
  if (!prismaModelName || !delegate || !item?.id) return false;

  const clean = cleanRecord(prismaModelName, item);

  // Parent relational validation to avoid constraint errors
  if (clean.userId) {
    const uExists = await prisma.user.findUnique({ where: { id: clean.userId }, select: { id: true } });
    if (!uExists) {
      const anyUser = await prisma.user.findFirst({ select: { id: true } });
      if (anyUser) clean.userId = anyUser.id;
    }
  }
  if (clean.containerId) {
    const cExists = await prisma.container.findUnique({ where: { id: clean.containerId }, select: { id: true } });
    if (!cExists) clean.containerId = null;
  }
  if (clean.shipmentId) {
    const sExists = await prisma.shipment.findUnique({ where: { id: clean.shipmentId }, select: { id: true } });
    if (!sExists) clean.shipmentId = null;
  }
  if (clean.dispatchId) {
    const dExists = await prisma.dispatch.findUnique({ where: { id: clean.dispatchId }, select: { id: true } });
    if (!dExists) clean.dispatchId = null;
  }
  if (clean.transitId) {
    const tExists = await prisma.transit.findUnique({ where: { id: clean.transitId }, select: { id: true } });
    if (!tExists) clean.transitId = null;
  }
  if (clean.invoiceId) {
    const iExists = await prisma.userInvoice.findUnique({ where: { id: clean.invoiceId }, select: { id: true } });
    if (!iExists) clean.invoiceId = null;
  }

  // Handle unique constraints on specific models to avoid P2002 errors
  if (modelKey === 'blogPosts' && clean.slug) {
    const existing = await prisma.blogPost.findFirst({
      where: {
        OR: [
          clean.id ? { id: clean.id } : undefined,
          { slug: clean.slug },
        ].filter(Boolean) as any,
      },
    });
    if (existing) {
      await prisma.blogPost.update({
        where: { id: existing.id },
        data: clean as any,
      });
      return true;
    }
  }

  if (modelKey === 'newsletters' && clean.email) {
    const existing = await prisma.newsletter.findFirst({
      where: {
        OR: [
          clean.id ? { id: clean.id } : undefined,
          { email: clean.email },
        ].filter(Boolean) as any,
      },
    });
    if (existing) {
      await prisma.newsletter.update({
        where: { id: existing.id },
        data: clean as any,
      });
      return true;
    }
  }

  await delegate.upsert({
    where: { id: clean.id },
    create: clean as any,
    update: clean as any,
  });
  return true;
}

async function restoreModelRecords(
  modelKey: string,
  items: any[] | undefined
): Promise<{ count: number; errors: string[] }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { count: 0, errors: [] };
  }

  let processor: (item: any) => Promise<boolean>;

  if (modelKey === 'users') {
    processor = restoreUserRecord;
  } else if (modelKey === 'shipments') {
    processor = restoreShipmentRecord;
  } else if (modelKey === 'containers') {
    processor = restoreContainerRecord;
  } else if (modelKey === 'companies') {
    processor = restoreCompanyRecord;
  } else if (modelKey === 'quotes') {
    processor = restoreQuoteRecord;
  } else {
    processor = (item) => restoreGenericRecord(modelKey, item);
  }

  const { successCount, errors } = await processInBatches(items, 15, processor);
  return { count: successCount, errors };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export class BackupService {
  /**
   * Ensure backups directory exists
   */
  private async ensureBackupDir() {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }

  /**
   * Get current live counts in database
   */
  async getDatabaseStats(): Promise<Record<string, number>> {
    const [
      shipments,
      containers,
      companies,
      invoices,
      users,
      ledgerEntries,
      dispatches,
      transits,
      quotes,
    ] = await Promise.all([
      prisma.shipment.count().catch(() => 0),
      prisma.container.count().catch(() => 0),
      prisma.company.count().catch(() => 0),
      prisma.userInvoice.count().catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.ledgerEntry.count().catch(() => 0),
      prisma.dispatch.count().catch(() => 0),
      prisma.transit.count().catch(() => 0),
      prisma.quote.count().catch(() => 0),
    ]);

    return {
      shipments,
      containers,
      companies,
      invoices,
      users,
      ledgerEntries,
      dispatches,
      transits,
      quotes,
    };
  }

  /**
   * List all stored backup files on server
   */
  async listStoredBackups(): Promise<{
    backups: StoredBackupInfo[];
    lastBackupAt: string | null;
    backupPath: string;
  }> {
    const backupDirs = getBackupDirs();
    const seenFiles = new Set<string>();
    const backups: StoredBackupInfo[] = [];
    let detectedPath = backupDirs[0] || 'Client Downloads';

    for (const dir of backupDirs) {
      try {
        const files = await fs.readdir(dir);
        const jsonFiles = files.filter(
          (f) => f.startsWith('jacxi-backup-') && f.endsWith('.json') && !seenFiles.has(f)
        );

        for (const filename of jsonFiles) {
          seenFiles.add(filename);
          detectedPath = dir;
          try {
            const filePath = path.join(dir, filename);
            const stat = await fs.stat(filePath);

            const handle = await fs.open(filePath, 'r');
            const buffer = Buffer.alloc(Math.min(8192, stat.size));
            await handle.read(buffer, 0, buffer.length, 0);
            await handle.close();

            const previewText = buffer.toString('utf-8');
            let timestamp = stat.mtime.toISOString();
            let version = '1.0.0';
            let scope: 'full' | 'custom' = 'full';
            let categories: string[] = ['all'];
            let totalRecords = 0;

            try {
              if (stat.size < 500000) {
                const fullContent = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                timestamp = fullContent.timestamp || timestamp;
                version = fullContent.version || version;
                scope = fullContent.scope || 'full';
                categories = fullContent.selectedCategories || Object.keys(fullContent.data || {});
                totalRecords = fullContent.totalRecords ||
                  (fullContent.data ? Object.values(fullContent.data).reduce((acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0), 0) : 0);
              } else {
                const timeMatch = previewText.match(/"timestamp":\s*"([^"]+)"/);
                if (timeMatch) timestamp = timeMatch[1];
                const verMatch = previewText.match(/"version":\s*"([^"]+)"/);
                if (verMatch) version = verMatch[1];
                const scopeMatch = previewText.match(/"scope":\s*"([^"]+)"/);
                if (scopeMatch) scope = scopeMatch[1] as any;
                const recordsMatch = previewText.match(/"totalRecords":\s*(\d+)/);
                if (recordsMatch) totalRecords = parseInt(recordsMatch[1], 10);
              }
            } catch {
              // Fallback
            }

            backups.push({
              filename,
              sizeBytes: stat.size,
              sizeFormatted: formatBytes(stat.size),
              createdAt: stat.mtime.toISOString(),
              timestamp,
              version,
              scope,
              categories,
              totalRecords,
            });
          } catch {
            // Ignore single file error
          }
        }
      } catch {
        // Ignore unreadable candidate directories
      }
    }

    // Sort newest first
    backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const lastBackupAt = backups[0]?.timestamp || null;

    return {
      backups,
      lastBackupAt,
      backupPath: BACKUP_DIR,
    };
  }

  /**
   * Create a new database backup (Full or Custom)
   */
  async createBackup(options?: {
    categories?: string[];
    initiatedBy?: string;
  }): Promise<{
    backup: BackupPayload;
    filename: string;
    filePath: string;
    lastBackupAt: string;
  }> {
    await this.ensureBackupDir();

    const selectedCategories = (options?.categories && options.categories.length > 0 && !options.categories.includes('all'))
      ? options.categories
      : BACKUP_CATEGORIES.map((c) => c.id);

    const isFull = selectedCategories.length >= BACKUP_CATEGORIES.length;
    const activeModels = new Set<string>();

    for (const catId of selectedCategories) {
      const cat = BACKUP_CATEGORIES.find((c) => c.id === catId);
      if (cat) {
        cat.models.forEach((m) => activeModels.add(m));
      }
    }

    const data: Record<string, any[]> = {};
    const stats: Record<string, number> = {};

    // 1. Users & Auth
    if (activeModels.has('users')) {
      data.users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          address: true,
          city: true,
          country: true,
          loginCode: true,
          collectionStatus: true,
          promiseToPayDate: true,
          collectionFollowUpDate: true,
          collectionNotes: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      stats.users = data.users.length;
    }

    // 2. Companies & Rates
    if (activeModels.has('companies')) {
      data.companies = await prisma.company.findMany().catch(() => []);
      stats.companies = data.companies.length;
    }
    if (activeModels.has('companyPriceLists')) {
      data.companyPriceLists = await prisma.companyPriceList.findMany().catch(() => []);
      stats.companyPriceLists = data.companyPriceLists.length;
    }
    if (activeModels.has('companyLedgerEntries')) {
      data.companyLedgerEntries = await prisma.companyLedgerEntry.findMany().catch(() => []);
      stats.companyLedgerEntries = data.companyLedgerEntries.length;
    }

    // 3. Containers & Logistics
    if (activeModels.has('containers')) {
      data.containers = await prisma.container.findMany().catch(() => []);
      stats.containers = data.containers.length;
    }
    if (activeModels.has('containerExpenses')) {
      data.containerExpenses = await prisma.containerExpense.findMany().catch(() => []);
      stats.containerExpenses = data.containerExpenses.length;
    }
    if (activeModels.has('containerDamages')) {
      data.containerDamages = await prisma.containerDamage.findMany().catch(() => []);
      stats.containerDamages = data.containerDamages.length;
    }
    if (activeModels.has('containerInvoices')) {
      data.containerInvoices = await prisma.containerInvoice.findMany().catch(() => []);
      stats.containerInvoices = data.containerInvoices.length;
    }
    if (activeModels.has('containerDocuments')) {
      data.containerDocuments = await prisma.containerDocument.findMany().catch(() => []);
      stats.containerDocuments = data.containerDocuments.length;
    }
    if (activeModels.has('containerTrackingEvents')) {
      data.containerTrackingEvents = await prisma.containerTrackingEvent.findMany().catch(() => []);
      stats.containerTrackingEvents = data.containerTrackingEvents.length;
    }
    if (activeModels.has('containerAuditLogs')) {
      data.containerAuditLogs = await prisma.containerAuditLog.findMany().catch(() => []);
      stats.containerAuditLogs = data.containerAuditLogs.length;
    }

    // 4. Shipments
    if (activeModels.has('shipments')) {
      data.shipments = await prisma.shipment.findMany().catch(() => []);
      stats.shipments = data.shipments.length;
    }
    if (activeModels.has('shipmentCharges')) {
      data.shipmentCharges = await prisma.shipmentCharge.findMany().catch(() => []);
      stats.shipmentCharges = data.shipmentCharges.length;
    }
    if (activeModels.has('shipmentAuditLogs')) {
      data.shipmentAuditLogs = await prisma.shipmentAuditLog.findMany().catch(() => []);
      stats.shipmentAuditLogs = data.shipmentAuditLogs.length;
    }

    // 5. Dispatches & Transits
    if (activeModels.has('dispatches')) {
      data.dispatches = await prisma.dispatch.findMany().catch(() => []);
      stats.dispatches = data.dispatches.length;
    }
    if (activeModels.has('dispatchEvents')) {
      data.dispatchEvents = await prisma.dispatchEvent.findMany().catch(() => []);
      stats.dispatchEvents = data.dispatchEvents.length;
    }
    if (activeModels.has('dispatchExpenses')) {
      data.dispatchExpenses = await prisma.dispatchExpense.findMany().catch(() => []);
      stats.dispatchExpenses = data.dispatchExpenses.length;
    }
    if (activeModels.has('transits')) {
      data.transits = await prisma.transit.findMany().catch(() => []);
      stats.transits = data.transits.length;
    }
    if (activeModels.has('transitEvents')) {
      data.transitEvents = await prisma.transitEvent.findMany().catch(() => []);
      stats.transitEvents = data.transitEvents.length;
    }
    if (activeModels.has('transitExpenses')) {
      data.transitExpenses = await prisma.transitExpense.findMany().catch(() => []);
      stats.transitExpenses = data.transitExpenses.length;
    }

    // 6. Financials
    if (activeModels.has('userInvoices')) {
      data.userInvoices = await prisma.userInvoice.findMany().catch(() => []);
      stats.userInvoices = data.userInvoices.length;
    }
    if (activeModels.has('invoiceLineItems')) {
      data.invoiceLineItems = await prisma.invoiceLineItem.findMany().catch(() => []);
      stats.invoiceLineItems = data.invoiceLineItems.length;
    }
    if (activeModels.has('payments')) {
      data.payments = await prisma.payment.findMany().catch(() => []);
      stats.payments = data.payments.length;
    }
    if (activeModels.has('paymentAllocations')) {
      data.paymentAllocations = await prisma.paymentAllocation.findMany().catch(() => []);
      stats.paymentAllocations = data.paymentAllocations.length;
    }
    if (activeModels.has('ledgerEntries')) {
      data.ledgerEntries = await prisma.ledgerEntry.findMany().catch(() => []);
      stats.ledgerEntries = data.ledgerEntries.length;
    }

    // 7. Partner Portals
    if (activeModels.has('partnerPortals')) {
      data.partnerPortals = await prisma.partnerPortal.findMany().catch(() => []);
      stats.partnerPortals = data.partnerPortals.length;
    }
    if (activeModels.has('partnerPortalMemberships')) {
      data.partnerPortalMemberships = await prisma.partnerPortalMembership.findMany().catch(() => []);
      stats.partnerPortalMemberships = data.partnerPortalMemberships.length;
    }
    if (activeModels.has('partnerCustomers')) {
      data.partnerCustomers = await prisma.partnerCustomer.findMany().catch(() => []);
      stats.partnerCustomers = data.partnerCustomers.length;
    }
    if (activeModels.has('partnerShipmentAssignments')) {
      data.partnerShipmentAssignments = await prisma.partnerShipmentAssignment.findMany().catch(() => []);
      stats.partnerShipmentAssignments = data.partnerShipmentAssignments.length;
    }
    if (activeModels.has('partnerPortalPaymentRecords')) {
      data.partnerPortalPaymentRecords = await prisma.partnerPortalPaymentRecord.findMany().catch(() => []);
      stats.partnerPortalPaymentRecords = data.partnerPortalPaymentRecords.length;
    }
    if (activeModels.has('partnerPortalLedgerEntries')) {
      data.partnerPortalLedgerEntries = await prisma.partnerPortalLedgerEntry.findMany().catch(() => []);
      stats.partnerPortalLedgerEntries = data.partnerPortalLedgerEntries.length;
    }

    // 8. Settings
    if (activeModels.has('userSettings')) {
      data.userSettings = await prisma.userSettings.findMany().catch(() => []);
      stats.userSettings = data.userSettings.length;
    }
    if (activeModels.has('callAgentSettings')) {
      data.callAgentSettings = await prisma.callAgentSettings.findMany().catch(() => []);
      stats.callAgentSettings = data.callAgentSettings.length;
    }
    if (activeModels.has('aiProviderSettings')) {
      data.aiProviderSettings = await prisma.aiProviderSettings.findMany().catch(() => []);
      stats.aiProviderSettings = data.aiProviderSettings.length;
    }
    if (activeModels.has('communicationProviderSettings')) {
      data.communicationProviderSettings = await prisma.communicationProviderSettings.findMany().catch(() => []);
      stats.communicationProviderSettings = data.communicationProviderSettings.length;
    }

    // 9. Content & Enquiries
    if (activeModels.has('quotes')) {
      data.quotes = await prisma.quote.findMany().catch(() => []);
      stats.quotes = data.quotes.length;
    }
    if (activeModels.has('testimonials')) {
      data.testimonials = await prisma.testimonial.findMany().catch(() => []);
      stats.testimonials = data.testimonials.length;
    }
    if (activeModels.has('blogPosts')) {
      data.blogPosts = await prisma.blogPost.findMany().catch(() => []);
      stats.blogPosts = data.blogPosts.length;
    }
    if (activeModels.has('contacts')) {
      data.contacts = await prisma.contact.findMany().catch(() => []);
      stats.contacts = data.contacts.length;
    }
    if (activeModels.has('newsletters')) {
      data.newsletters = await prisma.newsletter.findMany().catch(() => []);
      stats.newsletters = data.newsletters.length;
    }

    const totalRecords = Object.values(stats).reduce((acc, count) => acc + count, 0);
    const nowIso = new Date().toISOString();

    const backupPayload: BackupPayload = {
      version: '1.2.0',
      timestamp: nowIso,
      initiatedBy: options?.initiatedBy,
      scope: isFull ? 'full' : 'custom',
      selectedCategories: isFull ? ['all'] : selectedCategories,
      stats,
      totalRecords,
      data,
    };

    const fileTimestamp = nowIso.replace(/[:.]/g, '-');
    const filename = `jacxi-backup-${fileTimestamp}.json`;
    let savedFilePath: string = filename;

    // Best-effort disk caching; if running in a read-only serverless environment, NEVER fail!
    try {
      const writableDir = await getWritableBackupDir();
      if (writableDir) {
        savedFilePath = path.join(writableDir, filename);
        await fs.writeFile(savedFilePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
        logger.info(`Database backup created and saved: ${savedFilePath}`);

        // Clean up older backups (keep last 20)
        try {
          const allFiles = (await fs.readdir(writableDir))
            .filter((f) => f.startsWith('jacxi-backup-') && f.endsWith('.json'))
            .sort()
            .reverse();

          if (allFiles.length > 20) {
            const toDelete = allFiles.slice(20);
            await Promise.all(toDelete.map((f) => fs.unlink(path.join(writableDir, f)).catch(() => {})));
          }
        } catch {
          // Ignore rotation errors
        }
      }
    } catch (diskErr) {
      logger.warn('Disk caching skipped for backup (read-only filesystem):', diskErr);
    }

    return {
      backup: backupPayload,
      filename,
      filePath: savedFilePath,
      lastBackupAt: nowIso,
    };
  }

  /**
   * Preview and inspect an uploaded or stored backup file without applying changes
   */
  previewBackup(content: string | Record<string, any>): {
    valid: boolean;
    version: string;
    timestamp: string;
    scope: string;
    totalRecords: number;
    categoriesAvailable: string[];
    modelsFound: Record<string, number>;
    error?: string;
  } {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;

      if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
        return {
          valid: false,
          version: 'unknown',
          timestamp: new Date().toISOString(),
          scope: 'unknown',
          totalRecords: 0,
          categoriesAvailable: [],
          modelsFound: {},
          error: 'Invalid backup file structure: missing data payload',
        };
      }

      const modelsFound: Record<string, number> = {};
      let totalRecords = 0;

      for (const [model, records] of Object.entries(parsed.data)) {
        if (Array.isArray(records)) {
          modelsFound[model] = records.length;
          totalRecords += records.length;
        }
      }

      const categoriesAvailable: string[] = [];
      for (const cat of BACKUP_CATEGORIES) {
        if (cat.models.some((m) => (modelsFound[m] || 0) > 0)) {
          categoriesAvailable.push(cat.id);
        }
      }

      return {
        valid: true,
        version: parsed.version || '1.0.0',
        timestamp: parsed.timestamp || new Date().toISOString(),
        scope: parsed.scope || (categoriesAvailable.length >= BACKUP_CATEGORIES.length ? 'full' : 'custom'),
        totalRecords: parsed.totalRecords || totalRecords,
        categoriesAvailable,
        modelsFound,
      };
    } catch (err: any) {
      return {
        valid: false,
        version: 'unknown',
        timestamp: new Date().toISOString(),
        scope: 'unknown',
        totalRecords: 0,
        categoriesAvailable: [],
        modelsFound: {},
        error: `Could not parse JSON content: ${err?.message}`,
      };
    }
  }

  /**
   * Restore a single category with resilient batch processing and model dependency preservation
   */
  async restoreCategory(
    categoryId: string,
    categoryData: Record<string, any[]>
  ): Promise<{
    success: boolean;
    totalRestored: number;
    restoredCounts: Record<string, number>;
    errorsCount: number;
    errors: string[];
    message: string;
  }> {
    const cat = BACKUP_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) {
      throw new Error(`Unknown backup category: ${categoryId}`);
    }

    const restoredCounts: Record<string, number> = {};
    const allErrors: string[] = [];
    let totalRestored = 0;

    for (const modelKey of cat.models) {
      const items = categoryData[modelKey];
      if (Array.isArray(items) && items.length > 0) {
        const { count, errors } = await restoreModelRecords(modelKey, items);
        restoredCounts[modelKey] = count;
        totalRestored += count;
        if (errors.length > 0) {
          allErrors.push(...errors);
        }
      }
    }

    return {
      success: true,
      totalRestored,
      restoredCounts,
      errorsCount: allErrors.length,
      errors: allErrors.slice(0, 10),
      message: `Category "${cat.name}" restored successfully (${totalRestored} records).`,
    };
  }

  /**
   * Restore database from backup data with dependency order preservation
   */
  async restoreBackup(options: {
    backupContent: string | Record<string, any>;
    selectedCategories?: string[];
  }): Promise<RestoreResult> {
    const preview = this.previewBackup(options.backupContent);
    if (!preview.valid) {
      return {
        success: false,
        totalRestored: 0,
        restoredCounts: {},
        errorsCount: 1,
        errors: [preview.error || 'Invalid backup file'],
        message: preview.error || 'Invalid backup file structure',
      };
    }

    const parsed = typeof options.backupContent === 'string' 
      ? JSON.parse(options.backupContent) 
      : options.backupContent;

    const data: Record<string, any[]> = parsed.data || {};

    // Strictly ordered by database foreign-key dependency hierarchy
    const ORDERED_CATEGORY_IDS = [
      'users',
      'companies',
      'settings',
      'partners',
      'containers',
      'logistics',
      'shipments',
      'financials',
    ];

    const requestedCategories = new Set(
      (options.selectedCategories && options.selectedCategories.length > 0 && !options.selectedCategories.includes('all'))
        ? options.selectedCategories
        : BACKUP_CATEGORIES.map((c) => c.id)
    );

    const categoriesToRun = ORDERED_CATEGORY_IDS.filter((id) => requestedCategories.has(id));

    const restoredCounts: Record<string, number> = {};
    const allErrors: string[] = [];
    let totalRestored = 0;

    logger.info(`Starting database restoration for categories: ${categoriesToRun.join(', ')}...`);

    for (const catId of categoriesToRun) {
      const res = await this.restoreCategory(catId, data);
      Object.assign(restoredCounts, res.restoredCounts);
      totalRestored += res.totalRestored;
      if (res.errors && res.errors.length > 0) {
        allErrors.push(...res.errors);
      }
    }

    logger.info(`Restoration completed: ${totalRestored} records restored, ${allErrors.length} errors.`);

    return {
      success: true,
      totalRestored,
      restoredCounts,
      errorsCount: allErrors.length,
      errors: allErrors.slice(0, 10),
      message: `Database restored successfully (${totalRestored} records processed across ${Object.keys(restoredCounts).length} models).`,
    };
  }

  /**
   * Delete a stored backup file
   */
  async deleteBackup(filename: string): Promise<boolean> {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Invalid filename for deletion');
    }

    if (!filename.startsWith('jacxi-backup-') || !filename.endsWith('.json')) {
      throw new Error('Can only delete valid jacxi-backup-*.json files');
    }

    for (const dir of getBackupDirs()) {
      try {
        const filePath = path.join(dir, filename);
        await fs.unlink(filePath);
        return true;
      } catch {
        // Try next directory
      }
    }

    return false;
  }

  /**
   * Read raw content of a specific stored backup
   */
  async readBackupFile(filename: string): Promise<string> {
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Invalid filename');
    }

    for (const dir of getBackupDirs()) {
      try {
        const filePath = path.join(dir, filename);
        return await fs.readFile(filePath, 'utf-8');
      } catch {
        // Try next directory
      }
    }

    throw new Error(`Backup file ${filename} not found on server`);
  }
}

export const backupService = new BackupService();
