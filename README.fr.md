# Claude Export Viewer

[English](README.md) · [Español](README.es.md) · [Deutsch](README.de.md) · **Français** · [Русский](README.ru.md) · [简体中文](README.zh.md)

Un visualiseur 100 % local de l'export de données que vous pouvez télécharger depuis Claude.ai. Ouvrez `conversations.json`
ou les zips de l'export et lisez vos conversations avec leurs branches, la recherche, les pièces jointes, les projets, la mémoire et les artefacts.

Rien n'est envoyé : la page impose une Content-Security-Policy stricte et ne peut pas accéder au réseau.
Outil non officiel, sans lien avec Anthropic.

## Fonctionnalités

- Lit l'export tel quel : JSON, zips ou dossier décompressé. Les types de fichiers sont détectés à partir
  du contenu, donc les fichiers renommés fonctionnent aussi.
- Markdown avec code coloré, raisonnement et appels d'outils repliés, pièces jointes, citations.
- Branches : un contrôle `< 2 / 3 >` permet de passer d'une version modifiée ou régénérée à une autre.
- Recherche plein texte avec correspondances surlignées dans la conversation. Appuyez sur `/` pour y accéder.
- Tri par date, regroupement par date ou par projet.
- Projets avec instructions, documents et mémoire, plus les conversations et les artefacts que vous y classez.
- Les conversations sans contenu lisible vont sous *Conversations vides*, avec la raison lue dans le fichier.
- Export d'une conversation, d'un projet, de la mémoire, d'un artefact ou d'une réflexion en Markdown, ou d'un projet, de toute la mémoire, de tous les artefacts ou de toutes les réflexions en zip.
- Mémoire, artefacts et réflexions dans leurs propres sections.
- Disponible en anglais, espagnol, allemand, français, russe et chinois simplifié. Choisissez la langue sur la
  page d'accueil ou avec le bouton de langue de la barre latérale. Elle s'applique aussi au Markdown exporté.

## Démarrage rapide

Nécessite seulement Python 3, sans étape de compilation ni paquets.

```bash
python serve.py
```

Sert sur `http://127.0.0.1:5173` (localhost uniquement) et ouvre le navigateur. Sous Windows, vous pouvez lancer
`start.bat`. Options : `--port 8080`, `--no-open`.

## Charger un export

Déposez des fichiers ou un dossier sur la page, ou utilisez **Choisir des fichiers** / **Choisir un dossier**. Vous pouvez
ajouter des fichiers à tout moment ; ils sont fusionnés avec ce qui est déjà chargé.

| Fichier | Contenu |
| --- | --- |
| `conversations.json` | Toutes les conversations. Celui-ci suffit à lui seul |
| `conversations-XXX.zip` | La même chose, au format zip |
| `projects-XXX.zip` | Instructions et documents des projets |
| `memories-XXX.zip` | Mémoire globale, mémoire des projets, fichiers de mémoire |
| `frames-XXX.zip` | Artefacts avec une page lisible |
| `feedback-XXX.zip` | Réflexions mensuelles |
| `design_chats-XXX.zip` | Reconnu, mais l'export ne contient aucun message pour ceux-ci |

`XXX` est le numéro de partie, par exemple `000`.

Claude n'envoie parfois qu'une petite liste `manifest-....json` de liens de téléchargement. Déposez-la et le
visualiseur affiche les liens claude.ai (jamais ouverts ni conservés) pour que vous puissiez télécharger les zips.
Ils expirent après 24 heures.

Les fichiers de compte comme `users.json` et `login_history.json` ne sont jamais chargés.
Cochez **Conserver l'export chargé dans ce navigateur** pour le stocker dans IndexedDB ; le bouton corbeille ou
**Effacer** le supprime.

## Remarques

- **Projets :** l'export n'indique pas à quel projet appartenait une conversation ou un artefact. Utilisez le menu **Projet**
  d'une conversation ou d'un artefact, ou **Ajouter des conversations** / **Ajouter des artefacts** dans un projet. Les choix sont enregistrés uniquement dans ce navigateur.
- **Conversations vides :** le visualiseur ne peut pas récupérer le texte absent de l'export et ne devine pas
  pourquoi. Les raisons se limitent à ce que montre le fichier, par ex. aucun message, tous les corps vides ou
  seulement un texte de remplacement.
- **Confidentialité :** pas d'analytique, de CDN ni de polices distantes, et les bibliothèques sont incluses.
  Les images distantes ne sont pas récupérées (affichées comme liens `[image: alt]`), le HTML brut dans les
  messages est échappé et les liens sont limités à `http`, `https` et `mailto`. Les préférences sont dans `localStorage`.
- **Navigateurs :** Chrome, Edge, Firefox ou Safari récents.
- **Limites :** un `conversations.json` d'environ 500 Mo ou plus ne peut pas être traité dans un onglet.
  Les images et les pièces jointes binaires ne sont pas dans l'export, seulement leurs noms.

## Développement

Modules ES simples, sans bundler, sans Node.

```
index.html          point d'entrée et CSP
serve.py            serveur statique sur 127.0.0.1
src/lib/            import, arbre des branches, recherche, export, i18n (sans DOM)
src/components/     vues Preact + htm
src/locales/        traductions : en (référence), es, de, fr, ru, zh
src/styles.css      styles
fonts/, vendor/     Medeo Mono, bibliothèques incluses
tests/              suite de tests dans le navigateur
```

Tests : lancez `python serve.py`, ouvrez `http://127.0.0.1:5173/tests/`. Le titre de l'onglet affiche `PASSED n` ou `FAILED n`.

Traductions : les textes se trouvent dans `src/locales/<code>.js` et sont lus avec `t()` et `tn()` (pluriels) depuis
`src/lib/i18n.js`. Pour ajouter une langue, copiez `en.js`, traduisez-le et enregistrez-le dans `i18n.js`. Les tests
échouent si une langue manque d'une clé ou d'un paramètre, ou d'une forme de pluriel dont sa langue a besoin. La
langue du navigateur détermine le choix initial ; le choix est enregistré dans `localStorage`.

Contribuer : créez une branche à partir de `main` (`feature/...`, `fix/...`, `docs/...`), utilisez les
[Conventional Commits](https://www.conventionalcommits.org/) et ouvrez une pull request avec les tests au vert.

## Licence

[MIT](LICENSE)

## Construit avec

[Preact](https://preactjs.com/), [htm](https://github.com/developit/htm), [fflate](https://github.com/101arrowz/fflate),
[marked](https://github.com/markedjs/marked), [highlight.js](https://highlightjs.org/),
[Phosphor Icons](https://phosphoricons.com/) (MIT) et [Medeo Mono](https://github.com/DNFDEVS/medeo-font) (SIL OFL, voir `fonts/OFL.txt`).
