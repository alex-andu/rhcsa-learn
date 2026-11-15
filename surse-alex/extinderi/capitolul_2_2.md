## architecture

### 2.5. `dnf` de Zi cu Zi: Listare, Informații, Actualizări și Curățenie

Pe lângă instalare și ștergere, cele mai multe apeluri `dnf` sunt întrebări: ce am instalat, ce este disponibil, ce s-ar schimba dacă actualizez.

| Întrebare | Comandă |
| :--- | :--- |
| Ce pachete sunt instalate? | `dnf list installed` |
| Există pachetul X în depozite și în ce versiune? | `dnf list httpd` sau `dnf list available 'http*'` |
| Descriere, dimensiune, depozit de proveniență | `dnf info httpd` |
| Ce fișiere conține un pachet **neinstalat**? | `dnf repoquery -l httpd` |
| De ce pachete are nevoie? | `dnf repoquery --requires --resolve httpd` |
| Ce actualizări sunt disponibile (fără să le instaleze)? | `dnf check-update` |
| Din ce depozit a venit un pachet instalat? | `dnf info --installed httpd` (câmpul *From repo*) |

```bash
# Actualizează un singur pachet:
dnf upgrade -y openssl

# Actualizează doar pachetele cu corecții de securitate:
dnf upgrade -y --security

# Instalează un fișier .rpm local, rezolvând dependențele din depozite:
dnf install -y ./pachet-1.0-1.el9.x86_64.rpm

# Descarcă pachetul fără să îl instaleze (în directorul curent):
dnf download httpd

# Elimină dependențele rămase fără stăpân după ștergeri:
dnf autoremove

# Șterge metadatele și pachetele păstrate în cache (/var/cache/dnf):
dnf clean all
```

De ce `dnf install ./fișier.rpm` și nu `rpm -ivh fișier.rpm`: `rpm` se oprește la prima dependență lipsă, pe când `dnf` o aduce din depozite. Prefixul `./` îi spune lui `dnf` că este vorba despre un fișier, nu despre un nume de pachet.

**Istoricul în detaliu.** `dnf history` arată tranzacțiile; `dnf history info <ID>` arată exact ce pachete a adus fiecare, cine a rulat comanda și când. Jurnalul complet stă în `/var/log/dnf.log` și `/var/log/dnf.rpm.log`.

### 2.6. Gestionarea Depozitelor: Activare, Dezactivare, Chei GPG și Opțiuni Utile

```bash
# Depozitele configurate, inclusiv cele dezactivate:
dnf repolist --all

# Detalii despre un depozit: adresă, număr de pachete, data metadatelor:
dnf repoinfo baseos

# Dezactivare și activare persistentă (modifică enabled= în fișierul .repo):
dnf config-manager --set-disabled appstream
dnf config-manager --set-enabled appstream

# Folosirea unui depozit dezactivat doar pentru o comandă:
dnf install -y --enablerepo=epel htop

# Ignorarea unui depozit doar pentru o comandă:
dnf install -y --disablerepo=appstream pachet
```

Opțiuni pe care le poți pune într-o secțiune dintr-un fișier `.repo`, pe lângă cele din secțiunea 2.2:

| Opțiune | Efect |
| :--- | :--- |
| `priority=10` | Număr mai mic = prioritate mai mare, când același pachet există în mai multe depozite (implicit `99`). |
| `skip_if_unavailable=1` | Dacă depozitul nu răspunde, `dnf` continuă cu celelalte în loc să se oprească. |
| `metadata_expire=6h` | După cât timp reîmprospătează lista de pachete. |
| `sslverify=0` | Nu verifică certificatul serverului HTTPS (doar în laborator). |
| `exclude=kernel*` | Pachete pe care acest depozit nu are voie să le ofere. |

**Cheile GPG.** Cu `gpgcheck=1`, fiecare pachet este verificat cu o cheie publică aflată în baza de date RPM.

