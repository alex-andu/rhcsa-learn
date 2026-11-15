---
title: "5.1 Containere în RHEL: Podman, Skopeo, Stocare Persistentă cu SELinux (:Z) și Container-as-a-Service în systemd"
summary: "Înțelegerea profundă a arhitecturii containerelor Linux la nivel de Kernel (Namespaces, Control Groups — cgroups v2 și SELinux Multi-Category Security sVirt); de ce Red Hat a înlocuit arhitectura cu daemon (dockerd) cu motorul daemonless Podman (Pod Manager)…"
order: 1
origin: alex
updated: "2026-11-15"
---

> ### Obiectivul Capitolului, Ponderea în Examenul EX200 & Regula de Aur a Persistenței
>
> * **Obiectivul Capitolului:** Înțelegerea profundă a arhitecturii containerelor Linux la nivel de Kernel (**Namespaces**, **Control Groups — `cgroups v2`** și **SELinux Multi-Category Security `sVirt`**); de ce Red Hat a înlocuit arhitectura cu daemon (`dockerd`) cu motorul *daemonless* **`Podman` (*Pod Manager*)** alături de **`Buildah`** și **`Skopeo`**; diferența critică dintre **Rootfull Containers** și **Rootless Containers** (*User Namespaces* `/etc/subuid`, `/etc/subgid` și `podman unshare`); configurarea registrelor în `/etc/containers/registries.conf`; construirea imaginilor cu **`Containerfile` (`podman build`)**; montarea volumelor persistente pe disc cu flag-ul obligatoriu SELinux **`:Z`** (`container_file_t`); și **Subiectul Rege al Examenului EX200**: configurarea unui container *rootless* să pornească automat ca serviciu **`systemd --user`** la boot fără ca utilizatorul să se autentifice (**`loginctl enable-linger`**, `~/.config/systemd/user/`, `podman generate systemd --new` și noua arhitectură declarativă **Podman Quadlets** `.container` din RHEL 9.2+ / RHEL 10!).
>
> * **Ponderea în Examenul EX200:** **URIAȘĂ — 20% până la 25% DIN PUNCTAJUL TOTAL AL EXAMENULUI!**
>   În examenul RHCSA pe `node1`, ultimele 2 sau 3 task-uri sunt dedicate exclusiv containerelor `Podman` și valorează împreună 50–70 de puncte:
>   1. **Construirea unei imagini din `Containerfile`:** *„Ca utilizator `alison` (sau `root`), descărcați un `Containerfile` și construiți o imagine numită `my_logger:v1`.”*
>   2. **Rularea unui Container Rootless cu Stocare Persistentă (`-v ...:Z`) și Variabile/Porturi:** *„Ca utilizator `alison` (container rootless!), porniți un container numit `log_server` din imaginea `registry.lab.example.com/ubi9/httpd-24`, mapați portul gazdă `8080` la portul `8080` al containerului și montați directorul gazdă `/home/alison/container_files` la calea `/var/www/html` în interiorul containerului, astfel încât SELinux să permită accesul.”*
>   3. **Container-as-a-Service în `systemd` (`systemctl --user` + `enable-linger`):** *„Configurați containerul `log_server` să fie gestionat ca un serviciu `systemd` al utilizatorului `alison` (numit `container-log_server.service`), astfel încât să pornească automat la pornirea sistemului (`reboot`), fără intervenție manuală și fără ca utilizatorul `alison` să fie nevoit să se logheze!”*
>
> * **Regula de Aur a Persistenței (EX200 Survival Rule — CELE 3 REGULI DE SUPRAVIEȚUIRE PODMAN!):**
>   1. **NICIODATĂ nu folosi `su - alison` când lucrezi cu `podman` și `systemctl --user`!** Comanda `su -` nu creează o sesiune completă `systemd-logind` (nu setează variabila `$XDG_RUNTIME_DIR=/run/user/<UID>` și D-Bus-ul de utilizator), iar `systemctl --user` va da eroarea fatală `Failed to connect to bus: No medium found`! Conectează-te **EXCLUSIV prin SSH direct ca acel utilizator**: **`ssh alison@localhost`** (sau `ssh alison@node1`)!
>   2. **Dacă uiți `:Z` la montarea volumului (`-v /dir_host:/dir_container:Z`)**, SELinux va bloca containerul să scrie sau să citească din acel director și containerul va muri la pornire!
>   3. **Dacă uiți `loginctl enable-linger alison`**, serviciul `systemd --user` al lui `alison` **NU va porni la reboot-ul de evaluare** (deoarece procesele de utilizator pornesc implicit doar când utilizatorul face login interactiv), și vei lua **0 puncte pe tot subiectul Podman**!

