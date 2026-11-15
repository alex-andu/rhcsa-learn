## architecture

### 2.1. Unde Stă Persistența: Harta Fișierelor pe care se Bazează Fiecare Setare

Aproape orice punct pierdut la examen are aceeași cauză: setarea exista în memorie, dar nu și pe disc. Tabelul de mai jos arată, pentru fiecare tip de setare, **fișierul care o reface la boot** și comanda cu care verifici că fișierul este bun, fără să repornești.

| Setare | Unde este persistentă | Verificare fără reboot |
| :--- | :--- | :--- |
| Hostname | `/etc/hostname` | `hostnamectl` |
| Adresă IP, gateway, DNS | `/etc/NetworkManager/system-connections/*.nmconnection` | `nmcli -f ipv4,connection.autoconnect con show "<profil>"` |
| Depozite software | `/etc/yum.repos.d/*.repo` | `dnf clean all && dnf repolist` |
| Montări și swap | `/etc/fstab` | `findmnt --verify`, apoi `mount -a` și `swapon -a` |
| Serviciu pornit la boot | Legătură simbolică în `/etc/systemd/system/*.wants/` | `systemctl is-enabled <serviciu>` |
| Target implicit | `/etc/systemd/system/default.target` | `systemctl get-default` |
| Parametri de kernel la boot | `/etc/default/grub` și intrările din `/boot/loader/entries/` | `grubby --info=DEFAULT` |
| Parametri `sysctl` | `/etc/sysctl.d/*.conf` | `sysctl --system` |
| Mod SELinux | `/etc/selinux/config` | `grep ^SELINUX= /etc/selinux/config` |
| Context SELinux pe fișiere | Regulile locale din politică | `semanage fcontext -l -C` |
| Port SELinux | Regulile locale din politică | `semanage port -l -C` |
| Boolean SELinux | Politica de pe disc (opțiunea `-P`) | `semanage boolean -l -C` |
| Reguli de firewall | `/etc/firewalld/zones/*.xml` | `firewall-cmd --permanent --list-all` |
| Utilizatori, grupuri, parole | `/etc/passwd`, `/etc/group`, `/etc/shadow` | `id <utilizator>`, `chage -l <utilizator>` |
| Reguli `sudo` | `/etc/sudoers.d/*` | `visudo -c`, `sudo -l -U <utilizator>` |
| Joburi `cron` | `/var/spool/cron/<utilizator>` | `crontab -l -u <utilizator>` |
| Timere | `/etc/systemd/system/*.timer` | `systemctl list-timers` |
| Sincronizare de timp | `/etc/chrony.conf` | `chronyc sources` |
| Fus orar | `/etc/localtime` | `timedatectl` |
| Hărți `autofs` | `/etc/auto.master.d/*.autofs` și `/etc/auto.*` | `automount -m` |
| Profil `tuned` | `/etc/tuned/active_profile` | `tuned-adm active` |
| Jurnal persistent | Directorul `/var/log/journal` | `journalctl --list-boots` |
| Container la boot | `~/.config/systemd/user/` și *linger* | `loginctl show-user <utilizator> -p Linger` |
| Variabile și alias-uri | `~/.bashrc`, `/etc/profile.d/*.sh` | `su - <utilizator> -c 'echo $VARIABILA'` |

Folosește tabelul ca listă de control: după fiecare task, întreabă-te „în ce fișier am lăsat urma?” și verifică fișierul, nu doar efectul de moment.

### 2.2. Arborele de Diagnostic: Ce Faci Când un Serviciu nu Pornește sau nu Răspunde

Mai multe task-uri din simulare (serverul web pe portul 82, `autofs`, containerul) au aceeași formă: un serviciu trebuie să funcționeze și nu funcționează. Nu încerca soluții la întâmplare; parcurge straturile în ordine și oprește-te la primul care eșuează.

| Pas | Întrebare | Comandă | Unde este de obicei problema |
| :---: | :--- | :--- | :--- |
| 1 | Serviciul rulează? | `systemctl status <serviciu>` | Dacă este `failed`, citește ultimele linii afișate. |
| 2 | De ce a eșuat? | `journalctl -xeu <serviciu>` | Greșeală în fișierul de configurare, port ocupat, fișier lipsă. |
| 3 | Configurarea este validă? | `httpd -t`, `sshd -t`, `visudo -c`, `named-checkconf` | Greșeală de sintaxă. |
| 4 | Ascultă pe portul corect? | `ss -tlnp \| grep <port>` | Port greșit în configurare; serviciul ascultă doar pe `127.0.0.1`. |
| 5 | A blocat SELinux ceva? | `ausearch -m AVC -ts recent` | Port (`semanage port`), context (`semanage fcontext`), boolean. |
| 6 | Răspunde local? | `curl http://localhost:<port>/` | Permisiuni pe fișiere, conținut lipsă. |
| 7 | Răspunde de pe cealaltă mașină? | `curl http://node1:<port>/` rulat pe `node2` | `firewalld`: portul nu este deschis sau lipsește `--reload`. |
| 8 | Va porni și după reboot? | `systemctl is-enabled <serviciu>` | Serviciul este pornit, dar nu și activat. |

