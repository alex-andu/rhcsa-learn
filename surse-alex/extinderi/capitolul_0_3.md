## architecture

### 2.5. `sed` Pas cu Pas: Editarea unui Fișier fără Editor

`sed` (*Stream Editor*) citește textul linie cu linie, aplică o comandă pe liniile care te interesează și afișează rezultatul. Este unealta cu care modifici un fișier de configurare dintr-o singură comandă, fără să deschizi `vim`.

Forma generală este `sed '[adresă]comandă' fișier`. Adresa spune pe ce linii se aplică comanda; dacă lipsește, se aplică pe toate.

| Ce vrei | Comanda | Explicație |
| :--- | :--- | :--- |
| Să înlocuiești prima apariție de pe fiecare linie | `sed 's/vechi/nou/' f` | `s` vine de la *substitute*. |
| Să înlocuiești toate aparițiile | `sed 's/vechi/nou/g' f` | `g` = *global*, pe toată linia. |
| Să înlocuiești doar pe liniile care conțin un text | `sed '/^Port/s/22/2222/' f` | Adresa este expresia dintre slash-uri. |
| Să înlocuiești doar pe linia 5 | `sed '5s/vechi/nou/' f` | Adresa este numărul liniei. |
| Să ștergi liniile care conțin un text | `sed '/^#/d' f` | `d` = *delete*. |
| Să ștergi ultima linie | `sed '$d' f` | În adrese, `$` înseamnă ultima linie. |
| Să afișezi doar liniile 10–20 | `sed -n '10,20p' f` | `-n` oprește afișarea implicită, `p` tipărește. |
| Să adaugi o linie după cea care se potrivește | `sed '/^\[main\]/a gpgcheck=0' f` | `a` = *append*; `i` inserează înainte. |

Fără opțiuni, `sed` doar afișează rezultatul; fișierul rămâne neatins. Modificarea pe disc se face cu `-i`:

```bash
# Modifică fișierul direct pe disc:
sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config

# La fel, dar păstrează originalul în config.bak (recomandat pe fișiere importante):
sed -i.bak 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config
```

Două detalii care te scapă de erori:

* Dacă textul căutat conține slash-uri (o cale), schimbă delimitatorul: `sed -i 's|/var/www/html|/custom_web|g' fișier`. Orice caracter pus după `s` devine delimitator.
* Cu `-E` poți folosi grupuri și le reiei cu `\1`, `\2`: `sed -E 's/^(GRUB_TIMEOUT)=.*/\1=10/' /etc/default/grub` păstrează numele variabilei și schimbă doar valoarea.

Obișnuiește-te să rulezi comanda întâi **fără** `-i`, să te uiți la rezultat și abia apoi să adaugi `-i`.

### 2.6. `awk` Pas cu Pas: Coloane, Condiții și Totaluri

`awk` împarte fiecare linie în câmpuri și îți lasă să scrii mici programe de forma `condiție { acțiune }`. Acolo unde `cut` nu mai face față (separatori cu mai multe spații, condiții pe valori, calcule), folosești `awk`.

| Element | Semnificație |
| :--- | :--- |
| Câmpurile numerotate de la 1 | Primul, al doilea, al treilea câmp de pe linie; câmpul cu numărul zero este linia întreagă. |
| `NF` | Numărul de câmpuri de pe linia curentă; ultimul câmp se obține cu `NF` precedat de semnul dolar. |
| `NR` | Numărul liniei curente. |
| `-F ':'` | Separatorul de câmpuri (implicit: orice șir de spații sau tab-uri). |
| `BEGIN { ... }` / `END { ... }` | Acțiuni executate înainte de prima linie, respectiv după ultima. |

