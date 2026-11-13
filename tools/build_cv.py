#!/usr/bin/env python3
"""build_cv.py — builds the CV from the same facts as the website.

  assets/data.js  ->  cv/generated/*.tex  ->  cv/cvmain.tex (latexmk)  ->  assets/docs/Paras_CV.pdf

Every fact (education, publications, experience, awards, ...) lives in assets/data.js. This script writes one
LaTeX file per CV section into cv/generated/; cv/cvmain.tex holds only the layout and the order of the sections.

  python3 tools/build_cv.py            write the sections and compile the PDF (needs node and latexmk)
  python3 tools/build_cv.py --tex-only write the sections only (GitHub Actions compiles them itself)
"""
import html, json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CV, GEN = ROOT / 'cv', ROOT / 'cv' / 'generated'


def load_data():
    js = "global.window = {}; require(process.argv[1]); process.stdout.write(JSON.stringify(window.DATA));"
    out = subprocess.run(['node', '-e', js, str(ROOT / 'assets' / 'data.js')], check=True, capture_output=True, text=True)
    return json.loads(out.stdout)


# ---------- text: the light HTML and Unicode used in data.js, as LaTeX ----------
UNI = {'–': '--', '—': '---', '’': "'", '‘': '`', '“': '``', '”': "''", '…': r'\ldots{}', '≤': r'$\leq$', '≥': r'$\geq$',
       '≈': r'$\approx$', '×': r'$\times$', '·': r'$\cdot$', '−': r'$-$', '°': r'$^\circ$', 'σ': r'$\sigma$', 'μ': r'$\mu$',
       'Ω': r'$\Omega$', 'θ': r'$\theta$', '₀': r'$_0$', '₁': r'$_1$', '₂': r'$_2$', 'ₐ': r'$_a$', ' ': '~'}
SPECIAL = {'\\': r'\textbackslash{}', '&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}',
           '~': r'\textasciitilde{}', '^': r'\textasciicircum{}', '|': r'$|$', '<': r'$<$', '>': r'$>$'}


def plain(t):
    t = html.unescape(t)
    return ''.join(SPECIAL.get(c) or UNI.get(c) or c for c in t)


def url(u):
    return html.unescape(u).replace('\\', '/').replace('%', r'\%').replace('#', r'\#')


def tex(s):
    """HTML (<a href>, <b>, <strong>, <em>, <i>, <sub>) and Unicode -> LaTeX"""
    out, pos = [], 0
    for m in re.finditer(r'<(/?)(a|b|strong|em|i|sub)\b([^>]*)>', s):
        out.append(plain(s[pos:m.start()])); pos = m.end()
        close, tag, attrs = m.groups()
        if close: out.append('}'); continue
        if tag == 'a':
            href = re.search(r'href="([^"]*)"', attrs)
            out.append(r'\cvlink{%s}{' % url(href.group(1) if href else ''))
        else:
            out.append({'b': r'\textbf{', 'strong': r'\textbf{', 'em': r'\emph{', 'i': r'\emph{', 'sub': r'\textsubscript{'}[tag])
    out.append(plain(s[pos:]))
    return ''.join(out)


def note_text(n, where='cv'):
    if isinstance(n, dict):
        return None if n.get(where) is False else n['text']
    return n


# ---------- sections ----------
def header(D):
    """name and title on the left, contacts in a 2 x 2 block on the right (the CV's original layout)"""
    P = D['person']
    cell = lambda href, icon, text: r'\href{%s}{%s\ \ %s}' % (href, icon, plain(text))
    return '\n'.join([
        r'\begin{tabular*}{\textwidth}{@{}l@{\extracolsep{\fill}}r@{}}',
        r'  \begin{tabular}[c]{@{}l@{}}{\huge \bfseries\scshape %s} \\ \large %s\end{tabular} &' % (plain(P['name']), plain(P['cvTitle'])),
        r'  \begin{tabular}[c]{@{}l@{\hspace{2.2em}}l@{}}',
        r'    %s & %s \\' % (cell('mailto:' + P['email'], r'\faEnvelope', P['email']), cell('tel:' + re.sub(r'[^+\d]', '', P['phone']), r'\faPhone', P['phone'])),
        r'    %s & %s' % (cell('mailto:' + P['email2'], r'\faEnvelopeSquare', P['email2']), cell('https://' + P['web'], r'\faGlobe', P['web'])),
        r'  \end{tabular}',
        r'\end{tabular*}', ''])