Două reguli de interpretare. Dacă pasul 6 reușește și pasul 7 eșuează, problema este aproape sigur firewall-ul. Dacă serviciul nu pornește deloc și jurnalul spune `Permission denied` la deschiderea unui port, problema este SELinux, nu permisiunile de pe fișiere.

Testul rapid „este SELinux de vină?”: `setenforce 0`, încerci din nou, apoi **imediat** `setenforce 1`. Dacă în modul permisiv merge, cauți refuzul cu `ausearch` și aplici soluția corectă. Nu lăsa niciodată sistemul în `Permissive`.

### 2.3. Triajul: Ce Faci Când Rămâi în Urmă față de Plan

Planul pe minute din secțiunea 1 presupune că totul merge. În realitate, cel puțin un task te va ține pe loc. Contează ce decizi în acel moment.

**Regula celor zece minute.** Dacă un task te-a ținut mai mult de 10–12 minute fără progres vizibil, notează-l și treci la următorul. Un task de 10 puncte nu merită 30 de minute când alte patru task-uri de câte 15 puncte sunt încă neatinse. Te întorci la el la sfârșit; de multe ori soluția apare după ce ai lucrat la altceva.

**Excepția: task-urile care deblochează altele.** Parola de `root` pe `node2`, rețeaua și depozitele `dnf` nu pot fi sărite, pentru că de ele depinde restul. Dacă te blochezi aici, insistă și folosește documentația de pe sistem (`man nmcli-examples`, `man 5 dnf.conf`).

**Cum alegi ce faci întâi când timpul nu mai ajunge pentru tot:**

| Întrebare | Dacă răspunsul este „da” |
| :--- | :--- |
| Știu exact comenzile, fără să caut? | Fă-l acum. Punctele sigure se strâng primele. |
| Alte task-uri depind de el (utilizatori, grupuri, depozite)? | Fă-l înaintea celor care depind de el. |
| Poate strica boot-ul (`/etc/fstab`, GRUB, SELinux)? | Fă-l doar dacă mai ai timp pentru un reboot de verificare. |
| Am nevoie de `man` pentru jumătate din comenzi? | Lasă-l mai la urmă, dar nu îl abandona. |

**Un task făcut pe jumătate poate fi mai rău decât unul neînceput.** Notarea verifică starea finală a sistemului după reboot. O linie greșită rămasă în `/etc/fstab` sau un fișier `sudoers` stricat nu îți aduce puncte parțiale, ci îți poate anula și task-urile rezolvate corect pe același nod. Dacă abandonezi un task de stocare, **șterge sau comentează** linia adăugată în `/etc/fstab` și confirmă cu `mount -a` că nu mai apare nicio eroare.

**Ultimele 25 de minute nu se negociază.** Indiferent câte task-uri au rămas, te oprești din lucru nou și treci la protocolul de verificare și reboot. Un task în plus valorează 10–20 de puncte; un nod care nu mai pornește poate costa peste 100.

**Ține o evidență pe hârtie sau într-un fișier text:** numărul fiecărui task și starea lui (făcut și verificat, făcut dar neverificat, sărit). La sfârșit, lista îți spune în câteva secunde la ce să te întorci, fără să recitești tot enunțul.

### 2.4. Cum Citești un Enunț de Examen

Multe puncte se pierd pentru că a fost rezolvată altă cerință decât cea scrisă. Câteva formulări apar mereu și au un înțeles tehnic precis:

| Formularea din enunț | Ce înseamnă în practică |
| :--- | :--- |
| „persistent”, „după repornire”, „la boot” | Trebuie un fișier de configurare **și** serviciul activat (`enable`), nu doar pornit. |
| „grup secundar” / „grup primar” | `-G` (sau `-aG`), respectiv `-g`. |
| „fără acces la un shell interactiv” | `-s /sbin/nologin`. |
| „dimensiunea de N extents” | `lvcreate -l N` (litera mică). |
| „dimensiunea de N MiB” | `lvcreate -L NM` (litera mare). |
| „între 750 MiB și 800 MiB” | Orice valoare din interval; alege una din mijloc. |
| „fără a pierde datele existente” | Extindere online (`lvextend -r`); nu reformata. |
| „montat folosind UUID” / „folosind eticheta” | `UUID=...`, respectiv `LABEL=...` în prima coloană din `/etc/fstab`. |
| „pentru toți utilizatorii creați în viitor” | `/etc/login.defs` și `/etc/skel`, nu `chage` pe conturile existente. |
| „ca utilizatorul X” | Te conectezi ca acel utilizator (la containere, prin `ssh`, nu prin `su -`). |
| „accesibil de pe alte sisteme” | Trebuie deschis și portul în `firewalld`. |
| „la cerere”, „automat la accesare” | `autofs`, nu `/etc/fstab`. |
| „afișează pe ieșirea de eroare” | `>&2` în script. |
| „exact”, urmat de un text între ghilimele | Copiezi textul caracter cu caracter. |

