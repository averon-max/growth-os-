-- AlterEnum
ALTER TYPE "CMSType" ADD VALUE 'CUSTOM_API';

-- AlterTable
ALTER TABLE "CMSConnection" ALTER COLUMN "usernameRef" DROP NOT NULL;
