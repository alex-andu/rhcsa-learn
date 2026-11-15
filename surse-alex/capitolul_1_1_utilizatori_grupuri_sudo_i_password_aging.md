# Capitolul 1.1: Gestiunea Utilizatorilor, Grupurilor, Parolă Aging și Escaladarea Privilegiilor

> ### Obiectivul Capitolului, Ponderea în Examenul EX200 & Regula de Aur a Persistenței
>
> * **Obiectivul Capitolului:** Stăpânirea completă a arhitecturii de identitate locală în Red Hat Enterprise Linux (RHEL 9 / RHEL 10): disecția la nivel de câmp a bazelor de date locale (`/etc/passwd`, `/etc/shadow`, `/etc/group`, `/etc/gshadow`), parametrii impliciți din `/etc/login.defs` și `/etc/skel`, arhitectura UID/GID și diferența dintre **Primary Group (`-g`)** și **Supplementary Groups (`-G` / `-aG`)**, conturile de serviciu fără shell interactiv (`/sbin/nologin`), politicile de expirare a parolelor (**Password Aging** cu `chage` și `/etc/login.defs`) și escaladarea privilegiilor prin **`sudo`** (`visudo`, `/etc/sudoers.d/`, `NOPASSWD`).
>
> * **Ponderea în Examenul EX200:** **Critică și Garantată 100% (10–15% din punctajul examenului + dependență pentru alte 3-4 subiecte!).** Absolut fiecare examen RHCSA are un task dedicat de forma:
>
>   * *„Creați grupul `sysadmins` (cu GID 40000). Creați utilizatorii `natasha` și `harry` care să aibă `sysadmins` ca grup secundar (supplementary group). Creați utilizatorul `sarah` care să nu aibă acces la un shell interactiv pe sistem și să nu fie membru în `sysadmins`. Toți trei trebuie să aibă parola `flectrag`. Configurați `sudo` astfel încât membrii grupului `sysadmins` să poată executa orice comandă administrativă fără a li se cere parola (`NOPASSWD`).”*
>
>   * **Atenție:** Dacă greșești crearea acestor utilizatori sau grupuri, vei pierde puncte și la task-urile ulterioare de **Directoare Colaborative (SGID)**, **ACL-uri**, **Cron jobs** și **Containere Rootless Podman** care îți cer să lucrezi cu aceiași utilizatori!
>
> * **Regula de Aur a Persistenței (EX200 Survival Rule):**
>   Comenzile `useradd`, `usermod`, `groupadd`, `passwd`, `chage` scriu direct în fișierele persistente din `/etc` (`/etc/passwd`, `/etc/shadow`, `/etc/group`). **ÎNSĂ** există două reguli vitale de persistență în examen:
>
>   1. Dacă ți se cere ca *„toți utilizatorii **care vor fi creați în viitor** să aibă parola valabilă maxim 30 de zile (sau să conțină un fișier `README` în directorul lor home)”*, nu este suficient să rulezi `chage` pe userii existenți! Trebuie să modifici șabloanele persistente din **`/etc/login.defs`** (pentru parole) și **`/etc/skel/`** (pentru fișierele din home), deoarece scriptul de notare al lui Red Hat va crea un utilizator nou de test (`useradd testuser_grading`) după reboot pentru a verifica dacă a moștenit setările!
>
>   2. Pentru `sudo`, nu edita niciodată fișierul principal dacă poți crea un fișier modular curat în **`/etc/sudoers.d/<nume>`**, validat obligatoriu cu **`visudo -c`**!

## 1. Introducerea Profesorului & Analogia Vizuală

Pentru un om, identitatea ta pe server este numele **`natasha`** sau **`root`**. Pentru nucleul Linux (**Kernel Space — Ring 0**), numele `natasha` **nu există**! Kernelul nu stochează șiruri de caractere cu nume de utilizatori în structurile de procese (`task_struct`) sau în Inode-urile de pe disc. Kernelul cunoaște exclusiv numere întregi pe 32 de biți:

* **UID (*User Identifier* — ID-ul numeric al utilizatorului)**;

* **GID (*Group Identifier* — ID-ul numeric al grupului primar)**;

* **Supplementary GIDs (Lista de ID-uri numerice ale grupurilor secundare)**.

Fișierele `/etc/passwd` și `/etc/group` sunt doar „cărți de telefon” folosite de aplicațiile din *User Space* (`ls`, `id`, `ps`, `bash` prin biblioteca `glibc` și *Name Service Switch* `/etc/nsswitch.conf`) pentru a traduce numărul `UID 1001` în textul prietenos `natasha` când îl afișează pe ecran!

### Analogia Vizuală: Clădirea Corporativă, Ecusonul Magnetic (UID/GID) și Seiful de la HR (`/etc/shadow`)

Imaginează-ți serverul tău RHEL ca pe o **Clădire de Birouri de Înaltă Securitate**:

1. **UID-ul (`User ID`):** Este **Codul Numeric Unic de pe Ecusonul Magnetic** al fiecărui angajat:

   * **Ecusonul `#0` (`UID 0` — `root`):** Este **Cardul Master al Directorului General**. Deschide absolut orice ușă din clădire, fără ca sistemul de control acces (DAC) să mai întrebe cine este. *(Dacă îi dai și altui angajat `UID 0` în `/etc/passwd`, el devine instantaneu `root`, indiferent ce nume are pe ecuson!)*

   * **Ecusoanele `#1` – `#999` (`System / Service Accounts`):** Sunt **Roboții de Curățenie și Sistemele Automate ale Clădirii** (`sshd`, `apache`, `chrony`, `postgres`). Acești roboți au nevoie de un ecuson pentru a accesa doar camera lor tehnică, dar **nu au voie să intre pe ușa principală a recepției** (au shell-ul setat pe `/sbin/nologin`)!

   * **Ecusoanele `#1000+` (`Regular Users`):** Sunt **Angajații Umani** (`student`, `natasha`, `harry`).

