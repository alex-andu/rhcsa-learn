## architecture

### 2.7. Istoricul Comenzilor și Scurtăturile de Tastatură care Economisesc Timp

În examen și în producție tastezi sute de comenzi. Bash ține minte ce ai tastat și îți oferă scurtături care te scapă de rescris.

| Ce vrei | Ce tastezi | Explicație |
| :--- | :--- | :--- |
| Să completezi un nume de comandă, fișier sau opțiune | `Tab` (de două ori pentru lista variantelor) | Pachetul `bash-completion` completează și subcomenzi: `systemctl ena` + `Tab` devine `systemctl enable`. |
| Să cauți în istoric | `Ctrl + r`, apoi câteva litere | Apeși `Ctrl + r` din nou pentru potrivirea anterioară, `Enter` ca să rulezi. |
| Să repeți ultima comandă | `!!` | Clasic: `sudo !!` când ai uitat `sudo`. |
| Ultimul argument al comenzii anterioare | `!$` sau `Alt + .` | `mkdir -p /srv/date/proiect`, apoi `cd !$`. |
| Să sari la începutul sau la sfârșitul liniei | `Ctrl + a` / `Ctrl + e` | |
| Să ștergi de la cursor până la început sau până la sfârșit | `Ctrl + u` / `Ctrl + k` | |
| Să ștergi cuvântul dinaintea cursorului | `Ctrl + w` | |
| Să cureți ecranul | `Ctrl + l` | La fel ca `clear`. |
| Să oprești comanda care rulează | `Ctrl + c` | Trimite semnalul `SIGINT` (Capitolul 1.3). |
| Să închizi sesiunea | `Ctrl + d` | La fel ca `exit`. |

Istoricul se vede cu `history` și se salvează în `~/.bash_history` **la închiderea sesiunii**. De aici vin două surprize: comenzile din sesiunea curentă nu apar încă în fișier, iar dacă ai două terminale deschise, ultimul închis poate suprascrie ce a salvat primul. Variabilele `HISTSIZE` (câte comenzi ține în memorie) și `HISTFILESIZE` (câte ține în fișier) se setează în `~/.bashrc`.

```bash
# Ultimele 20 de comenzi, cu numărul lor:
history 20

# Rulăm din nou comanda cu numărul 142 din istoric:
!142

# Căutăm în istoric toate comenzile care conțin 'nmcli':
history | grep nmcli
```

### 2.8. Substituția de Comenzi, Expansiunea Parametrilor și Aritmetica

Înainte să pornească o comandă, Bash înlocuiește pe linia ta mai multe construcții cu valorile lor. Pe lângă variabile și globbing (secțiunile 2.2 și 2.4), cele mai folosite sunt:

**Substituția de comenzi.** Construcția de forma `$(comandă)` rulează comanda și pune pe linie ce a afișat ea:

```bash
# Câte nuclee are sistemul, pus într-o variabilă:
CPUS=$(nproc)
echo "Sistemul are $CPUS nuclee"

# Un nume de fișier cu data de azi:
tar -czf /root/etc-$(date +%F).tar.gz /etc

# UUID-ul unei partiții direct într-o linie pentru /etc/fstab:
echo "UUID=$(blkid -s UUID -o value /dev/vdb1)  /mnt/data  xfs  defaults  0 0"
```

Forma veche cu accente grave (`` `comandă` ``) face același lucru, dar se citește greu și nu se poate imbrica ușor. Folosește forma cu paranteze.

**Expansiunea parametrilor.** Acoladele îți dau mai mult decât valoarea variabilei:

| Construcție | Ce produce |
| :--- | :--- |
| `${VAR}` | Valoarea variabilei, delimitată clar: `${USER}_backup` (fără acolade, Bash ar căuta variabila `USER_backup`). |
| `${VAR:-implicit}` | Valoarea variabilei sau textul `implicit` dacă variabila e goală ori nedefinită. |
| `${#VAR}` | Numărul de caractere din valoare. |
| `${VAR%.conf}` | Valoarea fără sufixul `.conf` (`httpd.conf` devine `httpd`). |
| `${VAR##*/}` | Valoarea fără tot ce e până la ultimul slash, adică numele fișierului dintr-o cale. |

**Aritmetica.** Bash calculează doar cu numere întregi, între paranteze duble:

