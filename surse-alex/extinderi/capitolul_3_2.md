## architecture

### 2.5. Snapshot-uri LVM: Fotografia unui Volum Înaintea unei Operații Riscante

Un **snapshot** este un volum logic care reține starea altui volum la un moment dat. Nu copiază datele: ocupă spațiu doar pe măsură ce originalul se modifică, păstrând blocurile vechi (*copy-on-write*).

```bash
# Snapshot de 200 MiB pentru lv_app (200 MiB = câte MODIFICĂRI poate absorbi, nu dimensiunea datelor):
lvcreate -s -L 200M -n lv_app_snap /dev/vg_rhcsa/lv_app

# Cât din spațiul snapshot-ului s-a consumat (coloana Data%):
lvs vg_rhcsa
```

Două utilizări tipice:

**Recuperarea câtorva fișiere.** Montezi snapshot-ul doar pentru citire, alături de original. Dacă sistemul de fișiere este XFS, ai nevoie de `nouuid`, pentru că snapshot-ul are același UUID ca originalul:

```bash
mkdir -p /mnt/snap
mount -o ro,nouuid /dev/vg_rhcsa/lv_app_snap /mnt/snap    # la ext4: fără nouuid
cp -a /mnt/snap/fișier_șters /srv/app_lvm/
umount /mnt/snap
```

**Revenirea completă la starea din snapshot** (de exemplu după o actualizare eșuată):

```bash
umount /srv/app_lvm
lvconvert --merge /dev/vg_rhcsa/lv_app_snap
mount /srv/app_lvm
```

După contopire, snapshot-ul dispare, iar originalul are conținutul de la momentul fotografiei. Dacă volumul nu poate fi demontat (este `/`), contopirea se face la următoarea activare, adică la reboot.

Ce trebuie să știi despre limitele lor:

* Un snapshot care se **umple** (`Data%` ajunge la 100) devine invalid și nu mai poate fi folosit. Îl mărești din timp cu `lvextend -L +200M /dev/vg_rhcsa/lv_app_snap`.
* Cât timp există, fiecare scriere pe original costă o scriere în plus. Snapshot-urile se țin ore sau zile, nu luni.
* Un snapshot **nu este un backup**: stă pe aceleași discuri ca originalul și dispare odată cu ele.
* La final îl ștergi cu `lvremove /dev/vg_rhcsa/lv_app_snap`.

### 2.6. Scoaterea unui Disc dintr-un Volume Group: `pvmove`, `vgreduce`, `pvremove`

LVM îți permite să înlocuiești un disc fără să oprești aplicațiile. Ordinea operațiilor este inversă celei de la creare.

```bash
# 1. Ce PV-uri are grupul și cât e folosit din fiecare:
pvs -o +pv_used

# 2. Mută toate datele de pe discul care pleacă pe celelalte PV-uri din același VG (online!):
pvmove /dev/vdc1

# 3. Scoate PV-ul, acum gol, din grup:
vgreduce vg_rhcsa /dev/vdc1

# 4. Șterge eticheta LVM de pe dispozitiv:
pvremove /dev/vdc1
```

`pvmove` cere ca celelalte PV-uri să aibă destul spațiu liber pentru tot ce mută. Poate fi întrerupt și reluat (rulezi din nou `pvmove`, fără argumente) și poate dura mult pe volume mari.

Operația inversă, adăugarea unui disc nou, o știi deja: `pvcreate`, apoi `vgextend`. Combinate, cele două dau procedura de **migrare pe un disc nou**: adaugi discul nou în grup, muți datele cu `pvmove /dev/vechi /dev/nou`, scoți discul vechi.

### 2.7. Thin Provisioning în LVM: Volume Mai Mari Decât Spațiul Real

Un volum obișnuit își ocupă tot spațiul din momentul creării. Un volum **thin** ocupă doar ce scrii efectiv în el, luând blocuri dintr-un bazin comun (*thin pool*). Este același principiu pe care îl folosește Stratis.

```bash
# 1. Un thin pool de 1 GiB în grupul vg_rhcsa:
lvcreate --type thin-pool -L 1G -n pool0 vg_rhcsa

# 2. Două volume thin de câte 5 GiB "virtuali" (împreună: de zece ori cât bazinul):
lvcreate --type thin -V 5G -n lv_thin1 --thinpool pool0 vg_rhcsa
lvcreate --type thin -V 5G -n lv_thin2 --thinpool pool0 vg_rhcsa

# 3. Se formatează și se montează ca orice LV:
mkfs.xfs /dev/vg_rhcsa/lv_thin1

# 4. Cât din bazin s-a consumat cu adevărat (Data% și Meta% pe linia pool0):
lvs vg_rhcsa
```