```bash
# Importă cheia Red Hat livrată pe sistem:
rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release

# Cheile importate (apar ca pachete numite gpg-pubkey):
rpm -q gpg-pubkey

# Verifică semnătura și integritatea unui fișier .rpm ÎNAINTE de instalare:
rpm -K pachet-1.0-1.el9.x86_64.rpm
```

Dacă pui `gpgkey=` în fișierul `.repo`, `dnf` oferă singur să importe cheia la prima instalare (cu `-y` o acceptă automat).

**Un depozit propriu.** Orice director cu fișiere `.rpm` devine depozit dacă îi generezi metadatele:

```bash
dnf install -y createrepo_c
mkdir -p /srv/repo-local && cp *.rpm /srv/repo-local/
createrepo_c /srv/repo-local        # creează subdirectorul repodata/
```

Apoi îl folosești cu `baseurl=file:///srv/repo-local`. Așa distribui în interiorul unei companii pachete care nu există în depozitele publice.

### 2.7. Kernelul este un Pachet Special: Instalare în Paralel și Kernelul Implicit

Aproape toate pachetele se **înlocuiesc** la actualizare. Kernelul face excepție: versiunea nouă se instalează **alături** de cea veche, ca să poți porni cu kernelul anterior dacă cel nou are o problemă.

```bash
# Kernelurile instalate:
rpm -q kernel

# Kernelul care rulează acum:
uname -r

# Kernelul cu care va porni sistemul la următorul boot:
grubby --default-kernel

# Toate intrările de boot, cu indexul și parametrii fiecăreia:
grubby --info=ALL

# Schimbă kernelul implicit:
grubby --set-default /boot/vmlinuz-5.14.0-427.el9.x86_64
```

Câte versiuni se păstrează hotărăște `installonly_limit=3` din `/etc/dnf/dnf.conf`: la a patra instalare, cea mai veche este ștearsă automat. Kernelul care rulează nu este șters niciodată.

Două consecințe practice. După `dnf upgrade`, dacă a venit un kernel nou, sistemul rulează în continuare kernelul vechi până la reboot, deci `uname -r` și `grubby --default-kernel` vor arăta lucruri diferite. Iar pentru kernel folosești `dnf install kernel` sau `dnf upgrade`, niciodată `rpm -U`, care ar șterge versiunea veche.

### 2.8. `rpm` pentru Situații Speciale: Dependențe, Changelog și Extragerea unui Fișier

```bash
# De ce are nevoie un pachet instalat:
rpm -qR httpd

# Ce pachet oferă o anumită capabilitate sau bibliotecă:
rpm -q --whatprovides webserver

# Ce pachete instalate depind de acesta (ce s-ar strica dacă îl ștergi):
rpm -q --whatrequires openssl-libs

# Istoricul modificărilor, inclusiv corecțiile de securitate aduse în versiunea curentă:
rpm -q --changelog openssl | head -20

# Ultimele pachete instalate sau actualizate, cu data:
rpm -qa --last | head
```

**Recuperarea unui singur fișier dintr-un pachet.** Dacă ai stricat un fișier de configurare și vrei originalul fără să reinstalezi pachetul:

```bash
cd /tmp
dnf download chrony                          # aduce fișierul .rpm
rpm2cpio chrony-*.rpm | cpio -idmv ./etc/chrony.conf    # extrage doar acel fișier
diff -u /tmp/etc/chrony.conf /etc/chrony.conf           # compară cu ce ai pe sistem
```

**Fișierele `.rpmnew` și `.rpmsave`.** Când un pachet actualizat aduce o versiune nouă a unui fișier de configurare pe care tu l-ai modificat, RPM nu îți suprascrie munca. Fie păstrează fișierul tău și pune versiunea nouă alături, ca `fișier.rpmnew`, fie instalează versiunea nouă și îți salvează fișierul ca `fișier.rpmsave`. După actualizări mari, merită căutate: `find /etc -name "*.rpmnew" -o -name "*.rpmsave"`.