:::analogy
Prima întrebare pe care o pun la orice interviu de DevOps / Cloud Engineer este: *„Ce este un container la nivel de Linux Kernel? Există în codul sursă al kernelului Linux un obiect numit «container»?”*
Răspunsul este **NU!** Pentru nucleul Linux, un container este pur și simplu **un proces Linux normal (ca oricare altul, vizibil în `ps aux` de pe host!)**, dar căruia kernelul i-a pus „ochelari de cal” (**Namespaces**), „cotă de hrană” (**cgroups**) și „zgardă de securitate” (**SELinux `container_t`**)!

### Analogia Vizuală: Iluzia Matrix (Namespaces), Contorul Electric (`cgroups`) și De Ce Red Hat a Înlocuit Docker cu `Podman`

1. **Mașină Virtuală (KVM) vs. Container (Podman):**
   * O **Mașină Virtuală (`node1`)** este o **Casă Individuală cu Propria Fundație (propriul Kernel `vmlinuz`), Propria Centrală Termică și Propriul Acoperiș**. Izolarea este totală, dar consumă GB întregi de RAM și pornește în 30 de secunde.
   * Un **Container** este un **Apartament într-un Zgârie-Nori**: toate apartamentele împart **aceeași fundație și aceeași coloană de apă caldă (același Kernel Linux al hostului!)**, dar fiecare apartament are:
     * **Pereți opaci și numere de uși proprii (`Kernel Namespaces`):** Procesul din container crede că are `PID 1`, că are propria placă de rețea și propriul său sistem de fișiere `/`, fără să își vadă vecinii de palier!
     * **Contor de curent și siguranțe automate (`Control Groups — cgroups v2`):** Niciun apartament nu poate consuma toată apa caldă sau tot curentul clădirii (limitare de CPU și RAM).
     * **Cheie care nu se potrivește la ușa vecinului (`SELinux sVirt / MCS`):** Chiar dacă un chiriaș sparge peretele de rigips, ofițerul SELinux îl blochează deoarece poartă categoria unică `s0:c123,c456`!

2. **De ce a renunțat Red Hat la `Docker` în favoarea lui `Podman` (`Fork/Exec` vs. `Client/Server Daemon`)?**
   * **Arhitectura `Docker`:** Folosește un **Daemon monolitic gigant (`dockerd`) care rulează permanent ca `root` (`UID 0`)**. Toate containerele sunt copii ai lui `dockerd`. Dacă `dockerd` crapă, **toate containerele de pe server mor simultan**! Mai grav, când `systemd` vrea să supravegheze un container Docker, el vorbește doar cu clientul `docker`, nu vede procesul real al containerului!
   * **Arhitectura `Podman` (*Daemonless*):** **NU există niciun daemon în fundal!** Când rulezi `podman run`, Podman folosește modelul clasic UNIX `fork()/exec()` (cu un mic proces monitor per container numit **`conmon`**). Fiecare container poate rula direct sub contul unui utilizator neprivilegiat (**Rootless Container**), iar **`systemd` poate controla și reporni fiecare container exact ca pe un serviciu nativ Linux!**
:::

:::architecture
### 2.1. Cele 3Tehnologii din Kernel care Construiesc un Container și Triada `Podman` / `Buildah` / `Skopeo`

În RHEL 9 / RHEL 10, suita de unelte pentru containere respectă standardul **OCI (*Open Container Initiative*)** și se instalează prin metapachetul **`container-tools`**:
```bash
dnf install -y container-tools
```
Această suită conține 3 unelte specializate (și 100% compatibile la nivel de CLI cu Docker — poți face chiar `alias docker=podman`!):
1. **`podman` (*Pod Manager*):** Rulează și gestionează containere, pod-uri (grupuri de containere care împart același *Network Namespace*, exact ca în Kubernetes!), imagini și volume.
2. **`buildah`:** Construiește imagini OCI din `Containerfile` / `Dockerfile` sau direct din comenzi Bash (este apelat automat sub capotă când rulezi `podman build`!).
3. **`skopeo`:** Inspectează, copiază și sincronizează imagini între registre remote **FĂRĂ a fi nevoie să descarci (`pull`) imaginea pe discul local**!

