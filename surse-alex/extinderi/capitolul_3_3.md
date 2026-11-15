## architecture

### 2.4. Opțiunile de Montare NFS și Cum Vezi Ce S-a Negociat de Fapt

La montare, clientul și serverul NFS negociază versiunea protocolului și mai mulți parametri. Ce scrii în `/etc/fstab` sau într-o hartă `autofs` este cererea; ce s-a stabilit efectiv vezi după montare.

| Opțiune | Efect |
| :--- | :--- |
| `rw` / `ro` | Citire și scriere / doar citire. Dreptul efectiv este cel mai restrictiv dintre client și server. |
| `vers=4.2` (sau `nfsvers=4.2`) | Forțează o anumită versiune. Fără ea, clientul încearcă cea mai nouă versiune suportată de ambele părți. |
| `sync` / `async` | Scrierile sunt confirmate după ce ajung pe server / pot fi amânate în cache-ul clientului. |
| `hard` / `soft` | Reîncearcă la nesfârșit / renunță cu eroare (vezi întrebarea de interviu a capitolului). |
| `timeo=600` | Timpul de așteptare înainte de reîncercare, în zecimi de secundă. |
| `noexec`, `nosuid` | Ca la orice sistem de fișiere; recomandate pe partajări în care scriu mulți utilizatori. |
| `sec=sys` | Autentificare bazată pe UID-ul numeric (implicit). `sec=krb5`, `krb5i`, `krb5p` folosesc Kerberos. |
| `_netdev` | Montarea așteaptă rețeaua (doar în `/etc/fstab`). |

```bash
# Opțiunile EFECTIVE ale fiecărei montări NFS, inclusiv versiunea negociată și adresa serverului:
nfsstat -m

# Doar montările NFS, cu sursa și opțiunile:
findmnt -t nfs4

# Ce versiuni oferă serverul (rulat pe server):
cat /proc/fs/nfsd/versions
```

Dacă `nfsstat -m` arată `vers=3` când te așteptai la 4.2, serverul sau un firewall dintre voi nu permite NFSv4, iar clientul a coborât singur la versiunea 3, care are nevoie și de `rpcbind` și `mountd`.

### 2.5. Cine Ești pe Server: UID-uri, `root_squash` și Proprietarul `nobody`

Cu autentificarea implicită (`sec=sys`), serverul NFS **are încredere în UID-ul numeric** trimis de client. Nu verifică parole și nu compară nume. De aici vin cele mai multe probleme de permisiuni pe NFS.

| Situație | Ce vezi | Cauza |
| :--- | :--- | :--- |
| `natasha` are UID 1001 pe client și 1005 pe server | Nu își poate modifica propriile fișiere, sau le vede ca aparținând altcuiva. | Serverul aplică permisiunile pentru UID 1001, care acolo este alt utilizator. |
| `root` de pe client nu poate scrie, deși exportul este `rw` | `Permission denied` la `touch`. | `root_squash`: `root` devine `nobody` pe server. |
| Toate fișierele apar cu proprietarul `nobody` | `ls -l` arată `nobody nobody`. | La NFSv4, numele sunt trimise ca `utilizator@domeniu`; domeniul diferă între client și server. |

Pentru primul caz, soluția este ca utilizatorii să aibă **același UID** pe toate sistemele. De aceea laboratorul capitolului creează `remoteuser1` cu `-u 4001` pe ambele noduri; în companii, asta se rezolvă cu un director central de identități.

Pentru al treilea caz, verifici că domeniul NFSv4 este același pe client și pe server:

```bash
# Domeniul folosit pentru maparea numelor (implicit: domeniul DNS al mașinii):
grep -i "^Domain" /etc/idmapd.conf
nfsidmap -d
```

Pe lângă permisiuni, SELinux mai pune o condiție pe client, prin boolean-uri:

| Boolean | Ce permite |
| :--- | :--- |
| `use_nfs_home_dirs` | Directoare home aflate pe NFS (autentificare, citirea fișierelor de profil). |
| `httpd_use_nfs` | Serverul web poate servi conținut de pe o partajare NFS. |
| `virt_use_nfs` | Mașinile virtuale își pot ține discurile pe NFS. |

Iar pe server: `nfs_export_all_rw` și `nfs_export_all_ro` (active implicit) permit exportul oricărui director.

