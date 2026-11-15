## architecture

### 2.6. `chmod` Simbolic în Detaliu și Litera `X` Mare

Notația octală (`chmod 2770`) stabilește toate permisiunile dintr-o dată. Notația simbolică schimbă doar ce îi spui și lasă restul neatins, de aceea este mai sigură când lucrezi pe multe fișiere cu permisiuni diferite.

Forma este `cine` + `operator` + `ce`:

| Parte | Valori | Semnificație |
| :--- | :--- | :--- |
| Cine | `u`, `g`, `o`, `a` | Proprietar, grup, ceilalți, toți (`a` = `ugo`). |
| Operator | `+`, `-`, `=` | Adaugă, scoate, setează exact (și șterge restul pentru acea categorie). |
| Ce | `r`, `w`, `x`, `X`, `s`, `t` | Citire, scriere, execuție, execuție condiționată, SUID/SGID, sticky. |

```bash
chmod u+x script.sh            # adaugă execuție doar pentru proprietar
chmod g-w,o-rwx raport.txt     # mai multe schimbări, separate prin virgulă
chmod o= secret.txt            # 'ceilalți' rămân fără nicio permisiune
chmod a+r public.txt           # toată lumea poate citi
chmod g+s /srv/proiect         # SGID pe director, fără să atingi restul biților
chmod --reference=model.txt nou.txt   # copiază permisiunile de pe alt fișier
```

**De ce există `X` mare.** Când aplici recursiv permisiuni pe un arbore de directoare, ai o problemă: directoarele au nevoie de `x` ca să poată fi traversate, dar fișierele obișnuite nu trebuie să devină executabile. `X` înseamnă „execuție doar pentru directoare și pentru fișierele care au deja `x` la cineva”:

```bash
# GREȘIT: face toate fișierele executabile (documente, imagini, configurări):
chmod -R g+rwx /srv/proiect

# CORECT: directoarele devin traversabile, fișierele primesc doar rw:
chmod -R g+rwX /srv/proiect
```

Când `-R` nu ajunge (vrei valori octale diferite pentru fișiere și directoare), folosești `find`:

```bash
find /srv/proiect -type d -exec chmod 2770 {} +
find /srv/proiect -type f -exec chmod 0660 {} +
```

### 2.7. Proprietarul și Grupul: `chown`, `chgrp` și Cine Are Voie să le Schimbe

```bash
chown natasha fișier              # schimbă doar proprietarul
chown natasha:sysadmins fișier    # proprietar și grup
chown :sysadmins fișier           # doar grupul (la fel ca: chgrp sysadmins fișier)
chown natasha: fișier             # proprietar + grupul primar al lui natasha
chown -R apache:apache /var/www/site     # recursiv
chown --reference=/var/www/html /custom_web   # copiază proprietarul și grupul de pe alt fișier
```

Regulile kernelului sunt asimetrice și merită știute:

* **Proprietarul** unui fișier îl poate schimba doar `root`. Un utilizator obișnuit nu își poate „dărui” fișierele altcuiva, altfel ar putea ocoli cotele de disc sau ar putea planta fișiere în numele altuia.
* **Grupul** poate fi schimbat și de proprietarul fișierului, dar numai către un grup din care el însuși face parte.
* Când un utilizator obișnuit schimbă grupul unui fișier executabil, biții SUID și SGID sunt șterși automat, ca măsură de protecție.

Pentru verificare, `stat -c '%U:%G %a %n' fișier` afișează proprietarul, grupul și permisiunile în octal pe o singură linie, formă ușor de comparat cu ce cere un enunț.

### 2.8. ACL-uri în Practică: Recursiv, Copiere, Salvare și Restaurare

Pe lângă comenzile din secțiunea 2.4, în practică ai nevoie de ACL-uri aplicate pe arbori întregi și de o metodă de a le salva.

```bash
# Acces rwx pentru grupul 'devops' pe tot ce există deja (X mare: execuție doar pe directoare):
setfacl -R -m g:devops:rwX /srv/proiect

# Același acces moștenit de tot ce se va crea de acum înainte (default ACL pe toate directoarele):
setfacl -R -m d:g:devops:rwX /srv/proiect

# Scoaterea doar a regulilor default, păstrând ACL-urile de acces:
setfacl -k /srv/proiect

# Copierea ACL-ului de pe un fișier pe altul:
getfacl fișier_model | setfacl --set-file=- fișier_nou
```

