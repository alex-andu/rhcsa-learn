# Cuprins RHCSA (EX200)

> Cuprins generat automat de Claude (2026-11-14), la cererea lui Alex, din obiectivele publice ale examenului EX200 și din cele 5 capitole deja scrise (2.2, 2.3, 3.2, 3.3, 4.1, plus trimiterile lor la 3.1 și 4.2). Subiectele capitolelor existente sunt titlurile secțiunilor lor. Alex îl poate înlocui oricând cu cuprinsul lui: id-urile capitolelor existente se păstrează la reimport.

## PILONUL 1: Fundamentele Linux și Uneltele Esențiale
_Obiectiv: Lucrul sigur în linia de comandă: shell, fișiere, documentație, utilizatori și permisiuni._

### Capitolul 1.1: Shell-ul Bash, Sistemul de Fișiere și Documentația din Sistem
- **1.1.1.** Accesul la shell (consolă, terminal, SSH) și sintaxa corectă a comenzilor.
- **1.1.2.** Ierarhia sistemului de fișiere (FHS): `/etc`, `/var`, `/usr`, `/home`, căi absolute și relative.
- **1.1.3.** Documentația locală: `man` (secțiuni, căutare cu `man -k`), `info` și `/usr/share/doc`.

### Capitolul 1.2: Gestiunea Fișierelor, Legături, Arhive și Transfer Securizat
- **1.2.1.** Crearea, copierea, mutarea și ștergerea fișierelor și directoarelor.
- **1.2.2.** Legături hard și simbolice (`ln`, `ln -s`) și diferența la nivel de inode.
- **1.2.3.** Arhive și compresie: `tar` cu `gzip`, `bzip2` și `xz`.
- **1.2.4.** Transferul securizat de fișiere între sisteme (`scp`, `sftp`, `rsync`).

### Capitolul 1.3: Redirecționări, Pipe-uri, grep și Expresii Regulate
- **1.3.1.** Fluxurile `stdin`, `stdout`, `stderr` și redirecționarea lor (`>`, `>>`, `2>`, `&>`).
- **1.3.2.** Pipe-uri și filtrarea textului (`grep`, `sort`, `cut`, `wc`, `tee`).
- **1.3.3.** Expresii regulate de bază și extinse în `grep -E`.

### Capitolul 1.4: Utilizatori, Grupuri și Accesul sudo
- **1.4.1.** Crearea, modificarea și ștergerea utilizatorilor locali (`useradd`, `usermod`, `userdel`).
- **1.4.2.** Parole și îmbătrânirea lor (`passwd`, `chage`, `/etc/login.defs`).
- **1.4.3.** Grupuri locale și grupuri secundare (`groupadd`, `usermod -aG`).
- **1.4.4.** Acces de superuser cu `sudo` (`/etc/sudoers.d/`, `visudo`, grupul `wheel`).

### Capitolul 1.5: Permisiuni, umask și Biți Speciali
- **1.5.1.** Permisiunile standard `rwx` în mod simbolic și octal (`chmod`, `chown`, `chgrp`).
- **1.5.2.** Permisiunile implicite cu `umask`.
- **1.5.3.** Biții speciali SUID, SGID și sticky bit; directoare colaborative.
- **1.5.4.** Diagnosticarea problemelor de permisiuni.

## PILONUL 2: Operarea și Administrarea Sistemului
_Obiectiv: Pornirea, serviciile, procesele, software-ul, automatizarea și jurnalele unui server RHEL._

### Capitolul 2.1: Procesul de Boot, Targeturi systemd, GRUB2 și Resetarea Parolei root
- **2.1.1.** Pornirea, repornirea și oprirea corectă a sistemului.
- **2.1.2.** Targeturile systemd: pornirea manuală într-un target și setarea targetului implicit.
- **2.1.3.** Întreruperea boot-ului pentru acces la sistem (resetarea parolei `root`, `rd.break`).
- **2.1.4.** Modificarea bootloader-ului GRUB2 (`grubby`, `/etc/default/grub`).

### Capitolul 2.2: Gestiunea Pachetelor Software (rpm, dnf, Repo-uri Locale/Remote, AppStreams & Flatpak)
- **2.2.1.** Anatomia unui pachet `.rpm` și comanda de nivel jos `rpm`.
- **2.2.2.** Configurarea depozitelor `dnf` în `/etc/yum.repos.d/*.repo`.
- **2.2.3.** Comanda `dnf`: pachete, grupuri, istoric și module.
- **2.2.4.** Aplicații izolate cu `Flatpak`.