### 2.6. `autofs` în Detaliu: Timeout, Fișierul de Configurare și Depanare

**Timpul de demontare.** Cele 5 minute de inactivitate vin din `/etc/autofs.conf` (`timeout = 300`). Poți schimba valoarea global, acolo, sau doar pentru un punct de montare, în fișierul master:

```text
# /etc/auto.master.d/exam.autofs
/rhome   /etc/auto.rhome   --timeout=60
```

**Directoarele „fantomă”.** Implicit, `ls /rhome` arată gol până când cineva accesează un subdirector. Cu `browse_mode = yes` în `/etc/autofs.conf` (sau `--ghost` pe linia din master), `autofs` creează dinainte directoare goale pentru cheile cunoscute, ca utilizatorii să vadă ce există. Nu funcționează cu wildcard-ul `*`, pentru că acolo `autofs` nu are de unde ști numele.

**Ce cere repornire și ce nu:**

| Ai modificat | Ce trebuie făcut |
| :--- | :--- |
| Un fișier de mapare (`/etc/auto.rhome`, `/etc/auto.direct`), la o hartă **indirectă** | Nimic: harta este recitită la următoarea accesare. |
| Fișierul master (`/etc/auto.master.d/*.autofs`) | `systemctl reload autofs` |
| O hartă **directă** (ai adăugat sau ai scos o cale) | `systemctl reload autofs` |
| `/etc/autofs.conf` | `systemctl restart autofs` |

`reload` păstrează montările active. `restart` încearcă să le demonteze și poate eșua dacă sunt folosite.

**Depanare, în ordine:**

```bash
# 1. Ce hărți a înțeles autofs din fișierele tale (cea mai rapidă verificare):
automount -m

# 2. Serverul chiar exportă ce crezi? Montare manuală, fără autofs:
mount -t nfs4 192.168.122.102:/rhome/remoteuser1 /mnt && ls /mnt && umount /mnt

# 3. Ce spune autofs când accesezi directorul:
journalctl -u autofs -f        # într-un terminal
ls /rhome/remoteuser1          # în altul

# 4. Mod de depanare detaliat (oprește întâi serviciul):
systemctl stop autofs
automount -f -v
```

Pasul 2 este cel mai important: dacă montarea manuală nu merge, problema este la rețea, la firewall sau la export, nu la `autofs`.

**Alte forme de hărți**, pe care le vei întâlni în documentație:

```text
# Mai multe chei explicite într-o hartă indirectă:
proiecte   -rw,sync        server:/srv/proiecte
arhiva     -ro             server:/srv/arhiva

# Tipul sistemului de fișiere, precizat explicit:
date       -fstype=nfs4,rw server:/srv/date

# Harta specială -hosts: orice export al oricărui server, sub /net/<server>/<cale>
/net       -hosts
```

### 2.7. Alternativa fără `autofs`: Montare la Cerere prin `systemd`

`systemd` poate face singur montare la cerere, direct din `/etc/fstab`, cu două opțiuni:

```text
server:/srv/nfs_public  /mnt/public_docs  nfs4  _netdev,noauto,x-systemd.automount,x-systemd.idle-timeout=60  0 0
```

| Opțiune | Efect |
| :--- | :--- |
| `noauto` | Nu se montează la boot. |
| `x-systemd.automount` | `systemd` montează la prima accesare a directorului. |
| `x-systemd.idle-timeout=60` | Demontează după 60 de secunde de inactivitate. |

După editare: `systemctl daemon-reload` și `systemctl restart remote-fs.target`. Avantajul este că nu mai instalezi nimic. Limita este că nu există wildcard-uri: pentru directoare home ale unui număr necunoscut de utilizatori, `autofs` rămâne soluția. Dacă enunțul de examen cere explicit `autofs`, folosește `autofs`.

### 2.8. Partea de Server: Exporturi Modulare, Verificare și Firewall

```bash
exportfs -v                 # ce este exportat ACUM, cu toate opțiunile efective (inclusiv cele implicite)
exportfs -ra                # reaplică /etc/exports după o modificare
exportfs -u 192.168.122.0/24:/srv/nfs_public    # retrage temporar un export
exportfs -o rw,sync 192.168.122.101:/srv/test   # adaugă un export temporar, fără să editezi fișiere
```

