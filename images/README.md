# Photographies du carnet

## Direction artistique
Images culinaires **originales, générées pour le carnet** en style rustique réaliste :
- photographie naturelle de cuisine familiale, bois patiné, vaisselle simple et linge en lin ;
- cuisson et textures réalistes, ingrédients strictement compatibles avec la fiche ;
- plat entier visible, marges suffisantes, aucun recadrage excessif ;
- aucune écriture dans l’image, aucun logo et aucune image récupérée sans droits ;
- ne jamais suggérer qu'une image générée est une photographie du plat réellement cuisiné.

## Noms et mise en ligne
Chaque photo est un fichier WebP `images/NNN.webp` où `NNN` est l’ID de la recette. Les fiches utilisent le champ suivant dans `recipes.json` :

```json
"photo": {
  "src": "./images/NNN.webp",
  "generated": true,
  "featured": true,
  "style": "rustique-réaliste",
  "heroPosition": "center center",
  "cardPosition": "center center",
  "alt": "Illustration culinaire générée pour le plat"
}
```

Ne définir ce champ **qu'après** la présence vérifiée du fichier image sur GitHub. `featured` permet de choisir quelles photographies apparaissent dans le diaporama. Les nouveaux visuels ne doivent pas être activés dans le diaporama sans vérification du cadrage.

## Automatisation mise en place
- À chaque modification de `recipes.json`, le workflow GitHub Actions `.github/workflows/suivi-images.yml` génère/actualise la liste `images/a_generer.json` grâce au script `scripts/generer_file_images.py`.
- Cette file contient une demande de photo spécifique par recette encore non illustrée, avec le titre et les ingrédients connus.
- Le site affiche automatiquement une **couverture neutre et élégante** pour les fiches sans photo, puis la remplace par la vraie photo générée une fois ajoutée.
- Quand une nouvelle recette est traitée avec ChatGPT, suivre ce pipeline : vérifier les ingrédients de la source, générer une illustration conforme, enregistrer le WebP, le publier sur GitHub, l'associer à la fiche, contrôler le rendu sur mobile et sur ordinateur. Ne rien demander à l’utilisateur sur GitHub si l'intégration est possible directement.

## Limite technique
GitHub Pages est un hébergement statique. Le suivi des nouvelles images est automatisé, mais **la génération photoréaliste de chaque image n'est pas exécutée automatiquement en arrière-plan** : elle doit être déclenchée par l’outil de génération d’images pendant une séance de travail, ou par un service externe explicitement configuré et financé séparément. Aucune clé secrète et aucun coût de service tiers ne sont imposés par ce dépôt.
