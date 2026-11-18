import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@/lib/logger';
import { hasAnyPermission } from '@/lib/rbac';

export async function POST(request: NextRequest) {
	try {
		const session = await auth();

		if (!session) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		// Only authenticated users with appropriate permissions can upload files
		const canUpload =
			session.user?.role === 'admin' ||
			hasAnyPermission(session.user?.role, ['finance:manage', 'shipments:manage', 'documents:manage']) ||
			Boolean(session.user?.id);

		if (!canUpload) {
			return NextResponse.json(
				{ message: 'Forbidden: Insufficient permissions to upload files' },
				{ status: 403 }
			);
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json(
				{ message: 'No file provided' },
				{ status: 400 }
			);
		}

		// Validate file type
		const allowedTypes = [
			'image/jpeg', 
			'image/jpg', 
			'image/png', 
			'image/webp',
			'application/pdf',
			'text/csv',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
			'application/msword', // .doc
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
		];

		const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.csv', '.xls', '.xlsx', '.doc', '.docx'];
		const fileNameLower = (file.name || '').toLowerCase();
		const hasValidExtension = allowedExtensions.some(ext => fileNameLower.endsWith(ext));

		if (!allowedTypes.includes(file.type) && !hasValidExtension) {
			return NextResponse.json(
				{ message: 'Invalid file type. Allowed: Images, PDF, CSV, Excel, Word.' },
				{ status: 400 }
			);
		}

		// Validate file size (max 25MB to accommodate high-res title scans and multi-page vehicle inspection packets)
		const maxSize = 25 * 1024 * 1024; // 25MB
		if (file.size > maxSize) {
			return NextResponse.json(
				{ message: 'File size exceeds 25MB limit' },
				{ status: 400 }
			);
		}

		const sanitizedBaseName =
			file.name?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '') || `document-${Date.now()}.pdf`;
		const uniqueName = `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizedBaseName}`;
		const objectKey = `shipments/${uniqueName}`;

		// 1. Try Vercel Blob storage if configured
		const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
		if (blobToken) {
			try {
				const blob = await put(objectKey, file, {
					access: 'public',
					token: blobToken,
					contentType: file.type || 'application/octet-stream',
				});

				return NextResponse.json(
					{
						message: 'File uploaded successfully',
						url: blob.url,
						filename: blob.pathname,
					},
					{ status: 200 }
				);
			} catch (blobError) {
				logger.warn('Vercel Blob upload failed, falling back to local filesystem storage:', blobError);
			}
		}

		// 2. Resilient local filesystem storage fallback
		try {
			const uploadsDir = join(process.cwd(), 'public', 'uploads', 'shipments');
			if (!existsSync(uploadsDir)) {
				await mkdir(uploadsDir, { recursive: true });
			}

			const filePath = join(uploadsDir, uniqueName);
			const arrayBuffer = await file.arrayBuffer();
			await writeFile(filePath, Buffer.from(arrayBuffer));

			const localPublicUrl = `/uploads/shipments/${uniqueName}`;
			return NextResponse.json(
				{
					message: 'File uploaded successfully',
					url: localPublicUrl,
					filename: uniqueName,
				},
				{ status: 200 }
			);
		} catch (storageError) {
			logger.error('Failed to save file locally:', storageError);
			return NextResponse.json(
				{ message: 'Failed to persist uploaded file to storage' },
				{ status: 500 }
			);
		}
	} catch (error) {
		logger.error('Error uploading file:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}
