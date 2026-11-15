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
- **0.1.6.** Ciclul de Viață RHEL, Versiunile Minore și Abonamentul (subscription-manager)
- **0.1.7.** Modulele de Kernel: lsmod, modinfo, modprobe
- **0.1.8.** sysctl în Detaliu: Unde Stau Parametrii și în Ce Ordine Sunt Citiți
- **0.1.9.** Comenzile cu care Faci Cunoștință cu un Server Necunoscut
- **0.1.10.** /proc și /sys de Aproape: Ce Poți Afla Fără Nicio Unealtă
- **0.1.11.** De la Hardware la /dev: udev și Numele Stabile ale Dispozitivelor
- **0.1.12.** systemd-tmpfiles: Directoare și Fișiere Recreate la Fiecare Boot
- **0.1.13.** Executabile, Biblioteci Partajate și Limite de Resurse
- **0.1.14.** Consola Web (Cockpit) și Raportul de Diagnostic sos

### Capitolul 0.2: Stăpânirea Shell-ului Bash, Navigarea în Sistem și Sistemul de Documentație Offline
- **0.2.1.** Anatomia Shell-ului bash, Terminale (TTY vs. PTS) și Cum se Execută o Comandă
- **0.2.2.** Variabile de Mediu și Arhitectura Fișierelor de Profil (Login vs. Non-Login Shell)
- **0.2.3.** Arhitectura File Descriptors (0, 1, 2), Redirecționări I/O și Pipelines
- **0.2.4.** Bash Globbing (Pathname Expansion) vs. Expresii Regulare (Regex)
- **0.2.5.** Editorul vim (*Vi IMproved*) de Supraviețuire și Viteză în Examenul EX200
- **0.2.6.** Sistemul de Documentație Offline în RHEL (man, mandb, apropos, /usr/share/doc)
- **0.2.7.** Istoricul Comenzilor și Scurtăturile de Tastatură care Economisesc Timp
- **0.2.8.** Substituția de Comenzi, Expansiunea Parametrilor și Aritmetica
- **0.2.9.** Legarea Comenzilor: xargs, Here-String și Substituția de Proces
- **0.2.10.** Mai Multe Ferestre într-o Singură Sesiune SSH: tmux
- **0.2.11.** Încă Trei Surse de Ajutor: --help, whatis și info
- **0.2.12.** vim Peste Nivelul de Supraviețuire: Blocuri, Repetare și Ferestre
- **0.2.13.** Mediul Shell-ului: Inspecție, Opțiuni și Promptul

### Capitolul 0.3: Manipularea Textului, Căutare Avansată, Arhivare și Transfer Securizat
- **0.3.1.** Anatomia Inode-ului, Timpii atime/mtime/ctime și Hard Links vs. Symbolic Links
- **0.3.2.** Filtrarea și Procesarea Fluxurilor de Text (grep, cut, sort, uniq, wc, tr, sed, awk)
- **0.3.3.** Căutarea Chirurgicală pe Sistemul de Fișiere cu find (Subiect Garantat în EX200!)
- **0.3.4.** Arhivare, Compresie (tar, gzip, bzip2, xz) și Sincronizare (rsync, scp)
- **0.3.5.** sed Pas cu Pas: Editarea unui Fișier fără Editor
- **0.3.6.** awk Pas cu Pas: Coloane, Condiții și Totaluri
- **0.3.7.** find: Combinarea Condițiilor și Acțiuni Sigure
- **0.3.8.** Lucrul cu Arhive: Listare, Extragere Parțială, Excluderi
- **0.3.9.** Cât Spațiu Ocupă și Ce S-a Schimbat: du, diff, stat
- **0.3.10.** rsync și sftp în Detaliu

## PILONUL 1: Utilizatori, Permisiuni și Procese
_Obiectiv: Identitate locală, sudo, permisiuni și ACL-uri, procese și sarcini programate._