Avantajul este flexibilitatea: promiți spațiu fără să îl ai încă. Riscul este pe măsură: dacă bazinul se umple, **toate** volumele din el dau erori de scriere. Un thin pool trebuie monitorizat și mărit din timp cu `lvextend -L +1G vg_rhcsa/pool0`.

Snapshot-urile volumelor thin sunt ele însele thin: nu le dai o dimensiune și nu se „umplu” separat, consumă din același bazin.

### 2.8. Redenumire, Activare și Recuperarea Configurației LVM

```bash
lvrename vg_rhcsa lv_app lv_aplicatie      # redenumește un LV
vgrename vg_rhcsa vg_productie             # redenumește un VG
vgchange -an vg_rhcsa                      # dezactivează toate LV-urile din grup
vgchange -ay vg_rhcsa                      # le activează la loc
lvs -a -o +devices                         # pe ce PV-uri se află fiecare LV
vgs -o +vg_free_count,vg_extent_count      # câte extents libere și totale are grupul
```

După o redenumire, calea `/dev/<vg>/<lv>` se schimbă. O linie din `/etc/fstab` care folosește calea veche va trimite sistemul în *Emergency Mode* la reboot. Liniile cu `UUID=` nu sunt afectate, ceea ce este încă un argument pentru UUID. Dacă redenumești grupul pe care se află `/`, trebuie actualizați și parametrii de boot (`rd.lvm.lv=`), deci pe un sistem real nu o faci fără un motiv serios.

**Copiile de siguranță ale metadatelor.** LVM salvează automat configurația fiecărui grup înaintea oricărei modificări, în `/etc/lvm/archive/`, iar starea curentă în `/etc/lvm/backup/`. Dacă ai șters din greșeală un LV și **nu ai scris încă nimic** peste spațiul lui, îl poți recupera:

```bash
vgcfgrestore --list vg_rhcsa               # versiunile salvate, cu data și comanda care le-a precedat
vgcfgrestore -f /etc/lvm/archive/vg_rhcsa_00012-1234567890.vg vg_rhcsa
lvchange -ay /dev/vg_rhcsa/lv_app
```

Se restaurează doar **harta** (ce extents aparțin cărui volum), nu datele. Dacă blocurile au fost între timp realocate altui volum, conținutul vechi este pierdut.

**Fișierul de dispozitive.** Începând cu RHEL 9, LVM folosește doar dispozitivele listate în `/etc/lvm/devices/system.devices`. `pvcreate` adaugă singur dispozitivul în listă, deci în mod normal nu observi nimic. Contează când atașezi un disc care era deja PV pe alt sistem: `pvs` nu îl arată până nu rulezi `lvmdevices --adddev /dev/vdd`.

### 2.9. Swap pe LVM și Operațiile de Întreținere Stratis

**Swap pe un volum logic.** Un LV poate fi folosit ca swap, cu avantajul că îl poți mări ulterior:

```bash
lvcreate -L 512M -n lv_swap vg_rhcsa
mkswap /dev/vg_rhcsa/lv_swap
echo "/dev/mapper/vg_rhcsa-lv_swap  none  swap  defaults  0 0" >> /etc/fstab
swapon -a

# Mărirea: swap-ul trebuie oprit, extins și reformatat
swapoff /dev/vg_rhcsa/lv_swap
lvextend -L 1G /dev/vg_rhcsa/lv_swap
mkswap /dev/vg_rhcsa/lv_swap
swapon -a
```

Pentru swap pe LVM, calea `/dev/mapper/...` în `/etc/fstab` este acceptabilă și are un avantaj: `mkswap` generează un UUID nou la fiecare reformatare, deci o linie cu `UUID=` ar trebui actualizată după fiecare mărire.

**Stratis, comenzi de întreținere:**

| Comandă | Ce face |
| :--- | :--- |
| `stratis pool list` | Dimensiunea totală a pool-ului și cât este ocupat **fizic**. |
| `stratis filesystem list` | Sistemele de fișiere, dimensiunea lor virtuală și spațiul folosit. |
| `stratis blockdev list` | Dispozitivele care compun fiecare pool. |
| `stratis filesystem rename pool vechi nou` | Redenumește un sistem de fișiere. |
| `stratis filesystem destroy pool fs` | Șterge un sistem de fișiere (întâi demontat și scos din `/etc/fstab`). |
| `stratis pool destroy pool` | Șterge pool-ul (întâi distruse toate sistemele de fișiere din el). |

`df -h` pe un sistem de fișiere Stratis arată o dimensiune virtuală foarte mare (de ordinul unui terabyte), indiferent de mărimea reală a pool-ului. Nu este o eroare: sistemul de fișiere este thin și crește la cerere. Spațiul real îl citești doar cu `stratis pool list`.

