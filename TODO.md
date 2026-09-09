Instructions complètes pour PSI Dash
1. Rendre width/length optionnels + ajouter un champ format libre

Dans prisma/schema.prisma, modèle Product :


width  Int?     // optionnel désormais — dimensions rouleau en mm
length Int?     // optionnel désormais — longueur rouleau en m
format String?  // NOUVEAU : texte libre pour les produits sans dimensions
                // rouleau standard (ex. étiquettes : "100mm x 150mm",
                // "250 étiquettes/rouleau")
Migration Prisma requise (champs qui deviennent nullable + nouveau champ).

2. Adapter le formulaire admin (admin/products/page.tsx)

width/length ne sont plus obligatoires à la saisie
Ajouter un champ texte "Format" (libre), affiché à la place de width/length quand ils sont vides — ou en complément
3. Créer la catégorie "Étiquettes" + les 6 produits (comme dit précédemment) :

mode: ACHETE, active: false
width/length laissés vides, format renseigné à la place (ex. "100mm x 150mm — 250 étiquettes")
Les customFields existants (grammage, origine, BPA free...) restent utilisables normalement, rien à changer dessus
4. Vérifier les usages existants de width/length

Chercher partout où product.width/product.length sont lus (page publique, dashboard, calculs) et s'assurer qu'un null ne casse rien (affichage conditionnel).