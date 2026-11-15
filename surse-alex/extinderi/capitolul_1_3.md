## architecture

### 2.6. `top` ca Instrument de Lucru: Ce Înseamnă Fiecare Cifră

`top` este primul lucru pe care îl deschizi când un server „merge greu”. Antetul lui răspunde la trei întrebări: cât de încărcat e sistemul, pe ce se duce procesorul și câtă memorie mai este.

```text
top - 14:02:11 up 12 days,  3:41,  2 users,  load average: 0.42, 0.61, 0.58
Tasks: 187 total,   1 running, 186 sleeping,   0 stopped,   0 zombie
%Cpu(s):  3.1 us,  1.0 sy,  0.0 ni, 95.4 id,  0.3 wa,  0.0 hi,  0.2 si,  0.0 st
MiB Mem :   3654.9 total,    412.3 free,   1180.6 used,   2062.0 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   2190.4 avail Mem
```

| Câmp | Ce înseamnă | Când te îngrijorezi |
| :--- | :--- | :--- |
| `load average` | Media proceselor care rulează sau așteaptă (procesor ori disc), pe 1, 5 și 15 minute. | Când depășește constant numărul de nuclee (`nproc`). |
| `us` / `sy` | Timp de procesor în aplicații / în kernel. | `sy` mare înseamnă multe apeluri de sistem sau probleme de drivere. |
| `id` | Procesor liber. | — |
| `wa` | Timp în care procesorul așteaptă discul sau rețeaua. | Peste câteva procente, constant: stocarea este gâtuirea. |
| `st` | Timp „furat” de hypervisor pentru alte mașini virtuale. | Mare: problema e la gazdă, nu la tine. |
| `buff/cache` | Memorie folosită drept cache de fișiere, eliberată la nevoie. | Nu este o problemă; e memorie folosită util. |
| `avail Mem` | Câtă memorie poate primi o aplicație nouă. | Când se apropie de zero și swap-ul începe să crească. |

Pe fiecare proces, coloanele de memorie care contează sunt `RES` (memoria fizică ocupată efectiv) și `%MEM`. `VIRT` este spațiul de adrese rezervat și poate fi uriaș fără să însemne ceva.

Taste utile în timp ce `top` rulează:

| Tastă | Efect |
| :---: | :--- |
| `P` / `M` | Sortează după procesor / după memorie. |
| `1` | Arată fiecare nucleu separat. |
| `u` | Filtrează după un utilizator. |
| `k` | Trimite un semnal unui PID (implicit `SIGTERM`). |
| `r` | Schimbă valoarea `nice` a unui PID (`renice`). |
| `c` | Arată linia de comandă completă. |
| `q` | Ieșire. |

Pentru scripturi și rapoarte, `top -b -n 1 | head -20` rulează o singură dată și scrie rezultatul ca text simplu.

### 2.7. Joburile Shell-ului: `&`, `jobs`, `fg`, `bg`, `nohup`

Un *job* este o comandă pornită din shell-ul curent și ținută în evidența lui.

```bash
sleep 600 &           # pornește comanda în fundal; shell-ul afișează [1] și PID-ul
jobs -l               # lista joburilor acestui shell, cu numărul și PID-ul fiecăruia
fg %1                 # aduce jobul 1 în prim-plan
# Ctrl + z            # suspendă jobul din prim-plan (starea T)
bg %1                 # îl repornește în fundal
kill %1               # trimite SIGTERM jobului 1 (observă semnul %)
```

Joburile aparțin shell-ului. Când închizi sesiunea SSH, shell-ul trimite `SIGHUP` joburilor lui și ele se opresc. Ai trei metode să ții o comandă în viață după deconectare:

| Metodă | Cum | Când o alegi |
| :--- | :--- | :--- |
| `nohup comandă &` | Comanda ignoră `SIGHUP`; ce afișează ajunge în `nohup.out`. | Ai știut dinainte că va dura mult. |
| `disown %1` | Scoate din evidența shell-ului un job deja pornit. | Ai uitat de `nohup`. |
| `systemd-run --unit=copiere comandă` | Pornește comanda ca unitate `systemd` temporară, cu jurnal propriu. | Vrei să o urmărești cu `systemctl status` și `journalctl -u`. |

Pentru lucru interactiv de durată, `tmux` (Capitolul 0.2) rămâne cea mai comodă variantă.

### 2.8. Procesele Văzute prin `systemd`: cgroups, `systemctl kill` și Limite

În RHEL, fiecare serviciu rulează într-un **control group** (*cgroup*) propriu. Avantajul practic: `systemd` știe exact ce procese aparțin unui serviciu, inclusiv copiii porniți ulterior.

```bash
# Procesele unui serviciu, memoria și procesorul consumate:
systemctl status sshd

# Arborele complet al cgroup-urilor din sistem:
systemd-cgls

# Un 'top' pe servicii, nu pe procese:
systemd-cgtop

# Trimite un semnal TUTUROR proceselor unui serviciu (nu doar procesului principal):
systemctl kill --signal=SIGTERM httpd
```