**Salvare și restaurare.** Înainte de o operațiune riscantă (un `chmod -R`, o migrare), poți salva toate permisiunile și ACL-urile unui arbore într-un fișier text:

```bash
cd /srv
getfacl -R proiect > /root/proiect.acl      # salvează proprietari, permisiuni și ACL-uri
# ... ceva a stricat permisiunile ...
setfacl --restore=/root/proiect.acl         # le pune la loc exact cum erau
```

**Ce păstrează și ce pierde ACL-urile:**

| Operație | ACL-urile |
| :--- | :--- |
| `mv` pe același sistem de fișiere | Se păstrează (este același inode). |
| `cp` simplu | Se pierd; copia primește permisiuni după `umask` și eventualele default ACL ale directorului destinație. |
| `cp -p` sau `cp -a` | Se păstrează. |
| `tar` | Se păstrează doar cu `--acls` la creare și la extragere. |
| `rsync` | Se păstrează doar cu `-A`. |

**Cum citești `getfacl` când apare `#effective`.** O linie ca `user:natasha:rwx    #effective:r-x` înseamnă că regula îi dă `rwx`, dar masca o limitează la `r-x`. Masca se recalculează automat la fiecare `setfacl -m`, astfel încât să permită tot ce ai acordat. Dacă o vrei fixă, o setezi explicit cu `setfacl -m m::r-x fișier` după celelalte reguli.

### 2.9. De Unde Vine `umask` și Cum îl Vezi în Formă Simbolică

```bash
umask        # afișează masca în octal, de exemplu 0022
umask -S     # afișează ce RĂMÂNE permis: u=rwx,g=rx,o=rx
```

Forma simbolică este mai ușor de înțeles pentru un începător: arată direct permisiunile maxime pe care le va primi un director nou.

Valoarea implicită din RHEL 9 și 10 este `0022` și vine din directiva `UMASK` din `/etc/login.defs`, aplicată la autentificare. Locurile în care o poți schimba, de la general la particular (ultimul câștigă):

| Loc | Cui se aplică |
| :--- | :--- |
| `/etc/login.defs` (`UMASK`) | Tuturor utilizatorilor, la autentificare. |
| Un fișier `/etc/profile.d/umask.sh` care conține `umask 0027` | Tuturor shell-urilor de login. |
| `~/.bashrc` al utilizatorului | Doar acelui utilizator, în orice shell interactiv. |
| Directiva `UMask=` din unitatea `systemd` | Unui serviciu anume. Serviciile nu citesc fișierele de profil! |

Ultimul rând explică o problemă frecventă: un serviciu care creează fișiere cu alte permisiuni decât te aștepți nu are legătură cu `umask`-ul din shell-ul tău, ci cu al lui, moștenit de la `systemd` (implicit `0022`).

`umask` afectează doar fișierele **noi**. Nu schimbă nimic din ce există deja și nu poate adăuga permisiuni pe care programul nu le-a cerut: de aceea un fișier nou nu iese niciodată executabil, oricât de permisivă ar fi masca.

### 2.10. Alte Atribute `chattr` și Cum Recunoști un Fișier „Ciudat”

Pe lângă `i` (imutabil) și `a` (doar adăugare) din secțiunea 2.5, `lsattr` poate arăta și alte litere. Cele pe care le vei întâlni:

| Literă | Semnificație |
| :---: | :--- |
| `i` | Fișierul nu poate fi modificat, șters, redenumit sau legat cu un hard link. |
| `a` | Se poate doar adăuga la sfârșit; util pentru jurnale. |
| `A` | Nu se mai actualizează timpul de acces (`atime`). |
| `d` | Fișierul este sărit de utilitarul `dump`. |
| `e` | Fișierul folosește *extents*; apare implicit pe ext4 și nu se poate scoate. |

```bash
lsattr -d /etc              # atributele directorului însuși, nu ale conținutului
lsattr -R /etc 2>/dev/null | grep -- '-i-'    # caută fișiere imutabile într-un arbore
chattr -R +i /srv/arhiva    # aplică recursiv
```

Când o operație eșuează, mesajul de eroare îți spune pe ce strat să cauți:

| Mesaj | Unde te uiți |
| :--- | :--- |
| `Permission denied` | Permisiuni `rwx`, ACL (`getfacl`) sau SELinux (`ausearch -m AVC`). |
| `Operation not permitted` | Atribute `chattr` (`lsattr`) sau o operație rezervată lui `root` (de exemplu `chown`). |
| `Read-only file system` | Sistemul de fișiere este montat `ro` (`findmnt`). |

