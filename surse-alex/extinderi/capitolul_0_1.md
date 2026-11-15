## architecture

### 2.6. Ciclul de Viață RHEL, Versiunile Minore și Abonamentul (`subscription-manager`)

Un server enterprise nu se reinstalează la fiecare șase luni, așa că trebuie să știi cât timp este întreținută versiunea pe care lucrezi și de unde vin actualizările.

**Cum citești o versiune RHEL.** În `RHEL 9.4`, cifra `9` este versiunea majoră (apare o dată la aproximativ trei ani și poate schimba comportamente), iar `4` este versiunea minoră (apare cam la șase luni și aduce corecții și funcții noi, fără să strice compatibilitatea).

| Ce vrei să afli | Comanda | Ce vezi |
| :--- | :--- | :--- |
| Versiunea distribuției | `cat /etc/redhat-release` | `Red Hat Enterprise Linux release 9.4 (Plow)` |
| Aceeași informație, în format citibil de scripturi | `cat /etc/os-release` | Variabilele `NAME`, `VERSION_ID`, `ID` |
| Versiunea kernelului care rulează acum | `uname -r` | `5.14.0-...el9` pe RHEL 9, `6.12.0-...el10` pe RHEL 10 |
| Totul pe un singur ecran | `hostnamectl` | Hostname, sistem de operare, kernel, tip de virtualizare |

**Fazele de suport.** O versiune majoră RHEL este întreținută aproximativ zece ani, în două faze mari: *Full Support* (primii ani: funcții noi, suport pentru hardware nou, corecții) și *Maintenance Support* (restul: doar corecții de securitate și erori grave). De aceea în producție vei întâlni des servere cu o versiune majoră mai veche decât cea curentă, perfect legitime.

**De ce vezi versiuni „vechi” de programe.** Red Hat nu urcă versiunea unui program în timpul vieții unei versiuni majore, ci aduce corecțiile de securitate în versiunea existentă (*backporting*). Un `httpd-2.4.57` din RHEL poate avea reparate vulnerabilități care în proiectul original au fost reparate abia în `2.4.60`. Concluzia practică: nu judeca securitatea unui pachet RHEL după numărul versiunii, ci după `rpm -q --changelog <pachet>`.

**Abonamentul.** Depozitele oficiale Red Hat sunt accesibile doar sistemelor înregistrate:

```bash
# Înregistrarea sistemului la Red Hat (cere utilizatorul și parola contului Red Hat):
subscription-manager register

# Ce depozite sunt active pe acest sistem:
subscription-manager repos --list-enabled

# Starea înregistrării:
subscription-manager status
```

Pentru studiu, Red Hat oferă gratuit *Red Hat Developer Subscription for Individuals*. În examenul EX200 **nu** folosești `subscription-manager`: acolo depozitele sunt servere din rețeaua de examen, configurate manual în `/etc/yum.repos.d/` (Capitolul 2.2).

### 2.7. Modulele de Kernel: `lsmod`, `modinfo`, `modprobe`

În secțiunea 2.2 ai văzut că driverele rulează în *Kernel Space*. Cele mai multe nu sunt compilate în kernel, ci stau pe disc ca **module** (`.ko`, comprimate ca `.ko.xz`) în `/lib/modules/$(uname -r)/` și sunt încărcate la cerere.

```bash
# Modulele încărcate acum (nume, dimensiune, de cine sunt folosite):
lsmod

# Informații despre un modul: descriere, parametri acceptați, calea fișierului:
modinfo xfs

# Încărcarea unui modul împreună cu dependențele lui:
modprobe dm_thin_pool

# Descărcarea unui modul (reușește doar dacă nu îl folosește nimeni):
modprobe -r dm_thin_pool
```

`modprobe` are efect doar până la reboot. Persistența se face prin două directoare:

| Director | La ce folosește | Exemplu de fișier |
| :--- | :--- | :--- |
| `/etc/modules-load.d/*.conf` | Lista modulelor încărcate la fiecare boot, câte un nume pe linie | `/etc/modules-load.d/thin.conf` cu linia `dm_thin_pool` |
| `/etc/modprobe.d/*.conf` | Parametri pentru module și interzicerea încărcării lor | `blacklist pcspkr` sau `options <modul> <parametru>=<valoare>` |

De regulă nu încarci module manual: `udev` încarcă driverul potrivit când apare un dispozitiv, iar comenzi ca `mkfs.xfs`, `lvcreate` sau `podman` își cer singure modulele.

### 2.8. `sysctl` în Detaliu: Unde Stau Parametrii și în Ce Ordine Sunt Citiți

Parametrii de kernel din `/proc/sys/` se citesc și se scriu cu `sysctl`. Numele folosește puncte în loc de slash-uri: `net.ipv4.ip_forward` este fișierul `/proc/sys/net/ipv4/ip_forward`.

```bash
# Toți parametrii și valorile lor curente:
sysctl -a

# Un singur parametru:
sysctl net.ipv4.ip_forward

# Schimbare doar la runtime (se pierde la reboot):
sysctl -w net.ipv4.ip_forward=1
```

La boot, `systemd-sysctl.service` citește fișierele `.conf` din mai multe directoare. Când același parametru apare în două locuri, câștigă cel citit ultimul:

| Ordine | Loc | Cine scrie aici |
| :---: | :--- | :--- |
| 1 | `/usr/lib/sysctl.d/*.conf` | Pachetele RPM. Nu edita aici, fișierele se suprascriu la actualizare. |
| 2 | `/run/sysctl.d/*.conf` | Setări temporare, dispar la reboot. |
| 3 | `/etc/sysctl.d/*.conf` | **Administratorul.** Aici pui setările tale persistente. |
| 4 | `/etc/sysctl.conf` | Fișierul istoric, citit și el. |

Fișierele dintr-un director sunt citite în ordine alfabetică, de aceea numele încep cu un număr (`99-custom.conf` se citește după `10-default.conf`). După ce scrii un fișier, îl aplici fără reboot:

```bash
# Scriem setarea persistentă:
echo "vm.swappiness = 10" > /etc/sysctl.d/99-swappiness.conf

# Reîncărcăm toate fișierele, în ordinea de la boot (afișează fiecare fișier citit):
sysctl --system

# Sau doar un fișier anume:
sysctl -p /etc/sysctl.d/99-swappiness.conf
```

Parametri pe care îi vei întâlni des:

| Parametru | Ce controlează |
| :--- | :--- |
| `net.ipv4.ip_forward` | Dacă sistemul rutează pachete între interfețe (`1`) sau nu (`0`). |
| `vm.swappiness` | Cât de dispus este kernelul să mute pagini în swap (`0`–`100`, mai mic înseamnă mai rar). |
| `fs.file-max` | Numărul maxim de fișiere deschise în tot sistemul. |
| `kernel.sysrq` | Dacă este activă combinația de taste de urgență *Magic SysRq*. |
| `net.ipv4.ip_unprivileged_port_start` | Primul port pe care îl poate deschide un utilizator obișnuit (implicit `1024`); contează la containerele rootless din Capitolul 5.1. |

### 2.9. Comenzile cu care Faci Cunoștință cu un Server Necunoscut

Primul minut pe un server pe care nu l-ai mai văzut (inclusiv pe `node1` în examen) merită cheltuit cu un inventar. Toate comenzile de mai jos doar citesc, nu schimbă nimic:

| Întrebare | Comandă | Pe ce te uiți |
| :--- | :--- | :--- |
| Ce procesor am? | `lscpu` | `CPU(s)`, `Model name`, `Hypervisor vendor` |
| Câte nuclee vede sistemul? | `nproc` | Un singur număr; îl compari cu *load average* |
| Câtă memorie și cât swap? | `free -h` | Coloana `available`, nu `free` |
| Ce discuri și partiții? | `lsblk -fp` | `FSTYPE`, `UUID`, `MOUNTPOINTS` |
| Cât spațiu liber? | `df -Th` | `Use%` pe fiecare sistem de fișiere |
| De cât timp merge și cât e de încărcat? | `uptime` | Cele trei valori *load average* (1, 5, 15 minute) |
| Sunt mașină virtuală? | `systemd-detect-virt` | `kvm`, `vmware`, `none` |
| Cu ce parametri a pornit kernelul? | `cat /proc/cmdline` | `root=`, `ro`, `rhgb quiet` |
| Ce a spus kernelul la pornire și despre hardware? | `dmesg -T \| less` | Erori de disc, de rețea, mesaje *Out of memory* |
| Ce servicii au eșuat? | `systemctl --failed` | Lista ar trebui să fie goală |

De ce `available` și nu `free` la memorie: Linux folosește memoria liberă drept cache pentru fișiere (*page cache*) și o eliberează imediat când o aplicație are nevoie de ea. Coloana `free` arată doar memoria nefolosită deloc, care pe un server sănătos este mică. Coloana `available` estimează câtă memorie poate primi o aplicație nouă, cu tot cu cache-ul care poate fi eliberat.

### 2.10. `/proc` și `/sys` de Aproape: Ce Poți Afla Fără Nicio Unealtă

În secțiunea 2.3 ai văzut că `/proc` și `/sys` nu sunt directoare de pe disc, ci ferestre către memoria kernelului. Merită să știi câteva „adrese” pe dinafară, pentru că funcționează pe orice sistem Linux, chiar și pe unul minimal, fără pachete instalate.

**Informații despre sistem:**

| Fișier | Ce conține |
| :--- | :--- |
| `/proc/cpuinfo` | Câte o secțiune pentru fiecare nucleu: model, frecvență, capabilități (`flags`). |
| `/proc/meminfo` | Memoria în detaliu: `MemTotal`, `MemAvailable`, `SwapTotal`, `SwapFree`. De aici citește `free`. |
| `/proc/loadavg` | Cele trei valori *load average*, plus numărul de procese. De aici citește `uptime`. |
| `/proc/cmdline` | Parametrii cu care a pornit kernelul. |
| `/proc/mounts` | Ce este montat acum, așa cum vede kernelul (mai de încredere decât `/etc/fstab`, care spune doar ce **ar trebui** montat). |
| `/proc/partitions` | Discurile și partițiile cunoscute de kernel. |
| `/proc/swaps` | Zonele de swap active. |
| `/proc/version` | Versiunea kernelului și compilatorul cu care a fost construit. |

**Informații despre un proces.** Fiecare proces are un director `/proc/<PID>/`. Pentru shell-ul curent există scurtătura `/proc/self/`.

| Cale | Ce găsești |
| :--- | :--- |
| `/proc/<PID>/cmdline` | Comanda completă cu care a fost pornit procesul. |
| `/proc/<PID>/status` | Nume, stare, UID-uri, memorie folosită, într-o formă ușor de citit. |
| `/proc/<PID>/environ` | Variabilele de mediu ale procesului (separate prin caracterul nul). |
| `/proc/<PID>/cwd` | Legătură simbolică spre directorul curent al procesului. |
| `/proc/<PID>/exe` | Legătură simbolică spre executabilul care rulează. |
| `/proc/<PID>/fd/` | Câte o legătură pentru fiecare fișier deschis; aici vezi cu ochii tăi descriptorii `0`, `1` și `2`. |
| `/proc/<PID>/limits` | Limitele de resurse aplicate procesului. |

```bash
# Ce fișiere are deschise procesul sshd principal:
ls -l /proc/$(pgrep -o sshd)/fd

# Variabilele de mediu ale unui proces, câte una pe linie:
tr '\0' '\n' < /proc/$(pgrep -o sshd)/environ

# În ce director "stă" un proces (util când un umount spune 'target is busy'):
ls -l /proc/1234/cwd
```

**`/sys`, pe scurt.** Aici kernelul își expune dispozitivele și driverele, organizate ierarhic:

| Cale | Ce găsești |
| :--- | :--- |
| `/sys/class/net/<interfață>/address` | Adresa MAC a plăcii de rețea. |
| `/sys/class/net/<interfață>/operstate` | `up` sau `down`. |
| `/sys/block/<disc>/size` | Dimensiunea discului, în sectoare de 512 octeți. |
| `/sys/block/<disc>/queue/scheduler` | Planificatorul de I/O; cel activ apare între paranteze drepte. |
| `/sys/fs/cgroup/` | Ierarhia *control groups*, pe care `systemd` își construiește serviciile. |
| `/sys/fs/selinux/enforce` | `1` dacă SELinux este în `Enforcing`, `0` în `Permissive`. |

Ca regulă: în `/proc/sys` scrii prin `sysctl`, iar restul din `/proc` și `/sys` îl citești. Scrierea directă în `/sys` are efect imediat și se pierde la reboot, exact ca `sysctl -w`.

### 2.11. De la Hardware la `/dev`: `udev` și Numele Stabile ale Dispozitivelor

Când kernelul descoperă un dispozitiv (la boot sau când îl conectezi), trimite un eveniment către `systemd-udevd`. Acesta aplică regulile din `/usr/lib/udev/rules.d/` și `/etc/udev/rules.d/`, creează fișierul din `/dev`, îi stabilește permisiunile și adaugă **legături simbolice cu nume stabile**.

De ce contează numele stabile: `/dev/sdb` înseamnă doar „al doilea disc descoperit”. Dacă adaugi un disc sau se schimbă ordinea de detectare, același disc poate deveni `/dev/sdc`. Legăturile din `/dev/disk/` nu se schimbă:

| Director | Numele este construit din | Exemplu de folosire |
| :--- | :--- | :--- |
| `/dev/disk/by-uuid/` | UUID-ul sistemului de fișiere | Montări în `/etc/fstab` (`UUID=...`). |
| `/dev/disk/by-label/` | Eticheta sistemului de fișiere | Montări după `LABEL=...`. |
| `/dev/disk/by-id/` | Modelul și numărul de serie al discului | Identificarea unui disc fizic anume. |
| `/dev/disk/by-path/` | Poziția pe magistrală (controller, port) | „Discul din slotul 3”. |
| `/dev/disk/by-partuuid/` | Identificatorul partiției din tabela GPT | Unele configurații de boot. |

```bash
ls -l /dev/disk/by-uuid/                                    # ce UUID duce la ce dispozitiv
udevadm info --query=property --name=/dev/vda | head -20    # tot ce știe udev despre un dispozitiv
udevadm monitor                                             # evenimentele, în timp real (Ctrl+C la final)
udevadm settle                                              # așteaptă până când udev a terminat de procesat
```

Ultima comandă o vei folosi în capitolele de stocare: după ce creezi o partiție, `udevadm settle` te asigură că fișierul `/dev/vdb1` există înainte să rulezi `mkfs` pe el.

Pentru inventarul hardware: `lspci` (plăci pe magistrala PCI), `lsusb` (dispozitive USB), `lsblk` (discuri), `lscpu` (procesor), `dmidecode -t system` (producător și model, pe hardware fizic).

### 2.12. `systemd-tmpfiles`: Directoare și Fișiere Recreate la Fiecare Boot

`/run` și `/tmp` sunt golite la repornire. Multe servicii au însă nevoie de un director în `/run` cu anumite permisiuni. Soluția standard în RHEL este `systemd-tmpfiles`: descrii într-un fișier ce trebuie să existe, iar sistemul creează totul la fiecare boot.

Fișierele de configurare au extensia `.conf` și stau în trei locuri, cu aceeași regulă de prioritate ca la `sysctl`: `/usr/lib/tmpfiles.d/` (pachete), `/run/tmpfiles.d/` (temporar), `/etc/tmpfiles.d/` (administrator, câștigă).

Fiecare linie are până la șapte câmpuri: tip, cale, permisiuni, proprietar, grup, vârstă, argument.