Pe aceeași bază se pun limite de resurse pe un serviciu, fără să-i editezi fișierul de unitate:

```bash
# Cel mult 512 MiB de memorie și jumătate de nucleu pentru httpd, persistent:
systemctl set-property httpd.service MemoryMax=512M CPUQuota=50%

# Verificare:
systemctl show httpd -p MemoryMax -p CPUQuotaPerSecUSec
```

Prioritatea persistentă a unui serviciu (despre care vorbește Regula de Aur a capitolului) se pune cu directiva `Nice=` într-un fișier drop-in creat cu `systemctl edit <serviciu>`.

### 2.9. `cron` în Detaliu: Variabile, Scurtături, `anacron` și Unde Vezi ce a Rulat

**Variabilele din crontab.** Primele linii dintr-un crontab pot seta mediul joburilor:

```text
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
MAILTO=root

*/10 * * * * /usr/local/bin/verificare.sh
```

`PATH` rezolvă problema căilor absolute pentru toate joburile din fișier, iar `MAILTO` spune cui i se trimite prin e-mail ce afișează jobul (`MAILTO=""` oprește e-mailurile).

**Scurtături în locul celor cinci câmpuri:**

| Scurtătură | Echivalent | Când rulează |
| :--- | :--- | :--- |
| `@reboot` | — | O dată, la pornirea serviciului `crond` (practic la boot). |
| `@hourly` | `0 * * * *` | La fiecare oră fixă. |
| `@daily` | `0 0 * * *` | La miezul nopții. |
| `@weekly` | `0 0 * * 0` | Duminica, la miezul nopții. |
| `@monthly` | `0 0 1 * *` | În prima zi a lunii. |

**Directoarele `/etc/cron.daily`, `cron.weekly`, `cron.monthly` și `anacron`.** Scripturile executabile puse în aceste directoare rulează o dată pe zi, săptămână sau lună. Pe RHEL ele sunt lansate de `anacron` (configurat în `/etc/anacrontab`), care are o proprietate pe care `cron` nu o are: dacă serverul a fost oprit la ora programată, jobul este recuperat după pornire. `cron` simplu sare pur și simplu peste execuțiile ratate.

**Unde vezi ce s-a întâmplat:**

```bash
journalctl -u crond --since today     # ce joburi a pornit crond azi
grep CRON /var/log/cron | tail        # același lucru, din fișierul clasic
systemctl list-timers --all           # pentru timere: ultima și următoarea rulare
journalctl -u disk-check.service      # ce a afișat serviciul pornit de un timer
```

`cron` consemnează că a **pornit** comanda, nu și dacă ea a reușit. Ca să păstrezi rezultatul, redirecționezi în job: `comandă >> /var/log/job.log 2>&1`.

### 2.10. Timere `systemd`: `Persistent=`, Precizie și Timere de Unică Folosință

Trei directive din secțiunea `[Timer]` pe care merită să le cunoști pe lângă `OnCalendar=` și `OnUnitActiveSec=`:

| Directivă | Efect |
| :--- | :--- |
| `Persistent=true` | Dacă sistemul era oprit la ora programată, jobul rulează imediat după pornire. Echivalentul lui `anacron`; are sens doar cu `OnCalendar=`. |
| `AccuracySec=1s` | Precizia. Implicit este un minut: `systemd` își permite să întârzie jobul până la un minut ca să grupeze treziri. |
| `RandomizedDelaySec=300` | Adaugă o întârziere aleatoare, ca o sută de servere să nu pornească același job în aceeași secundă. |

Expresiile `OnCalendar=` au forma `ZiuaSăptămânii An-Lună-Zi Oră:Minut:Secundă`, cu `*` pentru „orice”:

| Expresie | Când |
| :--- | :--- |
| `*-*-* 02:30:00` | Zilnic la 02:30. |
| `Mon..Fri *-*-* 09:00:00` | De luni până vineri la 09:00. |
| `*-*-01 00:00:00` | În prima zi a fiecărei luni. |
| `*:0/15` | Din 15 în 15 minute. |
| `hourly`, `daily`, `weekly` | Scurtături, ca la `cron`. |

Pentru o execuție unică, fără niciun fișier, există `systemd-run`, alternativa modernă la `at`:

```bash
# Rulează comanda o singură dată, peste 10 minute:
systemd-run --on-active=10m /usr/bin/touch /tmp/gata

# Rulează comanda la o oră anume:
systemd-run --on-calendar="2026-12-31 23:59:00" /usr/local/bin/raport.sh
```

### 2.11. Măsurarea Sistemului în Timp: `vmstat`, `iostat`, `pidstat` și `sar`

`top` îți arată clipa de față. Pentru a înțelege o problemă de performanță ai nevoie de valori urmărite la interval regulat. Uneltele de mai jos, cu excepția lui `vmstat`, vin din pachetul `sysstat`.

