# Cuprins RHCSA (EX200)

> Generat automat de `scripts/generate-cuprins.mjs` din capitolele lui Alex (titlurile capitolelor și subiectele lor sunt luate din fișiere; titlurile și obiectivele pilonilor sunt scrise de Claude). Alex îl poate înlocui oricând cu cuprinsul lui.

## PILONUL 0: Fundamentele Linux și Laboratorul EX200
_Obiectiv: Arhitectura RHEL, laboratorul node1/node2, shell-ul și lucrul cu fișiere și text._

### Capitolul 0.1: Arhitectura Internă Red Hat Enterprise Linux & Construirea Lab-ului EX200
- **0.1.1.** Ce este Red Hat Enterprise Linux (RHEL) și Modelul Open Source Enterprise?
- **0.1.2.** Kernel Space vs. User Space, CPU Rings și System Calls (syscall)
- **0.1.3.** Virtual File System (VFS) și Filozofia „Everything is a File”
- **0.1.4.** Anatomia Completă a Ierarhiei de Directoare în RHEL 9 / 10 (FHS — Filesystem Hierarchy Standard)
- **0.1.5.** Anatomia Examenului RHCSA (EX200): Cum Funcționează, Cum Se Notează și Strategia Primelor 15 Minute

### Capitolul 0.2: Stăpânirea Shell-ului Bash, Navigarea în Sistem și Sistemul de Documentație Offline
- **0.2.1.** Anatomia Shell-ului bash, Terminale (TTY vs. PTS) și Cum se Execută o Comandă
- **0.2.2.** Variabile de Mediu și Arhitectura Fișierelor de Profil (Login vs. Non-Login Shell)
- **0.2.3.** Arhitectura File Descriptors (0, 1, 2), Redirecționări I/O și Pipelines
- **0.2.4.** Bash Globbing (Pathname Expansion) vs. Expresii Regulare (Regex)
- **0.2.5.** Editorul vim (*Vi IMproved*) de Supraviețuire și Viteză în Examenul EX200
- **0.2.6.** Sistemul de Documentație Offline în RHEL (man, mandb, apropos, /usr/share/doc)

### Capitolul 0.3: Manipularea Textului, Căutare Avansată, Arhivare și Transfer Securizat
- **0.3.1.** Anatomia Inode-ului, Timpii atime/mtime/ctime și Hard Links vs. Symbolic Links
- **0.3.2.** Filtrarea și Procesarea Fluxurilor de Text (grep, cut, sort, uniq, wc, tr, sed, awk)
- **0.3.3.** Căutarea Chirurgicală pe Sistemul de Fișiere cu find (Subiect Garantat în EX200!)
- **0.3.4.** Arhivare, Compresie (tar, gzip, bzip2, xz) și Sincronizare (rsync, scp)

## PILONUL 1: Utilizatori, Permisiuni și Procese
_Obiectiv: Identitate locală, sudo, permisiuni și ACL-uri, procese și sarcini programate._

### Capitolul 1.1: Gestiunea Utilizatorilor, Grupurilor, Parolă Aging și Escaladarea Privilegiilor
- **1.1.1.** Arhitectura Numerică UID/GID în RHEL 9 / RHEL 10 (Conform /etc/login.defs)
- **1.1.2.** Disecția Chirurgicală a Celor 4 Fișiere de Identitate din /etc
- **1.1.3.** Comenzile de Gestiune a Utilizatorilor și Grupurilor (Disecția Tuturor Flag-urilor EX200)
- **1.1.4.** Gestiunea Expirării Parolelor (Password Aging): chage vs. /etc/login.defs
- **1.1.5.** Escaladarea Privilegiilor: su vs. sudo, visudo și /etc/sudoers.d/

### Capitolul 1.2: Permisiuni Standard, Permisiuni Speciale (SUID, SGID, Sticky Bit), umask și ACLs
- **1.2.1.** Cum Evaluează Kernelul Permisiunile DAC (rwx) — Algoritmul First-Match!
- **1.2.2.** Disecția Biților Speciali: SUID (4000), SGID (2000) și Sticky Bit (1000)
- **1.2.3.** Masca de Creație a Fișierelor: umask (*User File-Creation Mode Mask*)
- **1.2.4.** POSIX Access Control Lists (ACL — getfacl & setfacl)
- **1.2.5.** Atribute Extinse de Sistem de Fișiere (lsattr și chattr)