```bash
echo $(( 50 * 16 ))        # 800  (50 de extents a câte 16 MiB)
echo $(( 1024 * 1024 ))    # 1048576
ZILE=$(( $(date +%s) / 86400 ))   # zilele de la 1 ianuarie 1970, ca în /etc/shadow
```

Pentru zecimale folosești `bc` (`echo "scale=2; 10/3" | bc`) sau `awk`.

### 2.9. Legarea Comenzilor: `xargs`, Here-String și Substituția de Proces

Pipe-ul simplu (`|`) trimite text la intrarea standard a comenzii următoare. Unele comenzi însă nu citesc de la intrarea standard, ci vor **argumente** (`rm`, `cp`, `chmod`). Aici intervine `xargs`:

```bash
# Găsește fișierele .tmp și șterge-le, în loturi (sigur și cu nume care conțin spații):
find /var/tmp -name "*.tmp" -print0 | xargs -0 rm -f

# Câte linii are fiecare fișier .conf din /etc (maximum 4 fișiere per apel):
ls /etc/*.conf | xargs -n 4 wc -l
```

Alte trei construcții pe care le vei vedea în scripturi și în documentație:

```bash
# Here-string: trimite un singur text la intrarea standard a comenzii
grep -c root <<< "$(cat /etc/passwd)"

# Substituția de proces: tratează ieșirea unei comenzi ca pe un fișier.
# Compară lista pachetelor instalate pe două servere, fără fișiere temporare:
diff <(ssh node1 rpm -qa | sort) <(ssh node2 rpm -qa | sort)

# Grup de comenzi cu o singură redirecționare pentru toate:
{ date; hostname; uptime; } > /root/raport.txt
```

### 2.10. Mai Multe Ferestre într-o Singură Sesiune SSH: `tmux`

Când lucrezi pe două servere sau vrei să urmărești un jurnal în timp ce editezi un fișier, `tmux` împarte terminalul în mai multe panouri și, mai important, **ține sesiunea în viață dacă se întrerupe conexiunea SSH**. Se instalează cu `dnf install -y tmux`.

| Acțiune | Taste (întâi `Ctrl + b`, apoi tasta) |
| :--- | :--- |
| Împarte fereastra în două, stânga și dreapta | `Ctrl + b`, apoi `%` |
| Împarte fereastra în două, sus și jos | `Ctrl + b`, apoi `"` |
| Treci în alt panou | `Ctrl + b`, apoi o săgeată |
| Fereastră nouă / fereastra următoare | `Ctrl + b`, apoi `c` / `n` |
| Te desprinzi de sesiune (rămâne pornită) | `Ctrl + b`, apoi `d` |
| Te reatașezi la sesiune | comanda `tmux attach` |

Un scenariu tipic: pornești `tmux`, lansezi într-un panou o comandă lungă (o copiere mare, un `dnf update`), te desprinzi cu `Ctrl + b`, `d`, închizi laptopul, iar a doua zi rulezi `tmux attach` și găsești comanda terminată.

### 2.11. Încă Trei Surse de Ajutor: `--help`, `whatis` și `info`

Pe lângă `man` (secțiunea 2.6), sistemul îți mai dă:

* **`comandă --help`**: rezumatul opțiunilor, pe un ecran sau două. De multe ori e mai rapid decât `man`: `tar --help | grep -i xz`.
* **`help <builtin>`**: pentru comenzile interne ale lui Bash, care nu au pagină de manual proprie: `help cd`, `help test`, `help export`.
* **`whatis <nume>`**: o linie de descriere pentru fiecare pagină de manual cu acel nume, ca să vezi în ce secțiuni există: `whatis passwd` arată și `passwd (1)`, și `passwd (5)`.
* **`info <comandă>`**: manuale mai lungi, cu capitole, pentru uneltele GNU (`info coreutils`, `info tar`).
* **`/usr/share/doc/<pachet>/`**: fișiere `README`, exemple de configurare și note de lansare instalate odată cu pachetul.

În interiorul unei pagini `man` navighezi ca în `less`: `/text` caută înainte, `n` trece la următoarea potrivire, `G` sare la sfârșit (unde stă de obicei secțiunea `EXAMPLES`), `q` închide.

### 2.12. `vim` Peste Nivelul de Supraviețuire: Blocuri, Repetare și Ferestre