**`vmstat 1`** afișează o linie pe secundă cu starea întregului sistem:

```text
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 1  0      0 412300   2104 2110440    0    0     5    12  110  220  3  1 95  1  0
```

| Coloană | Semnificație | Semnal de alarmă |
| :--- | :--- | :--- |
| `r` | Procese care așteaptă procesorul. | Constant mai mare decât numărul de nuclee. |
| `b` | Procese blocate în așteptarea discului sau a rețelei. | Orice valoare care nu revine la zero. |
| `si` / `so` | Memorie adusă din swap / trimisă în swap, pe secundă. | Valori nenule continue: memoria nu ajunge. |
| `bi` / `bo` | Blocuri citite de pe disc / scrise pe disc. | — |
| `wa` | Procent din timp în care procesorul așteaptă I/O. | Peste câteva procente, constant. |

Prima linie afișată este media de la pornirea sistemului; valorile curente încep cu a doua.

**`iostat -xz 1`** arată fiecare disc în parte. Coloanele de urmărit: `%util` (cât la sută din timp discul a fost ocupat; aproape de 100 înseamnă saturat) și `r_await` / `w_await` (cât a așteptat în medie o cerere, în milisecunde).

**`pidstat 1`** face același lucru pe procese: cine consumă procesor (`pidstat -u`), memorie (`-r`) sau disc (`-d`). Răspunde la întrebarea pe care `iostat` o lasă deschisă: discul e ocupat, dar **de cine**?

**`sar`** citește istoricul strâns automat în `/var/log/sa/`, după ce activezi colectarea cu `systemctl enable --now sysstat`:

```bash
sar -u            # procesorul, pe parcursul zilei de azi
sar -r            # memoria
sar -q            # load average și lungimea cozii de procese
sar -d            # discurile
sar -u -f /var/log/sa/sa12    # aceeași statistică, pentru ziua de 12 a lunii
```

`sar` este singura unealtă de aici care poate răspunde la întrebarea „ce s-a întâmplat azi-noapte la ora trei?”. De aceea colectarea `sysstat` se activează pe orice server de producție înainte să apară prima problemă.

## exam-alert

### ⚠️ Capcană în plus: Ziua din lună ȘI ziua din săptămână completate amândouă
Când în crontab restrângi **ambele** câmpuri de zi (al treilea și al cincilea), `cron` rulează jobul dacă se potrivește **oricare** dintre ele, nu amândouă. `0 9 13 * 5` nu înseamnă „vineri 13 la ora 9”, ci „în fiecare zi de 13 **și** în fiecare vineri”. Dacă enunțul cere o singură condiție de zi, lasă celălalt câmp cu `*`.

### ⚠️ Capcană în plus: Ai testat serviciul, dar ai uitat timerul (sau invers)
`systemctl start nume.service` dovedește doar că serviciul funcționează când îl pornești tu. Ce contează la reboot este ca **timerul** să fie activat: `systemctl is-enabled nume.timer` trebuie să răspundă `enabled`, iar `systemctl list-timers` trebuie să arate o oră în coloana `NEXT`. Dacă `NEXT` este goală, timerul nu este pornit.

## interview

### Întrebare în plus (Nivel Mid -> Senior):
> **Intervievator:** *„O aplicație Java dispare din când în când fără niciun mesaj în jurnalul ei. Serviciul apare ca `failed`, cu `signal=KILL`. Nimeni nu a rulat `kill`. Ce s-a întâmplat și cum dovedești?”*

**Răspunsul Ideal:**
> „Cel mai probabil a intervenit **OOM Killer** (*Out-Of-Memory Killer*). Când kernelul rămâne fără memorie și nu mai are ce elibera, alege un proces, de obicei pe cel care ocupă cea mai multă memorie, și îi trimite `SIGKILL`. Aplicația nu apucă să scrie nimic în jurnalul propriu, pentru că `SIGKILL` nu poate fi interceptat.
>
> Dovada este în jurnalul kernelului: `journalctl -k | grep -i -E 'out of memory|oom'` sau `dmesg -T | grep -i oom`. Acolo apare o linie de forma *Out of memory: Killed process 4812 (java)*, împreună cu memoria pe care o ocupa. `systemctl status` pe serviciu arată și el `Result: oom-kill` atunci când limita a fost depășită în cgroup-ul serviciului.
>
> Mai departe aflu **de ce** s-a terminat memoria: mă uit la `free -h`, la tendința din monitorizare și la setările aplicației (la Java, dimensiunea maximă a heap-ului față de memoria mașinii). Soluțiile, în ordinea preferinței: corectez configurarea aplicației, adaug memorie sau swap, pun o limită cu `MemoryMax=` pe serviciile mai puțin importante, ca să nu sufoce aplicația critică. Dacă vreau doar să protejez un anumit serviciu, îi setez `OOMScoreAdjust=-500` în unitate, ceea ce îl face o țintă mai puțin probabilă. Nu dezactivez OOM Killer: fără el, sistemul întreg ar îngheța.”
