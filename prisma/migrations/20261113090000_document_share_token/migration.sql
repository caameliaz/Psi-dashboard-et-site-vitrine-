-- AlterTable : lien public (jeton) pour envoyer un document au client par mail. La table est vide ou la valeur par défaut remplit les lignes existantes.
ALTER TABLE "Document" ADD COLUMN "shareToken" TEXT NOT NULL DEFAULT (replace((gen_random_uuid())::text, '-'::text, ''::text) || replace((gen_random_uuid())::text, '-'::text, ''::text));

-- CreateIndex
CREATE UNIQUE INDEX "Document_shareToken_key" ON "Document"("shareToken");
