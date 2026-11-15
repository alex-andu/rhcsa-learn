## architecture

### 2.5. Funcții, `read` și Mesaje Clare: Cum Arată un Script Ușor de Întreținut

Scripturile de examen au zece linii. Cele din producție cresc, iar trei obiceiuri le țin lizibile.

**Funcțiile** grupează comenzi sub un nume. În interiorul funcției, argumentele primite se citesc tot cu variabilele poziționale (primul, al doilea...), iar `return` întoarce un cod de ieșire fără să oprească scriptul:

```bash
#!/bin/bash

eroare() {
    echo "EROARE: $1" >&2
    exit 1
}

verifica_pachet() {
    rpm -q "$1" &>/dev/null
}

[[ $# -eq 1 ]] || eroare "Folosire: $0 <nume_pachet>"

if verifica_pachet "$1"; then
    echo "Pachetul $1 este instalat."
else
    echo "Pachetul $1 lipsește."
fi
```

Observă că `if` primește direct funcția: `if` nu are nevoie de paranteze pătrate, ci de orice comandă, și se uită doar la codul ei de ieșire.

**`read`** citește o linie de la tastatură sau dintr-un fișier în variabile:

```bash
read -p "Nume utilizator: " NUME           # afișează întrebarea și așteaptă răspunsul
read -s -p "Parolă: " PAROLA; echo         # -s nu afișează ce tastezi
read -r -t 10 RASPUNS || echo "Timp expirat"   # -t = așteaptă cel mult 10 secunde
```

**`printf`** înlocuiește `echo` când vrei coloane aliniate:

```bash
printf "%-15s %5s\n" "Utilizator" "UID"
printf "%-15s %5d\n" "natasha" 1001
```

`%-15s` înseamnă text aliniat la stânga pe 15 caractere, iar `%5d` un număr întreg pe 5 caractere.

### 2.6. Depanarea Scripturilor: `bash -n`, `bash -x` și `trap`

Când un script nu face ce trebuie, nu ghici. Bash îți poate arăta exact ce execută.

| Unealtă | Ce face |
| :--- | :--- |
| `bash -n script.sh` | Verifică doar sintaxa, fără să execute nimic. Prinde un `fi` sau un `done` uitat. |
| `bash -x script.sh` | Afișează fiecare comandă înainte să o execute, cu variabilele deja înlocuite, precedată de `+`. |
| `set -x` ... `set +x` în script | Pornește și oprește urmărirea doar pe o porțiune. |
| `echo "DEBUG: var=$VAR" >&2` | Metoda simplă: afișezi valorile în punctele-cheie, pe `stderr`. |

```bash
[root@node1 ~]# bash -x /usr/local/bin/distro_switch.sh rhel
+ [[ rhel == \r\h\e\l ]]
+ echo centos
centos
```

Fiecare linie cu `+` arată comanda așa cum o vede Bash după înlocuiri. Dacă aici o variabilă apare goală, ai găsit problema.

**`trap`** execută o comandă când scriptul se termină sau primește un semnal. Folosirea tipică este curățenia fișierelor temporare, indiferent cum se încheie scriptul:

```bash
#!/bin/bash
TMP=$(mktemp)                    # creează un fișier temporar cu nume unic
trap 'rm -f "$TMP"' EXIT         # se execută la orice ieșire: normală, eroare sau Ctrl+C

df -h > "$TMP"
grep -c "/dev/" "$TMP"
```

**Coduri de ieșire cu semnificație fixă**, utile când citești de ce a eșuat o comandă:

| Cod | Semnificație |
| :---: | :--- |
| `0` | Succes. |
| `1` | Eroare generală. |
| `2` | Folosire greșită a comenzii (opțiuni sau argumente invalide). |
| `126` | Fișierul există, dar nu poate fi executat (lipsește dreptul `x`). |
| `127` | Comanda nu a fost găsită (greșeală de tastare sau lipsă din `PATH`). |
| `130` | Întrerupt cu `Ctrl + c` (128 + numărul semnalului 2). |
| `137` | Omorât cu `SIGKILL` (128 + 9), de exemplu de OOM Killer. |

### 2.7. Bucle pe Fișiere și pe Linii, Făcute Corect

