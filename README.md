# rhcsa-learn

Platformă personală de studiu pentru **RHCSA (EX200)**, în limba română. Rulează local, fără backend.
Este construită pe același schelet ca VMware Study LMS (`alex-andu/vmware-learning-ro`).

```
npm install
npm run dev
```

Deschide http://localhost:5173. Progresul se salvează în browser; fă backup din „Setări & backup”.

- Capitolele scrise de Alex sunt în `surse-alex/`; se importă cu `node scripts/import-alex.mjs surse-alex`.
- Convențiile proiectului sunt în `CLAUDE.md`, deciziile în `docs/DECISIONS.md`.
- Ce trebuie corectat în textele lui Alex e în `docs/PENTRU-ALEX.md`.