```bash
# Numele și shell-ul utilizatorilor obișnuiți (UID de la 1000 în sus):
awk -F ':' '$3 >= 1000 { print $1, $7 }' /etc/passwd

# Sistemele de fișiere ocupate peste 80% (sărim peste antet cu NR > 1):
df -h | awk 'NR > 1 && $5+0 > 80 { print $6, $5 }'

# Memoria totală folosită de procesele unui utilizator (coloana RSS din ps, în KiB):
ps -u apache -o rss= | awk '{ total += $1 } END { print total/1024 " MiB" }'

# Doar a doua linie dintr-un rezultat:
free -m | awk 'NR == 2 { print "Memorie disponibilă:", $7, "MiB" }'
```

De ce `awk` și nu `cut` pentru ieșirea comenzilor: `cut -d ' '` tratează fiecare spațiu ca separator, deci coloanele aliniate cu mai multe spații (cum afișează `df`, `ps`, `ls -l`) ies greșit. `awk` consideră orice șir de spații un singur separator.

### 2.7. `find`: Combinarea Condițiilor și Acțiuni Sigure

Pe lângă criteriile din secțiunea 2.3, `find` îți permite să le combini și să controlezi cât de adânc caută.

| Opțiune | Ce face |
| :--- | :--- |
| `-maxdepth 1` | Caută doar în directorul dat, fără subdirectoare. Se pune imediat după cale. |
| `-a`, `-o`, `!` | ȘI (implicit între condiții), SAU, NU. Grupezi cu paranteze precedate de backslash. |
| `-newer fișier` | Fișiere modificate mai recent decât fișierul de referință. |
| `-empty` | Fișiere și directoare goale. |
| `-ls` | Afișează rezultatele în formatul `ls -l`. |
| `-ok comandă {} \;` | La fel ca `-exec`, dar cere confirmare pentru fiecare fișier. |
| `-delete` | Șterge ce a găsit. |

```bash
# Fișiere .log SAU .tmp, mai vechi de 30 de zile, doar în /var/tmp (fără subdirectoare):
find /var/tmp -maxdepth 1 -type f \( -name "*.log" -o -name "*.tmp" \) -mtime +30

# Fișiere din /home care NU aparțin niciunui utilizator existent:
find /home -nouser -ls

# Fișiere din /etc modificate după ce a fost creat un fișier-martor:
touch /tmp/inainte
# ... faci modificările ...
find /etc -newer /tmp/inainte -type f

# Directoare cu drept de scriere pentru toată lumea, dar fără sticky bit (risc de securitate):
find / -xdev -type d -perm -0002 ! -perm -1000 2>/dev/null
```

Opțiunea `-xdev` ține căutarea pe un singur sistem de fișiere: nu coboară în `/proc`, `/sys` sau în partajările de rețea montate, deci e mai rapidă și mai curată.

**`-exec ... \;` față de `-exec ... +`.** Cu `\;`, comanda pornește o dată pentru fiecare fișier găsit. Cu `+`, `find` adună fișierele și pornește comanda o singură dată cu toate ca argumente (ca `xargs`). Pentru `ls`, `chmod`, `rm`, varianta cu `+` este mult mai rapidă. La `cp` și `mv` rămâi la `\;`, fiindcă destinația trebuie să fie ultimul argument.

### 2.8. Lucrul cu Arhive: Listare, Extragere Parțială, Excluderi

Câteva operații cu `tar` care apar des în practică, pe lângă crearea și extragerea completă:

```bash
# Ce conține arhiva, cu permisiuni, proprietar și dimensiuni (ca ls -l):
tar -tvf /root/backup.tar.gz

# Extrage UN SINGUR fișier (calea exact așa cum apare în listare, fără slash la început):
tar -xf /root/backup.tar.gz -C /tmp etc/ssh/sshd_config

# Creează arhiva fără fișierele .log și fără un subdirector:
tar -czf /root/www.tar.gz --exclude="*.log" --exclude="/var/www/cache" /var/www

# Adaugă un fișier într-o arhivă NECOMPRIMATĂ existentă:
tar -rf /root/arhiva.tar /etc/hosts
```

