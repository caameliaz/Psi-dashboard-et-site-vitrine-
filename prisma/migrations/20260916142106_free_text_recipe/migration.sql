-- CreateTable
CREATE TABLE "FreeTextRecipe" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeTextRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeTextRecipeItem" (
    "id" TEXT NOT NULL,
    "freeTextRecipeId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FreeTextRecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FreeTextRecipe_label_key" ON "FreeTextRecipe"("label");

-- CreateIndex
CREATE UNIQUE INDEX "FreeTextRecipeItem_freeTextRecipeId_rawMaterialId_key" ON "FreeTextRecipeItem"("freeTextRecipeId", "rawMaterialId");

-- AddForeignKey
ALTER TABLE "FreeTextRecipeItem" ADD CONSTRAINT "FreeTextRecipeItem_freeTextRecipeId_fkey" FOREIGN KEY ("freeTextRecipeId") REFERENCES "FreeTextRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreeTextRecipeItem" ADD CONSTRAINT "FreeTextRecipeItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