Un snapshot Stratis (`stratis filesystem snapshot`) este un sistem de fișiere de sine stătător: îl montezi ca pe oricare altul din `/dev/stratis/<pool>/<snapshot>`, cu aceeași opțiune `x-systemd.requires=stratisd.service` dacă îl treci în `/etc/fstab`.

### 2.10. LVM-VDO: Două Dimensiuni de Urmărit și Două Feluri de Extindere

Un volum VDO are o dimensiune **fizică** (spațiul ocupat efectiv pe disc, în bazinul VDO) și una **virtuală** (cât vede sistemul de fișiere). Raportul dintre ele depinde de cât de bine se deduplică și se comprimă datele tale.

```bash
lvs -o name,size,data_percent,pool_lv vg_vdo     # cât la sută din bazinul fizic este ocupat
vdostats --human-readable                        # spațiu folosit, disponibil și procentul economisit
df -h /mnt/vdo_storage                           # ce vede sistemul de fișiere (dimensiunea VIRTUALĂ)
```

Cifra de urmărit este ocuparea bazinului **fizic**. `df` poate arăta 80% liber în timp ce bazinul este aproape plin, dacă datele nu se deduplică bine. Când bazinul fizic se umple, scrierile eșuează, deși `df` încă raportează spațiu liber.

Cele două dimensiuni se extind separat:

```bash
# Spațiul FIZIC: mărește bazinul VDO (ai nevoie de extents libere în grup)
lvextend -L +5G vg_vdo/vpool0

# Dimensiunea VIRTUALĂ: mărește volumul și sistemul de fișiere de pe el
lvextend -r -L +20G vg_vdo/lv_vdo
```

Numele bazinului (`vpool0` în exemplu) este ales automat la creare; îl vezi cu `lvs -a vg_vdo`. Ca la orice thin provisioning, dimensiunea virtuală este o promisiune: mărește-o doar dacă știi că datele tale chiar se comprimă.

## exam-alert

### ⚠️ Capcană în plus: „Folosiți tot spațiul rămas” scris cu `-L` în loc de `-l`
Procentele funcționează doar cu `-l` (litera mică): `lvcreate -l 100%FREE -n lv_date vg1` sau `lvextend -r -l +100%FREE /dev/vg1/lv_date`. `-L 100%FREE` este o eroare de sintaxă. Variantele utile: `100%FREE` (tot spațiul liber din grup), `50%VG` (jumătate din grup), `+100%FREE` (la extindere: adaugă tot ce a rămas).

### ⚠️ Capcană în plus: Dimensiunea „aproximativă” cerută în enunț
Când enunțul cere un volum „între 750 MiB și 800 MiB”, verifică rezultatul cu `lvs --units m`, nu cu `df -h`. `df` arată spațiul utilizabil din sistemul de fișiere, care este mai mic decât volumul cu dimensiunea structurilor interne, și rotunjește afișarea. Dacă ai cerut o valoare care nu se împarte exact la dimensiunea unui extent, LVM rotunjește **în sus**: alege o valoare din mijlocul intervalului, ca rotunjirea să nu te scoată din el.

## interview

### Întrebare în plus (Nivel Mid -> Senior):
> **Intervievator:** *„Un volum logic se întinde pe două discuri fizice, în configurația implicită. Unul dintre discuri se defectează. Ce se întâmplă cu datele? Și ce ar fi trebuit făcut ca să nu se întâmple?”*

**Răspunsul Ideal:**
> „În configurația implicită, un LV este **liniar**: extents de pe primul disc, apoi de pe al doilea, puse cap la cap. LVM singur nu oferă nicio redundanță. Dacă un disc se defectează, lipsește o parte din volum, iar sistemul de fișiere de deasupra este, practic, pierdut: chiar dacă fișierele de pe discul bun mai există fizic, structurile sistemului de fișiere sunt incomplete. LVM este flexibilitate, nu protecție.
>
> Redundanța se obține în unul din două feluri. Fie sub LVM, construind PV-urile pe ceva deja redundant: un RAID hardware, un RAID software `mdadm` sau un volum dintr-o rețea de stocare. Fie chiar în LVM, creând volumul ca RAID: `lvcreate --type raid1 -m 1 -L 10G -n lv_date vg1` ține două copii ale datelor pe două PV-uri diferite. `lvs -a -o +devices` arată pe ce discuri stă fiecare copie, iar `lvs -o +sync_percent` arată starea sincronizării.
>
> După defectarea unui disc dintr-un LV `raid1`, volumul rămâne utilizabil. Adaug un disc nou în grup cu `vgextend`, refac oglinda cu `lvconvert --repair vg1/lv_date` și scot discul defect cu `vgreduce --removemissing vg1`.
>
> Niciuna dintre variante nu înlocuiește backup-ul: RAID protejează de defectarea unui disc, nu de un `rm -rf` sau de o aplicație care își corupe datele.”