### Capitolul 1.1: Gestiunea Utilizatorilor, Grupurilor, Parolă Aging și Escaladarea Privilegiilor
- **1.1.1.** Arhitectura Numerică UID/GID în RHEL 9 / RHEL 10 (Conform /etc/login.defs)
- **1.1.2.** Disecția Chirurgicală a Celor 4 Fișiere de Identitate din /etc
- **1.1.3.** Comenzile de Gestiune a Utilizatorilor și Grupurilor (Disecția Tuturor Flag-urilor EX200)
- **1.1.4.** Gestiunea Expirării Parolelor (Password Aging): chage vs. /etc/login.defs
- **1.1.5.** Escaladarea Privilegiilor: su vs. sudo, visudo și /etc/sudoers.d/
- **1.1.6.** Ștergerea, Redenumirea și Inventarul Conturilor
- **1.1.7.** Valorile Implicite ale lui useradd: /etc/default/useradd și /etc/login.defs
- **1.1.8.** Calitatea Parolelor și Blocarea după Încercări Eșuate
- **1.1.9.** sudo Dincolo de ALL: Alias-uri, Comenzi Limitate și Verificare
- **1.1.10.** Verificarea Consistenței Fișierelor de Conturi și Editarea lor în Siguranță
- **1.1.11.** De Unde Vin Utilizatorii: nsswitch, sssd și authselect, pe Scurt

### Capitolul 1.2: Permisiuni Standard, Permisiuni Speciale (SUID, SGID, Sticky Bit), umask și ACLs
- **1.2.1.** Cum Evaluează Kernelul Permisiunile DAC (rwx) — Algoritmul First-Match!
- **1.2.2.** Disecția Biților Speciali: SUID (4000), SGID (2000) și Sticky Bit (1000)
- **1.2.3.** Masca de Creație a Fișierelor: umask (*User File-Creation Mode Mask*)
- **1.2.4.** POSIX Access Control Lists (ACL — getfacl & setfacl)
- **1.2.5.** Atribute Extinse de Sistem de Fișiere (lsattr și chattr)
- **1.2.6.** chmod Simbolic în Detaliu și Litera X Mare
- **1.2.7.** Proprietarul și Grupul: chown, chgrp și Cine Are Voie să le Schimbe
- **1.2.8.** ACL-uri în Practică: Recursiv, Copiere, Salvare și Restaurare
- **1.2.9.** De Unde Vine umask și Cum îl Vezi în Formă Simbolică
- **1.2.10.** Alte Atribute chattr și Cum Recunoști un Fișier „Ciudat”
- **1.2.11.** Verificarea Accesului pe Tot Drumul: namei și Testul ca Alt Utilizator

### Capitolul 1.3: Gestiunea Proceselor, Semnale Kernel, Priorități CPU și Planificarea Task-urilor
- **1.3.1.** Ciclul de Viață al unui Proces: fork(), execve(), wait4() și exit()
- **1.3.2.** Cele 5 Stări ale Proceselor în Kernel (Vizibile în coloana STAT din ps aux și top)
- **1.3.3.** Semnalele Kernel (kill, pkill, killall) — SIGTERM (15) vs. SIGKILL (9)
- **1.3.4.** Priorități CPU și Planificatorul CFS: nice vs. renice (-20 la +19)
- **1.3.5.** Planificarea Task-urilor în Viitor și Periodic: at, cron și systemd Timers
- **1.3.6.** top ca Instrument de Lucru: Ce Înseamnă Fiecare Cifră
- **1.3.7.** Joburile Shell-ului: &, jobs, fg, bg, nohup
- **1.3.8.** Procesele Văzute prin systemd: cgroups, systemctl kill și Limite
- **1.3.9.** cron în Detaliu: Variabile, Scurtături, anacron și Unde Vezi ce a Rulat
- **1.3.10.** Timere systemd: Persistent=, Precizie și Timere de Unică Folosință
- **1.3.11.** Măsurarea Sistemului în Timp: vmstat, iostat, pidstat și sar

## PILONUL 2: Boot, Software și Automatizare
_Obiectiv: Procesul de boot și systemd, pachete și depozite, scripturi Bash și tuned._

