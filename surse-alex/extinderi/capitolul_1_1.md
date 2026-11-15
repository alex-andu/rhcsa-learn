## architecture

### 2.6. Ștergerea, Redenumirea și Inventarul Conturilor

Crearea conturilor este jumătate din muncă. Cealaltă jumătate este să le scoți curat și să știi cine are acces.

```bash
# Șterge contul, dar LASĂ directorul home și fișierele pe disc:
userdel harry

# Șterge contul împreună cu directorul home și căsuța de mail (-r = remove):
userdel -r harry

# Redenumește contul (-l = login) și mută-i directorul home la noul nume:
usermod -l henry -d /home/henry -m harry

# Scoate un utilizator dintr-un singur grup secundar, fără să atingi celelalte:
gpasswd -d natasha sysadmins

# Șterge un grup (refuză dacă este grupul primar al unui utilizator):
groupdel devops
```

După un `userdel` fără `-r`, fișierele fostului utilizator rămân pe disc și apar în `ls -l` cu un număr în loc de nume, fiindcă UID-ul nu mai are corespondent în `/etc/passwd`. Le găsești cu `find / -xdev -nouser`. Riscul: următorul utilizator creat poate primi același UID și devine, fără să vrea nimeni, proprietarul acelor fișiere.

Comenzi de inventar, utile la orice audit:

| Întrebare | Comandă |
| :--- | :--- |
| Ce conturi există, cu UID, grup, ultimul login și starea parolei? | `lslogins` |
| Detalii despre un singur cont | `lslogins natasha` |
| Cine este conectat acum și de unde? | `who`, respectiv `w` (arată și ce rulează) |
| Istoricul conectărilor | `last` (reușite), `lastb` (eșuate, doar ca `root`) |
| Când s-a conectat ultima dată fiecare cont? | `lastlog` |
| Din ce grupuri face parte un utilizator? | `id natasha` sau `groups natasha` |
| Cine sunt membrii unui grup? | `getent group sysadmins` |

`getent` merită reținut: citește prin *Name Service Switch*, deci vede și conturile care nu sunt în fișierele locale (de exemplu cele dintr-un director LDAP), spre deosebire de `grep` în `/etc/passwd`.

### 2.7. Valorile Implicite ale lui `useradd`: `/etc/default/useradd` și `/etc/login.defs`

Când rulezi `useradd nume` fără opțiuni, comanda ia deciziile din două fișiere.

```bash
# Valorile implicite curente:
useradd -D
```

```text
GROUP=100
HOME=/home
INACTIVE=-1
EXPIRE=
SHELL=/bin/bash
SKEL=/etc/skel
CREATE_MAIL_SPOOL=yes
```

Acestea vin din `/etc/default/useradd` și se pot schimba tot cu `useradd -D`: de exemplu `useradd -D -s /sbin/nologin` face ca toate conturile viitoare să primească `/sbin/nologin`, iar `useradd -D -f 30` setează perioada de inactivitate implicită la 30 de zile.

Din `/etc/login.defs` vin, pe lângă regulile de expirare a parolei din secțiunea 2.4:

| Directivă | Ce stabilește |
| :--- | :--- |
| `UID_MIN` / `UID_MAX` | Plaja de UID-uri pentru utilizatori obișnuiți (`1000`–`60000`). |
| `SYS_UID_MIN` / `SYS_UID_MAX` | Plaja pentru conturile de sistem create cu `useradd -r`. |
| `CREATE_HOME` | Dacă `useradd` creează directorul home fără să i se ceară cu `-m` (`yes` în RHEL). |
| `UMASK` și `HOME_MODE` | Permisiunile cu care se creează directorul home (`0700` în RHEL 9 și 10). |
| `USERGROUPS_ENAB` | Dacă se creează un grup privat cu numele utilizatorului (`yes`). |
| `ENCRYPT_METHOD` | Algoritmul cu care se criptează parolele noi (`SHA512` sau `YESCRYPT`). |

