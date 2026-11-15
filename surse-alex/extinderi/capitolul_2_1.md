## architecture

### 2.6. Anatomia unui Fișier de Unitate și Scrierea Propriului Serviciu

Până acum ai pornit și oprit servicii existente. Un fișier de unitate este însă un simplu fișier text cu trei secțiuni, pe care îl poți scrie singur în `/etc/systemd/system/`.

```ini
# Fișier: /etc/systemd/system/raport.service
[Unit]
Description=Generator de rapoarte
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=raport
ExecStart=/usr/local/bin/raport.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

| Secțiune | Directivă | Ce face |
| :--- | :--- | :--- |
| `[Unit]` | `Description=` | Textul afișat de `systemctl status`. |
| | `After=` / `Before=` | Doar **ordinea** de pornire. Nu pornește nimic în plus. |
| | `Wants=` | Pornește și unitatea numită; dacă aceea eșuează, serviciul tău pornește oricum. |
| | `Requires=` | Dependență strictă: dacă unitatea numită eșuează, nu pornește nici serviciul tău. |
| `[Service]` | `Type=` | Cum își dă seama `systemd` că serviciul a pornit (vezi tabelul următor). |
| | `ExecStart=` | Comanda de pornire, **cu cale absolută**. |
| | `User=` / `Group=` | Sub ce cont rulează (implicit `root`). |
| | `Restart=` | Când repornește automat: `no`, `on-failure`, `always`. |
| | `Environment=` / `EnvironmentFile=` | Variabile de mediu pentru proces. |
| `[Install]` | `WantedBy=` | La ce target se „agață” serviciul când rulezi `systemctl enable`. |

Greșeala clasică este confuzia dintre ordine și dependență: `After=network-online.target` singur nu garantează că rețeaua este pornită, ci doar că, **dacă** pornește, serviciul tău vine după ea. De aceea apar de obicei împreună `After=` și `Wants=`.

| `Type=` | Când consideră `systemd` că serviciul e pornit | Exemplu |
| :--- | :--- | :--- |
| `simple` (implicit) | Imediat ce a lansat procesul din `ExecStart=`. | Un script sau un program care rămâne în prim-plan. |
| `forking` | Când procesul lansat se termină, lăsând un copil în fundal. | Daemoni clasici; de obicei cu `PIDFile=`. |
| `oneshot` | Când comanda s-a terminat; nu rămâne niciun proces. | Scripturi de inițializare, serviciile pornite de timere. |
| `notify` | Când serviciul anunță singur că este gata. | `sshd`, `httpd`, `chronyd`. |

După ce scrii sau modifici fișierul:

```bash
systemctl daemon-reload                    # systemd recitește fișierele de unitate
systemd-analyze verify /etc/systemd/system/raport.service   # verifică sintaxa
systemctl enable --now raport.service      # pornește acum și la fiecare boot
systemctl cat raport.service               # afișează fișierul, cu tot cu drop-in-uri
```

### 2.7. Cine Depinde de Cine și Cât Durează Pornirea

```bash
# Ce pornește odată cu un target sau un serviciu (arbore):
systemctl list-dependencies multi-user.target

# Cine are nevoie de o unitate (dependențe inverse):
systemctl list-dependencies --reverse sshd.service

# Ce unități au eșuat:
systemctl --failed

