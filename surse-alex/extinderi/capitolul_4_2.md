## architecture

### 2.6. Unelte SELinux pentru Diagnostic și Întreținere

Cele trei pârghii din secțiunea 2.4 rezolvă problemele. Uneltele de mai jos te ajută să afli **care** pârghie este cea potrivită și să vezi ce ai modificat.

| Vrei să afli | Comandă |
| :--- | :--- |
| Ce context **ar trebui** să aibă o cale, după regulile din politică | `matchpathcon /custom_web/index.html` |
| Ce ar schimba `restorecon`, fără să schimbe nimic | `restorecon -Rnv /custom_web` |
| Ce reguli de context ai adăugat **tu** (nu cele livrate cu sistemul) | `semanage fcontext -l -C` |
| Ce porturi ai adăugat tu | `semanage port -l -C` |
| Ce boolean-uri ai schimbat față de valorile implicite | `semanage boolean -l -C` |
| De ce a fost refuzată o acțiune, în cuvinte | `ausearch -m AVC -ts recent \| audit2why` |
| Ce face un boolean | `semanage boolean -l \| grep httpd_can_network` |

Opțiunea `-C` (*customized*) este foarte utilă înainte de a încheia un task: îți arată exact ce ai lăsat tu în politică, deci și greșelile de tastare.

**Ștergerea unei reguli greșite.** `semanage` nu are „undo”; scoți regula cu `-d`, scriind calea sau portul exact ca la adăugare, apoi refaci etichetele:

```bash
semanage fcontext -d "/custom_wbe(/.*)?"       # regula adăugată cu o greșeală de tastare
semanage port -d -t http_port_t -p tcp 8282
restorecon -Rv /custom_web
```

**Regula de echivalență.** Când muți un serviciu întreg într-un director nou și vrei ca tot arborele să fie etichetat **exact ca originalul**, cu toate subdirectoarele lui speciale, nu scrii zece reguli, ci una singură:

```bash
# Tot ce este sub /srv/site primește aceleași contexte ca echivalentul din /var/www:
semanage fcontext -a -e /var/www /srv/site
restorecon -Rv /srv/site
```

Astfel `/srv/site/html` primește `httpd_sys_content_t`, iar `/srv/site/cgi-bin` primește `httpd_sys_script_exec_t`, la fel ca în `/var/www`.

**Modul permisiv pentru un singur domeniu.** În loc de `setenforce 0`, care oprește protecția pentru tot sistemul, poți face permisiv un singur tip de proces cât timp investighezi:

```bash
semanage permissive -a httpd_t       # doar procesele httpd nu mai sunt blocate (dar refuzurile se jurnalizează)
semanage permissive -l               # ce domenii sunt permisive
semanage permissive -d httpd_t       # revenire; obligatoriu înainte de a încheia
```

**`audit2allow`, ultima soluție.** Poate genera un modul de politică din refuzurile jurnalizate (`ausearch -m AVC -ts recent | audit2allow -M modulul_meu`, apoi `semodule -i modulul_meu.pp`). Permite exact ce a fost refuzat, inclusiv lucruri pe care nu ar trebui să le permiți. Aproape întotdeauna, soluția corectă este o etichetă, un port sau un boolean, iar în examen nu vei avea nevoie de module proprii.

### 2.7. Tipurile și Boolean-urile pe care le Întâlnești Cel Mai Des

Nu trebuie memorate, dar e bine să le recunoști când apar într-un mesaj AVC.

| Tip SELinux | La ce folosește |
| :--- | :--- |
| `httpd_sys_content_t` | Conținut web pe care serverul îl poate doar **citi**. |
| `httpd_sys_rw_content_t` | Conținut în care serverul web poate și **scrie** (încărcări, cache). |
| `httpd_sys_script_exec_t` | Scripturi CGI pe care serverul web le poate executa. |
| `public_content_t` | Fișiere partajate doar pentru citire de mai multe servicii (web, FTP, NFS, Samba). |
| `samba_share_t` | Directoare partajate prin Samba. |
| `container_file_t` | Fișiere accesibile containerelor (Capitolul 5.1). |
| `ssh_home_t` | Conținutul directorului `~/.ssh`. |
| `user_home_t`, `admin_home_t` | Fișiere din directoarele home, respectiv din `/root`. |
| `var_log_t`, `tmp_t`, `etc_t` | Jurnale, fișiere temporare, configurări. |
| `default_t` | Un director creat într-un loc pentru care politica nu are nicio regulă. Semn că lipsește `semanage fcontext`. |
| `unlabeled_t` | Fișier fără nicio etichetă (creat cu SELinux dezactivat). Semn că trebuie o reetichetare. |