Atenție la deosebire: `PASS_MAX_DAYS` din `/etc/login.defs` se aplică doar conturilor create **după** modificare. Conturile existente se schimbă numai cu `chage`.

### 2.8. Calitatea Parolelor și Blocarea după Încercări Eșuate

Două mecanisme PAM controlează parolele dincolo de expirare.

**Complexitatea parolei: `pwquality`.** Regulile stau în `/etc/security/pwquality.conf` și se aplică atunci când un utilizator obișnuit își schimbă parola:

| Opțiune | Semnificație |
| :--- | :--- |
| `minlen = 12` | Lungimea minimă. |
| `dcredit = -1` | Cel puțin o cifră (valoarea negativă înseamnă „minimum atâtea”). |
| `ucredit = -1`, `lcredit = -1`, `ocredit = -1` | Cel puțin o majusculă, o minusculă, un caracter special. |
| `maxrepeat = 3` | Cel mult trei caractere identice la rând. |
| `dictcheck = 1` | Respinge parolele bazate pe cuvinte din dicționar. |
| `enforce_for_root` | Aplică regulile și când `root` setează parola. |

Fără `enforce_for_root`, `root` primește doar un avertisment (`BAD PASSWORD`) și parola este acceptată. De aceea în laborator poți seta parole simple precum `flectrag` când lucrezi ca `root`.

**Blocarea contului: `faillock`.** Contorizează autentificările eșuate și blochează temporar contul. Se activează cu `authselect enable-feature with-faillock`, iar pragurile stau în `/etc/security/faillock.conf` (`deny = 3` încercări, `unlock_time = 600` secunde).

```bash
# Câte încercări eșuate are un utilizator și de unde au venit:
faillock --user natasha

# Deblocarea contului înainte să expire timpul:
faillock --user natasha --reset
```

Dacă un utilizator spune „parola mea e corectă, dar nu pot intra”, verifici în ordine: `faillock --user`, `chage -l` (parolă sau cont expirat), `passwd -S` (cont blocat cu `-L`) și shell-ul din `/etc/passwd`.

### 2.9. `sudo` Dincolo de `ALL`: Alias-uri, Comenzi Limitate și Verificare

Regula `NOPASSWD: ALL` este cea cerută de obicei în examen. În producție dai fiecărui rol doar ce îi trebuie.

```text
# Fișier: /etc/sudoers.d/operatori  (editat cu: visudo -f /etc/sudoers.d/operatori)

# Un alias de comenzi: căi ABSOLUTE, separate prin virgulă
Cmnd_Alias SERVICII_WEB = /usr/bin/systemctl restart httpd, /usr/bin/systemctl status httpd
Cmnd_Alias JURNALE      = /usr/bin/journalctl

# Membrii grupului 'operatori' pot rula doar aceste comenzi, cu propria parolă:
%operatori  ALL=(root)  SERVICII_WEB, JURNALE

# Utilizatorul 'backup' poate rula rsync ca root fără parolă (pentru scripturi):
backup      ALL=(root)  NOPASSWD: /usr/bin/rsync
```

Comenzi pentru lucrul zilnic cu `sudo`:

| Comandă | Ce face |
| :--- | :--- |
| `sudo -l` | Arată ce are voie să ruleze utilizatorul curent. |
| `sudo -l -U natasha` | Ca `root`: arată ce are voie să ruleze `natasha`. Verificare excelentă după ce scrii o regulă. |
| `sudo -i` | Deschide un shell de login ca `root` (mediu curat, director `/root`), echivalentul lui `su -`. |
| `sudo -s` | Deschide un shell ca `root`, dar păstrează mediul și directorul curent. |
| `sudo -u apache comandă` | Rulează comanda ca alt utilizator decât `root`. |
| `sudo -k` | Uită parola memorată; următorul `sudo` o cere din nou. |
| `visudo -f /etc/sudoers.d/nume` | Editează un fișier de reguli cu verificarea sintaxei la salvare. |