```text
# /etc/tmpfiles.d/aplicatie.conf
d  /run/aplicatie        0750  appuser  appgroup  -    -
f  /run/aplicatie/stare  0640  appuser  appgroup  -    -
d  /var/tmp/rapoarte     1777  root     root      10d  -
L  /opt/curent           -     -        -         -    /opt/aplicatie-2.4
```

| Tip | Efect |
| :---: | :--- |
| `d` | Creează directorul dacă lipsește; dacă este dată o vârstă, curăță periodic ce e mai vechi. |
| `D` | Ca `d`, dar golește directorul și la fiecare boot. |
| `f` | Creează fișierul dacă lipsește. |
| `L` | Creează o legătură simbolică spre calea din ultimul câmp. |
| `z` / `Z` | Reface permisiunile, proprietarul și contextul SELinux (`Z` = recursiv). |
| `r` / `R` | Șterge calea la boot (`R` = recursiv). |

```bash
systemd-tmpfiles --create /etc/tmpfiles.d/aplicatie.conf    # aplică acum, fără reboot
systemd-tmpfiles --clean                                    # șterge acum ce a depășit vârsta
systemctl list-timers systemd-tmpfiles-clean.timer          # curățenia automată, zilnică
```

În al treilea rând din exemplu, `10d` înseamnă că fișierele din `/var/tmp/rapoarte` neatinse de zece zile sunt șterse automat. Tot prin acest mecanism se golește periodic `/tmp` (regulile sunt în `/usr/lib/tmpfiles.d/tmp.conf`). Dacă vrei alt comportament, **nu** edita fișierul din `/usr/lib`, ci copiază-l cu același nume în `/etc/tmpfiles.d/` și modifică copia.

### 2.13. Executabile, Biblioteci Partajate și Limite de Resurse

Trei verificări care lămuresc repede de ce un program „nu pornește”:

```bash
file /usr/bin/ls            # ce fel de fișier este: executabil ELF pe 64 de biți, script, text...
ldd /usr/bin/ls             # de ce biblioteci partajate are nevoie și unde le-a găsit
ldconfig -p | grep libssl   # ce biblioteci cunoaște sistemul
```

Dacă `ldd` afișează `not found` în dreptul unei biblioteci, programul nu va porni până nu instalezi pachetul care o conține (`dnf provides '*/libnume.so*'`). Directoarele în care sunt căutate bibliotecile se declară în `/etc/ld.so.conf.d/*.conf`, iar după o modificare se rulează `ldconfig`.

**Limite de resurse.** Fiecare proces are plafoane: câte fișiere poate deschide, câte procese poate porni, câtă memorie poate bloca.

```bash
ulimit -a          # toate limitele shell-ului curent
ulimit -n          # numărul maxim de fișiere deschise (de obicei 1024)
ulimit -n 4096     # mărește limita, doar pentru această sesiune
```

Fiecare limită are două valori: una *soft* (cea aplicată) și una *hard* (plafonul până la care utilizatorul își poate ridica singur limita soft).

| Unde se setează persistent | Cui se aplică |
| :--- | :--- |
| `/etc/security/limits.d/*.conf`, cu linii ca `appuser soft nofile 8192` | Sesiunilor de login ale utilizatorilor (prin PAM). |
| Directive `LimitNOFILE=`, `LimitNPROC=` în unitatea `systemd` | Serviciilor. **Serviciile nu citesc `limits.d`!** |

A doua linie explică o confuzie frecventă: ai mărit limita în `/etc/security/limits.d/`, dar serviciul primește în continuare eroarea *Too many open files*. Verifici limita reală a unui proces care rulează cu `cat /proc/<PID>/limits`.

### 2.14. Consola Web (Cockpit) și Raportul de Diagnostic `sos`

Două unelte livrate cu RHEL, pe care le vei întâlni la primul contact cu un server administrat de o echipă.

**Cockpit, consola web.** Este o interfață grafică în browser pentru administrarea unui server: servicii, jurnale, stocare, rețea, conturi, actualizări și un terminal. Nu înlocuiește linia de comandă și nu este cerută la examen, dar este utilă ca să **vezi** ce face o comandă pe care abia ai învățat-o.