### Capitolul 2.3: Automatizare prin Bash Scripting și Tuning de Performanță (tuned)
- **2.3.1.** Anatomia unui script Bash: shebang, permisiuni și variabilele speciale.
- **2.3.2.** Operatorii de testare `[[ ... ]]` și structurile condiționale (`if`, `case`).
- **2.3.3.** Bucle `for` și `while` și procesarea listelor.
- **2.3.4.** Optimizarea performanței cu `tuned` și `tuned-adm`.

### Capitolul 2.4: Servicii systemd, Procese și Priorități
- **2.4.1.** Pornirea, oprirea și activarea serviciilor la boot (`systemctl`).
- **2.4.2.** Identificarea proceselor care consumă CPU și memorie (`ps`, `top`) și oprirea lor (`kill`, `pkill`).
- **2.4.3.** Ajustarea priorității proceselor (`nice`, `renice`).

### Capitolul 2.5: Programarea Sarcinilor și Jurnalele Sistemului
- **2.5.1.** Sarcini programate cu `cron`, `at` și timere systemd.
- **2.5.2.** Localizarea și interpretarea jurnalelor (`journalctl`, `/var/log`).
- **2.5.3.** Păstrarea persistentă a jurnalului systemd.

## PILONUL 3: Stocarea Locală și în Rețea
_Obiectiv: Partiții, sisteme de fișiere, LVM și stocare în rețea, toate persistente după reboot._

### Capitolul 3.1: Partiționare GPT/MBR, Sisteme de Fișiere și Swap
- **3.1.1.** Partiții GPT și MBR (`parted`, `fdisk`, `gdisk`) adăugate fără a distruge datele.
- **3.1.2.** Crearea sistemelor de fișiere `xfs`, `ext4` și `vfat`.
- **3.1.3.** Montarea persistentă după UUID sau etichetă în `/etc/fstab`.
- **3.1.4.** Spațiu de swap pe partiție sau volum logic.

### Capitolul 3.2: Logical Volume Manager (LVM) și Stocare Avansată (Stratis / VDO)
- **3.2.1.** Arhitectura LVM2 pe cele 3 niveluri și matematica `PE` / `LE`.
- **3.2.2.** Comenzile LVM pe cele 3 niveluri: creare, inspecție, ștergere.
- **3.2.3.** Extinderea online a unui volum logic (`lvextend -r`).
- **3.2.4.** Stocare modernă: `Stratis` și `LVM-VDO`.

### Capitolul 3.3: Stocare în Rețea (NFS) și Montarea Dinamică la Cerere cu autofs
- **3.3.1.** Arhitectura protocolului `NFSv4` (server și client).
- **3.3.2.** Descoperirea și montarea clasică pe client (`showmount`, `mount`, `/etc/fstab`).
- **3.3.3.** Arhitectura `autofs`: Direct Maps, Indirect Maps și wildcards.

## PILONUL 4: Rețea și Securitate
_Obiectiv: Conectivitate persistentă, acces la distanță sigur, firewall și SELinux._

### Capitolul 4.1: Rețelistică în RHEL (NetworkManager / nmcli), DNS, Hostname și Sincronizarea Timpului (chrony)
- **4.1.1.** Numele predictibile ale interfețelor de rețea.
- **4.1.2.** Arhitectura `NetworkManager` și comanda `nmcli`.
- **4.1.3.** Hostname, rezoluția numelor și diagnosticare (`ip`, `ss`).
- **4.1.4.** Accesul la distanță cu `OpenSSH` și autentificarea prin chei.
- **4.1.5.** Fusul orar (`timedatectl`) și sincronizarea timpului cu `chrony`.

### Capitolul 4.2: Firewall (firewalld) și SELinux
- **4.2.1.** Zone și servicii în `firewalld` (`firewall-cmd --permanent`).
- **4.2.2.** Modurile SELinux: `enforcing`, `permissive`, `disabled`.
- **4.2.3.** Contextele SELinux ale fișierelor și proceselor; restaurarea contextelor implicite (`restorecon`, `semanage fcontext`).
- **4.2.4.** Etichetele de port (`semanage port`) și boolean-urile SELinux (`setsebool -P`).

## PILONUL 5: Pregătirea Finală pentru Examen
_Obiectiv: Strategia de examen și simularea completă a unui EX200 pe node1 și node2._

### Capitolul 5.1: Strategia de Examen EX200
- **5.1.1.** Ordinea task-urilor: acces la `node2`, rețea, depozite, apoi restul.
- **5.1.2.** Regula persistenței: verificarea fiecărei configurații după reboot.
- **5.1.3.** Documentația disponibilă în examen și gestionarea timpului.

### Capitolul 5.2: Simulare Completă EX200
- **5.2.1.** Examen simulat pe `node1` și `node2`, cu limita de timp a examenului real.
- **5.2.2.** Scripturi de verificare pentru toate task-urile și analiza greșelilor.