2. **Primary Group (`GID` — Grupul Primar) vs. Supplementary Groups (Grupurile Secundare):**

   * **Grupul Primar (`-g`):** Este **Departamentul Oficial pe Statul de Plată** al angajatului (în RHEL, implicit fiecare angajat primește un departament privat cu propriul său nume, sistem numit **UPG — *User Private Group***). Când angajatul tipărește un document nou (creează un fișier pe disc), ștampila pusă automat pe acel document este cea a **Grupului său Primar**!

   * **Grupurile Secundare (`-G` / `-aG`):** Sunt **Comitetele și Proiectele Speciale** din care mai face parte angajatul (`wheel`, `sysadmins`, `devops`). Ele nu apar ca ștampilă implicită pe documentele noi, dar îi dau dreptul să deschidă ușile sălilor de ședință ale acelor departamente!

3. **`/etc/passwd` vs. `/etc/shadow`:**

   * `/etc/passwd` este **Lista Publică de la Recepție** cu numele angajaților, biroul lor (`/home/natasha`) și numărul de interior. Oricine din clădire are voie să o citească (`-rw-r--r--`).

   * `/etc/shadow` este **Seiful Blindat de la Departamentul de Securitate**, unde sunt ținute amprentele criptografice ale parolelor și datele de expirare a contractelor. Are permisiuni **`0000` (`----------`)** — niciun utilizator obișnuit nu poate nici măcar să se uite la el!

## 2. Arhitectură Internă, Teorie & Mecanică Linux

### 2.1. Arhitectura Numerică UID/GID în RHEL 9 / RHEL 10 (Conform `/etc/login.defs`)

În RHEL, plajele de numere UID și GID sunt strict reglementate în fișierul `/etc/login.defs`:

| Plajă UID / GID | Tipul Contului | Cum este alocat și ce rol are în arhitectura RHEL? | 
| ----- | ----- | ----- | 
| **`0`** | **Superuser (`root`)** | Contul administrativ suprem. Kernelul ocolește verificările standard de permisiuni DAC (`rwx`) pentru orice proces care are *Effective UID (`EUID`) = `0`*. | 
| **`1` – `200`** | **Static System Users** | Alocate static de către Red Hat pentru procese critice de sistem (`bin`, `daemon`, `sshd`, `systemd-network`, `apache` = `48`). | 
| **`201` – `999`** | **Dynamic System / Service Users** | Alocate dinamic (în ordine descrescătoare de la `999` în jos!) când instalezi pachete `.rpm` de servicii (`chrony`, `polkitd`, `colord`) sau când rulezi **`useradd -r <nume>`**. Nu creează director în `/home`! | 
| **`1000` – `60000`** | **Regular Human Users** | Utilizatori obișnuiți creați cu `useradd <nume>`. Primul utilizator creat la instalare (`student`) primește **`UID 1000`**, următorul `1001` etc. (`UID_MIN 1000`, `UID_MAX 60000` în `/etc/login.defs`). | 
| **`65534`** | **Unmapped User (`nobody`)** | Cont special fără niciun privilegiu, folosit de `NFSv4` (*root squashing*) și de **Containerele Rootless Podman** (*User Namespaces*) pentru UID-urile nemapate! | 

### 2.2. Disecția Chirurgicală a Celor 4 Fișiere de Identitate din `/etc`

Pentru examenul EX200 și pentru interviuri, trebuie să poți citi o linie din `/etc/passwd`, `/etc/shadow` și `/etc/group` dintr-o singură privire (iar dacă uiți ordinea câmpurilor în examen, rulezi **`man 5 passwd`**, **`man 5 shadow`** sau **`man 5 group`**!).

```
flowchart TB
    subgraph Passwd["1. /etc/passwd (Permisiuni: 0644 -rw-r--r-- | 7 Câmpuri separate prin ':')"]
        P["natasha : x : 1001 : 1001 : Natasha Romanoff,Room 42 : /home/natasha : /bin/bash\n[1.User] [2.Pass] [3.UID] [4.Primary GID] [5.GECOS/Comment] [6.Home Dir] [7.Login Shell]"]
    end

    subgraph Shadow["2. /etc/shadow (Permisiuni: 0000 ---------- | 9 Câmpuri separate prin ':')"]
        S["natasha : $6$rounds=...$Hash : 19673 : 0 : 90 : 7 : 14 : 20088 : \n[1.User] [2.Hash Parolă] [3.Lastchg] [4.Min] [5.Max] [6.Warn] [7.Inact] [8.Expire] [9.Reserved]"]
    end

    subgraph Group["3. /etc/group (Permisiuni: 0644 -rw-r--r-- | 4 Câmpuri separate prin ':')"]
        G["sysadmins : x : 40000 : natasha,harry\n[1.Group Name] [2.Group Pass] [3.GID] [4.Lista Membrilor Secundari (Supplementary)!]"]
    end

    Passwd -->|Câmpul 2 'x' trimite la| Shadow
    Passwd -->|"Câmpul 4 (GID) & Membri secundari"| Group

    style Passwd fill:#064e3b,stroke:#34d399,color:#ffffff
    style Shadow fill:#7f1d1d,stroke:#f87171,color:#ffffff,stroke-width:2px
    style Group fill:#1e3a8a,stroke:#60a5fa,color:#ffffff

```

#### 1. Anatomia `/etc/passwd` (Cele 7 Câmpuri — `man 5 passwd`)

Exemplu de linie: `natasha:x:1001:1001:Natasha Romanoff:/home/natasha:/bin/bash`

1. **Username (`natasha`):** Numele de login.

2. **Password Placeholder (`x`):** În UNIX-ul anilor '80, aici stătea direct hash-ul parolei! Dar cum `/etc/passwd` trebuie să fie citibil de toată lumea (`0644`) pentru ca `ls -l` să poată traduce UID-urile în nume, oricine putea copia hash-urile și le spărgea cu *brute-force*. Astăzi, litera **`x`** înseamnă: *„Parola criptată a fost mutată în siguranță în `/etc/shadow`”*.

