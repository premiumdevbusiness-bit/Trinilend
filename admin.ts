generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED
}

enum DocumentType {
  ID
  PAYSLIP
  UTILITY_BILL
}

model Application {
  id                  String   @id @default(uuid()) @db.Uuid
  fullName            String
  nationalId          String   @map("national_id")
  phone               String
  email               String
  employer            String
  monthlyIncomeTTD    Decimal  @map("monthly_income_ttd") @db.Decimal(12, 2)
  loanAmountTTD       Decimal  @map("loan_amount_ttd") @db.Decimal(12, 2)
  loanTermMonths      Int      @map("loan_term_months")
  monthlyRepaymentTTD Decimal  @map("monthly_repayment_ttd") @db.Decimal(12, 2)
  status              ApplicationStatus @default(PENDING)
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  documents           KYCDocument[]

  @@index([status])
  @@index([createdAt])
  @@map("applications")
}

model KYCDocument {
  id             String       @id @default(uuid()) @db.Uuid
  applicationId  String       @map("application_id") @db.Uuid
  documentType   DocumentType @map("document_type")
  fileUrl        String       @map("file_url")
  originalName   String       @map("original_name")
  mimeType       String       @map("mime_type")
  fileSize       Int          @map("file_size")
  uploadedAt     DateTime     @default(now()) @map("uploaded_at")

  application    Application  @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@map("kyc_documents")
}
