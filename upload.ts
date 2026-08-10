import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { calculateMonthlyRepayment, validateAffordability } from '../utils/calculations';
import { ApplicationResponse } from '../types';

// Validation schema for loan application
const applicationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  nationalId: z.string().min(5, 'National ID must be at least 5 characters').max(20),
  phone: z.string().regex(
    /^\+1-868-[0-9]{7}$|^\+1868[0-9]{7}$|^[0-9]{7}$/,
    'Phone must be a valid Trinidad & Tobago number (e.g., +1-868-1234567 or 1234567)'
  ),
  email: z.string().email('Invalid email address'),
  employer: z.string().min(2, 'Employer name must be at least 2 characters').max(100),
  monthlyIncomeTTD: z.number().positive('Monthly income must be greater than 0'),
  loanAmountTTD: z.number().positive('Loan amount must be greater than 0'),
  loanTermMonths: z.number().int().min(3, 'Minimum loan term is 3 months').max(60, 'Maximum loan term is 60 months'),
});

type ApplicationInput = z.infer<typeof applicationSchema>;

/**
 * POST /api/applications
 * Create a new loan application
 */
export async function createApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validatedData = applicationSchema.parse(req.body);

    // Calculate monthly repayment
    const monthlyRepayment = calculateMonthlyRepayment(
      validatedData.loanAmountTTD,
      validatedData.loanTermMonths
    );

    // Validate affordability
    const affordability = validateAffordability(
      validatedData.monthlyIncomeTTD,
      monthlyRepayment
    );

    // Create application in database
    const application = await prisma.application.create({
      data: {
        fullName: validatedData.fullName,
        nationalId: validatedData.nationalId,
        phone: validatedData.phone,
        email: validatedData.email,
        employer: validatedData.employer,
        monthlyIncomeTTD: validatedData.monthlyIncomeTTD,
        loanAmountTTD: validatedData.loanAmountTTD,
        loanTermMonths: validatedData.loanTermMonths,
        monthlyRepaymentTTD: monthlyRepayment,
        status: 'PENDING',
      },
    });

    // Build response matching exact required JSON structure
    const response: ApplicationResponse = {
      id: application.id,
      fullName: application.fullName,
      nationalId: application.nationalId,
      phone: application.phone,
      email: application.email,
      employer: application.employer,
      monthlyIncomeTTD: Number(application.monthlyIncomeTTD),
      loanAmountTTD: Number(application.loanAmountTTD),
      loanTermMonths: application.loanTermMonths,
      monthlyRepaymentTTD: Number(application.monthlyRepaymentTTD),
      status: application.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      createdAt: application.createdAt.toISOString(),
    };

    res.status(201).json(response);
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