3. **UID (`1001`):** Identificatorul numeric al utilizatorului.

4. **Primary GID (`1001`):** Identificatorul numeric al **Grupului Primar** (care trebuie să existe în `/etc/group`).

5. **GECOS / Comment (`Natasha Romanoff`):** Numele complet sau descrierea contului (setat cu `useradd -c "..."`).

6. **Home Directory (`/home/natasha`):** Directorul în care este plasat utilizatorul imediat după autentificare (`$HOME`).

7. **Login Shell (`/bin/bash`):** Primul proces pornit pentru utilizator după autentificare.

   * **Cazul Special de Examen (`/sbin/nologin` vs. `/bin/false`):** Dacă cerința din EX200 îți spune: *„Utilizatorul `sarah` nu trebuie să aibă acces la un shell interactiv pe sistem”*, setezi acest câmp nr. 7 la **`/sbin/nologin`** (sau `/usr/sbin/nologin`) folosind **`useradd -s /sbin/nologin sarah`**! Ce face `/sbin/nologin`? Când `sarah` încearcă să se logheze prin SSH sau la consolă, îi afișează politicos mesajul *"This account is currently not available."* și îi închide instantaneu sesiunea, dar îi permite în continuare să dețină fișiere, să folosească FTP/Samba sau să ruleze joburi non-interactive!

#### 2. Anatomia `/etc/shadow` (Cele 9 Câmpuri & Formatul Criptografic — `man 5 shadow`)

Exemplu: `natasha:$y$j9T$SaltString$HashValue...:19673:0:90:7:14:20088:`

1. **Username (`natasha`):** Corespunde numelui din `/etc/passwd`.

2. **Encrypted Password Hash:** Format din 3 părți separate prin simbolul `$`: **`$ID_Algoritm$Salt$Hash`**:

   * **`$6$`** = Algoritmul **SHA-512** (standardul în RHEL 8 / RHEL 9 inițial);

   * **`$y$`** = Algoritmul **yescrypt** (noul standard ultra-rezistent la atacuri GPU din RHEL 9.4+ / RHEL 10!);

   * **`Salt`** = Un șir aleatoriu adăugat parolei înainte de *hashing*, astfel încât dacă doi utilizatori (`natasha` și `harry`) au exact aceeași parolă (`flectrag`), hash-urile lor din `/etc/shadow` să arate **100% diferit** (împiedicând atacurile cu *Rainbow Tables*)!

   * **Ce înseamnă caracterele speciale `!` sau `!!` sau `*` în Câmpul 2?**

     * **`!!`** = Contul a fost proaspăt creat cu `useradd`, dar nu i s-a setat încă nicio parolă (autentificarea cu parolă este imposibilă).

     * **`!`** (un semn de exclamare în fața hash-ului) = Contul a fost **blocat (*locked*)** de administrator cu `usermod -L` sau `passwd -l`.

     * **`*`** = Cont de sistem/serviciu pe care nu a fost și nu va fi permisă niciodată autentificarea cu parolă.

3. **Last Password Change (`19673`):** Numărul de zile scurse de la **Unix Epoch (`1 Ianuarie 1970`)** până în ziua în care a fost schimbată ultima dată parola!

   * *(Notă: Dacă acest câmp este setat la **`0`** — prin `chage -d 0 <user>` sau `passwd -e <user>` — utilizatorul este **forțat să își schimbe parola imediat la primul login**!)*

4. **Minimum Password Age (`0` — `chage -m`):** Numărul minim de zile pe care utilizatorul trebuie să le aștepte înainte de a avea voie să își schimbe din nou parola.

5. **Maximum Password Age (`90` — `chage -M`):** **CÂMPUL FAVORIT ÎN EX200!** Numărul maxim de zile în care parola este validă (implicit `99999` zile $\approx 273$ ani).

6. **Warning Period (`7` — `chage -W`):** Cu câte zile înainte de expirarea parolei începe sistemul să îl avertizeze pe utilizator la login.

7. **Inactivity Period (`14` — `chage -I`):** Numărul de zile de grație **DUPĂ ce parola a expirat** în care utilizatorul mai are voie să se logheze pentru a-și reseta parola, înainte ca întregul cont să fie blocat.

8. **Account Expiration Date (`20088` — `chage -E`):** Data absolută (în zile de la `1970-01-01`, dar o setăm ușor în format `YYYY-MM-DD`, ex: `chage -E 2026-12-31 natasha`) la care **întregul cont expiră definitiv** (de exemplu, când se termină contractul unui consultant extern), indiferent dacă parola lui încă mai era validă!

9. **Reserved Field:** Câmp gol rezervat pentru utilizări viitoare.

#### 3. Anatomia `/etc/group` (Cele 4 Câmpuri — și o Capcană Clasică de Interviu!)

Exemplu:

```
natasha:x:1001:
sysadmins:x:40000:natasha,harry

```

1. **Group Name (`sysadmins`)**

2. **Group Password Placeholder (`x`)** -> trimite la `/etc/gshadow`.

3. **GID (`40000`)** -> ID-ul numeric al grupului.

4. **Group Members (`natasha,harry`)**: Lista utilizatorilor care au acest grup ca **Supplementary Group (Grup Secundar)**!

   * **Întrebare Capcană de Interviu:** *„De ce pe linia `natasha:x:1001:` din `/etc/group`, câmpul 4 (lista de membri) este complet gol? Nu face parte `natasha` din grupul `natasha`?”*

   * **Răspunsul de Arhitect:** În `/etc/group`, în câmpul 4 sunt trecuți **DOAR membrii secundari (*supplementary members*)**! Membrii care au acel grup drept **Grup Primar (*Primary Group*)** sunt deja legați de el prin câmpul 4 din `/etc/passwd` (`1001`), deci nu mai sunt duplicați în `/etc/group`! Pentru a vedea toate grupurile reale (primar + secundare) ale unui utilizator, rulăm întotdeauna comanda **`id natasha`**!