### 2.11. Verificarea Accesului pe Tot Drumul: `namei` și Testul ca Alt Utilizator

Pentru a ajunge la un fișier, un utilizator are nevoie de dreptul `x` pe **fiecare** director din cale, nu doar de drepturi pe fișierul final. O eroare `Permission denied` vine adesea de la un director de mai sus, la care nu te-ai uitat.

```bash
namei -l /srv/proiect/rapoarte/q1.txt
```

```text
f: /srv/proiect/rapoarte/q1.txt
drwxr-xr-x root     root      /
drwxr-xr-x root     root      srv
drwxrws--- root     sysadmins proiect
drwxr-x--- natasha  natasha   rapoarte
-rw-rw-r-- natasha  sysadmins q1.txt
```

`namei -l` afișează permisiunile, proprietarul și grupul fiecărui element din cale, pe câte o linie. Aici se vede imediat de ce un coleg din `sysadmins` nu ajunge la `q1.txt`, deși fișierul are `rw` pentru grup: directorul `rapoarte` aparține grupului `natasha` și nu permite nimic altora.

Apoi verifici practic, ca utilizatorul în cauză, fără să-i știi parola:

```bash
sudo -u harry test -r /srv/proiect/rapoarte/q1.txt && echo "poate citi" || echo "NU poate citi"
sudo -u harry test -w /srv/proiect && echo "poate scrie în director" || echo "NU poate scrie"
```

`test -r`, `-w` și `-x` întreabă kernelul dacă utilizatorul are efectiv acel drept, ținând cont de permisiuni, de ACL-uri și de grupurile lui.

## exam-alert

### ⚠️ Capcană în plus: Directorul colaborativ este corect, dar fișierele noi nu pot fi modificate de colegi
SGID pe director garantează că fișierele noi primesc **grupul** directorului. Nu garantează că grupul are drept de **scriere** pe ele: cu `umask 0022`, un fișier nou iese `rw-r--r--`, deci colegii îl pot citi, dar nu îl pot modifica. Dacă enunțul cere ca membrii grupului să își poată modifica reciproc fișierele, ai două soluții: un default ACL pe director (`setfacl -m d:g:sysadmins:rwx /home/managers`) sau `umask 0002` pentru acei utilizatori. Testează creând un fișier ca un utilizator și modificându-l ca altul.

### ⚠️ Capcană în plus: SUID pus pe un script nu are niciun efect
Kernelul Linux ignoră biții SUID și SGID pe fișierele interpretate (scripturi Bash, Python și altele care încep cu `#!`). `chmod u+s script.sh` reușește și `ls -l` arată `rws`, dar scriptul rulează tot cu drepturile celui care l-a pornit. Pentru a rula un script cu drepturi ridicate, soluția corectă este o regulă `sudo`.

## interview

### Întrebare în plus (Nivel Mid):
> **Intervievator:** *„Un dezvoltator a rulat din greșeală `chmod -R 777 /var/www` pe un server de producție «ca să meargă». Site-ul funcționează. De ce este totuși o problemă și cum repari permisiunile fără să reinstalezi nimic?”*

**Răspunsul Ideal:**
> „Este o problemă de securitate din trei motive. Orice utilizator local și orice proces compromis poate acum modifica sau înlocui fișierele site-ului. Toate fișierele au devenit executabile, inclusiv cele încărcate de vizitatori. Iar dacă existau biți speciali (SGID pe directoare), au fost șterși, pentru că `777` setează explicit primul octet la zero.
>
> Repar în trei pași. Întâi proprietarul: `chown -R root:apache /var/www`, astfel încât serverul web să citească prin grup, fără să fie proprietar. Apoi permisiunile, diferit pentru directoare și fișiere: `find /var/www -type d -exec chmod 2750 {} +` și `find /var/www -type f -exec chmod 0640 {} +`. Directoarele în care aplicația chiar trebuie să scrie (încărcări, cache) primesc separat drept de scriere pentru grup.
>
> Pentru fișierele instalate din pachete RPM pot reface exact permisiunile originale: `rpm -Va` îmi arată ce diferă, iar `rpm --restore <pachet>` (sau `rpm --setperms` și `rpm --setugids` pe versiunile mai vechi) le pune la loc. La final rulez `restorecon -Rv /var/www`, pentru că, dacă cineva a mutat fișiere între timp, contextul SELinux poate fi și el greșit. Ca prevenție, salvez periodic permisiunile cu `getfacl -R`, ca să am din ce restaura.”