Comenzile din secțiunea 2.5 îți ajung ca să editezi orice fișier. Cele de mai jos îți economisesc timp la operațiile pe care le vei repeta de zeci de ori.

**Comentarea mai multor linii dintr-o dată** (de exemplu, a unui bloc dintr-un fișier de configurare):

| Metodă | Taste |
| :--- | :--- |
| Mod vizual pe coloană | `Ctrl + v`, cobori cu săgeata peste liniile dorite, `I` (i mare), tastezi `#`, apoi `ESC`. Caracterul apare pe toate liniile. |
| Comandă pe un interval de linii | `:10,20s/^/#/` pune `#` la începutul liniilor 10–20. |
| Decomentare | `:10,20s/^#//` |

**Repetare și mișcare rapidă:**

| Taste | Efect |
| :--- | :--- |
| `.` (punct) | Repetă ultima modificare. Faci o schimbare o dată, apoi `j` și `.` pe fiecare linie următoare. |
| `w` / `b` | Sare un cuvânt înainte / înapoi. |
| `0` / `$` | Începutul / sfârșitul liniei. |
| `cw` | Șterge cuvântul de sub cursor și intră în modul de inserare (*change word*). |
| `ci"` | Înlocuiește tot ce este între ghilimele (*change inside*). |
| `x` / `r<caracter>` | Șterge un caracter / îl înlocuiește cu altul. |
| `>>` / `<<` | Indentează / dezindentează linia curentă. |
| `:noh` | Stinge evidențierea rămasă după o căutare. |
| `:e!` | Renunță la toate modificările și reîncarcă fișierul de pe disc. |

**Lipirea textului copiat din altă fereastră.** Când lipești cu mouse-ul un bloc indentat într-un `vim` cu `autoindent` activ, fiecare linie iese mai la dreapta decât precedenta. Rulează `:set paste` înainte de lipire și `:set nopaste` după. Este important la fișierele în care indentarea contează.

**Două fișiere pe același ecran:**

```bash
vim -O /etc/ssh/sshd_config /etc/ssh/sshd_config.bak    # două ferestre alăturate
vimdiff fișier_vechi fișier_nou                          # cu diferențele evidențiate
```

În interiorul lui `vim`: `:sp alt_fișier` împarte ecranul pe orizontală, `:vsp alt_fișier` pe verticală, iar `Ctrl + w` urmat de `w` trece dintr-o fereastră în alta.

**Ai editat un fișier al lui `root` fără să fii `root`.** În loc să pierzi modificările, le poți salva prin `sudo`: `:w !sudo tee % > /dev/null`. Aici `%` înseamnă „fișierul curent”.

Pentru exercițiu, comanda `vimtutor` deschide un curs interactiv de aproximativ 30 de minute, inclus în pachetul `vim-enhanced`.

**Dacă `vim` nu este instalat.** Pe o instalare minimală există doar `vi`, cu aceleași comenzi de bază, dar fără evidențierea sintaxei. Alternativa pentru începători este `nano`, unde comenzile sunt afișate în josul ecranului: `Ctrl + o` salvează, `Ctrl + x` iese, `Ctrl + w` caută. Editorul folosit implicit de `crontab -e`, `visudo` și `systemctl edit` se alege cu variabila `EDITOR`: `export EDITOR=vim` în `~/.bashrc`.

### 2.13. Mediul Shell-ului: Inspecție, Opțiuni și Promptul

**Variabile: cum le vezi, cum le ștergi, cum le dai unei singure comenzi.**

```bash
printenv                 # toate variabilele de MEDIU (cele moștenite de procesele-copil)
printenv PATH            # o singură variabilă
set | less               # toate variabilele shell-ului, inclusiv cele locale și funcțiile
unset NUME               # șterge o variabilă
export -n NUME           # variabila rămâne, dar nu mai este exportată

# O variabilă valabilă DOAR pentru o comandă, fără să o definești în shell:
LANG=C ls -l
TZ=America/New_York date
```

Ultima formă este foarte utilă: `LANG=C` în fața unei comenzi îi obține ieșirea în engleză și cu sortarea clasică, lucru care contează când un script caută un anumit text în ce afișează comanda.

**Alias-uri: cum le ocolești și cum le scoți.**

```bash
alias                    # toate alias-urile definite
unalias ll               # șterge un alias din sesiunea curentă
\ls                      # backslash în față: rulează comanda reală, ignorând alias-ul
command ls               # același lucru, mai explicit
```