Numele (de utilizatori, grupuri, volume, directoare, fișiere) se **copiază** din enunț, nu se rescriu din memorie. `vg_datastore` și `vg_datastor` sunt, pentru scriptul de notare, două lucruri complet diferite.

## exam-alert

### ⚠️ Regulă în plus: După fiecare linie adăugată în `/etc/fstab`, verifici pe loc
Nu aduna trei linii noi și apoi un singur `mount -a` la sfârșit. Dacă apare o eroare, nu mai știi care linie a produs-o, iar sub presiunea timpului greșeala rămâne în fișier. Ritmul corect: adaugi o linie, rulezi `systemctl daemon-reload && mount -a`, te uiți cu `df -h` sau `findmnt` că montarea există, și abia apoi treci la următoarea.

### ⚠️ Regulă în plus: Înainte de reboot, ține deschisă consola mașinii virtuale
Dacă un nod nu mai revine în rețea după reboot, prin SSH nu mai ai ce face. Singura cale de reparare este consola mașinii virtuale, de unde intri în *Emergency Mode* cu parola de `root` (Capitolul 3.1) sau reiei procedura `rd.break` (Capitolul 2.1). Asigură-te din timp că știi cum se deschide consola fiecărui nod, nu abia când ai nevoie de ea.

### ⚠️ Regulă în plus: Nu repara ce merge
În ultimele minute, tentația este să „îmbunătățești” un task deja rezolvat. O modificare făcută în grabă într-un fișier critic (`/etc/fstab`, `sudoers`, configurarea rețelei), fără timp pentru încă un reboot de verificare, poate costa mai mult decât punctele pe care voiai să le câștigi. După reboot-ul final și testele funcționale, te oprești.

## interview

### Scenariul 4 (în plus): „Discul este plin la ora 3 dimineața”

> **Intervievator:** *„Ești de serviciu. Monitorizarea te trezește: sistemul de fișiere `/var` al unui server de producție este 100% plin, iar aplicațiile încep să dea erori. Ce faci în primele zece minute și ce faci a doua zi?”*

**Răspunsul Ideal:**
> „Am două obiective, în această ordine: opresc efectul asupra producției, apoi găsesc cauza. Nu șterg nimic înainte să știu ce șterg.
>
> **Primele minute: confirm și localizez.** `df -hT` îmi arată că într-adevăr `/var` este plin, iar `df -i` exclude epuizarea inode-urilor. Caut unde este spațiul, coborând în arbore: `du -xh --max-depth=1 /var | sort -h`, apoi repet în directorul cel mai mare. Opțiunea `-x` ține căutarea pe acest sistem de fișiere. Dacă `du` arată mult mai puțin decât `df`, bănuiesc fișiere șterse, dar încă deschise, și le caut cu `lsof +L1`.
>
> **Eliberez spațiu în siguranță.** De obicei vinovat este un jurnal. Nu îl șterg cu `rm`, pentru că aplicația îl ține deschis și spațiul nu s-ar elibera; îl golesc cu `truncate -s 0`. Alte surse sigure de spațiu: `journalctl --vacuum-size=200M` pentru jurnalul `systemd`, `dnf clean all` pentru cache-ul de pachete, arhivele vechi din `/var/log` deja comprimate. Dacă `/var` este pe LVM și grupul are spațiu liber, soluția cea mai rapidă și fără risc este extinderea online: `lvextend -r -L +2G /dev/vg/lv_var`. Verific apoi că aplicațiile și-au revenit; unele trebuie repornite după ce au primit erori de scriere.
>
> **A doua zi: cauza.** Mă întreb de ce a crescut fișierul: o aplicație lăsată în mod de depanare, o eroare care se repetă de mii de ori pe minut sau o rotire a jurnalelor care nu funcționează. Verific configurarea `logrotate` pentru acel jurnal și o testez cu `logrotate -d`. Mă uit și la alertă: un prag la 80%, cu avertizare în timpul zilei, ar fi evitat incidentul de noapte.
>
> **Măsuri de durată:** jurnalele aplicației pe un volum separat, ca un jurnal scăpat de sub control să nu mai poată umple `/var`; limită pentru jurnalul `systemd` (`SystemMaxUse=`); și o notă în documentația de intervenție, ca următorul coleg de serviciu să rezolve în două minute, nu în douăzeci.”