def education(D):
    L = [r'\resumeSubHeadingListStart']
    for e in D['education']:
        if e.get('cv') is False: continue
        name = plain(e['school'])
        L.append(r'  \educationSubheading{%s}{%s}{%s}{%s}' % (name, tex(e['dates']), tex(e['cvDegree']), tex(e.get('gpa', ''))))
        notes = [t for t in (note_text(n) for n in e['notes']) if t]
        if notes:
            L += [r'  \begin{itemize}\small'] + [r'    \item %s' % tex(t) for t in notes] + [r'  \end{itemize}']
    L.append(r'\resumeSubHeadingListEnd')
    return '\n'.join(L) + '\n'


def authors(p, me):
    n = max(3, p['authors'].index(me) + 1 if me in p['authors'] else 3)   # up to and including me (at least three), then et al.
    a = [r'\textbf{%s}' % plain(x) if x == me else plain(x) for x in p['authors'][:n]]
    return ', '.join(a) + (', et al.' if p.get('etal') or len(p['authors']) > n else '')


def publication(p, me):
    links = []
    if p.get('arxiv'): links.append(r'\cvlink{https://arxiv.org/abs/%s}{arXiv:%s}' % (p['arxiv'], p['arxiv']))
    if p.get('ascl'): links.append(r'\cvlink{https://ascl.net/%s}{ascl:%s}' % (p['ascl'], p['ascl']))
    if p.get('github'): links.append(r'\cvlink{%s}{GitHub}' % url(p['github']))
    venue = '' if p['venue'] == 'Preprint' else plain(p['venue']) + '. '
    return r'  \item %s (%s). \emph{%s}. %s%s' % (authors(p, me), p['year'], plain(p['title']), venue, ' $|$ '.join(links))


def publications(D):
    me, P = D['me'], [p for p in D['pubs'] if p.get('cv') is not False]
    groups = [('Peer-reviewed articles', lambda p: p['kind'] == 'paper' and p['venue'] != 'Preprint'),
              ('Preprints', lambda p: p['kind'] == 'paper' and p['venue'] == 'Preprint'),
              ('Software', lambda p: p['kind'] == 'software'),
              ('Conference abstracts', lambda p: p['kind'] == 'abstract')]
    L = []
    for title, keep in groups:
        ps = [p for p in P if keep(p)]
        if not ps: continue
        L += [r'\subsection*{%s}' % title, r'\begin{itemize}[leftmargin=0.15in, label={}, itemsep=2pt]']
        L += [publication(p, me) for p in ps] + [r'\end{itemize}']
    return '\n'.join(L) + '\n'


def experience(D):
    L = [r'\resumeSubHeadingListStart']
    for x in D['experience']:
        if x.get('cv') is False: continue
        L.append(r'  \resumeSubheading{%s}{%s}{\textit{%s}}{}' % (tex(x['title']), tex(x.get('dates', '')), tex(x.get('people', ''))))
        L += [r'  \resumeItemListStart'] + [r'    \resumeItem{%s}' % tex(t) for t in x['points']] + [r'  \resumeItemListEnd']
    L.append(r'\resumeSubHeadingListEnd')
    return '\n'.join(L) + '\n'