```mermaid
flowchart TB
    subgraph UserSpace["User Space: Uneltele OCI din RHEL 9 / RHEL 10 (pachetul container-tools)"]
        Podman["⚙️ podman\n(Rulare containere, volume,\npod-uri & integrare systemd)"]
        Buildah["🔨 buildah / podman build\n(Construire imagini OCI\ndin Containerfile)"]
        Skopeo["🔍 skopeo inspect / copy\n(Inspecție la distanță în Registry\nfără podman pull!)"]
    end

    subgraph KernelSpace["Kernel Space: Cele 3 Mecanisme Linux care Izolează Containerul"]
        NS["1. Linux Namespaces (Ce POATE VEDEA procesul):\n- pid (PID 1 propriu în container)\n- net (IP, rute și porturi proprii - pasta / slirp4netns / netavark)\n- mnt (Arbore VFS / propriu prin OverlayFS)\n- uts (Hostname propriu), ipc, user (Mapare UID Rootless!)"]
        CG["2. Control Groups (cgroups v2) (Cât POATE CONSUMA):\n- Limitare CPU, RAM, Disk I/O și număr de PID-uri"]
        SE["3. SELinux + Seccomp (Ce ARE VOIE SĂ FACĂ):\n- Procesul rulează în domeniul restricționat 'container_t'\n- Poate accesa pe host DOAR directoare cu eticheta 'container_file_t' (:Z)"]
    end

    Podman --> NS & CG & SE

    style Podman fill:#064e3b,stroke:#34d399,color:#ffffff,stroke-width:2px
    style Buildah fill:#1e3a8a,stroke:#60a5fa,color:#ffffff
    style Skopeo fill:#312e81,stroke:#818cf8,color:#ffffff
    style NS fill:#0f172a,stroke:#38bdf8,color:#ffffff
    style CG fill:#0f172a,stroke:#38bdf8,color:#ffffff
    style SE fill:#7f1d1d,stroke:#f87171,color:#ffffff,stroke-width:2px
```

---

### 2.2. Rootfull vs. Rootless Containers și Arhitectura `User Namespaces` (`/etc/subuid` & `podman unshare`)

În examenul EX200, aproape toate cerințele de containere îți vor cere să rulezi containerul **sub contul unui utilizator obișnuit (de exemplu `alison` sau `natasha` — adică un Container Rootless!)**.

| Caracteristică | **Rootfull Container** (Rulat de `root`) | **Rootless Container** (Rulat de un utilizator normal, ex: `alison` — **FAVORIT EX200!**) |
| :--- | :--- | :--- |
| **Unde sunt stocate imaginile și containerele pe disc?** | În **`/var/lib/containers/storage/`** | În directorul home al utilizatorului: **`~/.local/share/containers/storage/`** |
| **Unde se pun unitățile `systemd` pentru pornire la boot?** | În **`/etc/systemd/system/`** *(administrate cu `systemctl enable --now ...`)* | În **`~/.config/systemd/user/`** *(administrate cu **`systemctl --user enable --now ...`** + **`loginctl enable-linger`**!)* |
| **Ce porturi poate deschide pe host (`-p host:container`)?** | Orice port (`1`–`65535`, inclusiv portul `80` sau `443`). | Doar **porturi neprivilegiate $\ge 1024$** (ex: `-p 8080:80` sau `-p 8080:8080`), conform `/proc/sys/net/ipv4/ip_unprivileged_port_start`! |
| **Cum funcționează maparea UID-urilor (*User Namespace*)?** | `UID 0` din container este chiar `UID 0` (`root`) de pe host! | Folosește `/etc/subuid` și `/etc/subgid` (ex: `alison:100000:65536`):<br/>- **`UID 0` (`root`) din container** este mapat la **`UID 1000` (`alison`) pe host**!<br/>- **`UID 27` (`mysql`) din container** este mapat la **`UID 100026` pe host**! |

> **Subtilitate Tehnică de Examen & Interviu: Cum acordăm permisiuni pe un director de pe Host pentru un proces care nu rulează ca `UID 0` în interiorul unui Container Rootless (`podman unshare chown`)?**
> Să presupunem că utilizatorul `alison` (`UID 1000` pe host) pornește un container *rootless* de `mariadb` sau `httpd`. În interiorul containerului, procesul bazei de date nu rulează ca `UID 0` (care s-ar mapa la `alison`), ci rulează sub utilizatorul intern `mysql` (**`UID 27` în container**, care pe host este văzut ca `UID 100026`!).
> Dacă `alison` creează pe host directorul `/home/alison/db_data` (deținut de `alison:alison`), procesul `UID 27` din container poate primi `Permission denied` la scriere!
> Cum schimbă `alison` proprietarul directorului `/home/alison/db_data` în `27:27` văzut din interiorul *User Namespace*-ului containerului, fără a avea drepturi de `sudo` pe host?
> Folosind comanda magică **`podman unshare`**:
> ```bash
> podman unshare chown -R 27:27 /home/alison/db_data
> ```
> *(Sau, în majoritatea imaginilor Red Hat UBI din examen, fie procesul din container rulează în grupul `0 (root)` — deci un simplu `chmod 0775` sau `0777` pe directorul de pe host înainte de montare rezolvă orice problemă DAC, fie rulează direct mapat pe utilizatorul curent!)*