Pe RHEL, `root` are implicit alias-urile `cp -i`, `mv -i` și `rm -i`, care cer confirmare. De aceea un `cp` rulat ca `root` te întreabă înainte să suprascrie, iar același `cp` într-un script nu întreabă (scripturile nu încarcă alias-urile). `\cp` sau `cp -f` sar peste întrebare.

**Opțiunile shell-ului.** Se pornesc cu `set -o nume` și se opresc cu `set +o nume`:

| Opțiune | Efect |
| :--- | :--- |
| `set -o noclobber` | `>` refuză să suprascrie un fișier existent. Suprascrierea se forțează cu `>|`. |
| `set -o vi` | Editarea liniei de comandă cu tastele din `vi`, în locul celor implicite. |
| `set -o` (fără argument) | Lista tuturor opțiunilor și starea lor. |
| `shopt -s histappend` | Istoricul se **adaugă** la fișier la ieșire, în loc să îl suprascrie. |

`noclobber` este o plasă de siguranță bună pentru cei care se tem de capcana `>` în loc de `>>`: pus în `~/.bashrc`, transformă o greșeală distructivă într-un mesaj de eroare.

**Promptul.** Textul afișat înaintea fiecărei comenzi este în variabila `PS1`. Câteva coduri: `\u` (utilizatorul), `\h` (numele scurt al mașinii), `\w` (directorul curent, complet), `\W` (doar ultimul director), `\t` (ora). Promptul implicit din RHEL este `[\u@\h \W]\$ `, unde ultimul cod afișează `#` pentru `root` și semnul dolar pentru ceilalți. Pe un server de producție, un prompt care arată clar numele mașinii te ferește de cea mai scumpă greșeală: comanda corectă, rulată pe serverul greșit.

## exam-alert

### ⚠️ Capcană în plus: `sudo echo ... > /etc/fișier` dă `Permission denied`
Redirecționarea (`>`) este făcută de shell-ul tău **înainte** să pornească `sudo`, deci fișierul este deschis cu drepturile tale, nu ale lui `root`. `sudo` se aplică doar comenzii `echo`. Variantele corecte:

```bash
echo "linie nouă" | sudo tee -a /etc/fișier        # tee rulează ca root; -a adaugă la sfârșit
sudo sh -c 'echo "linie nouă" >> /etc/fișier'      # tot rândul rulează într-un shell al lui root
```

În examen lucrezi de obicei direct ca `root`, dar capcana apare imediat ce lucrezi ca utilizator cu `sudo`.

### ⚠️ Capcană în plus: Spațiile din jurul semnului `=` la variabile
`NUME="valoare"` definește o variabilă. `NUME = "valoare"` încearcă să ruleze comanda `NUME` cu două argumente și dă `command not found`. Regula este inversă față de testele `[[ ... ]]`, unde spațiile sunt obligatorii.

## interview

### Întrebare în plus (Nivel Junior -> Mid):
> **Intervievator:** *„Care este diferența dintre a rula un script cu `./script.sh` și a-l rula cu `source script.sh` (sau `. script.sh`)? Dă-mi un exemplu în care alegerea greșită face ca scriptul să pară că nu funcționează.”*

**Răspunsul Ideal:**
> „`./script.sh` pornește un proces `bash` nou (un copil), care execută scriptul și apoi se închide. Orice schimbă scriptul în propriul mediu, adică variabile, directorul curent sau alias-uri, dispare odată cu procesul-copil. `source script.sh` citește și execută liniile scriptului **în shell-ul curent**, fără proces nou, deci schimbările rămân.
>
> Exemplul clasic: un script care conține `export JAVA_HOME=/opt/java` și `cd /opt/app`. Rulat cu `./script.sh`, după terminare `echo $JAVA_HOME` nu afișează nimic și sunt în același director ca înainte. Rulat cu `source script.sh`, variabila există și sunt în `/opt/app`. Din același motiv, după ce modific `~/.bashrc` rulez `source ~/.bashrc` ca să aplic schimbările în sesiunea curentă, fără să mă reconectez.
>
> Mai există o diferență practică: `./script.sh` cere drept de execuție pe fișier și respectă linia shebang, pe când `source` cere doar drept de citire și folosește întotdeauna shell-ul curent.”
