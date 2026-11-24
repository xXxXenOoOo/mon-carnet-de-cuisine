#!/usr/bin/env python3
"""Prépare la liste des illustrations culinaires manquantes, sans service payant.

Les photographies IA sont générées lors du traitement éditorial, puis le
fichier WebP est publié sous images/<ID>.webp et référencé dans recipes.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECIPES = ROOT / 'recipes.json'
DEST = ROOT / 'images' / 'a_generer.json'

def main():
    data = json.loads(RECIPES.read_text(encoding='utf-8'))
    queue = []
    for recipe in data:
        photo = recipe.get('photo') or {}
        if photo.get('generated') is True and str(photo.get('src', '')).startswith('./images/'):
            continue
        ingredients = [x.get('name', '').strip() for x in recipe.get('ingredients', [])]
        ingredients = [name for name in ingredients if name and 'non précisé' not in name.lower() and 'à confirmer' not in name.lower()]
        detail = ', '.join(ingredients[:9]) if ingredients else 'ingrédients non encore documentés'
        status = recipe.get('status', 'À compléter')
        incomplete = status == 'À compléter' or len(ingredients) < 3
        prompt = (
            'Photographie culinaire hyperréaliste pour un carnet de recettes français, '
            'esthétique rustique naturelle, repas maison non surstylisé, lumière de fenêtre, '
            'bois patiné, linge en lin, vaisselle traditionnelle, cuisson crédible et textures authentiques. '
            f'Plat : {recipe.get("title", "Recette")}. '
            f'Ingrédients mentionnés dans la fiche : {detail}. '
            'Préserver l’identité culinaire du plat et ses ingrédients dominants. '
            'Composition horizontale 16:9, plat intégralement visible avec 12 % de marge, '
            'aucun zoom extrême, pas de mains, pas de personnes, pas de texte, pas de logo. '
            'Ne pas représenter comme vérifiés des ingrédients ou des étapes inconnus.'
        )
        queue.append({
            'id': str(recipe.get('id')),
            'titre': recipe.get('title', ''),
            'categorie': recipe.get('category', ''),
            'priorite': 'haute' if status in ('À tester', 'Validée') else 'normale',
            'source_incomplete': incomplete,
            'fichier_attendu': f'images/{recipe.get("id")}.webp',
            'prompt': prompt,
        })
    queue.sort(key=lambda r: (r['priorite'] != 'haute', r['id']))
    payload = {
        'description': 'Images IA à produire lors de la prochaine édition ; liste mise à jour automatiquement lors des changements de recettes.',
        'total_recettes': len(data),
        'images_realisees': len(data) - len(queue),
        'images_a_realiser': len(queue),
        'recettes': queue,
    }
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Images présentes : {payload['images_realisees']}; manquantes : {len(queue)}")

if __name__ == '__main__':
    main()