---

### 2.3. Configurarea Registrelor (`/etc/containers/registries.conf`), Căutare, Autentificare și `skopeo`

Când rulezi `podman pull ubi9/httpd-24` fără a scrie numele serverului în față, de unde știe `podman` pe ce servere din rețea să caute imaginea?
El citește fișierul **`/etc/containers/registries.conf`** (sau `~/.config/containers/registries.conf`):

```ini
# Lista registrelor în care podman caută automat când nu specifici domeniul complet:
unqualified-search-registries = ["registry.lab.example.com", "registry.access.redhat.com", "registry.redhat.io", "docker.io"]
```
*(Dacă în examenul EX200 ți se dă un registru local fără certificat SSL/TLS valid — pe HTTP simplu — se configurează în `/etc/containers/registries.conf.d/local.conf` cu `insecure = true`, însă în examen registrele au de obicei certificatul CA deja instalat pe mașini!).*

#### Comenzile Esențiale pentru Imagini și Registre (`podman` & `skopeo`)

```bash
# 1. Autentificarea la un registru de containere (salvează tokenul în $XDG_RUNTIME_DIR/containers/auth.json,
# sau cu --authfile ~/.config/containers/auth.json pentru persistență la reboot!):
podman login registry.lab.example.com

# 2. Căutarea unei imagini în registre:
podman search httpd

# 3. Inspectarea unei imagini direct în registrul remote FĂRĂ a o descărca pe disc (cu skopeo!):
skopeo inspect docker://registry.lab.example.com/ubi9/httpd-24

# 4. Descărcarea (pull), listarea imaginilor locale și inspectarea detaliilor (Porturi expuse, Variabile ENV!):
podman pull registry.lab.example.com/ubi9/httpd-24
podman images
podman inspect registry.lab.example.com/ubi9/httpd-24

# 5. Etichetarea (tag), trimiterea (push) în registru și ștergerea (rmi) unei imagini:
podman tag localhost/my_app:v1 registry.lab.example.com/devops/my_app:v1
podman push registry.lab.example.com/devops/my_app:v1
podman rmi localhost/my_app:v1
```

---

### 2.4. Construirea Imaginilor cu `Containerfile` (`podman build`) și Rularea cu Stocare Persistentă SELinux (`:Z`)

#### 1. Construirea unei Imagini din `Containerfile` / `Dockerfile` (`podman build -t`)
În examen ți se poate cere să descarci un `Containerfile` (sau să scrii unul scurt de 4 linii) și să construiești o imagine cu un nume și un tag exact:

```dockerfile
FROM registry.access.redhat.com/ubi9/ubi:latest
LABEL maintainer="student@lab.example.com"
RUN dnf install -y httpd && dnf clean all
ENV APP_ENV="PRODUCTION"
EXPOSE 80
CMD ["/usr/sbin/httpd", "-D", "FOREGROUND"]
```
Comanda de construire (**nu uita punctul `.` de la final**, care reprezintă directorul curent de context unde se află `Containerfile`!):
```bash
podman build -t my_custom_web:1.0 .
```

#### 2. Rularea Containerelor cu `podman run` — Disecția Tuturor Flag-urilor de Examen!

Să disecăm comanda completă `podman run` pe care o vei scrie în examenul EX200:

```bash
podman run -d \
    --name log_server \
    -p 8080:80 \
    -e MYSQL_ROOT_PASSWORD="secret" \
    -v /home/alison/web_data:/var/www/html:Z \
    registry.lab.example.com/ubi9/httpd-24
```

* **`-d` (`--detach`):** Pornește containerul în *background* (fără `-d`, terminalul tău rămâne blocat în container!).
* **`--name log_server`:** Setează numele exact cerut în enunțul examenului!
* **`-p 8080:80` (`--publish <Port_Host>:<Port_Container>`):** Mapează portul `8080` de pe mașina virtuală `node1` către portul `80` din interiorul containerului! *(Dacă uiți pe ce port intern ascultă imaginea — `80` sau `8080` — verifică ÎNTOTDEAUNA cu `podman inspect <imagine> | grep -i -A 5 exposedports`!)*
* **`-e VAR="valoare"` (`--env`):** Transmite o variabilă de mediu în interiorul containerului.
* **`-v /cale_host:/cale_container:Z` (`--volume` cu SELinux Relabeling!):**
  * **DE CE ESTE `:Z` (sau `:z`) OBLIGATORIU ÎN EXAMENUL EX200?**
    Când utilizatorul `alison` creează directorul `/home/alison/web_data` cu `mkdir -p`, acel director primește contextul SELinux **`user_home_t`**.
    Procesul din interiorul containerului rulează cu contextul SELinux **`container_t`**. Conform politicii SELinux din RHEL, un proces `container_t` **NU are voie să atingă fișiere `user_home_t`**!
    Când adaugi sufixul **`:Z`** la finalul volumului (`-v /home/alison/web_data:/var/www/html:Z`), Podman schimbă automat contextul SELinux al directorului `/home/alison/web_data` în **`container_file_t`** (cu categoria MCS privată a acelui container, iar cu `:z` mic îi pune o etichetă `container_file_t` partajabilă între mai multe containere)!

