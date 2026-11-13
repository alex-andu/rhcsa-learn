# Pentru Alex: de corectat în capitole

Textul tău intră neschimbat în platformă. Aici sunt problemele de formatare găsite la import; după ce le corectezi în fișierul tău, rulează din nou importul.

## Capitolul 4.1 — diagrama din secțiunea 2.2 (arhitectura NetworkManager)

Diagrama Mermaid nu se poate desena (în platformă apare codul brut). Cauza: eticheta săgeții conține paranteze fără ghilimele:

```
NM <-->|Citește & Scrie Persistent\n(Permisiuni 0600)| Keyfiles[...]
```

Corectura: pune eticheta între ghilimele.

```
NM <-->|"Citește & Scrie Persistent\n(Permisiuni 0600)"| Keyfiles[...]
```

## Lipsește `cuprins.md`

Fără cuprins, pilonii apar doar ca „Pilonul 2”, „Pilonul 3”, „Pilonul 4”, iar capitolele nescrise încă nu apar pe pagina Curriculum. Cu `cuprins.md` (același format ca la VMware: `## PILONUL N: titlu`, `_Obiectiv: …_`, `### Capitolul X.Y: titlu`, subiectele `- **X.Y.Z.** …`) apar titlurile pilonilor, obiectivele și capitolele „planificat”.
