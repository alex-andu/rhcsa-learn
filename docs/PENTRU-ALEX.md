# Pentru Alex: de corectat în capitole

Textul tău intră neschimbat în platformă. Aici apar problemele de formatare găsite la import; după ce le corectezi în fișierul tău, rulează din nou importul.

## Ce am corectat la cererea ta (fără să schimb textul)

- **Diagramele Mermaid:** o etichetă de săgeată care conține paranteze trebuie pusă între ghilimele, altfel diagrama nu se desenează. Am pus ghilimele la 4.1 (2026-11-14) și la 0.2, 0.3, 1.1, 1.2, 1.3, 2.1 și 4.2 (2026-11-15). Exemplu: `A -->|DA (Mod Resetare)| B` devine `A -->|"DA (Mod Resetare)"| B`. Pe viitor, scrie-le direct cu ghilimele.
- **2.1 și 3.1** au venit fără formatare (titluri, liste și cod lipite într-un paragraf); am refăcut Markdown-ul.
- **Cuprinsul** e generat automat din capitolele tale (`node scripts/generate-cuprins.mjs surse-alex`).

## De verificat de tine

- **Laboratorul din 0.1** are pașii ca „#### Pasul N” în subsecțiunea 5.4, nu „### Pasul N”. Se afișează ca text, dar fără bifele pe pași pe care le au celelalte capitole.
- **Mesajul final din 6.1** spune „toate cele 12 capitole complete”, dar cursul are 16 capitole (0.1–6.1).