Comprimarea unui singur fișier, fără arhivă, se face direct cu utilitarele de compresie. Atenție: ele **înlocuiesc** fișierul original cu varianta comprimată.

| Comprimare | Decomprimare | Citire fără decomprimare | Extensie |
| :--- | :--- | :--- | :--- |
| `gzip fișier` | `gunzip fișier.gz` | `zcat`, `zless`, `zgrep` | `.gz` |
| `bzip2 fișier` | `bunzip2 fișier.bz2` | `bzcat`, `bzgrep` | `.bz2` |
| `xz fișier` | `unxz fișier.xz` | `xzcat`, `xzgrep` | `.xz` |

Opțiunea `-k` (*keep*) păstrează și originalul: `gzip -k fișier`. Jurnalele vechi din `/var/log` sunt de obicei comprimate, de aceea `zgrep "eroare" /var/log/messages-*.gz` este o comandă pe care o vei folosi des.

### 2.9. Cât Spațiu Ocupă și Ce S-a Schimbat: `du`, `diff`, `stat`

```bash
# Cât ocupă fiecare subdirector din /var, sortat crescător, în unități citibile:
du -xh --max-depth=1 /var | sort -h

# Doar totalul unui director:
du -sh /var/log

# Diferențele dintre două fișiere de configurare (format unificat, ușor de citit):
diff -u /etc/ssh/sshd_config.bak /etc/ssh/sshd_config

# Diferențele dintre două directoare, recursiv, doar numele fișierelor care diferă:
diff -rq /etc/skel /home/natasha

# Toate metadatele unui fișier: inode, permisiuni în octal, cei trei timpi:
stat /etc/passwd
```

`du` măsoară spațiul ocupat de fișierele pe care le poate vedea în director, iar `df` întreabă sistemul de fișiere cât spațiu este alocat în total. Cele două pot arăta valori diferite, iar diferența este ea însăși o informație de diagnostic (vezi întrebarea de interviu de mai jos).

### 2.10. `rsync` și `sftp` în Detaliu

`rsync` este unealta de bază pentru copii de siguranță și migrări. Pe lângă `-a` și `-v` din secțiunea 2.4, opțiunile de mai jos fac diferența dintre o sincronizare sigură și una periculoasă.

| Opțiune | Efect |
| :--- | :--- |
| `-n` (`--dry-run`) | Arată ce **ar** face, fără să copieze sau să șteargă nimic. Rulează întotdeauna întâi așa. |
| `--delete` | Șterge din destinație ce nu mai există în sursă. Face din destinație o oglindă exactă. |
| `-z` | Comprimă datele pe rețea; ajută pe legături lente. |
| `-P` | Arată progresul și păstrează fișierele transferate parțial, ca transferul să poată fi reluat. |
| `--exclude='*.log'` | Sare peste fișierele care se potrivesc. Se poate repeta. |
| `-H`, `-A`, `-X` | Păstrează hard link-urile, ACL-urile, respectiv atributele extinse (inclusiv contextul SELinux). |
| `-e 'ssh -p 2222'` | Folosește SSH pe alt port. |

```bash
# Simulare: ce s-ar schimba dacă aș sincroniza și aș șterge surplusul din destinație?
rsync -avn --delete /srv/date/ root@node2:/srv/date/

# Sincronizarea reală, cu progres:
rsync -avP --delete /srv/date/ root@node2:/srv/date/

# Copie locală (rsync funcționează și fără rețea), fără directorul cache:
rsync -a --exclude='cache/' /var/www/ /backup/www/
```

Combinația `--delete` cu sursa greșită sau cu un slash pus aiurea poate goli destinația. De aceea prima rulare se face cu `-n`: citești lista liniilor care încep cu `deleting` și abia apoi rulezi comanda reală.