### 2.9. Flatpak: Instalare pe Sistem sau pe Utilizator, Actualizare și Curățenie

Flatpak are două niveluri de instalare, iar diferența contează când un enunț spune „pentru toți utilizatorii” sau „pentru utilizatorul X”:

| Nivel | Opțiune | Unde se instalează | Cine vede aplicația |
| :--- | :--- | :--- | :--- |
| Sistem (implicit, cere `root`) | `--system` | `/var/lib/flatpak` | Toți utilizatorii. |
| Utilizator | `--user` | `~/.local/share/flatpak` | Doar utilizatorul care a instalat. |

```bash
# Adaugă un depozit doar pentru utilizatorul curent:
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Detalii despre un depozit și despre o aplicație instalată:
flatpak remotes --show-details
flatpak info org.gimp.GIMP

# Ce oferă un depozit:
flatpak remote-ls flathub --app

# Actualizează toate aplicațiile și mediile de rulare:
flatpak update -y

# Șterge mediile de rulare rămase nefolosite după dezinstalări:
flatpak uninstall --unused -y

# Scoate un depozit:
flatpak remote-delete flathub
```

Numele unei aplicații Flatpak are forma unui domeniu scris invers (`org.gimp.GIMP`). Fiecare aplicație depinde de un **mediu de rulare** (*runtime*), descărcat o singură dată și folosit în comun de mai multe aplicații; de aceea prima instalare este mare, iar următoarele sunt mult mai mici.

## exam-alert

### ⚠️ Capcană în plus: Ai corectat fișierul `.repo`, dar `dnf` încă dă erori
`dnf` ține în cache metadatele depozitelor. Dacă ai greșit prima dată adresa și apoi ai corectat-o, sau dacă depozitul s-a schimbat între timp, poți primi în continuare erori vechi. După orice modificare într-un fișier `.repo`, rulează `dnf clean all` și apoi `dnf repolist`. Depozitul este bun doar dacă `dnf repolist` îl afișează, iar un `dnf list bash` întoarce un rezultat fără erori.

### ⚠️ Capcană în plus: `enabled=0` rămas dintr-un test
Un depozit cu `enabled=0` este ignorat fără niciun mesaj: `dnf repolist` pur și simplu nu îl arată. Dacă ai dezactivat temporar un depozit ca să testezi ceva, verifică la final cu `dnf repolist --all` că depozitele cerute apar ca `enabled`.

## interview

### Întrebare în plus (Nivel Mid):
> **Intervievator:** *„Un coleg a instalat un pachet cu `rpm -ivh --nodeps --force`, «pentru că altfel nu mergea». De ce este asta o problemă pe termen lung și cum verifici starea sistemului după?”*

**Răspunsul Ideal:**
> „`--nodeps` îi spune lui RPM să instaleze pachetul chiar dacă îi lipsesc dependențele, iar `--force` să suprascrie fișiere care aparțin altor pachete. Pachetul apare ca instalat, dar baza de date RPM descrie acum un sistem inconsecvent: un program care poate să nu pornească, fiindcă îi lipsesc biblioteci, și fișiere suprascrise care nu mai corespund pachetului lor de origine.
>
> Efectul se vede mai târziu: următorul `dnf upgrade` poate refuza să ruleze din cauza dependențelor nerezolvate, iar actualizările pachetului «călcat» pot readuce fișierele vechi și strica programul instalat forțat.
>
> Verific cu `dnf check`, care raportează dependențele lipsă și conflictele din baza de date, și cu `rpm -Va`, care îmi arată fișierele ce diferă față de pachetele lor. Soluția corectă este să dezinstalez pachetul și să îl reinstalez cu `dnf install ./pachet.rpm`, care aduce dependențele din depozite. Dacă dependențele nu există în niciun depozit configurat, problema reală este un depozit lipsă, iar pe aceea o rezolv, în loc să ocolesc verificarea.”