### 2.3. Comenzile de Gestiune a Utilizatorilor și Grupurilor (Disecția Tuturor Flag-urilor EX200)

#### 1. Crearea și Modificarea Grupurilor (`groupadd`, `groupmod`, `groupdel`)

```
# Crearea unui grup simplu:
groupadd sysadmins

# Crearea unui grup cu un GID specific cerut în examen (-g):
groupadd -g 40000 devops

# Crearea unui grup de sistem (-r, GID < 1000):
groupadd -r app_service

# Redenumirea unui grup (-n) sau schimbarea GID-ului (-g) unui grup existent:
groupmod -n nou_nume vechi_nume
groupmod -g 45000 devops

```

#### 2. Crearea Utilizatorilor cu `useradd` și Modificarea cu `usermod`

| Flag la `useradd` / `usermod` | Semnificație & Acțiune în Sistem | Exemplu Exact de Examen EX200 | 
| ----- | ----- | ----- | 
| **`-u <UID>`** | Setează manual **UID-ul** numeric al utilizatorului. | `useradd -u 2500 alex` | 
| **`-g <grup>`** *(cu **`g` mic**!)* | Setează **Primary Group (Grupul Primar — 1 singur!)**. | `useradd -g developers alex` | 
| **`-G <g1,g2>`** *(cu **`G` mare**!)* | Setează lista de **Supplementary Groups (Grupuri Secundare)**! | `useradd -G sysadmins,wheel natasha` | 
| **`-aG <grup>`** *(DOAR la `usermod`!)* | **Append to Supplementary Group:** Adaugă utilizatorul într-un grup secundar nou **FĂRĂ a-l șterge din grupurile secundare în care era deja**! | **`usermod -aG sysadmins harry`** | 
| **`-s <shell>`** | Setează **Login Shell-ul** (câmpul 7 din `/etc/passwd`). | **`useradd -s /sbin/nologin sarah`** | 
| **`-d <cale>`** | Specifică calea directorului Home (la `usermod`, combină cu `-m` pentru a muta și fișierele existente: `usermod -d /home/new -m user`). | `useradd -d /opt/custom_home bob` | 
| **`-m` / `-M`** | `-m` forțează crearea Home Dir (implicit pentru useri normali); **`-M`** interzice crearea directorului Home! | `useradd -M -s /sbin/nologin svc_web` | 
| **`-r`** | Creează un **System Account** (`UID < 1000`, fără Home Dir implicit și fără expirare). | `useradd -r -s /sbin/nologin prometheus` | 
| **`-c "<text>"`** | Setează câmpul 5 (**GECOS / Comment** — Numele complet). | `useradd -c "Sarah Connor" sarah` | 
| **`-L` / `-U`** *(la `usermod`)* | **Lock (`-L`)** blochează parola adăugând `!` în `/etc/shadow`; **Unlock (`-U`)** o deblochează. | `usermod -L harry` | 

#### 3. Setarea Parolelor în Examen: Interactiv vs. Intr-o Singură Linie (`--stdin` / `chpasswd`)

În examenul EX200 ți se va cere să setezi aceeași parolă (de exemplu `flectrag`) pentru 3 sau 4 utilizatori. Dacă rulezi `passwd natasha` manual și tastezi parola de două ori fără să vezi ce scrii pe ecran, riști să faci o greșeală de tastare (*typo*)!
**Metoda Infailibilă RHCA (Copy-Paste direct din enunțul examenului!):**

```
# În RHEL, comanda passwd suportă flag-ul genial --stdin (citește parola din pipe!):
echo 'flectrag' | passwd --stdin natasha
echo 'flectrag' | passwd --stdin harry
echo 'flectrag' | passwd --stdin sarah

# Sau, alternativ, cu utilitarul standard POSIX chpasswd:
echo 'natasha:flectrag' | chpasswd

```

Cu `echo 'flectrag' | passwd --stdin natasha`, vezi exact parola pe ecran (îi dai Copy-Paste din browserul de examen!) și nu poți greși niciodată!

### 2.4. Gestiunea Expirării Parolelor (Password Aging): `chage` vs. `/etc/login.defs`

În examenul EX200, cerințele despre expirarea parolelor vin în **două forme diferite** — iar confundarea lor duce la pierderea punctelor:

1. **Forma A: Pentru un utilizator EXISTENT (ex: *„Parola utilizatorului `natasha` trebuie să expire la fiecare 60 de zile și să ceară schimbarea parolei la primul login”*):**
   Folosim comanda **`chage` (*Change Age*)**:

   ```
   # -M 60 (Max days = 60), -m 2 (Min days = 2), -W 7 (Warn = 7), -I 14 (Inactive = 14), -E 2027-12-31 (Expire date):
   chage -M 60 -m 2 -W 7 -I 14 -E 2027-12-31 natasha
   
   # Cum forțăm utilizatorul să își schimbe parola IMEDIAT la următoarea autentificare?
   chage -d 0 natasha
   # (Setează Last Password Change = 0, adică 1 Ianuarie 1970 -> parola e considerată expirată pe loc!)
   
   # Cum verificăm setările de aging ale unui utilizator? Cu chage -l (List):
   chage -l natasha
   
   ```

2. **Forma B: Pentru TOȚI utilizatorii NOU-CREAȚI în viitor (ex: *„Configurați sistemul astfel încât toți utilizatorii care vor fi creați pe viitor să aibă durata maximă de valabilitate a parolei de 30 de zile”*):**
   Comanda `chage` modifică doar o linie existentă din `/etc/shadow`! Pentru utilizatorii care vor fi creați în viitor (de scriptul de evaluare al examenului!), `useradd` își citește valorile implicite din fișierul **`/etc/login.defs`**!
   Deschidem `/etc/login.defs` în `vim` și modificăm directivele:

   ```
   PASS_MAX_DAYS   30
   PASS_MIN_DAYS   0
   PASS_WARN_AGE   7
   
   ```