def awards(D):
    L = [r'\resumeSubHeadingListStart']
    for a in D['awards']:
        if a.get('cv') is False: continue
        t = r'\href{%s}{\textbf{%s}}' % (url(a['url']), plain(a['title'])) if a.get('url') else r'\textbf{%s}' % plain(a['title'])
        L.append(r'  \scholasticitem{%s, %s.}{%s}' % (t, tex(a['detail']), a['year']))
    L.append(r'\resumeSubHeadingListEnd')
    return '\n'.join(L) + '\n'


def labelled(items):
    L = [r'\begin{itemize}[leftmargin=0.15in, label={}, itemsep=0pt]']
    L += [r'  \item \textbf{%s}: %s' % (plain(i['label']), tex(i['text'])) for i in items]
    return '\n'.join(L + [r'\end{itemize}']) + '\n'


def collaborations(D):
    L = [r'\begin{itemize}[leftmargin=0.15in, label={}, itemsep=0pt]']
    L += [r'  \item \cvlink{%s}{%s}' % (url(c['url']), plain(c['name'])) for c in D['collaborations']]
    return '\n'.join(L + [r'\end{itemize}']) + '\n'


def teaching(D):
    L = [r'\begin{itemize}[leftmargin=0.15in, label={}]']
    for t in D['teaching']:
        role = r'\href{%s}{\textbf{%s}}' % (url(t['url']), plain(t['role'])) if t.get('url') else r'\textbf{%s}' % plain(t['role'])
        L.append(r'  \item %s $|$ \emph{%s} \hfill %s' % (role, tex(t['course']), tex(t['dates'])))
        L += [r'  \begin{itemize}\small'] + [r'    \item %s' % tex(p) for p in t['points']] + [r'  \end{itemize}']
    return '\n'.join(L + [r'\end{itemize}']) + '\n'


def competitions(D):
    L = [r'\begin{itemize}[leftmargin=0.15in, label={}]']
    for c in D['competitions']:
        L.append(r'  \item \href{%s}{\textbf{%s}} $|$ %s \hfill %s' % (url(c['url']), plain(c['title']), tex(c['result']), tex(c['dates'])))
        L += [r'  \begin{itemize}\small'] + [r'    \item %s' % tex(p) for p in c['points']] + [r'  \end{itemize}']
    return '\n'.join(L + [r'\end{itemize}']) + '\n'


def talks(D):
    L = [r'\begin{itemize}[leftmargin=0.15in, label={}, itemsep=2pt]']
    row = r'  \item \begin{tabular*}{0.97\textwidth}[t]{@{}p{0.8\textwidth}@{\extracolsep{\fill}}r@{}}\raggedright \emph{%s}, %s, %s & %s \end{tabular*}'
    L += [row % (plain(t['title']), plain(t['event']), plain(t['place']), tex(t['date'])) for t in D['talks']]
    return '\n'.join(L + [r'\end{itemize}']) + '\n'


SECTIONS = {'header': header, 'talks': talks, 'education': education, 'publications': publications, 'experience': experience,
            'awards': awards, 'collaborations': collaborations, 'teaching': teaching, 'competitions': competitions,
            'skills': lambda D: labelled(D['skills']), 'coursework': lambda D: labelled(D['coursework']),
            'outreach': lambda D: labelled(D['outreach'])}


def main():
    D = load_data()
    GEN.mkdir(exist_ok=True)
    for name, f in SECTIONS.items():
        (GEN / f'{name}.tex').write_text('% generated by tools/build_cv.py from assets/data.js: edit the data, not this file\n' + f(D))
    print(f'wrote {len(SECTIONS)} sections to cv/generated/')
    if '--tex-only' in sys.argv: return
    subprocess.run(['latexmk', '-pdf', '-interaction=nonstopmode', '-halt-on-error', '-outdir=build', 'cvmain.tex'], cwd=CV, check=True,
                   stdout=subprocess.DEVNULL)
    shutil.copy(CV / 'build' / 'cvmain.pdf', ROOT / 'assets' / 'docs' / 'Paras_CV.pdf')
    print('built assets/docs/Paras_CV.pdf')


if __name__ == '__main__':
    main()
