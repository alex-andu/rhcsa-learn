## architecture

### 2.6. Opțiunile de Montare care Contează și Verificarea lui `/etc/fstab` Înainte de Reboot

Coloana a patra din `/etc/fstab` nu trebuie să fie mereu `defaults`. Câteva opțiuni schimbă securitatea, performanța sau comportamentul la boot:

| Opțiune | Efect | Unde o folosești |
| :--- | :--- | :--- |
| `ro` | Doar citire. | Date de referință, medii de instalare. |
| `noexec` | Nu se pot executa programe de pe acest sistem de fișiere. | `/tmp`, `/var/tmp`, partiții de date. |
| `nosuid` | Biții SUID și SGID sunt ignorați. | Partiții pe care scriu utilizatorii. |
| `nodev` | Fișierele de tip dispozitiv sunt ignorate. | Orice în afară de `/dev`. |
| `noatime` | Nu se mai actualizează timpul de acces la citire. | Volume cu multe citiri (mai puține scrieri pe disc). |
| `nofail` | Dacă dispozitivul lipsește la boot, sistemul pornește oricum. | Discuri externe, volume neesențiale. |
| `x-systemd.device-timeout=10s` | Cât așteaptă `systemd` apariția dispozitivului (implicit 90 de secunde). | Împreună cu `nofail`. |
| `_netdev` | Montarea așteaptă rețeaua. | NFS, iSCSI (Capitolul 3.3). |

`nofail` merită înțeles bine. Fără el, un dispozitiv lipsă trimite sistemul în *Emergency Mode*. Cu el, montarea respectivă este sărită și serverul rămâne accesibil prin SSH, de unde poți repara. Pentru volumele de care depinde o aplicație, lipsa montării trebuie totuși observată, deci nu pune `nofail` din reflex pe orice.

**Verificarea fără reboot.** Pe lângă `mount -a`, există o comandă care analizează `/etc/fstab` fără să monteze nimic:

```bash
findmnt --verify
```

Raportează dispozitive inexistente, tipuri de sisteme de fișiere care nu corespund cu ce este pe disc, puncte de montare lipsă și opțiuni necunoscute. Folosite împreună, `findmnt --verify`, `systemctl daemon-reload` și `mount -a` prind practic orice greșeală înainte să te coste un reboot ratat.

Alte forme utile:

```bash
findmnt /mnt/data            # ce este montat într-un punct: sursă, tip, opțiuni efective
findmnt -t xfs,ext4          # doar sistemele de fișiere de anumite tipuri
mount -o remount,noexec /mnt/data    # schimbă opțiunile unui sistem de fișiere deja montat
```

### 2.7. Demontarea și Eroarea „target is busy”

`umount /mnt/data` eșuează cu *target is busy* dacă un proces folosește sistemul de fișiere: are un fișier deschis acolo sau, foarte des, directorul lui curent este în interior (inclusiv shell-ul tău, dacă ai rămas cu `cd` în el).

```bash
# Cine ține ocupat punctul de montare:
lsof +f -- /mnt/data
fuser -vm /mnt/data          # din pachetul psmisc: utilizator, PID și tipul de acces

# Ieși din director și încearcă din nou:
cd / && umount /mnt/data

# Ultima soluție: demontare 'leneșă' (se detașează acum, se închide când nu mai e folosit):
umount -l /mnt/data
```

`umount -l` ascunde problema, nu o rezolvă: procesele continuă să scrie pe un sistem de fișiere pe care tu nu îl mai vezi. Nu îl folosi înainte de `mkfs`, `fsck` sau de scoaterea discului.

### 2.8. Întreținere: Informații, Verificare, Reparare și Ștergerea Semnăturilor

| Operație | XFS | ext4 |
| :--- | :--- | :--- |
| Informații despre sistemul de fișiere | `xfs_info /punct_de_montare` | `tune2fs -l /dev/vdb2` sau `dumpe2fs -h /dev/vdb2` |
| Verificare fără modificări | `xfs_repair -n /dev/vdb1` | `e2fsck -n /dev/vdb2` |
| Reparare | `xfs_repair /dev/vdb1` | `e2fsck -f -y /dev/vdb2` |
| Schimbarea etichetei | `xfs_admin -L NUME /dev/vdb1` | `e2label /dev/vdb2 NUME` |
| UUID nou | `xfs_admin -U generate /dev/vdb1` | `tune2fs -U random /dev/vdb2` |