### 2.5. Escaladarea Privilegiilor: `su` vs. `sudo`, `visudo` și `/etc/sudoers.d/`

De ce în mediile enterprise moderne nu dăm parola de `root` tuturor administratorilor (folosind `su -`), ci folosim **`sudo` (*Superuser Do / Substitute User Do*)**?

1. **Granularitate:** Cu `su -`, dai totul sau nimic (`UID 0` complet). Cu `sudo`, poți permite unui operator junior să ruleze doar `/usr/bin/systemctl restart httpd`, fără a putea șterge discurile.

2. **Auditabilitate Completă (în `/var/log/secure` și `journalctl`):** Când rulezi `sudo <comanda>`, utilizatorul se autentifică cu **propria sa parolă** (sau cu `NOPASSWD`), iar în `/var/log/secure` rămâne înregistrat exact ce utilizator uman a executat ce comandă, de pe ce terminal și în ce director!

#### Anatomia Regulilor din `/etc/sudoers` și `/etc/sudoers.d/`

În RHEL, grupul administrativ standard este grupul **`wheel`**. Dacă ne uităm în `/etc/sudoers`, vedem două linii celebre:

```
## Allows people in group wheel to run all commands
%wheel  ALL=(ALL)       ALL

## Same thing without a password
# %wheel        ALL=(ALL)       NOPASSWD: ALL

```

Să disecăm matematic fiecare componentă a sintaxei `sudoers`:

$$
\underbrace{\text{\%sysadmins}}_{\text{1. Cine? (User sau \%Grup)}} \quad \underbrace{\text{ALL}}_{\text{2. Pe ce Hostname?}} = \underbrace{\text{(ALL : ALL)}}_{\text{3. Ca ce (User : Grup)?}} \quad \underbrace{\text{NOPASSWD:}}_{\text{4. Tag Opțional}} \quad \underbrace{\text{ALL}}_{\text{5. Ce comenzi?}}
$$

1. **Cine (`user` sau `%grup`):**

   * Dacă scrii `natasha` (**fără `%`**), regula se aplică **utilizatorului** `natasha`.

   * Dacă scrii **`%sysadmins`** (**CU semnul procent `%` în față!**), regula se aplică **grupului** `sysadmins`! *(Dacă uiți semnul `%` în fața numelui de grup în examenul EX200, `sudo` va căuta un utilizator cu numele `sysadmins` și vei primi **0 puncte**!)*

2. **Pe ce Host (`ALL`):** Pe ce server se aplică regula (aproape mereu `ALL`).

3. **Ca ce identitate țintă (`(ALL)` sau `(ALL:ALL)`):** În numele cărui utilizator și grup are voie să execute comanda (ex: `(ALL)` îi permite să devină `root` sau orice alt utilizator).

4. **Tag-ul `NOPASSWD:`:** **CRITIC ÎN EXAMEN!** Dacă cerința specifică *„fără a li se cere parola (without password)”*, trebuie să pui exact **`NOPASSWD:`** (cu două puncte la final!) înaintea listei de comenzi!

5. **Ce comenzi (`ALL` sau căi absolute):** Fie `ALL` (orice comandă), fie o listă de căi absolute separate prin virgulă (ex: `/usr/sbin/useradd, /usr/bin/passwd`).

> **Procedura Oficială și Sigură pentru Examenul EX200 (`/etc/sudoers.d/` + `visudo -c`):**
> La finalul fișierului `/etc/sudoers` există directiva `@includedir /etc/sudoers.d`. În loc să modifici fișierul mare `/etc/sudoers`, creează un fișier dedicat în `/etc/sudoers.d/sysadmins`:
>
> ```
> # 1. Creăm fișierul direct sau cu visudo -f:
> echo "%sysadmins ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/sysadmins
> chmod 0440 /etc/sudoers.d/sysadmins
> 
> # 2. VALIDAREA OBLIGATORIE DE SINTAXĂ CU visudo -c:
> visudo -c
> # Output obligatoriu:
> # /etc/sudoers: parsed OK
> # /etc/sudoers.d/sysadmins: parsed OK
> 
> ```
>
> **De ce este `visudo -c` vital?** Dacă faci o greșeală de sintaxă într-un fișier din `/etc/sudoers.d/`, `sudo` refuză din motive de securitate să mai funcționeze pentru **orice utilizator de pe server**! Comanda `visudo -c` verifică gramatica tuturor fișierelor și îți confirmă `parsed OK`!

## 3. Cutia cu Secrete RHCA & Capcane Mortale de Examen (Exam Killers & Man Page Hacks)

### 💀 Capcana Mortală #1: `usermod -G` FĂRĂ `-a` (Ștergerea Accidentală din Grupurile Existente!)

Aceasta este greșeala clasică: utilizatorul `natasha` este deja în grupul `wheel`. Mai târziu în examen, un alt task îți cere să o adaugi și în grupul `devops`.
Dacă rulezi:
`usermod -G devops natasha` (**FĂRĂ `-a`!**),
comanda `usermod` **SUPRASCRIE** întreaga listă de grupuri secundare a lui `natasha`, scoțând-o din `wheel` (sau din `sysadmins`, unde o puseseși la Task-ul 1)!

* **Regula de Aur RHCA:** Când adaugi un utilizator existent într-un grup secundar, folosește **ÎNTOTDEAUNA `-aG`** (*append to supplementary Groups*):

  ```
  usermod -aG devops natasha
  
  ```

### 💀 Capcana Mortală #2: Uitarea Semnului `%` pentru Grupuri în `/etc/sudoers.d/`