Două tipare apar în aproape orice script de administrare, iar fiecare are o variantă greșită foarte răspândită.

**Bucla pe fișiere.** Nu parcurge ieșirea lui `ls`; folosește direct globbing-ul, care tratează corect numele cu spații:

```bash
# FRAGIL: se rupe la primul nume de fișier care conține un spațiu
for f in $(ls /etc/*.conf); do echo "$f"; done

# CORECT:
for f in /etc/*.conf; do
    [[ -f "$f" ]] || continue        # sare peste ce nu e fișier obișnuit
    echo "$(wc -l < "$f") linii: $f"
done
```

**Bucla pe liniile unui fișier.** `while read` citește linie cu linie; `-r` împiedică interpretarea backslash-urilor:

```bash
# Creează utilizatorii dintr-un fișier cu un nume pe linie, sărind peste liniile goale și comentarii:
while read -r nume; do
    [[ -z "$nume" || "$nume" == \#* ]] && continue
    id "$nume" &>/dev/null || useradd "$nume"
done < /root/utilizatori.txt
```

**Capcana pipe-ului.** Într-o construcție `comandă | while read ...`, bucla rulează într-un proces-copil, deci variabilele modificate în ea se pierd la ieșire:

```bash
TOTAL=0
cat fișier.txt | while read -r n; do TOTAL=$((TOTAL + n)); done
echo "$TOTAL"      # afișează 0, nu suma!

TOTAL=0
while read -r n; do TOTAL=$((TOTAL + n)); done < fișier.txt
echo "$TOTAL"      # corect: bucla rulează în shell-ul curent
```

**Tablouri**, pe scurt, pentru liste pe care le refolosești:

```bash
SERVICII=(sshd chronyd crond)
for s in "${SERVICII[@]}"; do
    systemctl is-active --quiet "$s" && echo "$s: OK" || echo "$s: OPRIT"
done
echo "Am verificat ${#SERVICII[@]} servicii"
```

### 2.8. Scripturi care Pot Fi Rulate de Două Ori fără Urmări

Un script de administrare bun este **idempotent**: a doua rulare nu strică nimic și nu dă erori. Asta contează și în examen, unde vei rula de mai multe ori același script până iese bine.

| În loc de | Scrie | De ce |
| :--- | :--- | :--- |
| `mkdir /srv/date` | `mkdir -p /srv/date` | Nu dă eroare dacă directorul există. |
| `useradd natasha` | `id natasha &>/dev/null \|\| useradd natasha` | Creează contul doar dacă lipsește. |
| `echo "linie" >> fișier` | `grep -qxF "linie" fișier \|\| echo "linie" >> fișier` | Nu adaugă aceeași linie de zece ori. |
| `ln -s țintă link` | `ln -sfn țintă link` | Înlocuiește link-ul dacă există deja. |
| `cp fișier destinație` | `install -m 0644 -o root fișier destinație` | Copiază și stabilește permisiunile și proprietarul într-un singur pas. |

Opțiunile lui `grep` din rândul al treilea: `-q` nu afișează nimic, `-x` cere potrivirea întregii linii, `-F` tratează textul literal, nu ca expresie regulată.

Pentru opțiuni de forma `-v` sau `-f fișier`, Bash are comanda internă `getopts`:

```bash
while getopts "vf:" opt; do
    case "$opt" in
        v) VERBOSE=1 ;;
        f) FISIER="$OPTARG" ;;
        *) echo "Folosire: $0 [-v] [-f fișier]" >&2; exit 2 ;;
    esac
done
```

Cele două puncte de după `f` spun că opțiunea cere o valoare, pe care o găsești în `OPTARG`.

### 2.9. `tuned` Mai în Adâncime: Ce Conține un Profil și Cum Îți Faci Unul

Un profil `tuned` este un director care conține un fișier `tuned.conf`. Profilurile livrate de Red Hat stau în `/usr/lib/tuned/` (pe versiunile noi, în subdirectorul `profiles/`), iar cele proprii în `/etc/tuned/`. Te poți uita într-unul ca să vezi că nu este nimic magic:

```ini
# Extras din profilul virtual-guest
[main]
summary=Optimize for running inside a virtual guest
include=throughput-performance

[sysctl]
vm.dirty_ratio = 30
vm.swappiness = 30
```

