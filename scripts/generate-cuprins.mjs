// Generates surse-alex/cuprins.md from Alex's chapter files (asked for by Alex on 2026-11-14:
// "genereaza tu un cuprins automat"). Pillar titles and objectives are the only text written here;
// chapter titles come from "# Capitolul X.Y:" and topics from the "### 2.N." headings of each chapter.
//
//   node scripts/generate-cuprins.mjs surse-alex
//
// If Alex writes his own cuprins.md, stop running this script: the importer reads cuprins.md as is.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = process.argv[2] ?? 'surse-alex';
const PILLARS = {
  0: ['Fundamentele Linux și Laboratorul EX200', 'Arhitectura RHEL, laboratorul node1/node2, shell-ul și lucrul cu fișiere și text.'],
  1: ['Utilizatori, Permisiuni și Procese', 'Identitate locală, sudo, permisiuni și ACL-uri, procese și sarcini programate.'],
  2: ['Boot, Software și Automatizare', 'Procesul de boot și systemd, pachete și depozite, scripturi Bash și tuned.'],
  3: ['Stocare Locală și în Rețea', 'Partiții, sisteme de fișiere, swap, LVM, Stratis, VDO, NFS și autofs, persistente după reboot.'],
  4: ['Rețea și Securitate', 'NetworkManager, DNS, SSH, chrony, SELinux și firewalld.'],
  5: ['Containere cu Podman', 'Containere rootless, imagini, volume cu SELinux și servicii systemd pentru containere.'],
  6: ['Simularea Finală EX200', 'Examenul complet de 180 de minute, strategia de examen și pașii de după RHCSA.'],
};

const plain = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const chapters = readdirSync(SRC)
  .map((f) => [f, /^capitolul_(\d+)_(\d+)_.*\.md$/.exec(f)])
  .filter(([, m]) => m)
  .map(([f, m]) => {
    const ext = join(SRC, 'extinderi', `capitolul_${m[1]}_${m[2]}.md`);
    // Topics also include the "### 2.N." headings of the extension file, if there is one.
    const text =
      readFileSync(join(SRC, f), 'utf8').replace(/\r\n/g, '\n') + (existsSync(ext) ? '\n' + readFileSync(ext, 'utf8') : '');
    const title = plain(/^#{1,2}\s+Capitolul\s+\d+\.\d+:\s*(.+)$/m.exec(text)?.[1] ?? f);
    let fence = false;
    const topics = [];
    for (const line of text.split('\n')) {
      if (/^\s*```/.test(line)) fence = !fence;
      const t = !fence && /^###\s+2\.(\d+)\.\s+(.+)$/.exec(line);
      if (t) topics.push(plain(t[2]));
    }
    return { p: Number(m[1]), c: Number(m[2]), title, topics };
  })
  .sort((a, b) => a.p - b.p || a.c - b.c);

const out = [
  '# Cuprins RHCSA (EX200)',
  '',
  '> Generat automat de `scripts/generate-cuprins.mjs` din capitolele lui Alex (titlurile capitolelor și subiectele lor sunt luate din fișiere; titlurile și obiectivele pilonilor sunt scrise de Claude). Alex îl poate înlocui oricând cu cuprinsul lui.',
];
for (const p of [...new Set(chapters.map((c) => c.p))]) {
  const [name, goal] = PILLARS[p] ?? [`Pilonul ${p}`, ''];
  out.push('', `## PILONUL ${p}: ${name}`);
  if (goal) out.push(`_Obiectiv: ${goal}_`);
  for (const ch of chapters.filter((c) => c.p === p)) {
    out.push('', `### Capitolul ${p}.${ch.c}: ${ch.title}`);
    ch.topics.forEach((t, i) => out.push(`- **${p}.${ch.c}.${i + 1}.** ${t}`));
  }
}
writeFileSync(join(SRC, 'cuprins.md'), out.join('\n') + '\n');
console.log(`cuprins.md: ${new Set(chapters.map((c) => c.p)).size} piloni, ${chapters.length} capitole`);
