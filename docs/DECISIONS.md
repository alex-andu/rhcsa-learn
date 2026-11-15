# Decizii

Decizii luate fără a întreba (reversibile). Cea mai nouă sus.

## 2026-11-15 — Toate cele 16 capitole ale lui Alex

13. **Cuprinsul e generat de `scripts/generate-cuprins.mjs`** din fișierele capitolelor (titlu din `# Capitolul X.Y:`, subiecte din titlurile `### 2.N.`). Doar titlurile și obiectivele celor 7 piloni (0–6) sunt scrise de Claude. Înlocuiește cuprinsul de la punctul 10, care urma alte numere decât capitolele lui Alex.
14. **Id-urile se păstrează doar pentru capitolele care aveau deja lecție** (2.2, 2.3, 3.2, 3.3, 4.1), ca progresul salvat să rămână legat de ele. Capitolele „planificat” din vechiul cuprins nu aveau progres, deci au primit id-uri noi, după titlurile lui Alex.
15. **2.1 și 3.1 au venit fără formatare** (tot textul lipit). La cererea lui Alex, Claude a refăcut structura Markdown; verificat automat că textul e identic (diferă doar numerotarea listelor și limbajul blocurilor de cod).
16. **Diagramele Mermaid cu paranteze în etichetele săgeților** (0.2, 0.3, 1.1, 1.2, 1.3, 2.1, 4.2, în total 18 etichete) au primit ghilimele în jurul etichetei, ca să poată fi desenate (Alex a cerut deja asta la 4.1). Textul etichetelor nu s-a schimbat.
17. **6.1 (simularea completă)**: secțiunea 5 devine „Simulare de examen” cu cronometru de 180 de minute (din „Timp de lucru: 3 Ore / 180 Minute”), secțiunea 6 („Rezolvarea Oficială…”) devine rezolvarea, închisă implicit; secțiunea 7 (carieră și bibliografie) devine Bibliografie.
18. **Laboratorul din 0.1** are subsecțiuni 5.1–5.4 cu „#### Pasul N” în interior, nu „### Pasul N”; rămâne text întreg în lecție, fără bife pe pași.

## 2026-11-14 — Cuprins generat și diagrama din 4.1

10. **`surse-alex/cuprins.md` a fost generat de Claude, la cererea lui Alex.** Sursa: obiectivele publice EX200 (pagina oficială Red Hat nu a fost accesibilă din sesiune; au fost folosite ghiduri secundare) și cele 5 capitole existente, cu trimiterile lor la 3.1 (partiții) și 4.2 (SELinux/firewalld). 5 piloni, 17 capitole, 12 dintre ele „planificat”. Subiectele capitolelor existente sunt titlurile secțiunilor lor. Containerele (Podman) nu au capitol: sursele nu sunt de acord dacă mai fac parte din EX200 pe RHEL 10; de verificat pe pagina oficială.
11. **Diagrama din 4.1 a fost corectată la cererea lui Alex**, în `surse-alex/capitolul_4_1_*.md`: eticheta săgeții `NM <--> Keyfiles` e acum între ghilimele (parantezele fără ghilimele opreau Mermaid). Restul textului e neschimbat.
12. **Nota „Ponderea în EX200” rămâne pe capitole și cu `cuprins.md`**: importul o citește din fișierul fiecărui capitol în ambele moduri.

## 2026-11-13 — Pornirea platformei RHCSA

1. **Același schelet ca VMware Study LMS** (Vite + React + TypeScript + Tailwind, LocalStorage, fără backend). Codul a fost copiat din `alex-andu/vmware-learning-ro`; conținutul VMware (lecții, glosar, surse) nu a fost preluat.
2. **Ținta de examen: RHCSA (EX200).** Fiecare capitol primește eticheta `EX200`, iar nota de capitol (`examNote`) este „Ponderea în EX200” copiată din capitolul lui Alex.
3. **Fără `cuprins.md` deocamdată.** Importul construiește `modules.json` din fișierele capitolelor: pilonul se numește „Pilonul N”, capitolul ia titlul din `# Capitolul X.Y:`. Când vine `cuprins.md`, importul îl folosește și păstrează id-urile capitolelor existente (progresul salvat rămâne legat de ele).
4. **Id-ul capitolului vine din numele fișierului** (`capitolul_3_2_lvm_pe_le_...` → `3-2-lvm-pe-le-lvextend-stratis`), nu din titlu, ca să nu se schimbe dacă Alex reformulează titlul.
5. **Simularea de examen în locul quiz-ului A–D.** Capitolele RHCSA nu au întrebări cu variante, ci „Simulare de Examen EX200”. Importul o împarte în:
   - secțiunea `exam`: cronometru (minutele din „Pune-ți cronometrul pe X minute”) + task-urile din Partea A;
   - carduri de recapitulare din Partea B, cu răspunsurile din „Răspunsurile la Întrebările de Diagnosticare” (`<capitol>.exam.json`); utilizatorul se notează singur („Am știut” / „N-am știut”), cu istoric și „Refă doar greșelile”;
   - secțiunea `solution` (rezolvarea task-urilor + scriptul de verificare), închisă implicit.
6. **Buton „Copiază” pe toate blocurile de cod**, pentru comenzile de laborator și scripturile de verificare.
7. **Diagramă Mermaid invalidă într-un capitol al lui Alex = avertisment, nu eroare de build.** Aplicația arată codul brut cu un mesaj, iar greșeala intră în `docs/PENTRU-ALEX.md`. Textul nu se corectează în tăcere. Pentru lecții care nu sunt ale lui Alex, diagrama invalidă tot oprește build-ul.
8. **Glosarul și registrul de surse pornesc goale.** Claude nu scrie conținut; bibliografia fiecărui capitol e în secțiunea „Bibliografie”.
9. **Culori:** gri închis + accent roșu (fără logo sau marcă Red Hat).