În examen ți se cere: *„Membrii grupului `admin` trebuie să poată rula orice comandă cu `sudo` fără parolă”*.
Dacă scrii în `/etc/sudoers.d/admin`:
`admin ALL=(ALL) NOPASSWD: ALL` (fără `%`),
regula va funcționa doar pentru un utilizator numit `admin`, **NU** pentru membrii grupului `admin`! Pentru grupuri, semnul **`%`** este obligatoriu:
`%admin ALL=(ALL) NOPASSWD: ALL`

### 💀 Capcana Mortală #3: Confuzia între `-g` (Primary) și `-G` (Supplementary)

Citește enunțul examenului cu lupa:

* Dacă scrie *„belongs to `sysadmins` as a **secondary / supplementary** group”* -> folosești **`-G sysadmins`** (sau `-aG sysadmins`).

* Dacă scrie *„has `sysadmins` as their **primary / default** group”* -> folosești **`-g sysadmins`**.

### 🛠️ Man Page Hacks pentru Capitolul 1.1

Ai uitat în timpul examenului sintaxa exactă pentru `NOPASSWD` în `sudoers`?
Nu trebuie să cauți nici măcar în `man`! Deschide pur și simplu fișierul **`/etc/sudoers`** (`grep -C 3 wheel /etc/sudoers`) și la linia \~110 vei găsi linia **gata scrisă de Red Hat**, doar comentată cu `#`:
`# %wheel        ALL=(ALL)       NOPASSWD: ALL`
Doar o copiezi, înlocuiești `%wheel` cu `%grupul_cerut` și ai rezolvat subiectul în 10 secunde cu 0% șanse de eroare!

## 4. Pregătire pentru Interviu (Linux SysAdmin & DevOps Job Readiness)

### Întrebarea 1 (Nivel Mid -> Senior / Security Engineer):

> **Intervievator:** *„Am blocat un utilizator pe serverul de producție folosind comanda `passwd -l developer` (sau `usermod -L developer`). Cu toate acestea, văd în logurile `/var/log/secure` că utilizatorul `developer` încă se conectează fără probleme pe server prin SSH în fiecare dimineață! Cum este posibil acest lucru și cum blochezi cu adevărat complet un cont în RHEL?”*

**Răspunsul Ideal:**

> „Comenzile `passwd -l` și `usermod -L` fac un singur lucru: pun un semn de exclamare (`!`) în fața hash-ului parolei din câmpul 2 al fișierului `/etc/shadow`. Aceasta invalidează exclusiv **autentificarea bazată pe parolă**!
>
> Dacă utilizatorul `developer` are configurată o cheie publică SSH în `~/.ssh/authorized_keys`, daemonul `sshd` (împreună cu modulul PAM `pam_unix.so`) verifică dacă contul în sine este valid și, deoarece autentificarea prin cheie criptografică SSH nu folosește deloc hash-ul parolei din `/etc/shadow`, îi permite accesul!
>
> **Cum blochez 100% un cont (inclusiv pentru SSH Keys și Cron jobs):**
> Setez data de expirare a întregului cont în trecut (ex: ziua `1`, adică 2 Ianuarie 1970) și îi schimb shell-ul în `/sbin/nologin`:
>
> ```
> chage -E 1 developer
> usermod -L -s /sbin/nologin developer
> 
> ```
>
> Când modulul PAM `pam_unix` verifică secțiunea `account` la conectarea SSH și vede că `Account Expiration Date (câmpul 8 din /etc/shadow)` a expirat, blochează instantaneu autentificarea indiferent dacă se folosește parolă sau cheie SSH!”

### Întrebarea 2 (Nivel Junior -> Mid):

> **Intervievator:** *„Cum poate un utilizator obișnuit (`UID 1001`) să își schimbe propria parolă rulând comanda `/usr/bin/passwd`, având în vedere că parola este salvată în `/etc/shadow`, un fișier care are permisiunile `0000 (----------)` și aparține lui `root`?”*

**Răspunsul Ideal:**

> „Secretul se află în permisiunile binarelor: dacă rulăm `ls -l /usr/bin/passwd`, vedem `-rwsr-xr-x. 1 root root ... /usr/bin/passwd`. Litera **`s`** din permisiunile proprietarului indică faptul că binarul are bitul **SUID (*Set User ID*, octal `4000`)** activat!
>
> La nivel de Kernel, când utilizatorul `UID 1001` execută `/usr/bin/passwd`, procesul are:
>
> * **Real UID (`RUID`) = `1001`** (cine a pornit procesul — astfel încât `passwd` să știe a cui parolă trebuie schimbată și să îi ceară parola veche);
>
> * **Effective UID (`EUID`) = `0` (`root`)** (datorită bitului SUID de pe binar!).
>   Deoarece kernelul evaluează permisiunile de acces la fișiere pe baza lui **EUID (`0`)**, procesul `/usr/bin/passwd` poate modifica `/etc/shadow` doar pentru linia corespunzătoare lui `RUID (1001)`.”

## 5. Laboratorul Practic Explicat & Scenarii de Examen (Hands-On Lab pe `node1`)

Conectează-te pe **`node1.lab.example.com`** ca `root` și execută pas cu pas laboratorul complet:

### Pasul 1: Configurarea Șablonului `/etc/skel` și `/etc/login.defs`

Să presupunem că în companie (sau în examen) ni se cere ca orice utilizator nou creat să primească automat în directorul său home un subdirector `workspace` și un fișier `SECURITY_POLICY.txt`:

```
# 1. Inspectăm conținutul actual al șablonului /etc/skel (inclusiv fișierele ascunse cu -a):
[root@node1 ~]# ls -la /etc/skel/
total 24
drwxr-xr-x.  3 root root   78 Nov 12 09:00 .
drwxr-xr-x. 86 root root 8192 Nov 12 11:30 ..
-rw-r--r--.  1 root root   18 Aug 10  2021 .bash_logout
-rw-r--r--.  1 root root  141 Aug 10  2021 .bash_profile
-rw-r--r--.  1 root root  492 Aug 10  2021 .bashrc

# 2. Adăugăm structura cerută în /etc/skel/:
[root@node1 ~]# mkdir -p /etc/skel/workspace
[root@node1 ~]# echo "Respectati politicile SELinux si sudo!" > /etc/skel/SECURITY_POLICY.txt

```

