"""check.py — run before every deploy:  python3 tools/check.py [--strict]

1. Every arXiv ID in assets/data.js resolves, its title matches ours, and "Sharma" is among its authors.
2. Every local link and asset (href/src) in the HTML pages exists.
3. No TODO is left in a page (a warning; an error with --strict, which a deploy should use).
Exits non-zero on any error.
"""
import pathlib, re, sys, time, urllib.request, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
strict = '--strict' in sys.argv
errors, warnings = [], []
norm = lambda s: re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

# ---------- 1. publications against arXiv ----------
data = (ROOT / 'assets/data.js').read_text()
pubs = data[data.index('pubs: ['):data.index('research: [')]
entries = []
for block in pubs.split('{ year:')[1:]:  # one publication per block
    t, a = re.search(r"title: '((?:[^'\\]|\\.)*)'", block), re.search(r"arxiv: '([\d.]+)'", block)
    au = re.search(r"authors: \[([^\]]*)\]", block)
    if a: entries.append((t.group(1), a.group(1), [x or y for x, y in re.findall(r"'([^']+)'|\"([^\"]+)\"", au.group(1))], 'etal: true' in block))
surname = lambda n: norm(n.split()[-1].replace("O'", 'O'))
for title, aid, ours, etal in entries:
    url = f'https://export.arxiv.org/api/query?id_list={aid}'
    try:
        xml = urllib.request.urlopen(url, timeout=30).read()
    except Exception as e:
        errors.append(f'arXiv:{aid}: could not reach arXiv ({e})'); continue
    ns = {'a': 'http://www.w3.org/2005/Atom'}
    entry = ET.fromstring(xml).find('a:entry', ns)
    got = entry.find('a:title', ns) if entry is not None else None  # (an Element with no children is falsy)
    if got is None or got.text is None or entry.find('a:id', ns) is None:
        errors.append(f'arXiv:{aid}: not found'); continue
    authors = [a.find('a:name', ns).text for a in entry.findall('a:author', ns)]
    if norm(got.text) != norm(title.replace("\\'", "'")):
        errors.append(f'arXiv:{aid}: title differs\n    ours:  {title}\n    arXiv: {" ".join(got.text.split())}')
    if not any('Sharma' in a for a in authors):
        errors.append(f'arXiv:{aid}: no Sharma among the authors')
    # the authors we list must be arXiv's first authors, in order; "…" only when there are more
    if [surname(a) for a in ours] != [surname(a) for a in authors[:len(ours)]]:
        errors.append(f'arXiv:{aid}: author list differs\n    ours:  {", ".join(ours)}\n    arXiv: {", ".join(authors[:len(ours)])}')
    if etal != (len(authors) > len(ours)):
        errors.append(f'arXiv:{aid}: "…" should be {"shown" if len(authors) > len(ours) else "removed"} ({len(authors)} authors on arXiv)')
    print(f'ok   arXiv:{aid}  ({len(authors)} authors)')
    time.sleep(1)  # arXiv asks for at most one request every few seconds in bursts

# ---------- 2. local links, 3. TODOs ----------
for page in sorted(p for p in ROOT.rglob('*.html') if not p.name.startswith('_') and 'prototype' not in p.parts):  # _template.html is a stub; prototype/ is not published
    if 'tools' in page.parts: continue
    html = page.read_text()
    for ref in re.findall(r'(?:href|src)="([^"]+)"', html):
        if re.match(r'(https?:|mailto:|#|data:)', ref) or '${' in ref: continue  # external, or built by a script
        target = (page.parent / ref.split('#')[0].split('?')[0]).resolve()
        if not target.exists(): errors.append(f'{page.relative_to(ROOT)}: broken link {ref}')
    if 'TODO' in html:
        (errors if strict else warnings).append(f'{page.relative_to(ROOT)}: contains TODO')

for w in warnings: print('warn', w)
for e in errors: print('FAIL', e)
print(f'\n{len(entries)} papers checked, {len(errors)} error(s), {len(warnings)} warning(s)')
sys.exit(1 if errors else 0)
