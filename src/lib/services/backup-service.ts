/**
 * Database Backup and Restore Service
 * Provides comprehensive snapshotting and selective restoration
 * of all JACXI Shipping database models with dependency preservation.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { prisma } from '@/lib/db';
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

/**
 * Sanitize a record before database upsert:
 * Strips nested relation objects and relation arrays so Prisma doesn't fail.
 */
function sanitizeRecordData(record: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;

    // Preserve scalar arrays like string[] photos
    if (Array.isArray(value)) {
      if (SCALAR_ARRAY_FIELDS.has(key)) {
        sanitized[key] = value;
      } else if (value.length > 0 && typeof value[0] !== 'object') {
        sanitized[key] = value;
      }
      // Arrays of objects (relations) are skipped here and restored into their own tables
      continue;
    }

    // Skip nested relation objects
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      // Check if it's a plain object (relation) vs JSON field
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
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
    const selectedCategories = (options.selectedCategories && options.selectedCategories.length > 0 && !options.selectedCategories.includes('all'))
      ? options.selectedCategories
      : BACKUP_CATEGORIES.map((c) => c.id);

    const allowedModels = new Set<string>();
    for (const catId of selectedCategories) {
      const cat = BACKUP_CATEGORIES.find((c) => c.id === catId);
      if (cat) cat.models.forEach((m) => allowedModels.add(m));
    }

    const restoredCounts: Record<string, number> = {};
    const errors: string[] = [];
    let totalRestored = 0;

    // Helper to safely upsert or create records for any model
    const restoreModel = async (
      modelName: string,
      modelDelegate: any,
      items: any[] | undefined,
      customUpsert?: (item: any) => Promise<boolean>
    ) => {
      if (!allowedModels.has(modelName) || !Array.isArray(items) || items.length === 0) {
        return;
      }

      let count = 0;
      for (const item of items) {
        if (!item || typeof item !== 'object' || !item.id) continue;
        try {
          if (customUpsert) {
            const ok = await customUpsert(item);
            if (ok) count++;
          } else {
            const clean = sanitizeRecordData(item);
            await modelDelegate.upsert({
              where: { id: item.id },
              create: clean,
              update: clean,
            });
            count++;
          }
        } catch (err: any) {
          logger.warn(`Failed restoring ${modelName} item ${item.id}:`, err?.message);
          errors.push(`[${modelName}] ID ${item.id}: ${err?.message}`);
        }
      }

      restoredCounts[modelName] = count;
      totalRestored += count;
    };

    logger.info(`Starting database restoration for categories: ${selectedCategories.join(', ')}...`);

    // Level 1: Base Entities (Users, Companies, Portals, Settings, Quotes)
    if (allowedModels.has('users')) {
      await restoreModel('users', prisma.user, data.users, async (item) => {
        const clean = sanitizeRecordData(item);
        // Exclude passwordHash from update if not provided in backup to avoid wiping passwords
        const existing = await prisma.user.findUnique({ where: { id: item.id } });
        if (existing) {
          const { passwordHash, ...updateData } = clean;
          await prisma.user.update({
            where: { id: item.id },
            data: updateData as any,
          });
        } else {
          await prisma.user.create({
            data: clean as any,
          });
        }
        return true;
      });
    }

    await restoreModel('companies', prisma.company, data.companies);
    await restoreModel('companyPriceLists', prisma.companyPriceList, data.companyPriceLists);
    await restoreModel('partnerPortals', prisma.partnerPortal, data.partnerPortals);
    await restoreModel('partnerPortalMemberships', prisma.partnerPortalMembership, data.partnerPortalMemberships);
    await restoreModel('partnerCustomers', prisma.partnerCustomer, data.partnerCustomers);

    // Settings
    await restoreModel('userSettings', prisma.userSettings, data.userSettings);
    await restoreModel('callAgentSettings', prisma.callAgentSettings, data.callAgentSettings);
    await restoreModel('aiProviderSettings', prisma.aiProviderSettings, data.aiProviderSettings);
    await restoreModel('communicationProviderSettings', prisma.communicationProviderSettings, data.communicationProviderSettings);

    // Level 2: Primary Containers, Dispatches, Transits
    await restoreModel('containers', prisma.container, data.containers);
    await restoreModel('dispatches', prisma.dispatch, data.dispatches);
    await restoreModel('transits', prisma.transit, data.transits);

    // Level 3: Shipments (depends on User, Container, Dispatch, Transit)
    await restoreModel('shipments', prisma.shipment, data.shipments, async (item) => {
      const clean = sanitizeRecordData(item);
      // Ensure relations that don't exist in DB are set to null
      if (clean.containerId) {
        const containerExists = await prisma.container.findUnique({ where: { id: clean.containerId }, select: { id: true } });
        if (!containerExists) clean.containerId = null;
      }
      if (clean.companyId) {
        const compExists = await prisma.company.findUnique({ where: { id: clean.companyId }, select: { id: true } });
        if (!compExists) clean.companyId = null;
      }
      if (clean.dispatchId) {
        const dispExists = await prisma.dispatch.findUnique({ where: { id: clean.dispatchId }, select: { id: true } });
        if (!dispExists) clean.dispatchId = null;
      }
      if (clean.transitId) {
        const transExists = await prisma.transit.findUnique({ where: { id: clean.transitId }, select: { id: true } });
        if (!transExists) clean.transitId = null;
      }

      await prisma.shipment.upsert({
        where: { id: item.id },
        create: clean as any,
        update: clean as any,
      });
      return true;
    });

    // Level 4: Container Child Tables
    await restoreModel('containerExpenses', prisma.containerExpense, data.containerExpenses);
    await restoreModel('containerDamages', prisma.containerDamage, data.containerDamages);
    await restoreModel('containerInvoices', prisma.containerInvoice, data.containerInvoices);
    await restoreModel('containerDocuments', prisma.containerDocument, data.containerDocuments);
    await restoreModel('containerTrackingEvents', prisma.containerTrackingEvent, data.containerTrackingEvents);
    await restoreModel('containerAuditLogs', prisma.containerAuditLog, data.containerAuditLogs);

    // Level 5: Dispatch & Transit Events / Expenses
    await restoreModel('dispatchEvents', prisma.dispatchEvent, data.dispatchEvents);
    await restoreModel('dispatchExpenses', prisma.dispatchExpense, data.dispatchExpenses);
    await restoreModel('transitEvents', prisma.transitEvent, data.transitEvents);
    await restoreModel('transitExpenses', prisma.transitExpense, data.transitExpenses);

    // Level 6: Shipment Charges & Audits
    await restoreModel('shipmentCharges', prisma.shipmentCharge, data.shipmentCharges);
    await restoreModel('shipmentAuditLogs', prisma.shipmentAuditLog, data.shipmentAuditLogs);

    // Level 7: Invoices & Accounting
    await restoreModel('userInvoices', prisma.userInvoice, data.userInvoices);
    await restoreModel('invoiceLineItems', prisma.invoiceLineItem, data.invoiceLineItems);
    await restoreModel('payments', prisma.payment, data.payments);
    await restoreModel('paymentAllocations', prisma.paymentAllocation, data.paymentAllocations);
    await restoreModel('ledgerEntries', prisma.ledgerEntry, data.ledgerEntries);
    await restoreModel('companyLedgerEntries', prisma.companyLedgerEntry, data.companyLedgerEntries);

    // Level 8: Partner Portal Assignments & Ledgers
    await restoreModel('partnerShipmentAssignments', prisma.partnerShipmentAssignment, data.partnerShipmentAssignments);
    await restoreModel('partnerPortalPaymentRecords', prisma.partnerPortalPaymentRecord, data.partnerPortalPaymentRecords);
    await restoreModel('partnerPortalLedgerEntries', prisma.partnerPortalLedgerEntry, data.partnerPortalLedgerEntries);

    // Level 9: Content & Miscellaneous
    await restoreModel('quotes', prisma.quote, data.quotes);
    await restoreModel('testimonials', prisma.testimonial, data.testimonials);
    await restoreModel('blogPosts', prisma.blogPost, data.blogPosts);
    await restoreModel('contacts', prisma.contact, data.contacts);
    await restoreModel('newsletters', prisma.newsletter, data.newsletters);

    logger.info(`Restoration completed: ${totalRestored} records restored, ${errors.length} errors.`);

    return {
      success: true,
      totalRestored,
      restoredCounts,
      errorsCount: errors.length,
      errors: errors.slice(0, 10), // Return sample of errors if any
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