De ce este `rsync` rapid la a doua rulare: compară dimensiunea și data modificării fiecărui fișier și transferă doar ce s-a schimbat. Un director de 50 GB în care s-au modificat trei fișiere se sincronizează în câteva secunde.

**`sftp`, pentru transferuri interactive.** Deschide o sesiune în care navighezi pe server și alegi ce transferi:

```bash
sftp root@node2
```

| Comandă în sesiunea `sftp` | Efect |
| :--- | :--- |
| `ls`, `cd`, `pwd` | Navigare pe server. |
| `lls`, `lcd`, `lpwd` | Aceleași, pe mașina locală (prefixul `l`). |
| `get fișier` / `get -r director` | Descarcă de pe server. |
| `put fișier` / `put -r director` | Încarcă pe server. |
| `bye` | Închide sesiunea. |

Pentru o singură operație, fără sesiune interactivă: `sftp root@node2:/etc/hosts /tmp/`.

Pe RHEL 9 și 10, `scp` folosește în spate tot protocolul SFTP. Comenzile `scp` pe care le știi funcționează la fel; pentru transferuri mari sau repetate, `rsync` rămâne alegerea mai bună, fiindcă poate relua un transfer întrerupt.

## exam-alert

### ⚠️ Capcană în plus: `find ... -delete` pus înaintea condițiilor șterge tot
`find` evaluează expresia de la stânga la dreapta. În `find /var/tmp -delete -name "*.tmp"`, acțiunea `-delete` se execută pe fiecare fișier **înainte** să fie verificat numele, deci se șterge tot conținutul din `/var/tmp`. Pune întotdeauna `-delete` la sfârșit și rulează întâi comanda fără el (sau cu `-ls`), ca să vezi exact ce ar șterge.

### ⚠️ Capcană în plus: `sed -i` pe o expresie netestată
`sed -i` scrie direct în fișier și nu are „undo”. O expresie prea largă (de exemplu `s/no/yes/g` într-un `sshd_config`) schimbă și linii la care nu te-ai gândit. Rulează comanda întâi fără `-i` și compară cu `diff`, sau folosește `-i.bak` ca să ai originalul alături.

## interview

### Întrebare în plus (Nivel Mid -> Senior):
> **Intervievator:** *„Alarma de monitorizare spune că `/var` este plin 100%. `df -h` confirmă, dar `du -sh /var` arată doar 40% din dimensiunea partiției. Inode-uri sunt destule. Unde este restul spațiului și cum îl recuperezi fără să repornești serverul?”*

**Răspunsul Ideal:**
> „Diferența dintre `df` și `du` apare de obicei din cauza unor fișiere **șterse, dar încă deschise de un proces**. Când șterg un fișier cu `rm`, dispare doar numele lui din director (dentry-ul). Blocurile de date sunt eliberate abia când contorul de link-uri ajunge la zero **și** niciun proces nu mai ține fișierul deschis. `du` nu mai vede fișierul, pentru că nu mai are nume, dar `df` îl numără în continuare.
>
> Cazul tipic: cineva a șters un jurnal uriaș al unei aplicații care încă scrie în el. Găsesc fișierele cu `lsof +L1` (fișiere deschise cu zero link-uri), unde văd procesul, descriptorul și dimensiunea. Am două soluții. Prima: repornesc sau reîncarc serviciul respectiv, ca să închidă fișierul. A doua, dacă serviciul nu poate fi oprit: golesc fișierul prin descriptorul procesului, de exemplu `: > /proc/<PID>/fd/<număr>`, ceea ce eliberează spațiul fără să opresc nimic.
>
> A doua cauză posibilă este un sistem de fișiere montat **peste** un director care conținea deja date: fișierele vechi rămân pe disc, ascunse sub punctul de montare. Pe aceea o verific montând temporar partiția rădăcină în alt loc și uitându-mă în director. Ca regulă, un jurnal mare se golește cu `truncate -s 0 fișier`, nu se șterge cu `rm`.”