### Capitolul 2.1: Secvența de Boot, GRUB2, systemd, Targets și Resetarea Parolei de Root (Primul Task din EX200!)
- **2.1.1.** Anatomia Completă în 6 Etape a Secvenței de Boot în RHEL 9 / RHEL 10
- **2.1.2.** PROCEDURA OFICIALĂ EX200: Spargerea și Resetarea Parolei de root pe node2 (Memorare Obligatorie!)
- **2.1.3.** Configurarea Persistentă a Bootloader-ului GRUB2 (/etc/default/grub & BLS)
- **2.1.4.** Arhitectura systemd (PID 1), Unități, Drop-ins și Targets
- **2.1.5.** Configurarea Jurnalului Persistent systemd-journald (/var/log/journal)
- **2.1.6.** Anatomia unui Fișier de Unitate și Scrierea Propriului Serviciu
- **2.1.7.** Cine Depinde de Cine și Cât Durează Pornirea
- **2.1.8.** journalctl ca Unealtă de Depanare: Filtre care Scurtează Căutarea
- **2.1.9.** Pornirea Manuală într-un Alt Target și Oprirea Corectă a Sistemului
- **2.1.10.** reload, restart, edit și revert: Cum Aplici o Schimbare unui Serviciu

### Capitolul 2.2: Gestiunea Pachetelor Software (rpm, dnf, Repo-uri Locale/Remote, AppStreams & Flatpak)
- **2.2.1.** Anatomia unui Pachet .rpm și Comanda de Nivel Jos rpm
- **2.2.2.** Configurarea Depozitelor dnf în /etc/yum.repos.d/*.repo (Primul Task pe Ambele Noduri în EX200!)
- **2.2.3.** Stăpânirea Completă a Comenzii dnf (Packages, Groups, History & Modules)
- **2.2.4.** Gestiunea Aplicațiilor Izolate cu Flatpak (Obiectiv Nou în RHEL 9 / RHEL 10!)
- **2.2.5.** dnf de Zi cu Zi: Listare, Informații, Actualizări și Curățenie
- **2.2.6.** Gestionarea Depozitelor: Activare, Dezactivare, Chei GPG și Opțiuni Utile
- **2.2.7.** Kernelul este un Pachet Special: Instalare în Paralel și Kernelul Implicit
- **2.2.8.** rpm pentru Situații Speciale: Dependențe, Changelog și Extragerea unui Fișier
- **2.2.9.** Flatpak: Instalare pe Sistem sau pe Utilizator, Actualizare și Curățenie

### Capitolul 2.3: Automatizare prin Bash Scripting și Tuning de Performanță (tuned)
- **2.3.1.** Anatomia unui Script Bash: Shebang, Permisiuni și Variabilele Speciale ($1, $@, $#, $?)
- **2.3.2.** Operatorii de Testare în Bash ([[ ... ]]) și Structurile Condiționale (if/elif/else, case)
- **2.3.3.** Bucle în Bash (for și while) și Procesarea Listelor în Examen
- **2.3.4.** Optimizarea Performanței Sistemului cu tuned și tuned-adm (Subiect Garantat în EX200!)
- **2.3.5.** Funcții, read și Mesaje Clare: Cum Arată un Script Ușor de Întreținut
- **2.3.6.** Depanarea Scripturilor: bash -n, bash -x și trap
- **2.3.7.** Bucle pe Fișiere și pe Linii, Făcute Corect
- **2.3.8.** Scripturi care Pot Fi Rulate de Două Ori fără Urmări
- **2.3.9.** tuned Mai în Adâncime: Ce Conține un Profil și Cum Îți Faci Unul

## PILONUL 3: Stocare Locală și în Rețea
_Obiectiv: Partiții, sisteme de fișiere, swap, LVM, Stratis, VDO, NFS și autofs, persistente după reboot._

### Capitolul 3.1: Partiționare (MBR vs. GPT), Sisteme de Fișiere (XFS vs. ext4), Swap și /etc/fstab
- **3.1.1.** Convenția de Denumire a Discurilor (Block Devices) în /dev
- **3.1.2.** Arhitectura Tabelelor de Partiții: MBR (msdos) vs. GPT (*GUID Partition Table*)
- **3.1.3.** Sistemele de Fișiere XFS vs. ext4 (Formatare, Etichetare și Administrare)
- **3.1.4.** Disecția Chirurgicală a Fișierului /etc/fstab (*File System Table*)
- **3.1.5.** Memoria Virtuală Swap (Partiții Swap vs. Fișiere Swap)
- **3.1.6.** Opțiunile de Montare care Contează și Verificarea lui /etc/fstab Înainte de Reboot
- **3.1.7.** Demontarea și Eroarea „target is busy”
- **3.1.8.** Întreținere: Informații, Verificare, Reparare și Ștergerea Semnăturilor
- **3.1.9.** Spațiul Liber Văzut Corect: df, Blocuri Rezervate și Spațiul Nealocat
- **3.1.10.** Swap: Cât, Cum Îl Scoți și Cum Îl Prioritizezi
- **3.1.11.** Mărirea unei Partiții Obișnuite, Fără LVM

### Capitolul 3.2: Logical Volume Manager (LVM) și Stocare Avansată (Stratis / VDO)
- **3.2.1.** Arhitectura LVM2 pe Cele 3 Niveluri și Matematica PE / LE
- **3.2.2.** Tabelul Complet al Comenzilor LVM pe Cele 3 Niveluri (Creare, Inspecție, Ștergere)
- **3.2.3.** Extinderea Online a unui Volum Logic (lvextend -r) — Fără Demontare și Fără Pierdere de Date!
- **3.2.4.** Stocare Modernă în RHEL 9 / RHEL 10: Stratis și LVM-VDO
- **3.2.5.** Snapshot-uri LVM: Fotografia unui Volum Înaintea unei Operații Riscante
- **3.2.6.** Scoaterea unui Disc dintr-un Volume Group: pvmove, vgreduce, pvremove
- **3.2.7.** Thin Provisioning în LVM: Volume Mai Mari Decât Spațiul Real
- **3.2.8.** Redenumire, Activare și Recuperarea Configurației LVM
- **3.2.9.** Swap pe LVM și Operațiile de Întreținere Stratis
- **3.2.10.** LVM-VDO: Două Dimensiuni de Urmărit și Două Feluri de Extindere

### Capitolul 3.3: Stocare în Rețea (NFS) și Montarea Dinamică la Cerere cu autofs (Subiect Clasic de Examen!)
- **3.3.1.** Arhitectura Protocolului NFSv4 (Server & Client în RHEL 9 / RHEL 10)
- **3.3.2.** Descoperirea și Montarea Clasică pe Client (showmount, mount, /etc/fstab)
- **3.3.3.** Arhitectura autofs (*Automounter*) — Direct Maps vs. Indirect Maps & Wildcards
- **3.3.4.** Opțiunile de Montare NFS și Cum Vezi Ce S-a Negociat de Fapt
- **3.3.5.** Cine Ești pe Server: UID-uri, root_squash și Proprietarul nobody
- **3.3.6.** autofs în Detaliu: Timeout, Fișierul de Configurare și Depanare
- **3.3.7.** Alternativa fără autofs: Montare la Cerere prin systemd
- **3.3.8.** Partea de Server: Exporturi Modulare, Verificare și Firewall

## PILONUL 4: Rețea și Securitate
_Obiectiv: NetworkManager, DNS, SSH, chrony, SELinux și firewalld._

### Capitolul 4.1: Rețelistică în RHEL (NetworkManager / nmcli), DNS, Hostname și Sincronizarea Timpului (chrony)
- **4.1.1.** Convenția Predictable Network Interface Names în RHEL 9 / RHEL 10
- **4.1.2.** Arhitectura NetworkManager și Stăpânirea Completă a Comenzii nmcli
- **4.1.3.** Hostname, Rezoluția Numelor (/etc/hosts, /etc/resolv.conf) și Diagnosticare (ip, ss)
- **4.1.4.** Securizarea Accesului la Distanță cu OpenSSH (sshd_config & Autentificare prin Chei)
- **4.1.5.** Fusul Orar (timedatectl) și Sincronizarea Timpului NTP cu chrony (Subiect Garantat în EX200!)
- **4.1.6.** Cum Citești Ieșirea lui nmcli: Ce Este Configurat față de Ce Este Activ
- **4.1.7.** IPv6 cu nmcli
- **4.1.8.** Diagnosticarea Rețelei Strat cu Strat
- **4.1.9.** SSH în Detaliu: Fișierul Clientului, Permisiuni și Modificarea Sigură a Serverului
- **4.1.10.** chrony: Verificări Suplimentare și Corecția Imediată a Ceasului

### Capitolul 4.2: Securitate la Nivel de Kernel: SELinux Deep Dive și firewalld
- **4.2.1.** Ordinea de Evaluare în Kernel: DAC vs. MAC (SELinux)
- **4.2.2.** Cele 3 Moduri SELinux și Configurarea Persistentă (/etc/selinux/config)
- **4.2.3.** Anatomia Contextului SELinux (-Z) și Moștenirea la cp vs. mv
- **4.2.4.** Cele 3 Pârghii SELinux din Examenul EX200: fcontext, port și booleans
- **4.2.5.** Arhitectura Firewall-ului Dinamic: firewalld și firewall-cmd
- **4.2.6.** Unelte SELinux pentru Diagnostic și Întreținere
- **4.2.7.** Tipurile și Boolean-urile pe care le Întâlnești Cel Mai Des
- **4.2.8.** firewalld Dincolo de Servicii și Porturi: Zone, Surse și Reguli Bogate
- **4.2.9.** Contextul Proceselor și Tranzițiile de Domeniu

## PILONUL 5: Containere cu Podman
_Obiectiv: Containere rootless, imagini, volume cu SELinux și servicii systemd pentru containere._

### Capitolul 5.1: Containere în RHEL: Podman, Skopeo, Stocare Persistentă cu SELinux (:Z) și Container-as-a-Service în systemd
- **5.1.1.** Cele 3Tehnologii din Kernel care Construiesc un Container și Triada Podman / Buildah / Skopeo
- **5.1.2.** Rootfull vs. Rootless Containers și Arhitectura User Namespaces (/etc/subuid & podman unshare)
- **5.1.3.** Configurarea Registrelor (/etc/containers/registries.conf), Căutare, Autentificare și skopeo
- **5.1.4.** Construirea Imaginilor cu Containerfile (podman build) și Rularea cu Stocare Persistentă SELinux (:Z)
- **5.1.5.** SUBIECTUL REGE ÎN EX200: Transformarea unui Container Rootless într-un Serviciu systemd care Pornește Automat la Boot!
- **5.1.6.** Ciclul de Viață al unui Container: Comenzile de Zi cu Zi
- **5.1.7.** Volume Numite față de Directoare Montate
- **5.1.8.** Rețeaua Containerelor și Pod-urile
- **5.1.9.** Imagini: Etichete, Straturi, Transfer fără Registru și Instrucțiunile din Containerfile
- **5.1.10.** Quadlet în Detaliu și Depanarea Serviciilor de Container

## PILONUL 6: Simularea Finală EX200
_Obiectiv: Examenul complet de 180 de minute, strategia de examen și pașii de după RHCSA._

### Capitolul 6.1: Simulare Oficială Completă de Examen RHCSA (EX200 Mock Exam), Cheat-Sheet Suprem și Ghid de Carieră
- **6.1.1.** Unde Stă Persistența: Harta Fișierelor pe care se Bazează Fiecare Setare
- **6.1.2.** Arborele de Diagnostic: Ce Faci Când un Serviciu nu Pornește sau nu Răspunde
- **6.1.3.** Triajul: Ce Faci Când Rămâi în Urmă față de Plan
- **6.1.4.** Cum Citești un Enunț de Examen