```bash
dnf install -y cockpit
systemctl enable --now cockpit.socket                 # pornește la cerere, la prima conexiune
firewall-cmd --permanent --add-service=cockpit && firewall-cmd --reload
```

O deschizi din browser la `https://<adresa_serverului>:9090` și te autentifici cu un cont de pe server. Observă că se activează unitatea `cockpit.socket`, nu un serviciu: `systemd` ascultă pe portul 9090 și pornește Cockpit abia când se conectează cineva, deci nu consumă resurse cât timp nu este folosit.

**`sos report`, fotografia completă a sistemului.** Când deschizi o cerere de suport la Red Hat sau predai o problemă unui coleg, în loc să trimiți pe rând zeci de fișiere, generezi o arhivă cu tot ce contează: configurări, jurnale, lista pachetelor, starea serviciilor, ieșirea a sute de comenzi de diagnostic.

```bash
dnf install -y sos
sos report --batch                 # fără întrebări; arhiva ajunge în /var/tmp/
sos report --batch --clean         # ascunde adresele IP, numele de mașini și utilizatorii din arhivă
```

Arhiva nu conține parole sau chei private, dar conține nume de mașini, adrese și configurări. Înainte să o trimiți în afara companiei, folosește `--clean`. Tot aici merită reținute două comenzi de inventar rapid: `hostnamectl` pentru identitatea mașinii și `systemctl --failed` pentru serviciile căzute; împreună cu ultimele erori din `journalctl -p err -b`, ele răspund la primele întrebări pe care ți le va pune oricine te ajută.


## exam-alert

### ⚠️ Capcană în plus: Fișierul din `/etc/sysctl.d/` care nu se termină în `.conf`
`systemd-sysctl` citește doar fișierele cu extensia `.conf`. Un fișier numit `/etc/sysctl.d/99-custom` (fără extensie) sau `99-custom.conf.bak` este ignorat fără niciun mesaj de eroare, iar după reboot parametrul revine la valoarea implicită. După ce scrii fișierul, rulează `sysctl --system` și caută în ce afișează linia `* Applying /etc/sysctl.d/99-custom.conf ...`. Dacă fișierul tău nu apare în listă, nu va fi citit nici la boot.

### ⚠️ Capcană în plus: `modprobe` și `sysctl -w` „merg”, deci le consideri rezolvate
Ambele comenzi schimbă doar starea din memorie. Verificarea corectă nu este „funcționează acum?”, ci „există fișierul care o va reface la boot?”: `/etc/modules-load.d/*.conf` pentru module și `/etc/sysctl.d/*.conf` pentru parametri.

## interview

### Întrebare în plus (Nivel Junior -> Mid):
> **Intervievator:** *„Te conectezi prin SSH pe un server despre care nu știi nimic. Cum afli în câteva comenzi dacă este mașină virtuală sau server fizic, ce versiune de sistem are și de ce contează diferența?”*

**Răspunsul Ideal:**
> „Rulez `hostnamectl`, care îmi arată pe un singur ecran sistemul de operare, kernelul și câmpul `Virtualization` (de exemplu `kvm` sau `vmware`; pe un server fizic câmpul lipsește). Confirm cu `systemd-detect-virt`, care răspunde `none` pe hardware fizic, și cu `lscpu`, unde apare `Hypervisor vendor`.
>
> Diferența contează practic: pe o mașină virtuală discurile se numesc de obicei `/dev/vdX` sau `/dev/sdX` și pot fi mărite din hypervisor, profilul `tuned` recomandat este `virtual-guest`, iar problemele de performanță pot veni de la gazdă, nu din sistemul meu (în `top` mă uit la valoarea `st`, *steal time*, adică timpul în care hypervisorul a dat procesorul altei mașini). Pe un server fizic mă interesează în plus starea hardware-ului, pe care o văd în `dmesg` și în jurnalul kernelului (`journalctl -k`).”
