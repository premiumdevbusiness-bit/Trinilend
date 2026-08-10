import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { DocumentType } from '../types';

// Validation schema for document upload
const uploadSchema = z.object({
  applicationId: z.string().uuid('Application ID must be a valid UUID'),
  documentType: z.enum(['ID', 'PAYSLIP', 'UTILITY_BILL'], {
    errorMap: () => ({ message: 'Document type must be ID, PAYSLIP, or UTILITY_BILL' }),
  }),
});

/**
 * POST /api/documents/upload
 * Upload a KYC document and link it to an application
 */
export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: 'No file uploaded',
        details: 'Please provide a file in the "document" field',
      });
      return;
    }

    // Validate form fields
    const validatedData = uploadSchema.parse({
      applicationId: req.body.applicationId,
      documentType: req.body.documentType,
    });

    // Verify the application exists
    const application = await prisma.application.findUnique({
      where: { id: validatedData.applicationId },
    });

    if (!application) {
      res.status(404).json({
        error: 'Application not found',
        details: `No application found with ID: ${validatedData.applicationId}`,
      });
      return;
    }

    // Construct file URL (relative path for local storage)
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Save document record to database
    const document = await prisma.kYCDocument.create({
      data: {
        applicationId: validatedData.applicationId,
        documentType: validatedData.documentType as DocumentType,
        fileUrl,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });

    res.status(201).json({
      id: document.id,
      applicationId: document.applicationId,
      documentType: document.documentType,
      fileUrl: document.fileUrl,
      originalName: document.originalName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      uploadedAt: document.uploadedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      });
      return;
    }
    next(error);
  }
}