Regula comună: **verificarea și repararea se fac doar pe un sistem de fișiere demontat.** Rulate pe unul montat, pot produce exact stricăciunile pe care voiai să le repari.

De ce nu există „`fsck` la boot” pentru XFS: XFS își reface singur consistența la montare, din jurnal. De aceea coloana a șasea din `/etc/fstab` este `0` pentru XFS, iar `fsck.xfs` este o comandă care nu face nimic. Dacă jurnalul însuși este deteriorat, `xfs_repair` îți va spune să încerci întâi o montare; abia dacă nici aceea nu reușește, se folosește `xfs_repair -L`, care șterge jurnalul și poate pierde ultimele scrieri.

**Semnături vechi.** Un disc refolosit poate purta urme ale vechii utilizări (LVM, RAID, alt sistem de fișiere), iar unele comenzi refuză să lucreze pe el.

```bash
wipefs /dev/vdc1          # doar AFIȘEAZĂ semnăturile găsite
wipefs -a /dev/vdc1       # le ȘTERGE pe toate (datele devin inaccesibile!)
```

`wipefs -a` este soluția curată când `pvcreate` sau `mkfs` se plâng că dispozitivul conține deja ceva. Verifică de două ori numele dispozitivului înainte.

**Sistemul de fișiere `vfat`.** Obiectivele examenului îl menționează alături de `xfs` și `ext4`. Se creează cu `mkfs.vfat /dev/vdb5` (pachetul `dosfstools`) și se montează cu tipul `vfat` în `/etc/fstab`. Nu are proprietari și permisiuni Linux: tot conținutul apare ca aparținând utilizatorului care l-a montat, lucru controlat prin opțiunile `uid=`, `gid=` și `umask=`.

### 2.9. Spațiul Liber Văzut Corect: `df`, Blocuri Rezervate și Spațiul Nealocat

```bash
df -hT                   # spațiu pe fiecare sistem de fișiere montat, cu tipul lui
df -i                    # inode-uri folosite și libere
lsblk -o NAME,SIZE,FSTYPE,FSAVAIL,FSUSE%,MOUNTPOINTS    # discuri, partiții și spațiu liber
parted -s /dev/vdb unit MiB print free                  # include zonele NEALOCATE ale discului
```

Ultima comandă răspunde la întrebarea pe care ți-o pui înainte de orice `mkpart`: de la ce megabyte până la ce megabyte mai este loc pe disc. Liniile marcate *Free Space* îți dau exact valorile de început și de sfârșit de care ai nevoie.

**De ce `df` arată mai puțin decât dimensiunea partiției.** O parte din spațiu este ocupată de structurile interne (jurnal, tabele de inode-uri). În plus, `ext4` rezervă implicit **5% din blocuri pentru `root`**, ca sistemul să mai poată funcționa când utilizatorii obișnuiți umplu discul. Pe un volum mare de date, 5% este mult și se poate reduce:

```bash
tune2fs -l /dev/vdb2 | grep -i "reserved block count"
tune2fs -m 1 /dev/vdb2       # reduce rezerva la 1%
```

XFS nu are această rezervă pentru `root`.

### 2.10. Swap: Cât, Cum Îl Scoți și Cum Îl Prioritizezi

Recomandarea orientativă Red Hat pentru dimensiunea spațiului swap:

| Memorie RAM | Swap recomandat |
| :--- | :--- |
| Sub 2 GB | De două ori memoria RAM |
| 2–8 GB | Egal cu memoria RAM |
| 8–64 GB | Cel puțin 4 GB |
| Peste 64 GB | Cel puțin 4 GB |

În examen folosești întotdeauna dimensiunea cerută în enunț, nu tabelul.

```bash
swapon --show                # dispozitivele swap active, dimensiune, cât e folosit, prioritate
free -h                      # totalul, pe scurt
swapoff /dev/vdb3            # dezactivează un swap (conținutul lui se mută înapoi în RAM)
swapoff -a                   # dezactivează tot swap-ul
```

`swapoff` reușește doar dacă există destulă memorie liberă pentru paginile aflate în swap. Ca să scoți definitiv un swap, ordinea este: `swapoff`, ștergerea liniei din `/etc/fstab`, apoi ștergerea partiției.

**Prioritatea.** Când există mai multe zone de swap, kernelul o umple întâi pe cea cu prioritatea cea mai mare (`pri=` mai mare). Două zone cu aceeași prioritate sunt folosite alternativ, ceea ce împarte scrierile între discuri. Fără `pri=`, fiecare zonă primește automat o prioritate negativă, în ordinea activării.

