## architecture

### 2.6. Cum Citești Ieșirea lui `nmcli`: Ce Este Configurat față de Ce Este Activ

`nmcli connection show <nume>` afișează peste o sută de linii. Cheia de citire este **litera cu care începe numele câmpului**:

| Câmpuri | Ce reprezintă | Exemplu |
| :--- | :--- | :--- |
| Cu litere mici (`ipv4.addresses`, `ipv4.dns`) | Ce este **scris în profil**, pe disc. | `ipv4.addresses: 192.168.122.101/24` |
| Cu litere MARI (`IP4.ADDRESS[1]`, `IP4.DNS[1]`) | Ce este **activ acum** pe interfață. | `IP4.ADDRESS[1]: 192.168.122.50/24` |

Dacă cele două diferă, ai modificat profilul cu `nmcli con mod`, dar nu l-ai reactivat cu `nmcli con up`. Este cea mai rapidă metodă de a prinde greșeala descrisă la Capcana #1 a capitolului.

```bash
# Doar câmpurile care te interesează, din profil:
nmcli -f ipv4.method,ipv4.addresses,ipv4.gateway,ipv4.dns,connection.autoconnect con show "enp1s0"

# Doar ce este activ pe dispozitiv:
nmcli -f IP4 device show enp1s0

# Format scurt, pentru scripturi (-t = fără antet, -g = doar valoarea):
nmcli -g ipv4.addresses con show "enp1s0"
```

Alte operații pe conexiuni și dispozitive:

| Comandă | Ce face |
| :--- | :--- |
| `nmcli con down "nume"` / `nmcli con up "nume"` | Dezactivează / activează un profil. |
| `nmcli con delete "nume"` | Șterge profilul (și fișierul `.nmconnection`). |
| `nmcli con clone "nume" "copie"` | Copiază un profil, ca punct de plecare pentru altul. |
| `nmcli device reapply enp1s0` | Aplică modificările din profil fără să întrerupă conexiunea. |
| `nmcli device disconnect enp1s0` | Oprește interfața și o împiedică să se reconecteze singură. |
| `nmcli general hostname` | Afișează hostname-ul (cu un argument, îl schimbă). |
| `nmcli con mod "nume" ipv4.ignore-auto-dns yes` | Ignoră serverele DNS primite prin DHCP și le folosește doar pe cele din profil. |

Ultima linie rezolvă o situație frecventă: ai setat `ipv4.dns`, dar în `/etc/resolv.conf` apare în continuare, pe primul loc, serverul primit de la DHCP.

### 2.7. IPv6 cu `nmcli`

Obiectivele examenului cer configurarea adreselor IPv4 **și** IPv6. Sintaxa este aceeași, cu `ipv6` în loc de `ipv4`:

```bash
nmcli con mod "enp1s0" ipv6.method manual \
    ipv6.addresses fd00:122::101/64 \
    ipv6.gateway fd00:122::1 \
    ipv6.dns fd00:122::10
nmcli con up "enp1s0"

ip -6 addr show enp1s0        # adresele IPv6 ale interfeței
ip -6 route                   # tabela de rutare IPv6
ping -6 -c 3 fd00:122::1      # test de conectivitate
```

Ce trebuie să știi despre adresele IPv6:

| Noțiune | Explicație |
| :--- | :--- |
| Scriere prescurtată | Zerourile de la începutul unui grup se omit, iar un singur șir de grupuri nule se înlocuiește cu `::`. `fd00:0122:0000:0000:0000:0000:0000:0101` devine `fd00:122::101`. |
| Prefix | `/64` este prefixul obișnuit al unei rețele locale, echivalentul lui `/24` din IPv4. |
| Adresa *link-local* | Fiecare interfață are automat o adresă care începe cu `fe80::`, valabilă doar în rețeaua locală. La `ping` trebuie precizată interfața: `ping -6 fe80::1%enp1s0`. |
| Metode | `auto` (SLAAC, din anunțurile routerului), `dhcp`, `manual`, `disabled` (oprește IPv6 pe acel profil), `link-local`. |

În `/etc/hosts`, o adresă IPv6 se scrie la fel ca una IPv4: adresa, apoi numele. În adrese web și la `scp`, adresa se pune între paranteze drepte: `http://[fd00:122::101]:8080/`.

### 2.8. Diagnosticarea Rețelei Strat cu Strat

Când „nu merge rețeaua”, mergi de jos în sus și te oprești la primul strat care eșuează:

| Pas | Întrebare | Comandă | Dacă eșuează |
| :---: | :--- | :--- | :--- |
| 1 | Interfața este pornită și are adresă? | `ip -br addr` | Profil inactiv, `autoconnect` oprit, cablu sau interfață virtuală deconectată. |
| 2 | Ajung la gateway? | `ping -c 3 192.168.122.1` | Adresă sau mască greșită (de exemplu `/32`). |
| 3 | Există rută implicită? | `ip route` | Lipsește `ipv4.gateway`. |
| 4 | Ajung la o adresă din afara rețelei mele? | `ping -c 3 <adresă IP>` | Rutare sau firewall pe drum; `tracepath <adresă>` arată unde se oprește. |
| 5 | Funcționează rezolvarea numelor? | `getent hosts nume` | `/etc/hosts`, `/etc/resolv.conf`, serverul DNS. |
| 6 | Răspunde portul serviciului? | `nc -zv nume 22` | Serviciu oprit sau firewall pe server. |
| 7 | Răspunde corect aplicația? | `curl -I http://nume/` | Configurarea serviciului, SELinux. |

`nc` vine din pachetul `nmap-ncat`. Fără el, poți testa un port direct din Bash: `timeout 3 bash -c '</dev/tcp/node2/22' && echo deschis`.

Pentru DNS, două unelte din pachetul `bind-utils`:

```bash
dig +short node2.lab.example.com          # doar răspunsul
dig @192.168.122.10 node2.lab.example.com # întreabă un anumit server DNS
dig -x 192.168.122.102 +short             # rezolvare inversă: adresă -> nume
host node2.lab.example.com                # variantă mai scurtă
```

Diferența dintre mesajele de eroare îți spune singură unde este problema: *Connection refused* înseamnă că ai ajuns la mașină, dar nimic nu ascultă pe acel port; *No route to host* vine de obicei de la un firewall care respinge activ; *Connection timed out* înseamnă că pachetele se pierd pe drum sau sunt aruncate fără răspuns.

### 2.9. SSH în Detaliu: Fișierul Clientului, Permisiuni și Modificarea Sigură a Serverului

**Fișierul `~/.ssh/config`** îți scurtează comenzile:

```text
Host node2
    HostName node2.lab.example.com
    User root
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

De acum, `ssh node2` înseamnă `ssh -i ~/.ssh/id_ed25519 root@node2.lab.example.com`, iar scurtătura merge și la `scp` și `rsync`.

**Permisiunile sunt verificate.** `sshd` refuză autentificarea cu cheie dacă fișierele sunt prea permisive (opțiunea `StrictModes`), fără niciun mesaj clar către client:

| Cale | Permisiuni cerute |
| :--- | :--- |
| Directorul home al utilizatorului | Fără drept de scriere pentru grup sau pentru ceilalți. |
| `~/.ssh` | `0700` |
| `~/.ssh/authorized_keys` | `0600` |
| Cheia privată (`~/.ssh/id_ed25519`) | `0600` |

Când autentificarea cu cheie nu merge și cade pe parolă, verifici întâi permisiunile, apoi contextul SELinux (`restorecon -Rv ~/.ssh`), apoi jurnalul serverului (`journalctl -u sshd -n 20`). De pe client, `ssh -v` arată pas cu pas ce chei sunt încercate.

**Modificarea configurării serverului fără să te încui pe dinafară:**

```bash
# 1. Pune modificarea într-un fișier drop-in, nu în fișierul principal:
echo "PasswordAuthentication no" > /etc/ssh/sshd_config.d/01-fara-parole.conf

# 2. Verifică sintaxa ÎNAINTE de a reîncărca serviciul:
sshd -t

# 3. Vezi valoarea efectivă, după toate fișierele citite:
sshd -T | grep -i passwordauthentication