### Capitolul 1.3: Gestiunea Proceselor, Semnale Kernel, Priorități CPU și Planificarea Task-urilor
- **1.3.1.** Ciclul de Viață al unui Proces: fork(), execve(), wait4() și exit()
- **1.3.2.** Cele 5 Stări ale Proceselor în Kernel (Vizibile în coloana STAT din ps aux și top)
- **1.3.3.** Semnalele Kernel (kill, pkill, killall) — SIGTERM (15) vs. SIGKILL (9)
- **1.3.4.** Priorități CPU și Planificatorul CFS: nice vs. renice (-20 la +19)
- **1.3.5.** Planificarea Task-urilor în Viitor și Periodic: at, cron și systemd Timers

## PILONUL 2: Boot, Software și Automatizare
_Obiectiv: Procesul de boot și systemd, pachete și depozite, scripturi Bash și tuned._

### Capitolul 2.1: Secvența de Boot, GRUB2, systemd, Targets și Resetarea Parolei de Root (Primul Task din EX200!)
- **2.1.1.** Anatomia Completă în 6 Etape a Secvenței de Boot în RHEL 9 / RHEL 10
- **2.1.2.** PROCEDURA OFICIALĂ EX200: Spargerea și Resetarea Parolei de root pe node2 (Memorare Obligatorie!)
- **2.1.3.** Configurarea Persistentă a Bootloader-ului GRUB2 (/etc/default/grub & BLS)
- **2.1.4.** Arhitectura systemd (PID 1), Unități, Drop-ins și Targets
- **2.1.5.** Configurarea Jurnalului Persistent systemd-journald (/var/log/journal)

