# CLAUDE.md — convențiile proiectului RHCSA Study LMS

LMS personal (Vite + React + TypeScript + Tailwind) plus cursul de pregătire pentru RHCSA (EX200). Același schelet ca VMware Study LMS (`alex-andu/vmware-learning-ro`).
Rulează local, fără backend și fără bază de date. Utilizatorul e începător absolut.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm install && npm run dev` | Pornește aplicația local (http://localhost:5173) |
| `npm run validate` | Validează tot conținutul (structură lecții, frontmatter, Mermaid, quiz/lab JSON, surse, glosar) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint pe `src/` și `scripts/` |
| `npm run build` | `validate` + `typecheck` + `vite build`. Eșuează la orice eroare de conținut (o diagramă Mermaid invalidă a lui Alex e doar avertisment, vezi mai jos). |
| `npm run test:e2e` | Test în browser (Playwright): toate funcțiile LMS (cronometru, carduri de recapitulare, rezolvare, laborator, notițe, export/import) + layout pe telefon. Local cere `npm i -D playwright && npx playwright install chromium`. |

La fiecare etapă: rulează `build`, `lint`, `test:e2e` înainte de commit.

## Conținutul vine de la Alex

Teoria cursului o scrie Alex. Claude se ocupă **doar de integrarea ei în platformă**: nu scrie, nu cercetează și nu rescrie lecții.

- Capitolele lui Alex sunt în `surse-alex/` (`capitolul_X_Y_*.md`, plus `cuprins.md` când există).
- Cuprins: `node scripts/generate-cuprins.mjs surse-alex` îl generează din capitole (cerut de Alex; titlurile pilonilor sunt în script). Dacă Alex trimite propriul `cuprins.md`, nu mai rula generatorul.
- Import: `node scripts/import-alex.mjs surse-alex`. Scriptul:
  - cu `cuprins.md`: îl transformă în `content/modules.json` (Pilonii = module, Capitolele = capitole, cu subiectele din cuprins), păstrând id-urile capitolelor deja existente;
  - fără `cuprins.md`: adaugă în `modules.json` pilonul și capitolul fiecărui fișier („Pilonul N”, titlul din `# Capitolul X.Y:`, nota „Ponderea în EX200”);
  - pune fiecare `capitolul_X_Y_*.md` în `content/pilon-X/<capitol>.ro.md`, cu secțiunile `:::` ale platformei, plus `.lab.json` (din „Pasul N”) și `.exam.json` (din „Simulare de Examen”: minutele cronometrului, Partea B + Răspunsurile);
  - marchează lecția cu `origin: alex` și etichetează ca `mermaid` blocurile de diagramă scrise fără limbaj.
- Textul lui Alex rămâne neschimbat. Greșelile de formatare (o formulă `$…$` neînchisă, o diagramă Mermaid invalidă) i le semnalăm lui Alex în `docs/PENTRU-ALEX.md`, nu le corectăm în tăcere.
- Formulele `$…$` se afișează cu KaTeX. O diagramă Mermaid invalidă într-un capitol al lui Alex e avertisment la `validate` și apare în aplicație ca cod brut cu mesaj; în orice altă lecție oprește build-ul.
- Capitolele din cuprins fără fișier apar „planificat” pe `/curriculum`, cu subiectele lor.

## Structura conținutului

```
content/
  modules.json                 # generat din cuprins.md: id pilon-N, title, target (obiectivul), chapters[{id, number, title, topics, exam}]
  glossary.json                # glosar (tooltip-uri pentru abrevieri)
  sources.json                 # registru de surse (gol pentru lecțiile lui Alex; bibliografia e în secțiunea :::references)
  pilon-N/<capitol>.ro.md      # lecția (RO); lipsa EN afișează RO cu banner
  pilon-N/<capitol>.lab.json   # pașii de laborator (title + action; „why” e opțional)
  pilon-N/<capitol>.exam.json  # simularea EX200: timerMinutes, recallTitle, questions[{id, question, answer}]
  pilon-N/<capitol>.quiz.json  # (opțional) quiz cu variante A–D, dacă un capitol are „QUIZ DE CERTIFICARE”
```

Validatorul verifică pentru `origin: alex` doar formatul: secțiunile `:::` în ordinea de mai jos (cele lipsă sunt permise), simularea (fiecare întrebare are răspuns), quiz-ul A–D dacă există (5 întrebări × 4 variante, exact una corectă, cu explicație). Regulile mai stricte (10 surse, abrevieri, `examSummaryEn`, 2 diagrame) rămân doar pentru lecții care nu sunt ale lui Alex.

Ordinea secțiunilor: `analogy` (Introducerea profesorului), `architecture` (Arhitectură), `exam-alert` (Cutia cu secrete RHCA & capcane), `trenches` (Din tranșee), `interview`, `lab`, `exam` (Simulare de examen: cronometru, Partea A, carduri Partea B), `solution` (Rezolvare + script de verificare, închisă implicit), `quiz`, `references` (Bibliografie).

Lecțiile NU se hardcodează în componente; loader-ul (`src/lib/content.ts`) le citește prin `import.meta.glob`.

## Cod

- Persistență doar în LocalStorage, cheia `rhcsa-lms:v1` (`src/lib/storage.tsx`), cu try/catch la fiecare acces și export/import JSON.
- Textele UI în `src/lib/i18n.ts` (RO + EN). Secțiunile vizuale în `src/components/sections.tsx`.
- Harta `components` din `LessonMarkdown` trebuie să rămână stabilă (definită la nivel de modul); altfel quiz-ul, cardurile și cronometrul se resetează la fiecare update de stare.
- Fără funcții în plus față de cerințe. Deciziile noi se notează în `docs/DECISIONS.md`.