`exportfs -v` este verificarea de încredere: arată și opțiunile pe care nu le-ai scris tu, de exemplu `root_squash` și `sec=sys`. Dacă un client primește `access denied by server`, compară adresa lui cu ce arată această comandă.

Pe lângă `/etc/exports`, serverul citește și fișierele `*.exports` din `/etc/exports.d/`, ceea ce permite ca fiecare aplicație să își aducă propriul fișier.

În `/etc/exports`, clientul se poate scrie în mai multe feluri:

| Formă | Exemplu |
| :--- | :--- |
| Un singur host | `node1.lab.example.com` sau `192.168.122.101` |
| O rețea | `192.168.122.0/24` |
| Un domeniu, cu wildcard | `*.lab.example.com` |
| Oricine | `*` |

Firewall-ul de pe server: pentru NFSv4 este suficient serviciul `nfs` (portul 2049/tcp). Serviciile `rpc-bind` și `mountd` sunt necesare doar pentru NFSv3 și pentru ca `showmount -e` să funcționeze de pe clienți. De aceea un `showmount -e` care eșuează nu înseamnă neapărat că NFSv4 nu merge: testul sigur rămâne montarea manuală.

## exam-alert

### ⚠️ Capcană în plus: Ai testat ca `root`, dar enunțul vorbește despre utilizator
`ls /rhome/remoteuser1` rulat ca `root` poate reuși sau eșua din motive care nu au legătură cu ce verifică examenul (`root_squash`, permisiunile directorului). Testează întotdeauna **ca utilizatorul din enunț**: `su - remoteuser1`, apoi `pwd` (trebuie să fie directorul lui home, fără mesajul *could not chdir to home directory*) și `touch test && rm test`, ca să confirmi că poate scrie.

### ⚠️ Capcană în plus: Directorul părinte al unei hărți indirecte avea deja conținut
Când `autofs` preia `/rhome`, tot ce exista local în acel director devine invizibil cât timp serviciul rulează. Dacă un enunț îți cere o hartă indirectă pe un director care conține deja date locale (de exemplu `/home`), utilizatorii locali își pierd accesul la directoarele home. În acest caz se folosește fie alt director părinte, fie o hartă directă pentru căile individuale.

## interview

### Întrebare în plus (Nivel Mid -> Senior):
> **Intervievator:** *„După ce echipa de stocare a făcut o mentenanță pe serverul NFS, pe mai mulți clienți comenzile `ls` și `df` pe partajare răspund cu `Stale file handle`. Rețeaua merge, serverul răspunde. Ce înseamnă eroarea și cum o rezolvi?”*

**Răspunsul Ideal:**
> „Clientul NFS nu lucrează cu nume de fișiere, ci cu **file handle-uri**: identificatori opaci primiți de la server, care indică un anumit obiect de pe un anumit sistem de fișiere exportat. `Stale file handle` (`ESTALE`) înseamnă că handle-ul pe care clientul îl ține în memorie nu mai corespunde cu nimic pe server.
>
> Cauzele tipice după o mentenanță: directorul exportat a fost șters și recreat (același nume, alt inode), sistemul de fișiere a fost restaurat sau reformatat, exportul a fost mutat pe alt volum, ori a fost schimbat identificatorul exportului (`fsid`). Din punctul de vedere al clientului, obiectul pe care îl avea montat a dispărut, chiar dacă la aceeași cale există acum altceva.
>
> Rezolvarea este să obțin handle-uri noi, adică să demontez și să montez din nou. Întâi ies cu toate procesele din partajare, apoi `umount /mnt/share`. Dacă demontarea refuză, folosesc `umount -f` sau, în ultimă instanță, `umount -l`, și remontez cu `mount -a`. La montările prin `autofs` este suficient ca partajarea să fie demontată, după care se reface singură la următoarea accesare. Procesele care au rămas cu directorul curent în vechea montare trebuie repornite.
>
> Ca prevenție, pe server exporturile primesc un `fsid=` fix în `/etc/exports`, ca identificatorul să nu depindă de numărul dispozitivului, care se poate schimba la reboot sau la mutarea pe alt disc. Iar operațiile de pe server care recreează directoare exportate se anunță clienților, pentru că le cer o remontare.”