*(Orice apel `useradd` făcut de acum înainte va copia automat tot conținutul din `/etc/skel/` în `/home/<noul_user>/` și îi va schimba proprietarul pe noul utilizator!)*

### Pasul 2: Scenariul Clasic de Examen EX200 (Grupuri, Utilizatori, `/sbin/nologin`, Parole și `sudo`)

```
# 1. Creăm grupul 'sysadmins' cu GID-ul specific 40000:
[root@node1 ~]# groupadd -g 40000 sysadmins

# 2. Creăm utilizatorii 'natasha' și 'harry' având 'sysadmins' ca grup secundar (-G):
[root@node1 ~]# useradd -G sysadmins natasha
[root@node1 ~]# useradd -G sysadmins harry

# 3. Creăm utilizatorul 'sarah' fără acces la un shell interactiv (-s /sbin/nologin):
[root@node1 ~]# useradd -s /sbin/nologin sarah

# 4. Setăm parola 'flectrag' pentru toți cei 3 utilizatori fără riscul greșelilor de tastare:
[root@node1 ~]# for u in natasha harry sarah; do echo 'flectrag' | passwd --stdin $u; done

# 5. Verificăm identitatea, UID/GID-ul și shell-ul celor 3 utilizatori:
[root@node1 ~]# id natasha
[root@node1 ~]# id harry
[root@node1 ~]# getent passwd natasha harry sarah

# 6. Configurăm sudo fără parolă (NOPASSWD) pentru grupul 'sysadmins':
[root@node1 ~]# echo "%sysadmins ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/sysadmins
[root@node1 ~]# chmod 0440 /etc/sudoers.d/sysadmins
[root@node1 ~]# visudo -c

# 7. TESTĂM OBLIGATORIU că natasha poate executa comenzi de root fără parolă!
[root@node1 ~]# su - natasha -c "sudo id"
uid=0(root) gid=0(root) groups=0(root) context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023

```

## 6. Simulare de Examen EX200 (3 Task-uri Practice Cronometrate + 5 Întrebări de Diagnosticare)

Pune-ți cronometrul pe **15 minute** și rezolvă pe **`node1.lab.example.com`**:

### Partea A: Cele 3 Task-uri Practice (Stil Oficial EX200)

1. **Task 1 (Grupuri, Utilizatori, UID/GID și Shell Non-Interactiv):**

   * Creați un grup numit `ops_team` având GID-ul `35000`.

   * Creați utilizatorul `alison` cu UID-ul `3501`, care să aibă grupul `ops_team` ca **grup secundar (*supplementary group*)**.

   * Creați utilizatorul `bruno` care să aibă grupul `ops_team` tot ca **grup secundar**.

   * Creați utilizatorul `carlos` care să **nu** fie membru în `ops_team` și să **nu** aibă acces la un shell interactiv pe sistem (`/sbin/nologin`).

   * Toți cei trei utilizatori (`alison`, `bruno`, `carlos`) trebuie să aibă parola setată la `RedHatPass99!`.

2. **Task 2 (Password Aging — Existent vs. Viitor):**

   * Configurați contul utilizatorului `bruno` astfel încât parola sa să expire după maxim **45 de zile**, să primească avertizare cu **10 zile** înainte de expirare, și forțați-l să își schimbe parola la prima autentificare.

   * Configurați sistemul astfel încât pentru **orice utilizator nou care va fi creat în viitor**, durata maximă de valabilitate a parolei să fie de **60 de zile** și în directorul său home să fie creat automat un fișier gol numit `.onboarding_done`.

3. **Task 3 (Escaladarea Privilegiilor cu `sudo`):**
   Configurați `sudo` (într-un fișier dedicat `/etc/sudoers.d/ops_team`) astfel încât toți membrii grupului `ops_team` să poată executa orice comandă ca orice utilizator **fără a li se solicita parola**.

### Partea B: Cele 5 Întrebări de Diagnosticare

1. Care este diferența exactă dintre `usermod -g ops_team alison` și `usermod -aG ops_team alison`?

2. Dacă te uiți în `/etc/shadow` și vezi că al treilea câmp (după hash-ul parolei) este `0`, ce se va întâmpla când acel utilizator se va conecta prin SSH?

3. De ce este periculos să editezi `/etc/sudoers` direct cu `vim /etc/sudoers` în loc de `visudo` (sau fără a rula `visudo -c`)?

4. Cum setezi data de expirare a contului unui contractor (`alison`) pentru data de `31 Decembrie 2027` folosind comanda `chage`?

5. Unde își caută comanda `useradd` fișierele implicite pe care le copiază în `/home/<username>` atunci când creează un utilizator nou?

### Rezolvare Completă, Script de Verificare (Grading Script) și Explicații (Profesorul Explică)

#### Rezolvarea Pas cu Pas a Task-urilor Practice:

##### Rezolvare Task 1 (Grupul `ops_team` și utilizatorii `alison`, `bruno`, `carlos`):

```
# 1. Creăm grupul ops_team cu GID 35000:
groupadd -g 35000 ops_team

# 2. Creăm utilizatorii conform specificațiilor exacte:
useradd -u 3501 -G ops_team alison
useradd -G ops_team bruno
useradd -s /sbin/nologin carlos

# 3. Setăm parola 'RedHatPass99!' pentru toți trei:
for u in alison bruno carlos; do
    echo 'RedHatPass99!' | passwd --stdin "$u"
done

```

##### Rezolvare Task 2 (Password Aging pentru `bruno` + Viitorii Utilizatori):