| Tip de port | Porturi implicite | Comandă pentru un port nou |
| :--- | :--- | :--- |
| `http_port_t` | 80, 81, 443, 488, 8008, 8009, 8443, 9000 | `semanage port -a -t http_port_t -p tcp 82` |
| `ssh_port_t` | 22 | `semanage port -a -t ssh_port_t -p tcp 2222` |
| `mysqld_port_t` | 3306 | `semanage port -a -t mysqld_port_t -p tcp 3307` |
| `postgresql_port_t` | 5432 | `semanage port -a -t postgresql_port_t -p tcp 5433` |

Mutarea SSH pe alt port urmează exact tiparul serverului web din capitol: `Port 2222` într-un fișier din `/etc/ssh/sshd_config.d/`, `semanage port` pentru `ssh_port_t`, `firewall-cmd --permanent --add-port=2222/tcp`, apoi `systemctl restart sshd` și un test dintr-o a doua fereastră.

| Boolean | Ce permite când este `on` |
| :--- | :--- |
| `httpd_can_network_connect` | Serverul web poate iniția conexiuni către orice port (necesar pentru *reverse proxy*). |
| `httpd_can_network_connect_db` | Serverul web se poate conecta la o bază de date aflată pe alt server. |
| `httpd_enable_homedirs` | Serverul web poate citi din directoarele home (`~/public_html`). |
| `httpd_use_nfs` | Serverul web poate servi conținut de pe NFS. |
| `use_nfs_home_dirs` | Directoare home aflate pe NFS. |
| `container_manage_cgroup` | Un container poate rula `systemd` în interior. |

### 2.8. `firewalld` Dincolo de Servicii și Porturi: Zone, Surse și Reguli Bogate

**Cum alege `firewalld` zona pentru un pachet.** În ordine: întâi se uită dacă **adresa sursă** a pachetului este asociată unei zone; apoi la zona **interfeței** pe care a intrat; dacă niciuna nu se potrivește, folosește zona implicită.

```bash
firewall-cmd --get-active-zones                 # zonele folosite acum, cu interfețele și sursele lor
firewall-cmd --get-zones                        # toate zonele existente
firewall-cmd --list-all --zone=internal         # regulile unei anumite zone
firewall-cmd --set-default-zone=internal        # schimbă zona implicită (efect imediat ȘI permanent)

# Mută o interfață în altă zonă:
firewall-cmd --permanent --zone=internal --change-interface=enp7s0

# Tot ce vine din rețeaua de administrare este tratat după regulile zonei 'trusted':
firewall-cmd --permanent --zone=trusted --add-source=192.168.122.0/24
firewall-cmd --reload
```

Opțiunea `--zone=` se poate adăuga la orice comandă; fără ea, comanda acționează pe zona implicită.

**Reguli bogate (*rich rules*).** Când „serviciul X este permis” nu ajunge și trebuie să spui **cui**:

```bash
# SSH permis doar din rețeaua laboratorului:
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.122.0/24" service name="ssh" accept'

# Respinge tot ce vine de la o anumită adresă:
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.122.200" reject'

# Permite un port doar unei adrese, cu jurnalizare:
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.122.102" port port="5432" protocol="tcp" log prefix="PG " accept'

firewall-cmd --reload
firewall-cmd --list-rich-rules
```

Pentru ca prima regulă să aibă efect, serviciul `ssh` nu trebuie să fie permis și la modul general în aceeași zonă (`--remove-service=ssh`), altfel accesul rămâne deschis pentru toată lumea.

**Redirecționarea porturilor și mascarea:**

```bash
# Ce sosește pe portul 8080 este trimis la portul 80 al aceleiași mașini:
firewall-cmd --permanent --add-forward-port=port=8080:proto=tcp:toport=80

# Mașina devine gateway pentru rețeaua din spatele ei (traducere de adrese):
firewall-cmd --permanent --add-masquerade
firewall-cmd --reload
```

**Alte comenzi utile:**

| Comandă | Ce face |
| :--- | :--- |
| `firewall-cmd --info-service=nfs` | Ce porturi și protocoale deschide un serviciu predefinit. |
| `firewall-cmd --runtime-to-permanent` | Salvează ca permanentă configurația activă acum. Util când ai testat reguli fără `--permanent` și funcționează. |
| `firewall-cmd --permanent --list-all` | Ce este salvat pe disc, pentru comparație cu ce este activ. |
| `firewall-cmd --add-service=http --timeout=5m` | Regulă temporară, care dispare singură după 5 minute. |
| `firewall-cmd --panic-on` / `--panic-off` | Blochează imediat tot traficul. Rulată prin SSH, îți taie și propria sesiune! |

Varianta cu `--timeout` este plasa de siguranță când modifici de la distanță reguli care îți pot tăia accesul: dacă greșești, regula dispare singură.

### 2.9. Contextul Proceselor și Tranzițiile de Domeniu

