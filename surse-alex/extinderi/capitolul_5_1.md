## architecture

### 2.6. Ciclul de Viață al unui Container: Comenzile de Zi cu Zi

`podman run` creează **și** pornește un container. După aceea, lucrezi cu el prin nume.

| Vrei să | Comandă |
| :--- | :--- |
| Vezi containerele pornite / toate, inclusiv cele oprite | `podman ps` / `podman ps -a` |
| Citești ce a afișat procesul din container | `podman logs web_portal` (cu `-f` urmărești în timp real) |
| Rulezi o comandă într-un container pornit | `podman exec web_portal cat /etc/os-release` |
| Deschizi un shell în container | `podman exec -it web_portal /bin/bash` |
| Oprești / pornești / repornești | `podman stop`, `podman start`, `podman restart` |
| Ștergi un container (cu `-f` și dacă rulează) | `podman rm -f web_portal` |
| Copiezi un fișier în sau din container | `podman cp index.html web_portal:/var/www/html/` |
| Vezi procesele din container | `podman top web_portal` |
| Vezi consumul de resurse | `podman stats --no-stream` |
| Vezi ce porturi sunt publicate | `podman port web_portal` |

Opțiunile `-it` înseamnă terminal interactiv; ai nevoie de ele ori de câte ori vrei să tastezi în container.

`podman inspect` întoarce tot ce se știe despre un container sau o imagine, în format JSON. Cu `--format` extragi un singur câmp:

```bash
# Adresa IP a containerului, comanda lui și volumele montate:
podman inspect web_portal --format '{{.NetworkSettings.IPAddress}}'
podman inspect web_portal --format '{{.Config.Cmd}}'
podman inspect web_portal --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'

# Ce porturi și ce utilizator declară o IMAGINE (util înainte de podman run):
podman inspect registry.access.redhat.com/ubi9/httpd-24 --format '{{.Config.ExposedPorts}} {{.Config.User}}'
```

Pentru încercări rapide, un container de unică folosință: `podman run --rm -it registry.access.redhat.com/ubi9/ubi /bin/bash`. Opțiunea `--rm` îl șterge automat la ieșire, deci nu rămân containere oprite în urmă.

Curățenie:

```bash
podman container prune     # șterge toate containerele oprite
podman image prune         # șterge imaginile fără etichetă, rămase de la construiri
podman system df           # cât spațiu ocupă imaginile, containerele și volumele
```

### 2.7. Volume Numite față de Directoare Montate

Capitolul folosește un director de pe gazdă montat în container (*bind mount*). Podman are și **volume numite**, pe care le administrează el însuși.

| | Director de pe gazdă | Volum numit |
| :--- | :--- | :--- |
| Sintaxă | `-v /home/alison/date:/var/lib/app:Z` | `-v date_app:/var/lib/app` |
| Unde stau datele | Unde alegi tu. | `~/.local/share/containers/storage/volumes/` (rootless). |
| SELinux | Ai nevoie de `:Z` sau `:z`. | Etichetat corect din oficiu. |
| Proprietar și permisiuni | Trebuie potrivite cu utilizatorul din container. | Rezolvate de Podman. |
| Când îl alegi | Vrei să editezi fișierele de pe gazdă; enunțul cere un anumit director. | Date ale aplicației (baze de date), fără acces direct de pe gazdă. |

```bash
podman volume create date_app
podman volume ls
podman volume inspect date_app --format '{{.Mountpoint}}'
podman run -d --name db -v date_app:/var/lib/mysql registry.redhat.io/rhel9/mariadb-105
podman volume rm date_app          # refuză dacă un container îl mai folosește
```

Opțiuni care se pot adăuga la un volum, separate prin virgulă: `:ro` (containerul doar citește), `:Z` și `:z` (etichete SELinux), `:U` (Podman schimbă proprietarul directorului de pe gazdă astfel încât să corespundă utilizatorului din container, alternativa comodă la `podman unshare chown`).

Datele scrise în container în afara unui volum dispar odată cu containerul. Regula de proiectare: containerul este de unică folosință, iar tot ce trebuie păstrat stă într-un volum.

### 2.8. Rețeaua Containerelor și Pod-urile

Un container rootless nu primește o adresă accesibilă din rețea. Ajungi la el doar prin **porturile publicate** cu `-p`.

| Formă | Efect |
| :--- | :--- |
| `-p 8080:80` | Portul 8080 de pe toate adresele gazdei duce la portul 80 din container. |
| `-p 127.0.0.1:8080:80` | La fel, dar accesibil doar de pe gazdă. |
| `-p 8080:80/udp` | Pentru UDP. |
| `-P` | Publică toate porturile declarate de imagine, pe porturi alese aleator. |

Pentru ca alte mașini să ajungă la serviciu, portul de pe gazdă trebuie deschis și în `firewalld`.

**Containere care vorbesc între ele.** Pe rețeaua implicită, containerele nu se găsesc după nume. Pe o rețea creată de tine, Podman oferă rezolvare de nume între containere:

```bash
podman network create retea_app
podman run -d --name db  --network retea_app -e MYSQL_ROOT_PASSWORD=secret registry.redhat.io/rhel9/mariadb-105
podman run -d --name web --network retea_app -p 8080:8080 registry.access.redhat.com/ubi9/httpd-24
# Din containerul 'web', baza de date este acum accesibilă la numele 'db', pe portul 3306.
podman network ls
podman network inspect retea_app
```

**Pod-urile.** Un *pod* este un grup de containere care împart aceeași rețea: se văd între ele pe `localhost`, iar porturile se publică la nivelul pod-ului. Este același concept ca în Kubernetes.

```bash
podman pod create --name app_pod -p 8080:8080
podman run -d --pod app_pod --name db  -e MYSQL_ROOT_PASSWORD=secret registry.redhat.io/rhel9/mariadb-105
podman run -d --pod app_pod --name web registry.access.redhat.com/ubi9/httpd-24
podman pod ps
podman pod stop app_pod && podman pod rm app_pod
```

### 2.9. Imagini: Etichete, Straturi, Transfer fără Registru și Instrucțiunile din `Containerfile`

Numele complet al unei imagini are patru părți: `registru/spațiu/nume:etichetă`, de exemplu `registry.access.redhat.com/ubi9/httpd-24:latest`. Dacă lipsește eticheta, se folosește `latest`, care este doar un nume convențional și **nu** garantează cea mai nouă versiune. Pentru reproductibilitate se folosește o etichetă de versiune.

```bash
podman images                              # imaginile locale
podman history localhost/portal_img:v1     # straturile imaginii și instrucțiunea care a creat fiecare strat
podman rmi localhost/portal_img:v1         # șterge imaginea (refuză dacă un container o folosește)
podman pull --tls-verify=false registru.local:5000/app:1.0    # registru de laborator, fără certificat valid
```

**Mutarea unei imagini fără registru.** Util când mașina țintă nu are acces la rețea:

```bash
podman save -o /tmp/portal_img.tar localhost/portal_img:v1    # imaginea, într-o arhivă
scp /tmp/portal_img.tar alison@node2:/tmp/
podman load -i /tmp/portal_img.tar                            # pe mașina țintă
```

În modul rootless, fiecare utilizator are propriul depozit de imagini. O imagine construită de `root` nu este vizibilă lui `alison` și invers. Perechea `save` și `load` este și metoda de a trece o imagine de la un utilizator la altul.

**Instrucțiunile unui `Containerfile`:**

| Instrucțiune | Rol |
| :--- | :--- |
| `FROM` | Imaginea de bază. Prima instrucțiune. |
| `RUN` | Rulează o comandă **la construire** și salvează rezultatul ca strat nou. |
| `COPY` | Copiază fișiere din directorul de construire în imagine. |
| `ADD` | Ca `COPY`, dar poate dezarhiva un `.tar` și poate aduce de la o adresă web. Preferă `COPY` când nu ai nevoie de asta. |
| `ENV` | Variabilă de mediu, valabilă și la construire, și la rulare. |
| `WORKDIR` | Directorul curent pentru instrucțiunile următoare și pentru procesul containerului. |
| `USER` | Utilizatorul sub care rulează instrucțiunile următoare și containerul. |
| `EXPOSE` | Documentează portul pe care ascultă aplicația. **Nu** publică nimic; publicarea se face cu `-p`. |
| `VOLUME` | Declară o cale destinată datelor persistente. |
| `CMD` | Comanda implicită la pornire; poate fi înlocuită la `podman run imagine altă_comandă`. |
| `ENTRYPOINT` | Programul fix al containerului; argumentele din `CMD` sau din linia de comandă i se adaugă. |
| `LABEL` | Metadate (autor, versiune). |

Fiecare `RUN`, `COPY` și `ADD` creează un **strat**. La o nouă construire, straturile neschimbate sunt refolosite din cache. De aceea instrucțiunile care se schimbă rar (instalarea pachetelor) se pun primele, iar copierea codului la sfârșit, și tot de aceea instalarea și curățenia se scriu în același `RUN` (`dnf install -y httpd && dnf clean all`): altfel fișierele șterse rămân în stratul anterior și imaginea nu se micșorează.

`podman build` caută implicit un fișier numit `Containerfile` (sau `Dockerfile`) în directorul dat. Dacă fișierul are alt nume, îl indici cu `-f`: `podman build -t app:1.0 -f /cale/Fișier.build /cale/context`.

### 2.10. Quadlet în Detaliu și Depanarea Serviciilor de Container

Fișierul `.container` din secțiunea 2.5 acceptă în secțiunea `[Container]` echivalentul opțiunilor din `podman run`:

| Cheie Quadlet | Echivalentul din `podman run` |
| :--- | :--- |
| `Image=` | Numele imaginii. |
| `ContainerName=` | `--name` |
| `PublishPort=8080:8080` | `-p` |
| `Volume=/cale:/cale:Z` | `-v` |
| `Environment=CHEIE=valoare` | `-e` |
| `Network=retea_app` | `--network` |
| `Exec=` | Comanda de după numele imaginii. |
| `AutoUpdate=registry` | Permite actualizarea automată a imaginii cu `podman auto-update`. |