Cât de dispus este kernelul să folosească swap-ul hotărăște parametrul `vm.swappiness` (Capitolul 0.1). Un swap folosit nu este în sine o problemă; problema este un sistem care mută **continuu** pagini în și din swap, lucru vizibil în coloanele `si` și `so` din `vmstat 1`.

### 2.11. Mărirea unei Partiții Obișnuite, Fără LVM

Dacă discul virtual a fost mărit din hypervisor, sau dacă imediat după partiție a rămas spațiu nealocat, partiția poate fi extinsă pe loc. Sunt doi pași: întâi partiția, apoi sistemul de fișiere.

```bash
# 1. Unde se termină partiția și cât spațiu liber este după ea:
parted -s /dev/vdb unit MiB print free

# 2. Mută sfârșitul partiției 4 la 6000 MiB (sau la 100%, pentru tot spațiul rămas):
parted -s /dev/vdb resizepart 4 6000MiB
partprobe /dev/vdb && udevadm settle

# 3. Extinde sistemul de fișiere peste noul spațiu:
xfs_growfs /srv/xfs_exam          # XFS: primește punctul de montare, se face cu sistemul montat
resize2fs /dev/vdb5               # ext4: primește dispozitivul
```

Limitele metodei: se poate extinde doar spre **dreapta**, în spațiul liber aflat imediat după partiție. Dacă acolo începe altă partiție, nu ai unde crește. Începutul unei partiții nu se mută, iar micșorarea rămâne imposibilă pentru XFS. Tocmai aceste limite sunt motivul pentru care volumele care trebuie să crească se pun pe LVM (Capitolul 3.2).

Pe mașinile din cloud există și scurtătura `growpart /dev/vdb 4` (pachetul `cloud-utils-growpart`), care extinde partiția până la capătul discului într-un singur pas.

## exam-alert

### ⚠️ Capcană în plus: Kernelul nu vede partiția nou creată
După `fdisk` sau `parted` pe un disc care are deja partiții montate, tabela de pe disc este actualizată, dar kernelul poate lucra în continuare cu cea veche. Simptome: `lsblk` nu arată partiția nouă, sau `mkfs` răspunde *No such file or directory*. Rulează `partprobe /dev/vdb` urmat de `udevadm settle` și verifică din nou cu `lsblk`. Nu trece la `mkfs` până nu vezi partiția.

### ⚠️ Capcană în plus: `mkfs` pe dispozitivul greșit
`mkfs` nu cere confirmare (XFS refuză doar dacă găsește deja un sistem de fișiere, iar `-f` trece și peste asta). O cifră greșită, `/dev/vdb1` în loc de `/dev/vdb4`, distruge o partiție la care ai muncit la task-ul anterior. Înaintea fiecărui `mkfs`, rulează `lsblk -fp` și confirmă că dispozitivul țintă are coloana `FSTYPE` goală și nu este montat.

## interview

### Întrebare în plus (Nivel Mid -> Senior):
> **Intervievator:** *„Ai clonat discul unui server (sau ai atașat un snapshot al aceluiași volum) pe aceeași mașină, ca să recuperezi câteva fișiere. Când încerci să montezi partiția XFS de pe clonă, primești `wrong fs type, bad option, bad superblock`. Partiția este sănătoasă. Ce se întâmplă?”*

**Răspunsul Ideal:**
> „Clona are **același UUID** de sistem de fișiere ca originalul, care este deja montat. XFS refuză să monteze două sisteme de fișiere cu același UUID, ca protecție împotriva montării aceluiași volum pe două căi. Mesajul din `mount` este generic, dar cauza reală apare în jurnalul kernelului: `dmesg | tail` arată *Filesystem has duplicate UUID - can't mount*.
>
> Am două soluții, în funcție de scop. Dacă vreau doar să citesc câteva fișiere, montez temporar ignorând verificarea: `mount -o nouuid,ro /dev/vdc1 /mnt/clona`. Dacă clona va rămâne atașată permanent, îi dau un UUID nou, cu ea demontată: `xfs_admin -U generate /dev/vdc1`.
>
> Aceeași situație provoacă o problemă mai subtilă cu `/etc/fstab`: dacă două dispozitive au același UUID, o linie `UUID=...` poate monta la boot dispozitivul greșit. De aceea, după orice clonare verific cu `lsblk -f` sau `blkid` că nu există UUID-uri duplicate. La LVM apare problema echivalentă, cu UUID-uri de PV și nume de VG identice, care se rezolvă cu `vgimportclone`.”