`include=` moștenește tot dintr-un alt profil, iar secțiunile următoare (`[sysctl]`, `[cpu]`, `[disk]`, `[vm]`) adaugă sau schimbă setări. Un profil propriu se construiește la fel:

```bash
mkdir -p /etc/tuned/baza-de-date
cat << 'EOF' > /etc/tuned/baza-de-date/tuned.conf
[main]
summary=Profil pentru serverul de baze de date
include=throughput-performance

[sysctl]
vm.swappiness = 10
EOF

tuned-adm profile baza-de-date
```

Comenzi suplimentare:

| Comandă | Ce face |
| :--- | :--- |
| `tuned-adm list` | Profilurile disponibile, cu o linie de descriere, și profilul activ. |
| `tuned-adm profile_info virtual-guest` | Descrierea unui profil. |
| `tuned-adm verify` | Verifică dacă setările profilului activ chiar sunt aplicate în sistem. |
| `tuned-adm off` | Dezactivează orice profil (setările revin la valorile sistemului). |
| `tuned-adm profile A B` | Aplică două profiluri combinate; la conflict câștigă ultimul. |

Dacă un parametru apare și într-un profil `tuned`, și într-un fișier din `/etc/sysctl.d/`, câștigă cel din `/etc/sysctl.d/`: `tuned` reaplică la final setările `sysctl` ale sistemului. Dacă `tuned-adm verify` raportează diferențe, acolo este de obicei explicația.

## exam-alert

### ⚠️ Capcană în plus: Mesajul de eroare cerut, scris „aproape” la fel
Scriptul de notare compară textul afișat caracter cu caracter. Dacă enunțul cere `Usage: /usr/local/bin/script.sh redhat|fedora`, atunci `usage:` cu literă mică, un spațiu în plus sau un punct la sfârșit înseamnă zero puncte. Copiază mesajul din enunț, nu îl rescrie din memorie. Verifică și **unde** trebuie afișat: dacă se cere pe `stderr`, testează cu `script.sh greșit 2>/dev/null`, care nu trebuie să mai afișeze nimic.

### ⚠️ Capcană în plus: Scriptul scris pe alt sistem, cu sfârșit de linie Windows
Un script copiat dintr-un editor Windows are la sfârșitul fiecărei linii caracterul invizibil `\r`. Simptomul: `/bin/bash^M: bad interpreter: No such file or directory`, deși linia shebang pare corectă. Vezi caracterele cu `cat -A script.sh` (apar ca `^M`) și le elimini cu `sed -i 's/\r$//' script.sh`.

## interview

### Întrebare în plus (Nivel Mid):
> **Intervievator:** *„Ai un script de backup care rulează din `cron` în fiecare noapte. Într-o dimineață descoperi că rulează de trei ori în paralel, pentru că execuția durează acum mai mult de 24 de ore. Cum împiedici pornirea unei a doua copii?”*

**Răspunsul Ideal:**
> „Am nevoie de un mecanism de blocare, iar cel mai sigur în Linux este `flock`, care ține un blocaj pe un fișier cât timp rulează comanda. În crontab scriu:
>
> ```text
> 0 2 * * * /usr/bin/flock -n /run/lock/backup.lock /usr/local/bin/backup.sh
> ```
>
> `flock -n` încearcă să obțină blocajul fără să aștepte. Dacă o copie a scriptului rulează deja, a doua iese imediat cu cod de eroare și nu face nimic. Blocajul este ținut de kernel și se eliberează singur când procesul se termină, **inclusiv** dacă scriptul este omorât sau serverul repornește.
>
> Acesta este avantajul față de metoda clasică cu fișier PID (`if [[ -f /var/run/backup.pid ]]`): acolo, dacă scriptul moare fără să-și șteargă fișierul, toate rulările următoare refuză să pornească până intervine cineva manual.
>
> Dacă jobul este un timer `systemd` în loc de `cron`, problema nu apare deloc: `systemd` nu pornește o a doua instanță a unui serviciu care este încă activ. Este unul dintre motivele pentru care prefer timerele la joburile lungi. În ambele cazuri adaug și o alertă când execuția depășește durata normală, fiindcă un backup care durează peste 24 de ore este el însuși un semnal că trebuie regândit.”