# Toate serviciile și starea lor la boot (enabled, disabled, static, masked):
systemctl list-unit-files --type=service
```

În coloana de stare vei vedea uneori `static`: unitatea nu are secțiune `[Install]`, deci nu poate fi activată cu `enable`; pornește doar când o cere altă unitate. Nu este o eroare.

Pentru scripturi, trei comenzi răspund doar prin codul de ieșire și un cuvânt:

| Comandă | Răspuns |
| :--- | :--- |
| `systemctl is-active sshd` | `active` sau `inactive` |
| `systemctl is-enabled sshd` | `enabled`, `disabled`, `static`, `masked` |
| `systemctl is-failed sshd` | `failed` sau `active` |

Când pornirea durează prea mult:

```bash
systemd-analyze                  # timp total: firmware, bootloader, kernel, userspace
systemd-analyze blame            # unitățile, sortate după cât a durat pornirea fiecăreia
systemd-analyze critical-chain   # lanțul de unități care a determinat durata totală
```

### 2.8. `journalctl` ca Unealtă de Depanare: Filtre care Scurtează Căutarea

Jurnalul are mii de linii. Filtrele se pot combina și fac diferența dintre a căuta un minut și a căuta o oră.

| Ce vrei | Comanda |
| :--- | :--- |
| Să urmărești în timp real | `journalctl -f` |
| Ultimele 50 de linii ale unui serviciu | `journalctl -u httpd -n 50` |
| Un interval de timp | `journalctl --since "09:00" --until "09:30"` |
| De ieri încoace | `journalctl --since yesterday` |
| Doar mesajele kernelului | `journalctl -k` |
| Erori și mai grave, din boot-ul curent | `journalctl -b -p err` |
| Mesajele unui anumit proces | `journalctl _PID=1234` |
| Mesajele unui anumit program | `journalctl _COMM=sudo` |
| Lista boot-urilor păstrate | `journalctl --list-boots` |
| Fără paginare (pentru `grep` sau fișiere) | `journalctl --no-pager` |
| Toate câmpurile unui mesaj | `journalctl -o verbose -n 1` |

Nivelurile de prioritate pentru `-p`, de la cel mai grav: `emerg` (0), `alert` (1), `crit` (2), `err` (3), `warning` (4), `notice` (5), `info` (6), `debug` (7). `-p err` înseamnă „`err` și tot ce e mai grav”.

**Spațiul ocupat de jurnal.** Un jurnal persistent crește. Îl ții sub control astfel:

```bash
journalctl --disk-usage              # cât ocupă acum
journalctl --vacuum-size=200M        # păstrează doar cele mai recente 200 MiB
journalctl --vacuum-time=2weeks      # șterge ce e mai vechi de două săptămâni
```

Limita permanentă se pune în `/etc/systemd/journald.conf` cu `SystemMaxUse=500M`, urmată de `systemctl restart systemd-journald`.

**Relația cu `rsyslog`.** Pe RHEL rulează în paralel `rsyslog`, care primește mesajele din jurnal și le scrie în fișierele text clasice: `/var/log/messages` (general), `/var/log/secure` (autentificare, `sudo`, `sshd`), `/var/log/cron`, `/var/log/maillog`. Fișierele acestea sunt rotite periodic de `logrotate`. Poți scrie tu însuți un mesaj în jurnal, util ca să marchezi începutul unui test:

```bash
logger -p user.notice "Încep testul de reboot"
journalctl -n 1
```

### 2.9. Pornirea Manuală într-un Alt Target și Oprirea Corectă a Sistemului

`systemctl isolate` schimbă targetul unui sistem care merge. Când sistemul **nu** pornește, alegi targetul din meniul GRUB, cu aceeași tehnică folosită pentru `rd.break`: tasta `e`, capătul liniei `linux`, apoi unul dintre parametri și `Ctrl + x`.

| Parametru adăugat pe linia `linux` | Unde ajungi | Cere parola de `root`? | Când îl folosești |
| :--- | :--- | :---: | :--- |
| `systemd.unit=multi-user.target` | Sistem complet, fără interfață grafică | Login normal | Interfața grafică nu pornește. |
| `systemd.unit=rescue.target` | Sisteme de fișiere locale montate, fără rețea | Da | Un serviciu blochează pornirea. |
| `systemd.unit=emergency.target` | Doar `/`, montat doar pentru citire | Da | `/etc/fstab` greșit, sistem de fișiere defect. |
| `rd.break` | În `initramfs`, înainte de sistemul real | **Nu** | Parola de `root` este necunoscută. |

Diferența esențială: `rescue.target` și `emergency.target` îți cer parola de `root`, deci nu te ajută când ai pierdut-o. Doar `rd.break` (sau `init=/bin/sh`) ocolește autentificarea.

Oprirea și repornirea:

```bash
systemctl reboot              # repornire
systemctl poweroff            # oprire completă
shutdown -r +5 "Repornire pentru actualizare în 5 minute"   # programată, cu mesaj către utilizatori
shutdown -h 22:00             # oprire la o oră fixă
shutdown -c                   # anulează o oprire programată
```

`shutdown` anunță utilizatorii conectați și, în ultimele minute, blochează autentificările noi. Pe un server folosit și de alții, este varianta politicoasă.

### 2.10. `reload`, `restart`, `edit` și `revert`: Cum Aplici o Schimbare unui Serviciu

După ce modifici configurarea unui serviciu, ai de ales cum o aplici:

| Comandă | Ce face | Când o alegi |
| :--- | :--- | :--- |
| `systemctl reload <serviciu>` | Serviciul își recitește configurarea fără să se oprească; conexiunile active rămân. | Când serviciul o suportă (`sshd`, `httpd`, `firewalld`, `autofs`). |
| `systemctl restart <serviciu>` | Oprește și pornește din nou; conexiunile se întrerup. | Când schimbarea cere repornire (alt port, alt utilizator). |
| `systemctl reload-or-restart <serviciu>` | Încearcă `reload`; dacă serviciul nu îl suportă, face `restart`. | În scripturi, când nu știi ce suportă serviciul. |
| `systemctl try-restart <serviciu>` | Repornește **doar dacă** serviciul rula deja. | După actualizarea unui pachet. |

Nu confunda `systemctl reload <serviciu>` cu `systemctl daemon-reload`: primul se adresează serviciului (îi spune să își recitească propriul fișier de configurare), al doilea lui `systemd` (îi spune să recitească fișierele de unitate).

Pentru modificarea unității însăși:

| Comandă | Efect |
| :--- | :--- |
| `systemctl edit <serviciu>` | Creează sau editează un drop-in cu doar directivele schimbate. Varianta recomandată. |
| `systemctl edit --full <serviciu>` | Copiază **toată** unitatea în `/etc/systemd/system/` și o editează acolo. Copia ascunde de acum actualizările venite cu pachetul. |
| `systemctl revert <serviciu>` | Șterge toate modificările locale (drop-in-uri și copia completă) și revine la unitatea livrată de pachet. |
| `systemd-delta` | Arată ce unități au fost modificate local față de cele livrate. |

`systemd-delta` este un bun punct de pornire pe un server moștenit de la altcineva: vezi dintr-o privire ce a fost personalizat.

## exam-alert

### ⚠️ Capcană în plus: Ai modificat fișierul de unitate, dar nu ai rulat `daemon-reload`
`systemd` ține în memorie fișierele de unitate. După ce editezi unul, `systemctl restart serviciu` pornește **versiunea veche** și afișează doar un avertisment ușor de ratat: *Warning: The unit file changed on disk. Run 'systemctl daemon-reload'*. Secvența corectă este mereu: editare, `systemctl daemon-reload`, `systemctl restart`, `systemctl status`.

### ⚠️ Capcană în plus: `ExecStart=` fără cale absolută sau cu operatori de shell
`systemd` nu trece comanda printr-un shell. `ExecStart=raport.sh` eșuează (cere cale absolută), iar `ExecStart=/usr/bin/df -h > /tmp/disc.txt` nu redirecționează nimic, pentru că `>` este tratat ca argument obișnuit. Când ai nevoie de redirecționări, pipe-uri sau `&&`, pornește explicit un shell: `ExecStart=/usr/bin/sh -c '/usr/bin/df -h > /tmp/disc.txt'`.

## interview

### Întrebare în plus (Nivel Mid):
> **Intervievator:** *„Ai un serviciu scris de echipa de dezvoltare care se oprește din când în când. Vor să repornească singur, dar nu vor ca un serviciu stricat să se repornească la infinit și să umple jurnalul. Cum configurezi asta în `systemd`, fără să modifici fișierul livrat de ei?”*

**Răspunsul Ideal:**
> „Nu editez fișierul din `/usr/lib/systemd/system/`, pentru că s-ar suprascrie la următoarea actualizare a pachetului. Rulez `systemctl edit aplicatie.service`, care creează un fișier drop-in în `/etc/systemd/system/aplicatie.service.d/override.conf` și îl reîncarcă automat la salvare. Acolo pun doar ce vreau să schimb:
>
> ```ini
> [Unit]
> StartLimitIntervalSec=300
> StartLimitBurst=5
>
> [Service]
> Restart=on-failure
> RestartSec=10
> ```
>
> `Restart=on-failure` repornește serviciul doar când se termină cu eroare sau este omorât de un semnal, nu și când îl oprește cineva cu `systemctl stop`. `RestartSec=10` lasă zece secunde între încercări. Cele două directive `StartLimit` spun: dacă serviciul a pornit de cinci ori în cinci minute și tot a căzut, `systemd` renunță și îl marchează `failed`, în loc să-l repornească la infinit. După ce repar cauza, șterg contorul cu `systemctl reset-failed aplicatie.service` și îl pornesc din nou.
>
> Verific cu `systemctl cat aplicatie.service`, care arată fișierul original urmat de drop-in, și testez omorând procesul cu `systemctl kill --signal=SIGKILL aplicatie.service`, apoi urmăresc repornirea în `journalctl -u aplicatie.service -f`.”