# 4. Reîncarcă și testează dintr-o A DOUA fereastră, fără să o închizi pe prima:
systemctl reload sshd
```

Două detalii specifice RHEL 9 și 10. În `sshd_config` câștigă **prima** apariție a unei directive, iar fișierele din `/etc/ssh/sshd_config.d/` sunt citite în ordine alfabetică, înaintea restului fișierului principal: un fișier `01-...` are prioritate față de `50-redhat.conf`. Iar valoarea implicită pentru `PermitRootLogin` este `prohibit-password`, adică `root` se poate conecta doar cu cheie.

Alte directive utile: `AllowUsers natasha harry` (doar acești utilizatori se pot conecta), `AllowGroups sysadmins`, `MaxAuthTries 3`, `ClientAliveInterval 300`.

**Cheia serverului s-a schimbat.** După reinstalarea unui server, `ssh` refuză conexiunea cu avertismentul *REMOTE HOST IDENTIFICATION HAS CHANGED*. Dacă știi că schimbarea este legitimă, ștergi vechea amprentă cu `ssh-keygen -R node2.lab.example.com` și te conectezi din nou.

### 2.10. `chrony`: Verificări Suplimentare și Corecția Imediată a Ceasului

```bash
chronyc tracking          # diferența față de sursă, stratum-ul, dacă ceasul e sincronizat
chronyc sources -v        # sursele, cu legenda simbolurilor
chronyc sourcestats       # stabilitatea fiecărei surse
timedatectl               # 'System clock synchronized: yes' și 'NTP service: active'
```

În `chronyc tracking`, liniile de urmărit sunt `Reference ID` (sursa folosită), `Stratum` (distanța față de un ceas de referință; `0` înseamnă nesincronizat) și `System time` (cu cât diferă ceasul local).

| Directivă în `/etc/chrony.conf` | Rol |
| :--- | :--- |
| `server <adresă> iburst` | O singură sursă de timp. |
| `pool <nume> iburst` | Un nume care se rezolvă la mai multe servere; `chrony` le folosește pe toate. |
| `makestep 1.0 3` | La primele 3 actualizări, dacă diferența depășește o secundă, ceasul este corectat brusc. |
| `allow 192.168.122.0/24` | Sistemul devine el însuși server NTP pentru acea rețea. |
| `driftfile /var/lib/chrony/drift` | Unde reține cu cât „fuge” ceasul local. |

După primele actualizări, `chrony` corectează ceasul doar treptat. Dacă ceasul este greșit cu ore și vrei corecția pe loc, o ceri explicit:

```bash
chronyc makestep
```

Fusul orar nu are legătură cu sincronizarea: NTP lucrează în UTC, iar fusul orar hotărăște doar cum este **afișată** ora. Un server cu fus orar greșit și ceas sincronizat arată ora „greșită”, dar funcționează corect.

## exam-alert

### ⚠️ Capcană în plus: Două profiluri pentru aceeași interfață
Dacă ai creat un profil nou cu `nmcli con add` pe o interfață care avea deja unul (de exemplu `Wired connection 1`), ambele au `autoconnect yes`. La reboot, `NetworkManager` poate activa profilul vechi, cu DHCP, iar adresa ta statică „dispare”. Verifică cu `nmcli con show` că interfața are un singur profil. Pe cel nedorit îl ștergi (`nmcli con delete`) sau îi oprești pornirea automată (`connection.autoconnect no`).

### ⚠️ Capcană în plus: Mai multe valori într-o singură proprietate
Două servere DNS sau două adrese se dau **între ghilimele, separate prin virgulă sau spațiu**: `nmcli con mod "enp1s0" ipv4.dns "192.168.122.10,8.8.8.8"`. Dacă rulezi comanda de două ori, fără `+`, a doua valoare o **înlocuiește** pe prima. Verifică rezultatul cu `nmcli -g ipv4.dns con show "enp1s0"`.

## interview

### Întrebare în plus (Nivel Mid):
> **Intervievator:** *„Conectarea prin SSH la un server durează 20–30 de secunde înainte să apară promptul pentru parolă. După autentificare, totul merge repede. Ce cauze verifici?”*

**Răspunsul Ideal:**
> „Întârzierea apare **înaintea** autentificării, deci nu este vorba despre încărcarea serverului sau despre fișierele de profil ale utilizatorului. Rulez `ssh -vvv utilizator@server` și mă uit la ce pas stă pe loc.
>
> Cauza cea mai frecventă este **rezolvarea DNS inversă**. Cu `UseDNS yes`, serverul încearcă să afle numele asociat adresei clientului; dacă serverul DNS din `/etc/resolv.conf` nu răspunde, `sshd` așteaptă până expiră timpul. Verific pe server cu `dig -x <adresa_clientului>` cât durează răspunsul. Soluția corectă este repararea DNS-ului, adică un server care răspunde sau o intrare în `/etc/hosts`; soluția rapidă este `UseDNS no`.
>
> A doua cauză este **autentificarea GSSAPI** (Kerberos): clientul o încearcă prima și așteaptă un răspuns de la un domeniu care nu există. În `ssh -vvv` se vede blocajul la *Next authentication method: gssapi-with-mic*. Se dezactivează cu `GSSAPIAuthentication no`, pe server sau în `~/.ssh/config` pe client.
>
> A treia posibilitate: clientul are multe chei și le încearcă pe rând, sau un agent SSH răspunde greu. Precizez cheia cu `-i` și adaug `IdentitiesOnly yes` în configurarea clientului.
>
> Dacă întârzierea ar fi fost **după** parolă, m-aș fi uitat la modulele PAM, la directorul home aflat pe un NFS care nu răspunde și la scripturile din `/etc/profile.d/`.”