### Capitolul 2.2: Gestiunea Pachetelor Software (rpm, dnf, Repo-uri Locale/Remote, AppStreams & Flatpak)
- **2.2.1.** Anatomia unui Pachet .rpm și Comanda de Nivel Jos rpm
- **2.2.2.** Configurarea Depozitelor dnf în /etc/yum.repos.d/*.repo (Primul Task pe Ambele Noduri în EX200!)
- **2.2.3.** Stăpânirea Completă a Comenzii dnf (Packages, Groups, History & Modules)
- **2.2.4.** Gestiunea Aplicațiilor Izolate cu Flatpak (Obiectiv Nou în RHEL 9 / RHEL 10!)

### Capitolul 2.3: Automatizare prin Bash Scripting și Tuning de Performanță (tuned)
- **2.3.1.** Anatomia unui Script Bash: Shebang, Permisiuni și Variabilele Speciale ($1, $@, $#, $?)
- **2.3.2.** Operatorii de Testare în Bash ([[ ... ]]) și Structurile Condiționale (if/elif/else, case)
- **2.3.3.** Bucle în Bash (for și while) și Procesarea Listelor în Examen
- **2.3.4.** Optimizarea Performanței Sistemului cu tuned și tuned-adm (Subiect Garantat în EX200!)

## PILONUL 3: Stocare Locală și în Rețea
_Obiectiv: Partiții, sisteme de fișiere, swap, LVM, Stratis, VDO, NFS și autofs, persistente după reboot._

### Capitolul 3.1: Partiționare (MBR vs. GPT), Sisteme de Fișiere (XFS vs. ext4), Swap și /etc/fstab
- **3.1.1.** Convenția de Denumire a Discurilor (Block Devices) în /dev
- **3.1.2.** Arhitectura Tabelelor de Partiții: MBR (msdos) vs. GPT (*GUID Partition Table*)
- **3.1.3.** Sistemele de Fișiere XFS vs. ext4 (Formatare, Etichetare și Administrare)
- **3.1.4.** Disecția Chirurgicală a Fișierului /etc/fstab (*File System Table*)
- **3.1.5.** Memoria Virtuală Swap (Partiții Swap vs. Fișiere Swap)

### Capitolul 3.2: Logical Volume Manager (LVM) și Stocare Avansată (Stratis / VDO)
- **3.2.1.** Arhitectura LVM2 pe Cele 3 Niveluri și Matematica PE / LE
- **3.2.2.** Tabelul Complet al Comenzilor LVM pe Cele 3 Niveluri (Creare, Inspecție, Ștergere)
- **3.2.3.** Extinderea Online a unui Volum Logic (lvextend -r) — Fără Demontare și Fără Pierdere de Date!
- **3.2.4.** Stocare Modernă în RHEL 9 / RHEL 10: Stratis și LVM-VDO

### Capitolul 3.3: Stocare în Rețea (NFS) și Montarea Dinamică la Cerere cu autofs (Subiect Clasic de Examen!)
- **3.3.1.** Arhitectura Protocolului NFSv4 (Server & Client în RHEL 9 / RHEL 10)
- **3.3.2.** Descoperirea și Montarea Clasică pe Client (showmount, mount, /etc/fstab)
- **3.3.3.** Arhitectura autofs (*Automounter*) — Direct Maps vs. Indirect Maps & Wildcards

## PILONUL 4: Rețea și Securitate
_Obiectiv: NetworkManager, DNS, SSH, chrony, SELinux și firewalld._

### Capitolul 4.1: Rețelistică în RHEL (NetworkManager / nmcli), DNS, Hostname și Sincronizarea Timpului (chrony)
- **4.1.1.** Convenția Predictable Network Interface Names în RHEL 9 / RHEL 10
- **4.1.2.** Arhitectura NetworkManager și Stăpânirea Completă a Comenzii nmcli
- **4.1.3.** Hostname, Rezoluția Numelor (/etc/hosts, /etc/resolv.conf) și Diagnosticare (ip, ss)
- **4.1.4.** Securizarea Accesului la Distanță cu OpenSSH (sshd_config & Autentificare prin Chei)
- **4.1.5.** Fusul Orar (timedatectl) și Sincronizarea Timpului NTP cu chrony (Subiect Garantat în EX200!)

### Capitolul 4.2: Securitate la Nivel de Kernel: SELinux Deep Dive și firewalld
- **4.2.1.** Ordinea de Evaluare în Kernel: DAC vs. MAC (SELinux)
- **4.2.2.** Cele 3 Moduri SELinux și Configurarea Persistentă (/etc/selinux/config)
- **4.2.3.** Anatomia Contextului SELinux (-Z) și Moștenirea la cp vs. mv
- **4.2.4.** Cele 3 Pârghii SELinux din Examenul EX200: fcontext, port și booleans
- **4.2.5.** Arhitectura Firewall-ului Dinamic: firewalld și firewall-cmd

## PILONUL 5: Containere cu Podman
_Obiectiv: Containere rootless, imagini, volume cu SELinux și servicii systemd pentru containere._

### Capitolul 5.1: Containere în RHEL: Podman, Skopeo, Stocare Persistentă cu SELinux (:Z) și Container-as-a-Service în systemd
- **5.1.1.** Cele 3Tehnologii din Kernel care Construiesc un Container și Triada Podman / Buildah / Skopeo
- **5.1.2.** Rootfull vs. Rootless Containers și Arhitectura User Namespaces (/etc/subuid & podman unshare)
- **5.1.3.** Configurarea Registrelor (/etc/containers/registries.conf), Căutare, Autentificare și skopeo
- **5.1.4.** Construirea Imaginilor cu Containerfile (podman build) și Rularea cu Stocare Persistentă SELinux (:Z)
- **5.1.5.** SUBIECTUL REGE ÎN EX200: Transformarea unui Container Rootless într-un Serviciu systemd care Pornește Automat la Boot!

## PILONUL 6: Simularea Finală EX200
_Obiectiv: Examenul complet de 180 de minute, strategia de examen și pașii de după RHCSA._

### Capitolul 6.1: Simulare Oficială Completă de Examen RHCSA (EX200 Mock Exam), Cheat-Sheet Suprem și Ghid de Carieră