După ce introduci parola, `sudo` nu o mai cere timp de 5 minute (`timestamp_timeout`). Fiecare comandă rulată prin `sudo` ajunge în jurnal; o găsești cu `journalctl _COMM=sudo` sau în `/var/log/secure`.

O regulă de proiectare: nu permite prin `sudo` comenzi care pot deschide un shell sau pot edita orice fișier (`vim`, `less`, `find`, `awk`), fiindcă din ele se poate ajunge la un shell de `root`. Pentru editarea controlată a unui fișier există `sudoedit`.

### 2.10. Verificarea Consistenței Fișierelor de Conturi și Editarea lor în Siguranță

Fișierele din secțiunea 2.2 sunt text simplu, deci pot fi stricate: o linie cu un câmp lipsă, un utilizator fără grup primar, un UID duplicat. Sistemul oferă unelte care le verifică și un mod sigur de a le edita.

```bash
pwck          # verifică /etc/passwd și /etc/shadow: câmpuri, directoare home, shell-uri existente
grpck         # verifică /etc/group și /etc/gshadow
pwck -r       # doar raportează, fără să propună corecturi (read-only)
```

Mesaje tipice: *user 'x': directory '/home/x' does not exist* (cont creat cu `-M` sau home șters) și *no matching password file entry in /etc/shadow*. Nu toate sunt erori; conturile de serviciu fără director home sunt normale.

Dacă trebuie totuși să editezi manual aceste fișiere, nu folosi `vim` direct:

| Comandă | Ce editează | De ce e mai sigură |
| :--- | :--- | :--- |
| `vipw` | `/etc/passwd` | Blochează fișierul cât timp îl editezi, ca nicio altă comandă (`useradd`, `passwd`) să nu scrie în el în același timp. |
| `vipw -s` | `/etc/shadow` | La fel. |
| `vigr` | `/etc/group` | La fel. |

În practică, aproape orice modificare se poate face cu `usermod`, `groupmod` și `chage`, iar editarea manuală rămâne pentru reparații.

**Administratorii de grup și comenzile rulate cu alt grup:**

```bash
gpasswd -A natasha sysadmins    # natasha devine administrator al grupului sysadmins
gpasswd -a harry sysadmins      # (rulată de natasha) adaugă un membru, fără drepturi de root
gpasswd -d harry sysadmins      # scoate un membru

newgrp sysadmins                # shell nou, în care grupul PRIMAR este temporar sysadmins
sg sysadmins -c "touch /srv/proiect/raport.txt"    # o singură comandă cu alt grup primar
```

`newgrp` și `sg` sunt utile când vrei ca fișierele pe care le creezi să primească un anumit grup, fără să depinzi de un director cu SGID.

### 2.11. De Unde Vin Utilizatorii: `nsswitch`, `sssd` și `authselect`, pe Scurt

Pe serverele unei companii, conturile oamenilor nu stau în `/etc/passwd`, ci într-un director central (LDAP, Active Directory, Red Hat Identity Management). Examenul EX200 lucrează cu utilizatori locali, dar trebuie să înțelegi schema, fiindcă explică de ce un utilizator „există” deși nu apare în `/etc/passwd`.

Trei piese lucrează împreună:

| Piesă | Rol |
| :--- | :--- |
| `/etc/nsswitch.conf` | Spune **unde** se caută conturile și în ce ordine. Linia `passwd: files sss` înseamnă: întâi fișierele locale, apoi serviciul `sssd`. |
| `sssd` | Serviciul care vorbește cu directorul central și ține un cache local, ca autentificarea să meargă și când directorul nu răspunde. |
| PAM (`/etc/pam.d/`) | Lanțul de module care hotărăște **cum** se face autentificarea: parolă, blocare după încercări eșuate, crearea directorului home. |

Fișierele `nsswitch.conf` și cele din `/etc/pam.d/` nu se editează manual pe RHEL. Sunt generate de `authselect`, dintr-un profil:

