-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'COLLABORATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('VEGETABLE', 'FRUIT', 'HERB', 'FLOWER', 'TREE', 'SHRUB');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- CreateEnum
CREATE TYPE "Sun" AS ENUM ('FULL_SUN', 'PARTIAL_SHADE', 'FULL_SHADE');

-- CreateEnum
CREATE TYPE "Water" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('BENEFICIAL', 'INCOMPATIBLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garden" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "widthM" DOUBLE PRECISION NOT NULL,
    "lengthM" DOUBLE PRECISION NOT NULL,
    "gridResolutionM" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GardenMember" (
    "gardenId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COLLABORATOR',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GardenMember_pkey" PRIMARY KEY ("gardenId","userId")
);

-- CreateTable
CREATE TABLE "Obstacle" (
    "id" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "xM" DOUBLE PRECISION NOT NULL,
    "yM" DOUBLE PRECISION NOT NULL,
    "widthM" DOUBLE PRECISION NOT NULL,
    "lengthM" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Obstacle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GardenBed" (
    "id" TEXT NOT NULL,
    "gardenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "xM" DOUBLE PRECISION NOT NULL,
    "yM" DOUBLE PRECISION NOT NULL,
    "widthM" DOUBLE PRECISION NOT NULL,
    "lengthM" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GardenBed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "followedById" TEXT,

    CONSTRAINT "RotationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "category" "Category" NOT NULL,
    "seasons" "Season"[],
    "sunRequirement" "Sun" NOT NULL,
    "waterRequirement" "Water" NOT NULL,
    "spacingCm" INTEGER NOT NULL,
    "daysToMaturity" INTEGER,
    "fertilizationNotes" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "rotationGroupId" TEXT,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanionRule" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "companionPlantId" TEXT NOT NULL,
    "relationship" "Relationship" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CompanionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "quantity" INTEGER,
    "purchasedAt" TIMESTAMP(3),
    "bestBeforeYear" INTEGER,
    "notes" TEXT,

    CONSTRAINT "SeedInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantingPlan" (
    "id" TEXT NOT NULL,
    "gardenBedId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantingCell" (
    "id" TEXT NOT NULL,
    "plantingPlanId" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "col" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,
    "plantedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "PlantingCell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RotationGroup_name_key" ON "RotationGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanionRule_plantId_companionPlantId_key" ON "CompanionRule"("plantId", "companionPlantId");

-- CreateIndex
CREATE UNIQUE INDEX "SeedInventory_userId_plantId_key" ON "SeedInventory"("userId", "plantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantingPlan_gardenBedId_year_key" ON "PlantingPlan"("gardenBedId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PlantingCell_plantingPlanId_col_row_key" ON "PlantingCell"("plantingPlanId", "col", "row");

-- AddForeignKey
ALTER TABLE "GardenMember" ADD CONSTRAINT "GardenMember_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenMember" ADD CONSTRAINT "GardenMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obstacle" ADD CONSTRAINT "Obstacle_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GardenBed" ADD CONSTRAINT "GardenBed_gardenId_fkey" FOREIGN KEY ("gardenId") REFERENCES "Garden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationGroup" ADD CONSTRAINT "RotationGroup_followedById_fkey" FOREIGN KEY ("followedById") REFERENCES "RotationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_rotationGroupId_fkey" FOREIGN KEY ("rotationGroupId") REFERENCES "RotationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plant" ADD CONSTRAINT "Plant_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionRule" ADD CONSTRAINT "CompanionRule_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionRule" ADD CONSTRAINT "CompanionRule_companionPlantId_fkey" FOREIGN KEY ("companionPlantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedInventory" ADD CONSTRAINT "SeedInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedInventory" ADD CONSTRAINT "SeedInventory_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingPlan" ADD CONSTRAINT "PlantingPlan_gardenBedId_fkey" FOREIGN KEY ("gardenBedId") REFERENCES "GardenBed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingCell" ADD CONSTRAINT "PlantingCell_plantingPlanId_fkey" FOREIGN KEY ("plantingPlanId") REFERENCES "PlantingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantingCell" ADD CONSTRAINT "PlantingCell_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