---

### 2.5. SUBIECTUL REGE ÎN EX200: Transformarea unui Container Rootless într-un Serviciu `systemd` care Pornește Automat la Boot!

În examenul RHCSA ți se cere ca un container (de obicei *rootless*, rulând sub un utilizator precum `alison` sau `natasha`) să fie gestionat prin `systemd` și să pornească automat la `reboot`, fără ca utilizatorul să se autentifice.

```mermaid
sequenceDiagram
    autonumber
    actor Root as Administrator (root pe node1)
    actor User as Utilizator Rootless (ssh alison@localhost)
    participant Podman as Motorul Podman (User Space)
    participant SystemdUser as systemd --user (~/.config/systemd/user/)
    participant Logind as systemd-logind (/var/lib/systemd/linger/alison)

    Root->>Logind: 1. Activează Linger: loginctl enable-linger alison<br/>(sau direct din contul alison: loginctl enable-linger)
    Note over Root,User: 2. CONECTARE OBLIGATORIE PRIN SSH (NU cu 'su -'!)<br/>ssh alison@localhost
    User->>Podman: 3. Creează dir cu mkdir -p & pornește containerul:<br/>podman run -d --name myweb -p 8080:8080 -v /home/alison/html:/var/www/html:Z ...
    User->>SystemdUser: 4. Creează dir: mkdir -p ~/.config/systemd/user && cd ~/.config/systemd/user
    User->>Podman: 5. Generează unitatea systemd:<br/>podman generate systemd --name myweb --files --new<br/>(sau creează Quadlet ~/.config/containers/systemd/myweb.container)
    User->>SystemdUser: 6. Activează serviciul la boot:<br/>systemctl --user daemon-reload<br/>systemctl --user enable --now container-myweb.service
    Note over Logind,SystemdUser: 7. LA REBOOT-UL DE NOTARE EX200:<br/>Datorită 'linger', systemd pornește automat instanța user@3501.service<br/>și ridică containerul myweb FĂRĂ ca alison să se logheze!
```

Ai la dispoziție **două metode oficiale** în RHEL 9 / RHEL 10 (ambele sunt 100% acceptate în examenul EX200, pentru că ambele produc un serviciu `systemd --user` activ la boot!):

#### Metoda #1 (Metoda Clasică și Universală în RHEL 8 / RHEL 9): `podman generate systemd --new`

Execută acești **7 Pași Exacți în Ordine** (nu sări niciunul!):

1. **Pasul 1 (Logarea corectă prin SSH ca utilizatorul cerut!):**
   Din terminalul lui `root`, conectează-te prin **`ssh`** pe `localhost` ca utilizatorul `alison`:
   ```bash
   ssh alison@localhost
   ```
2. **Pasul 2 (Pregătirea directorului de pe host și pornirea containerului):**
   ```bash
   mkdir -p /home/alison/web_data
   chmod 0777 /home/alison/web_data
   echo "Container Rootless EX200 OK" > /home/alison/web_data/index.html

   podman run -d --name log_server -p 8080:8080 \
       -v /home/alison/web_data:/var/www/html:Z \
       registry.lab.example.com/ubi9/httpd-24
   ```
   *(Verifică cu `podman ps` că rulează și cu `curl http://localhost:8080` că răspunde!)*
3. **Pasul 3 (Crearea directorului `~/.config/systemd/user/` și intrarea în el):**
   **Atenție:** Acest director nu există implicit! Trebuie să îl creezi tu:
   ```bash
   mkdir -p ~/.config/systemd/user
   cd ~/.config/systemd/user
   ```