Până acum ai urmărit eticheta **fișierelor**. Cealaltă jumătate a ecuației este eticheta **procesului**:

```bash
ps -eZ | grep -E 'httpd|sshd'      # contextul proceselor
id -Z                              # contextul sesiunii tale
```

```text
system_u:system_r:httpd_t:s0                      1234 ?  00:00:01 httpd
system_u:system_r:sshd_t:s0-s0:c0.c1023           987 ?  00:00:00 sshd
unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023   root (sesiunea ta)
```

Două lucruri de reținut din această ieșire:

**Sesiunea ta de `root` rulează în `unconfined_t`.** Politica `targeted` restricționează serviciile, nu utilizatorii conectați. De aceea un test făcut de tine din terminal reușește, iar aceeași operație făcută de serviciu eșuează. Un serviciu trebuie testat **prin serviciu** (`curl` către server, nu `cat` pe fișier).

**Un proces își primește domeniul la pornire, printr-o tranziție.** Când `systemd` execută `/usr/sbin/httpd`, care are eticheta `httpd_exec_t`, politica spune că procesul rezultat intră în domeniul `httpd_t`. Consecința practică: dacă pornești manual un daemon din terminal, el rulează în `unconfined_t` și totul pare să meargă; pornit de `systemd`, intră în domeniul lui restrâns și este blocat. Tot de aici vine regula că un executabil mutat sau recompilat își poate pierde eticheta `_exec_t` și trebuie reparat cu `restorecon`.

## exam-alert

### ⚠️ Capcană în plus: Calea din `semanage fcontext` scrisă relativ sau cu slash la sfârșit
Expresia trebuie să fie o cale **absolută**, fără slash final și între ghilimele: `"/custom_web(/.*)?"`. Variantele `"custom_web(/.*)?"`, `"/custom_web/(/.*)?"` și cea fără ghilimele (unde shell-ul încearcă să interpreteze parantezele și steluța) fie dau eroare, fie creează o regulă care nu se potrivește cu nimic. După comandă, verifică în ordine: `semanage fcontext -l -C` (regula există și arată corect), `restorecon -Rv` (trebuie să afișeze linii *Relabeled*), `ls -ldZ` (tipul este cel dorit).

### ⚠️ Capcană în plus: `restorecon` nu afișează nimic
Dacă `restorecon -Rv /cale` nu tipărește nicio linie, înseamnă că nu a schimbat nimic: fie etichetele erau deja corecte, fie regula ta nu se potrivește cu acea cale și `restorecon` a „restaurat” vechiul context implicit. Nu presupune că a mers; uită-te cu `ls -ldZ`.

## interview

### Întrebare în plus (Nivel Mid -> Senior):
> **Intervievator:** *„Un server a rulat ani de zile cu SELinux dezactivat. Auditul de securitate cere trecerea în `Enforcing`. Cum faci tranziția pe un sistem de producție fără să oprești aplicațiile?”*

**Răspunsul Ideal:**
> „Nu trec direct în `Enforcing`. Cât timp SELinux a fost dezactivat, fișierele noi au fost create fără etichete, deci la prima pornire în `Enforcing` multe servicii ar fi blocate, posibil chiar autentificarea. Fac tranziția în trei etape.
>
> **Etapa 1, `Permissive` și reetichetare.** Setez `SELINUX=permissive` în `/etc/selinux/config`, mă asigur că parametrul `selinux=0` nu este prezent pe linia de comandă a kernelului și programez o reetichetare completă cu `touch /.autorelabel` (sau `fixfiles onboot`). Repornesc într-o fereastră de mentenanță: reetichetarea parcurge tot discul și poate dura de la câteva minute la mai mult de o oră pe volume mari. În `Permissive` nimic nu este blocat, dar orice ar fi fost blocat ajunge în jurnal.
>
> **Etapa 2, observare.** Las sistemul în `Permissive` cel puțin un ciclu complet de activitate, care să includă joburile de noapte, backup-urile și raportările lunare. Analizez periodic `ausearch -m AVC -ts today` și `sealert -a /var/log/audit/audit.log`. Pentru fiecare refuz aleg soluția corectă: `semanage fcontext` pentru directoare nestandard, `semanage port` pentru porturi, boolean-uri pentru funcții opționale. Modulele făcute cu `audit2allow` le folosesc doar pentru aplicații proprii, după ce am înțeles ce permit.
>
> **Etapa 3, `Enforcing`.** Când jurnalul rămâne curat, trec la runtime cu `setenforce 1`, lucru reversibil instantaneu dacă apare ceva neprevăzut. După câteva zile fără incidente, fac schimbarea persistentă în `/etc/selinux/config`.
>
> Dacă o singură aplicație rămâne problematică, nu țin tot sistemul în `Permissive`: pun doar domeniul ei în mod permisiv cu `semanage permissive -a`, până îi rezolv politica.”