În secțiunea `[Service]` pui directive `systemd` obișnuite, de exemplu `Restart=always`.

Două diferențe față de un serviciu obișnuit. Numele serviciului vine din numele fișierului: `log_server.container` produce `log_server.service`, nu `container-log_server.service`. Iar unitatea este **generată**, deci nu se activează cu `systemctl --user enable`: pornirea la boot vine din secțiunea `[Install]` a fișierului, împreună cu `loginctl enable-linger`.

```bash
systemctl --user daemon-reload                 # regenerează serviciile din fișierele .container
systemctl --user start log_server.service
systemctl --user status log_server.service

# Dacă serviciul nu apare după daemon-reload, generatorul îți spune ce nu îi place în fișier:
/usr/libexec/podman/quadlet --dryrun --user
```

Pe versiunile noi de Podman, `podman generate systemd` este marcat ca depreciat în favoarea Quadlet, dar există și funcționează în continuare. Dacă enunțul cere explicit un fișier `container-<nume>.service`, folosești `podman generate systemd`.

**Depanarea unui serviciu de container, în ordine:**

```bash
systemctl --user status container-web_portal.service        # starea și ultimele linii din jurnal
journalctl --user -u container-web_portal.service -n 50     # jurnalul serviciului
podman ps -a                                                # există containerul? cu ce cod a ieșit?
podman logs web_portal                                      # ce a spus aplicația din container
loginctl show-user alison -p Linger                         # va porni la boot?
```

## exam-alert

### ⚠️ Capcană în plus: `:Z` pus pe un director prea mare
`:Z` reetichetează **recursiv** tot directorul de pe gazdă cu `container_file_t`. Dacă montezi din grabă `-v /home/alison:/date:Z`, întregul director home își schimbă eticheta: cheile din `~/.ssh` nu mai sunt acceptate de `sshd`, iar autentificarea utilizatorului se strică. Montează întotdeauna un **subdirector dedicat** (`/home/alison/site_content`). Dacă ai făcut greșeala, repari cu `restorecon -Rv /home/alison`.

### ⚠️ Capcană în plus: Numele containerului este deja folosit
La a doua încercare, `podman run --name web_portal ...` eșuează cu *the container name "web_portal" is already in use*, pentru că prima încercare a lăsat în urmă un container, chiar dacă oprit. `podman ps` nu îl arată; `podman ps -a` da. Îl ștergi cu `podman rm -f web_portal` înainte să încerci din nou. Aceeași situație face ca serviciul `systemd` generat cu `--new` să nu pornească dacă ai uitat să ștergi containerul creat manual.

## interview

### Întrebare în plus (Nivel Mid):
> **Intervievator:** *„Pornești un container cu `podman run -d imaginea_mea`. Comanda afișează un identificator, dar `podman ps` nu arată nimic: containerul s-a oprit imediat. Cum afli de ce și care sunt cauzele obișnuite?”*

**Răspunsul Ideal:**
> „Un container trăiește exact cât trăiește **procesul lui principal**, cel pornit de `CMD` sau `ENTRYPOINT`. Când procesul se termină, containerul se oprește. Nu există un «sistem» care să rămână pornit în fundal, ca la o mașină virtuală.
>
> Întâi mă uit la urme: `podman ps -a` îmi arată containerul oprit și codul de ieșire în coloana `STATUS`, de exemplu `Exited (1)`. Apoi `podman logs <nume>` îmi arată ce a scris procesul înainte să moară, iar acolo este de obicei și răspunsul.
>
> Cauzele obișnuite, după codul de ieșire. **Cod 0:** procesul și-a terminat treaba cu succes. Se întâmplă când comanda implicită este un shell (`/bin/bash`) pornit fără terminal, care iese imediat, sau când serviciul se mută singur în fundal, ca un daemon clasic, și procesul inițial se încheie. Soluția este ca aplicația să ruleze în prim-plan, de exemplu `httpd -D FOREGROUND`. **Cod 1 sau alt cod de eroare:** aplicația a pornit și a eșuat; jurnalul arată de obicei o variabilă de mediu obligatorie lipsă (imaginile de baze de date cer parola de administrator), un fișier de configurare greșit sau un `Permission denied` pe un volum, adică lipsește `:Z` ori proprietarul directorului nu corespunde utilizatorului din container. **Cod 125, 126 sau 127:** Podman nu a putut porni containerul, comanda nu este executabilă, respectiv comanda nu există în imagine. **Cod 137:** procesul a fost omorât cu `SIGKILL`, de obicei din cauza limitei de memorie.
>
> Dacă jurnalul nu este suficient, pornesc aceeași imagine interactiv, cu un shell în locul comenzii implicite: `podman run --rm -it --entrypoint /bin/bash imaginea_mea`. Din interior rulez manual comanda de pornire și văd eroarea direct.”
