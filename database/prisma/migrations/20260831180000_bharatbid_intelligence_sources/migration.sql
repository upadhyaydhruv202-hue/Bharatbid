-- AlterEnum
ALTER TYPE "BidDocumentType" ADD VALUE 'epfo_certificate';
ALTER TYPE "BidDocumentType" ADD VALUE 'esic_certificate';
ALTER TYPE "BidDocumentType" ADD VALUE 'nsic_certificate';
ALTER TYPE "BidDocumentType" ADD VALUE 'dpiit_certificate';
ALTER TYPE "BidDocumentType" ADD VALUE 'bis_licence';

-- AlterEnum
ALTER TYPE "VerificationSource" ADD VALUE 'pan';
ALTER TYPE "VerificationSource" ADD VALUE 'income_tax';
ALTER TYPE "VerificationSource" ADD VALUE 'epfo';
ALTER TYPE "VerificationSource" ADD VALUE 'esic';
ALTER TYPE "VerificationSource" ADD VALUE 'dpiit';
ALTER TYPE "VerificationSource" ADD VALUE 'nsic';
ALTER TYPE "VerificationSource" ADD VALUE 'debarment';
ALTER TYPE "VerificationSource" ADD VALUE 'bis';

-- AlterEnum
ALTER TYPE "VerificationIdentifierType" ADD VALUE 'epfo';
ALTER TYPE "VerificationIdentifierType" ADD VALUE 'esic';
ALTER TYPE "VerificationIdentifierType" ADD VALUE 'nsic';
ALTER TYPE "VerificationIdentifierType" ADD VALUE 'dpiit';
ALTER TYPE "VerificationIdentifierType" ADD VALUE 'gem_seller';
ALTER TYPE "VerificationIdentifierType" ADD VALUE 'bis';
