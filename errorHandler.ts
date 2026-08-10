import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { ApplicationWithDocuments, ApplicationStatus } from '../types';

// Validation schema for status update
const statusUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' }),
  }),
});

/**
 * GET /api/admin/applications
 * Retrieve all applications with their KYC documents
 */
export async function getAllApplications(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    const response: ApplicationWithDocuments[] = applications.map((app) => ({
      id: app.id,
      fullName: app.fullName,
      nationalId: app.nationalId,
      phone: app.phone,
      email: app.email,
      employer: app.employer,
      monthlyIncomeTTD: Number(app.monthlyIncomeTTD),
      loanAmountTTD: Number(app.loanAmountTTD),
      loanTermMonths: app.loanTermMonths,
      monthlyRepaymentTTD: Number(app.monthlyRepaymentTTD),
      status: app.status as ApplicationStatus,
      createdAt: app.createdAt.toISOString(),
      documents: app.documents.map((doc) => ({
        id: doc.id,
        applicationId: doc.applicationId,
        documentType: doc.documentType as 'ID' | 'PAYSLIP' | 'UTILITY_BILL',
        fileUrl: doc.fileUrl,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt.toISOString(),
      })),
    }));

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/applications/:id/status
 * Update application status to APPROVED or REJECTED
 */
export async function updateApplicationStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidSchema = z.string().uuid('Invalid application ID format');
    uuidSchema.parse(id);

    // Validate status
    const { status } = statusUpdateSchema.parse(req.body);

    // Check if application exists
    const existing = await prisma.application.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        error: 'Application not found',
        details: `No application found with ID: ${id}`,
      });
      return;
    }

    // Prevent updating already processed applications
    if (existing.status !== 'PENDING') {
      res.status(409).json({
        error: 'Conflict',
        details: `Application is already ${existing.status.toLowerCase()}`,
      });
      return;
    }

    // Update status
    const updated = await prisma.application.update({
      where: { id },
      data: { status },
      include: {
        documents: true,
      },
    });

    const response: ApplicationWithDocuments = {
      id: updated.id,
      fullName: updated.fullName,
      nationalId: updated.nationalId,
      phone: updated.phone,
      email: updated.email,
      employer: updated.employer,
      monthlyIncomeTTD: Number(updated.monthlyIncomeTTD),
      loanAmountTTD: Number(updated.loanAmountTTD),
      loanTermMonths: updated.loanTermMonths,
      monthlyRepaymentTTD: Number(updated.monthlyRepaymentTTD),
      status: updated.status as ApplicationStatus,
      createdAt: updated.createdAt.toISOString(),
      documents: updated.documents.map((doc) => ({
        id: doc.id,
        applicationId: doc.applicationId,
        documentType: doc.documentType as 'ID' | 'PAYSLIP' | 'UTILITY_BILL',
        fileUrl: doc.fileUrl,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt.toISOString(),
      })),
    };

    res.status(200).json(response);
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