4. **Pasul 4 (Generarea fișierului `.service` cu `podman generate systemd`):**
   ```bash
   podman generate systemd --name log_server --files --new
   ```
   * **Disecția celor 3 flag-uri vitale:**
     * `--name log_server`: Numele containerului pe care l-ai pornit la Pasul 2.
     * `--files`: Îi spune lui Podman să scrie direct pe disc fișierul **`container-log_server.service`** în directorul curent (`~/.config/systemd/user/`) în loc să îl afișeze pe ecran!
     * **`--new`:** **CEL MAI IMPORTANT FLAG!** Fără `--new`, unitatea generată face doar `podman start/stop` pe un container deja existent. Cu **`--new`**, la fiecare pornire a serviciului `systemd`, acesta șterge orice rămășiță veche și **recreează un container proaspăt de la zero** cu `podman run ...`, garantând că va porni impecabil după un `reboot` forțat!
5. **Pasul 5 (Oprirea și ștergerea containerului manual înainte de a lăsa `systemd` să îl preia!):**
   Deoarece am folosit `--new`, oprim și ștergem containerul pornit manual la Pasul 2, ca să nu intre în conflict de nume cu cel pe care îl va porni `systemd`:
   ```bash
   podman stop log_server
   podman rm log_server
   ```
6. **Pasul 6 (Reîncărcarea și activarea serviciului cu `systemctl --user`):**
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now container-log_server.service
   systemctl --user status container-log_server.service
   podman ps
   ```
7. **Pasul 7 (PASUL VITAL PENTRU REBOOT — Activarea `Linger` cu `loginctl`!):**
   În mod implicit în Linux, când utilizatorul `alison` dă `logout` din SSH (sau când serverul repornește și `alison` nu s-a logat încă), `systemd` oprește toate procesele utilizatorului `alison`!
   Pentru ca serviciile `systemctl --user` ale lui `alison` să **pornească automat la boot-ul serverului și să rămână vii după logout**, rulăm:
   ```bash
   loginctl enable-linger
   # (Sau de pe contul root: loginctl enable-linger alison)
   ```
   Verificăm că `Linger=yes` este activ rulând:
   ```bash
   loginctl show-user alison | grep Linger
   # Output obligatoriu: Linger=yes
   ```

---

#### Metoda #2 (Noua Arhitectură din RHEL 9.2+ / RHEL 10): `Podman Quadlets` (`~/.config/containers/systemd/*.container`)

Începând cu Podman 4.4+ (RHEL 9.2+ și RHEL 10), Red Hat a introdus **Podman Quadlets** (`man podman-systemd.unit`) ca succesor declarativ pentru `podman generate systemd`.
Cum funcționează un **Quadlet**?
În loc să pornești containerul și să generezi un fișier `.service` stufos de 60 de linii, scrii un fișier simplu de 8 linii cu extensia **`.container`** în directorul **`~/.config/containers/systemd/`** (pentru rootless) sau **`/etc/containers/systemd/`** (pentru root):

```ini
# Fișier: ~/.config/containers/systemd/log_server.container
[Unit]
Description=Quadlet Container Log Server

[Container]
ContainerName=log_server
Image=registry.lab.example.com/ubi9/httpd-24
PublishPort=8080:8080
Volume=/home/alison/web_data:/var/www/html:Z

[Install]
WantedBy=default.target
```
Când rulezi **`systemctl --user daemon-reload`**, generatorul Quadlet traduce automat acest fișier `.container` într-un serviciu `systemd` pe care îl pornești cu **`systemctl --user start log_server.service`** (la Quadlets, pornirea la boot este activată automat prin simpla prezență a secțiunii `[Install] WantedBy=default.target` + `loginctl enable-linger`!).
*(Sfat RHCA pentru EX200 pe RHEL 9: Dacă cerința îți cere explicit ca fișierul unității să se numească `container-<nume>.service` în `~/.config/systemd/user/`, folosește **Metoda #1 (`podman generate systemd --name <nume> --files --new`)**, care creează fizic fișierul exact cu acel nume în `~/.config/systemd/user/`!)*
:::

:::exam-alert
### 💀 Capcana Mortală #1: Folosirea `su - alison` în loc de `ssh alison@localhost`!
Aceasta este eroarea pe care o fac 80% dintre candidații care nu s-au antrenat:
Din terminalul lui `root`, ei tastează `su - alison`, apoi încearcă să ruleze `systemctl --user daemon-reload` și primesc eroarea:
`Failed to connect to bus: No medium found`!
De ce? Pentru că `su -` schimbă doar UID-ul, nu înregistrează o sesiune completă în `pam_systemd` / `systemd-logind`!
* **Regula de Aur:** Conectează-te **MEREU cu `ssh alison@localhost`**!

### 💀 Capcana Mortală #2: Pierderea Autentificării la Registru după Reboot (`auth.json` în `/run` vs. `~/.config`)!
Când rulezi `podman login registry.lab.example.com`, unde salvează Podman parola/token-ul?
Implicit, îl salvează în **`/run/user/<UID>/containers/auth.json`** — iar `/run` este în **memoria RAM (`tmpfs`)** și se șterge la reboot!
Dacă la reboot-ul de evaluare serviciul `systemd` încearcă să verifice sau să tragă imaginea dintr-un registru care cere autentificare, va eșua!
* **Trucul Secret RHCA:** După ce te-ai logat cu `podman login`, copiază fișierul de autentificare în locația **persistentă pe disc** (`~/.config/containers/auth.json`), sau loghează-te direct cu:
  ```bash
  mkdir -p ~/.config/containers
  podman login --authfile ~/.config/containers/auth.json registry.lab.example.com
  ```

### 🛠️ Man Page Hacks pentru Capitolul 5.1
Ai uitat în timpul examenului sintaxa pentru `podman generate systemd` sau pentru `Quadlets`?
Rulează:
```bash
man podman-generate-systemd
# sau pentru Quadlets:
man podman-systemd.unit
```
Ambele pagini au exemple complete gata de Copy-Paste!
:::

:::interview
### Întrebarea 1 (Nivel Mid -> Senior / DevOps & Kubernetes Engineer):
> **Intervievator:** *„Care este diferența exactă dintre flag-urile `:z` (z mic) și `:Z` (Z mare) atunci când montezi un volum de pe un host RHEL cu SELinux Enforcing într-un container Podman (`-v /host:/container:Z`)?”*

**Răspunsul Ideal:**
> „Când Podman pornește un container, îi alocă nu doar tipul SELinux `container_t`, ci și o pereche unică aleatoare de categorii **MCS (*Multi-Category Security*)**, de exemplu `s0:c124,c589`. Aceasta izolează containerele unele de altele: Containerul A (`s0:c124,c589`) nu poate citi volumele Containerului B (`s0:c300,c400`), chiar dacă ambele au tipul `container_file_t`!
> * **`:Z` (Z MARE — Private Unshared Label):** Reetichetează directorul de pe host cu tipul `container_file_t` **ȘI cu categoriile MCS exacte (`s0:c124,c589`) ale acelui singur container**! Doar acel container specific are voie să acceseze directorul.
> * **`:z` (z mic — Shared Label):** Reetichetează directorul de pe host cu tipul `container_file_t` și nivelul generic **`s0` (fără categorii MCS restrictive)**, permițând ca **mai multe containere diferite** să partajeze și să scrie simultan în același director de pe host!”
:::

:::lab
Conectează-te pe **`node1.lab.example.com`** și hai să parcurgem de la cap la coadă scenariul complet de examen EX200 pentru containere rootless cu utilizatorul `alison` (creat în Capitolul 1.1 cu parola `RedHatPass99!`):
:::

:::exam
Pune-ți cronometrul pe **20 de minute** și rezolvă pe **`node1.lab.example.com`**:

### Partea A: Cele 3 Task-uri Practice (Stil Oficial EX200)

1. **Task 1 (Construirea unei Imagini din `Containerfile`):**
   Sub contul utilizatorului **`alison`**, creați în `/home/alison/build_dir/Containerfile` un fișier care pornește de la imaginea `registry.access.redhat.com/ubi9/httpd-24`, setează variabila de mediu `PORTAL_ENV=EXAM_READY` și adaugă un fișier `/var/www/html/info.txt` (sau folosește imaginea de bază). Construiți din acest `Containerfile` o imagine numită **`portal_img:v1`**.
2. **Task 2 (Container Rootless cu Stocare Persistentă SELinux `:Z` și Port Mapping):**
   Sub contul utilizatorului **`alison`**, porniți un container numit **`web_portal`** folosind imaginea `portal_img:v1` (sau `registry.access.redhat.com/ubi9/httpd-24`):
   * Mapați portul **`8088`** de pe host la portul **`8080`** al containerului;
   * Montați directorul de pe host `/home/alison/site_content` la calea `/var/www/html` în interiorul containerului, configurat corespunzător pentru SELinux (`:Z`);
   * În `/home/alison/site_content/index.html` trebuie să se afle textul `PODMAN_ROOTLESS_SYSTEMD_OK`.
3. **Task 3 (Integrarea Containerului în `systemd` pentru Pornire Automată la Boot):**
   Configurați containerul `web_portal` să ruleze ca un serviciu `systemd` al utilizatorului `alison` numit **`container-web_portal.service`** (în `/home/alison/.config/systemd/user/`). Serviciul trebuie să pornească automat la repornirea sistemului (`reboot`) fără ca utilizatorul `alison` să se autentifice. Deschideți și portul `8088/tcp` în `firewalld` pe `node1`.
:::

:::solution
#### Rezolvarea Pas cu Pas a Task-urilor Practice (pe `node1`):

```bash
# 1. Ca root: deschidem portul 8088/tcp în firewalld și activăm linger pentru alison:
firewall-cmd --permanent --add-port=8088/tcp
firewall-cmd --reload
loginctl enable-linger alison

# 2. Ne conectăm prin SSH ca alison:
ssh alison@localhost

# În sesiunea lui alison:
mkdir -p /home/alison/build_dir /home/alison/site_content ~/.config/systemd/user
chmod 0777 /home/alison/site_content
echo "PODMAN_ROOTLESS_SYSTEMD_OK" > /home/alison/site_content/index.html

cat << 'EOF' > /home/alison/build_dir/Containerfile
FROM registry.access.redhat.com/ubi9/httpd-24
ENV PORTAL_ENV=EXAM_READY
EOF

podman build -t portal_img:v1 /home/alison/build_dir

podman run -d --name web_portal -p 8088:8080 -v /home/alison/site_content:/var/www/html:Z localhost/portal_img:v1

cd ~/.config/systemd/user
podman generate systemd --name web_portal --files --new
podman stop web_portal && podman rm web_portal

systemctl --user daemon-reload
systemctl --user enable --now container-web_portal.service
```

#### Scriptul de Verificare Automată (Grading Script pentru Capitolul 5.1 — rulat ca `root` pe `node1`)

```bash
#!/bin/bash
# ==============================================================================
# RHCSA (EX200) - Script Automat de Evaluare: Capitolul 5.1 (pe node1)
# ==============================================================================
SCORE=0
TOTAL=30

echo "========================================================"
echo " Evaluare Obiective Capitolul 5.1 (Podman) pe $(hostname)"
echo "========================================================"

# Verificare Task 1: Imaginea portal_img:v1 construită în contul lui alison
if su - alison -c "podman images" 2>/dev/null | grep -q "portal_img"; then
    echo "[ PASS ] Task 1: Imaginea portal_img:v1 a fost construită cu succes de utilizatorul alison (+10p)"
    SCORE=$((SCORE + 10))
else
    echo "[ FAIL ] Task 1: Imaginea portal_img:v1 nu există în depozitul rootless al lui alison (0p)"
fi

# Verificare Task 2: Containerul web_portal răspunde pe 8088 și /home/alison/site_content are container_file_t
if ls -ldZ /home/alison/site_content 2>/dev/null | grep -q "container_file_t" && \
   curl -s http://localhost:8088/index.html | grep -q "PODMAN_ROOTLESS_SYSTEMD_OK"; then
    echo "[ PASS ] Task 2: Containerul web_portal rulează cu volum SELinux (:Z) și răspunde pe portul 8088 (+10p)"
    SCORE=$((SCORE + 10))
else
    echo "[ FAIL ] Task 2: Containerul nu răspunde pe portul 8088 sau ai uitat flag-ul :Z pe volum (0p)"
fi

# Verificare Task 3: Serviciul container-web_portal.service + Linger=yes
if [[ -f /home/alison/.config/systemd/user/container-web_portal.service ]] && \
   loginctl show-user alison 2>/dev/null | grep -qx "Linger=yes"; then
    echo "[ PASS ] Task 3: Unitatea systemd ~/.config/systemd/user/container-web_portal.service și Linger=yes sunt active (+10p)"
    SCORE=$((SCORE + 10))
else
    echo "[ FAIL ] Task 3: Unitatea systemd lipsește sau ai uitat loginctl enable-linger alison (0p)"
fi

echo "--------------------------------------------------------"
echo " PUNCTAJ FINAL CAPITOLUL 5.1: $SCORE / $TOTAL"
echo "========================================================"
```
:::

:::references
1. **Cursul Oficial Red Hat RH134 (*Red Hat System Administration II*):**
   * Capitolul 13: *Run Containers* (Arhitectura OCI, `podman`, `skopeo`, `Containerfile`, Rootless Containers, volume persistente cu `:Z`, `podman generate systemd`, `Quadlets` și `loginctl enable-linger`).
2. **Documentația Oficială RHEL 9 / RHEL 10:**
   * *Building, running, and managing containers in Red Hat Enterprise Linux* (`docs.redhat.com`).
3. **Pagini de Manual (`man`) Esențiale din Sistem:**
   * `man 1 podman`, `man 1 podman-run`, `man 1 podman-build`, `man 5 Containerfile`
   * `man 1 podman-generate-systemd`, `man 5 podman-systemd.unit` (Quadlets)
   * `man 1 loginctl`, `man 1 skopeo`
:::