```
# 1. Setăm regulile de aging pentru utilizatorul existent bruno (-M 45, -W 10, și -d 0 pentru schimbare la primul login):
chage -M 45 -W 10 -d 0 bruno

# 2. Modificăm PASS_MAX_DAYS la 60 în /etc/login.defs pentru toți utilizatorii viitori:
sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS\t60/' /etc/login.defs
grep "^PASS_MAX_DAYS" /etc/login.defs

# 3. Creăm fișierul .onboarding_done în /etc/skel/:
touch /etc/skel/.onboarding_done

```

##### Rezolvare Task 3 (Configurare `sudo` pentru grupul `%ops_team`):

```
echo "%ops_team ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/ops_team
chmod 0440 /etc/sudoers.d/ops_team
visudo -c

# Verificăm cu utilizatorul alison (care nu are parola expirată):
su - alison -c "sudo whoami"
# Output așteptat: root

```

#### Răspunsurile la Întrebările de Diagnosticare:

1. `-g ops_team` îi schimbă **Grupul Primar (Primary Group)** în `ops_team`. `-aG ops_team` îi adaugă `ops_team` în lista de **Grupuri Secundare (Supplementary Groups)**, păstrându-i grupul primar și celelalte grupuri secundare intacte.

2. Când câmpul 3 (*Last Password Change*) din `/etc/shadow` este `0`, sistemul îl forțează pe utilizator să își schimbe parola imediat la autentificare, înainte de a-i deschide shell-ul.

3. Pentru că `vim` nu validează gramatica specifică `sudoers`. O singură greșeală de sintaxă în `/etc/sudoers` blochează complet comanda `sudo` pe tot serverul. `visudo` blochează fișierul împotriva editării simultane și refuză salvarea dacă există erori de sintaxă.

4. `chage -E 2027-12-31 alison`.

5. În directorul **`/etc/skel/`**.

#### Scriptul de Verificare Automată (Grading Script pentru Capitolul 1.1)

```
#!/bin/bash
# ==============================================================================
# RHCSA (EX200) - Script Automat de Evaluare: Capitolul 1.1
# ==============================================================================
SCORE=0
TOTAL=30

echo "========================================================"
echo " Evaluare Obiective Capitolul 1.1 pe $(hostname)"
echo "========================================================"

# Verificare Task 1: Grupul ops_team și utilizatorii alison, bruno, carlos
if [[ $(getent group ops_team | cut -d: -f3) == "35000" ]] && \
   [[ $(id -u alison 2>/dev/null) == "3501" ]] && \
   id -nG alison | grep -qw "ops_team" && \
   id -nG bruno | grep -qw "ops_team" && \
   ! id -nG carlos 2>/dev/null | grep -qw "ops_team" && \
   getent passwd carlos | cut -d: -f7 | grep -q "nologin"; then
    echo "[ PASS ] Task 1: Grupul ops_team (35000) și utilizatorii alison, bruno, carlos sunt configurați corect (+10p)"
    SCORE=$((SCORE + 10))
else
    echo "[ FAIL ] Task 1: Eroare la UID/GID, apartenența la grupul ops_team sau shell-ul lui carlos (0p)"
fi

# Verificare Task 2: Password aging bruno + /etc/login.defs + /etc/skel
BRUNO_SHADOW=$(getent shadow bruno)
BRUNO_LASTCHG=$(echo "$BRUNO_SHADOW" | cut -d: -f3)
BRUNO_MAX=$(echo "$BRUNO_SHADOW" | cut -d: -f5)
BRUNO_WARN=$(echo "$BRUNO_SHADOW" | cut -d: -f6)
if [[ "$BRUNO_LASTCHG" == "0" ]] && \
   [[ "$BRUNO_MAX" == "45" ]] && \
   [[ "$BRUNO_WARN" == "10" ]] && \
   grep -qE "^PASS_MAX_DAYS[[:space:]]+60" /etc/login.defs && \
   [[ -f /etc/skel/.onboarding_done ]]; then
    echo "[ PASS ] Task 2: Politicile chage pentru bruno, /etc/login.defs (60 zile) și /etc/skel sunt corecte (+10p)"
    SCORE=$((SCORE + 10))
else
    echo "[ FAIL ] Task 2: Eroare la chage pentru bruno, PASS_MAX_DAYS în /etc/login.defs sau /etc/skel/.onboarding_done (0p)"
fi

# Verificare Task 3: Sudo NOPASSWD pentru ops_team
if visudo -c &>/dev/null && \
   [[ $(su - alison -c "sudo -n whoami" 2>/dev/null) == "root" ]]; then
    echo "[ PASS ] Task 3: Membrii grupului ops_team pot executa sudo fără parolă (NOPASSWD) (+10p)"
    SCORE=$((SCORE + 10))
else
    echo "[ FAIL ] Task 3: Configurația sudo pentru %ops_team lipsește sau cere parolă (0p)"
fi

echo "--------------------------------------------------------"
echo " PUNCTAJ FINAL CAPITOLUL 1.1: $SCORE / $TOTAL"
echo "========================================================"

```

## 7. Bibliografie Oficială Red Hat și Surse de Aprofundare

1. **Cursul Oficial Red Hat RH124 (*Red Hat System Administration I*):**

   * Capitolul 6: *Manage Local Users and Groups* (`useradd`, `usermod`, `groupadd`, `/etc/passwd`, `/etc/shadow`, `/etc/group`).

   * Capitolul 7: *Control Access to Files* (Introducere în identitatea de grup și `sudo`).

2. **Pagini de Manual (`man`) Esențiale din Sistem:**

   * `man 5 passwd`, `man 5 shadow`, `man 5 group`, `man 5 login.defs`

   * `man 8 useradd`, `man 8 usermod`, `man 8 groupadd`, `man 1 chage`

   * `man 5 sudoers`, `man 8 visudo`, `man 8 sudo`