```bash
authselect current                          # profilul activ și funcțiile lui
authselect list                             # profilurile disponibile (local/minimal, sssd, winbind)
authselect list-features sssd               # funcțiile opționale ale unui profil
authselect select sssd with-mkhomedir       # schimbă profilul și activează crearea automată a directorului home
authselect enable-feature with-faillock     # adaugă o funcție la profilul curent
```

Funcția `with-mkhomedir` creează directorul home la prima autentificare a unui utilizator din directorul central (are nevoie de serviciul `oddjobd` pornit). `with-faillock` este cea folosită în secțiunea 2.8.

Diagnostic rapid când un cont nu este găsit sau nu se poate autentifica:

| Întrebare | Comandă |
| :--- | :--- |
| Vede sistemul contul, prin oricare sursă? | `getent passwd utilizator` |
| Din ce grupuri face parte? | `id utilizator` |
| Rulează serviciul de identități? | `systemctl status sssd` |
| De ce a fost respinsă autentificarea? | `journalctl -u sshd -n 30` și `/var/log/secure` |

`getent` este testul corect, pentru că parcurge exact sursele din `nsswitch.conf`. Un `grep` în `/etc/passwd` vede doar conturile locale.

## exam-alert

### ⚠️ Capcană în plus: Fișierul din `/etc/sudoers.d/` cu punct în nume este ignorat
`sudo` sare, fără niciun mesaj, peste fișierele din `/etc/sudoers.d/` al căror nume **conține un punct** sau **se termină cu `~`**. Un fișier numit `/etc/sudoers.d/sysadmins.conf` sau `ops.team` nu este citit niciodată, deși `visudo -c` poate să nu semnaleze nimic în neregulă. Folosește nume simple, din litere, cifre, liniuță și underscore (`sysadmins`, `ops_team`) și confirmă cu `sudo -l -U <utilizator>` că regula apare.

### ⚠️ Capcană în plus: Ai adăugat utilizatorul în grup, dar sesiunea lui nu vede grupul
Lista de grupuri a unui proces se stabilește la autentificare. Dacă `natasha` era deja conectată când ai rulat `usermod -aG sysadmins natasha`, în sesiunea ei `id` arată în continuare vechile grupuri și `sudo` o refuză. Trebuie să se deconecteze și să se reconecteze (sau să ruleze `newgrp sysadmins`). Când testezi ca `root`, folosește `su - natasha`, care deschide o sesiune nouă cu grupurile actualizate.

## interview

### Întrebare în plus (Nivel Mid):
> **Intervievator:** *„Un coleg pleacă din companie astăzi. Contul lui are fișiere în mai multe directoare de proiect, joburi `cron` și o cheie SSH autorizată pe server. Ce faci, în ce ordine, și de ce nu rulezi pur și simplu `userdel -r`?”*

**Răspunsul Ideal:**
> „Nu șterg contul imediat, pentru că aș pierde legătura dintre UID și fișierele lui și aș șterge directorul home, care poate conține lucruri de care echipa mai are nevoie. Procedez în trei etape.
>
> **Blochez accesul pe loc:** `usermod -L -s /sbin/nologin coleg` blochează parola și shell-ul, iar `chage -E 0 coleg` expiră contul. Expirarea este pasul important, fiindcă blocarea parolei nu oprește autentificarea cu cheie SSH, iar un cont expirat este refuzat de PAM indiferent de metodă. Închid sesiunile deschise cu `pkill -KILL -u coleg`.
>
> **Opresc ce rulează în numele lui:** verific `crontab -l -u coleg` și îl elimin cu `crontab -r -u coleg`, verific joburile `at` cu `atq`, eventualele servicii `systemd --user` și dacă mai are `linger` activ (`loginctl disable-linger coleg`). Caut și regulile lui din `/etc/sudoers.d/`.
>
> **Inventariez și predau datele:** `find / -xdev -user coleg` îmi arată toate fișierele lui. Pe cele de proiect le trec pe alt proprietar cu `chown`, iar directorul home îl arhivez. Abia după perioada de păstrare stabilită de companie rulez `userdel -r` și verific cu `find / -xdev -nouser` că nu au rămas fișiere orfane.”
