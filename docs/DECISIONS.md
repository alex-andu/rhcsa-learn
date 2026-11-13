# Decizii

Decizii luate fără a întreba (reversibile). Cea mai nouă sus.

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
