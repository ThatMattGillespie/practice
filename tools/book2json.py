"""Convert the Lamp of Wisdom PDF into reflowable JSON for the in-site reader.

usage: python book2json.py <book.pdf> <out.json>
Needs PyMuPDF. The output is plain text of a restricted book: keep it in
../private and only publish the encrypted copy (tools/encrypt.mjs does that).
"""
import base64
import collections
import html
import json
import re
import sys

import fitz

SRC, OUT = sys.argv[1], sys.argv[2]
doc = fitz.open(SRC)

HEAD_Y = 30      # running heads live above this
FOOT_Y = 470     # page numbers live below this


def is_sc(font):
    return 'SC7' in font or 'SC700' in font


def is_note_font(span):
    f = span['font']
    return span['size'] <= 6.6 and ('Arial' in f or 'Helvetica' in f)


# ---- table of contents (page 7) gives chapter titles in order -------------
toc = []
for line in doc[6].get_text().splitlines():
    m = re.match(r'(Chapter (\d+): (.+?)|(Glossary of Key Terms))\.*\s*\.*\s*(\d+)\s*$', line.strip())
    if m:
        if m.group(4):
            toc.append({'n': None, 'title': 'Glossary of Key Terms'})
        else:
            toc.append({'n': int(m.group(2)), 'title': m.group(3).rstrip(' .')})

# ---- word list for hyphenation decisions ----------------------------------
all_text = ' '.join(p.get_text() for p in doc)
vocab = collections.Counter(w.lower() for w in re.findall(r"[A-Za-zÀ-ž]+(?:-[A-Za-zÀ-ž]+)*", all_text))


def join_hyphen(left, right):
    """left ends with '-'. Decide if the hyphen is a line-break artifact."""
    a = re.search(r'([A-Za-zÀ-ž]+)-$', left)
    b = re.match(r'([A-Za-zÀ-ž]+)', right)
    if not a or not b:
        return left + right
    whole = (a.group(1) + b.group(1)).lower()
    hyph = (a.group(1) + '-' + b.group(1)).lower()
    if vocab[hyph] > 0 and vocab[whole] == 0:
        return left + right
    if right[:1].isupper():
        return left + right
    return left[:-1] + right


# ---- find chapter start pages ----------------------------------------------
starts = []  # (page index, toc index)
ti = 0
for pno in range(8, doc.page_count):
    if ti >= len(toc):
        break
    top = ' '.join(s['text'] for b in doc[pno].get_text('dict')['blocks'] if b['type'] == 0
                   for l in b['lines'] for s in l['spans'] if s['bbox'][1] < 160)
    want = f"Chapter {toc[ti]['n']}" if toc[ti]['n'] else 'lossary'
    squashed = re.sub(r'\s+', ' ', top)
    if (toc[ti]['n'] and re.search(rf'Chapter\s*{toc[ti]["n"]}\b', squashed)) or (not toc[ti]['n'] and 'lossary' in squashed and pno > 100):
        starts.append((pno, ti))
        ti += 1
assert len(starts) == len(toc), (len(starts), len(toc), toc[len(starts):len(starts) + 1])

images = {}


def save_image(xref, pno):
    pix = fitz.Pixmap(doc, xref)
    if pix.n - pix.alpha >= 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    if pix.width > 900:
        pix.shrink(1 if pix.width < 1800 else 2)
    if pix.alpha:
        data, mime = pix.tobytes('png'), 'image/png'
    else:
        data, mime = pix.tobytes('jpeg', jpg_quality=72), 'image/jpeg'
    iid = f'img{xref}'
    images[iid] = f'data:{mime};base64,' + base64.b64encode(data).decode()
    return iid, pix.width, pix.height


def span_html(s):
    t = html.escape(s['text'])
    if (s['flags'] & 1 or s['size'] < 8) and re.fullmatch(r'\s*\d+\s*', s['text']):
        return f'<sup data-fn="{s["text"].strip()}">{s["text"].strip()}</sup>'
    f = s['font']
    if 'Italic' in f or 'Ital' in f:
        t = f'<em>{t}</em>'
    if ('SemiBold' in f or 'Bold' in f) and not is_sc(f):
        t = f'<strong>{t}</strong>'
    return t


chapters = []
for ci, (pstart, ti) in enumerate(starts):
    pend = starts[ci + 1][0] if ci + 1 < len(starts) else doc.page_count
    ch = {'n': toc[ti]['n'], 'title': toc[ti]['title'], 'blocks': [], 'notes': {}}
    cur = None          # open paragraph dict
    last_note = None

    def close():
        global cur
        if cur and cur['html'].strip():
            cur['html'] = re.sub(r'</(em|strong)>(\s*)<\1>', r'\2', cur['html']).strip()
            ch['blocks'].append(cur)
        cur = None

    for pno in range(pstart, pend):
        page = doc[pno]
        tables = []
        try:
            for tb in page.find_tables().tables:
                rows = [[(c or '').replace('\n', ' ').strip() for c in r] for r in tb.extract()]
                if len(rows) > 1 and len(rows[0]) > 1:
                    tables.append((fitz.Rect(tb.bbox), rows))
        except Exception:
            pass
        items = []  # (y, kind, payload)
        for img in page.get_images(full=True):
            for r in page.get_image_rects(img[0]):
                items.append((r.y0, 'img', (img[0], r)))
        for rect, rows in tables:
            items.append((rect.y0, 'table', rows))
        body_x = []
        lines = []
        for b in page.get_text('dict')['blocks']:
            if b['type'] != 0:
                continue
            for l in b['lines']:
                spans = [s for s in l['spans'] if s['text'].strip() or s['text'] == ' ']
                if not spans:
                    continue
                y0, x0 = l['bbox'][1], l['bbox'][0]
                if y0 < HEAD_Y or (y0 > FOOT_Y and re.fullmatch(r'[\divxlc\s]+', ''.join(s['text'] for s in spans))):
                    continue
                if any(fitz.Rect(l['bbox']).intersects(r) for r, _ in tables):
                    continue
                if pno == pstart and (any(is_sc(s['font']) for s in spans) or re.fullmatch(r'\s*Chapter\s*\d+\s*', ''.join(s['text'] for s in spans))):
                    continue  # chapter heading art; title comes from the TOC
                lines.append(l)
                if not is_note_font(spans[0]) and abs(spans[0]['size'] - 10) < 0.6:
                    body_x.append(round(x0))
        margin = collections.Counter(body_x).most_common(1)[0][0] if body_x else 0
        # Footnotes start at the first note-font line that begins with "N." near the bottom.
        note_y = min([l['bbox'][1] for l in lines if is_note_font(l['spans'][0]) and l['bbox'][1] > 300
                      and re.match(r'\s*\d+\.\s', ''.join(x['text'] for x in l['spans']))] or [9999])
        notes_lines = [l for l in lines if l['bbox'][1] >= note_y - 1 and is_note_font(l['spans'][0])]
        body_lines = [l for l in lines if l not in notes_lines]
        # Merge fragments that share a baseline (superscripts come out as separate lines).
        body_lines.sort(key=lambda l: (l['bbox'][1] + l['bbox'][3]) / 2)
        merged = []
        for l in body_lines:
            yc = (l['bbox'][1] + l['bbox'][3]) / 2
            if merged and abs(merged[-1]['_yc'] - yc) < 4.5:
                m = merged[-1]
                m['spans'] = sorted(m['spans'] + l['spans'], key=lambda sp: sp['bbox'][0])
                m['bbox'] = (min(m['bbox'][0], l['bbox'][0]), min(m['bbox'][1], l['bbox'][1]), max(m['bbox'][2], l['bbox'][2]), max(m['bbox'][3], l['bbox'][3]))
                continue
            merged.append({'spans': list(l['spans']), 'bbox': tuple(l['bbox']), '_yc': yc})
        for l in merged:
            items.append((l['bbox'][1], 'line', l))
        for l in notes_lines:
            items.append((l['bbox'][1] + 1000, 'note', l))
        items.sort(key=lambda it: (it[0], 0 if it[1] != 'line' else 1))

        first_body_line = True
        for y, kind, payload in items:
            if kind == 'img':
                close()
                xref, r = payload
                if r.width < 20 or r.height < 20:
                    continue
                iid, w, h = save_image(xref, pno)
                ch['blocks'].append({'t': 'img', 'src': iid, 'w': w, 'h': h, 'emblem': pno == pstart and r.width < 120})
                continue
            if kind == 'table':
                close()
                ch['blocks'].append({'t': 'table', 'rows': payload})
                continue
            l = payload
            spans = [s for s in l['spans'] if s['text']]
            text = ''.join(s['text'] for s in spans)
            x0 = l['bbox'][0]
            if kind == 'note':
                m = re.match(r'\s*(\d+)\.\s*', text)
                body = ''.join(span_html(s) for s in spans)
                if m:
                    last_note = m.group(1)
                    body = re.sub(r'^\s*\d+\.\s*', '', body)
                    ch['notes'][last_note] = body.strip()
                elif last_note:
                    prev = ch['notes'][last_note]
                    ch['notes'][last_note] = join_hyphen(prev, body.strip()) if prev.endswith('-') else prev + ' ' + body.strip()
                continue
            size = max([s['size'] for s in spans if s['text'].strip() and s['size'] >= 8] or [10])
            bold = all(('SemiBold' in s['font'] or 'Bold' in s['font']) for s in spans if s['text'].strip() and s['size'] >= 8)
            bullet = text.lstrip()[:1] in ('•', '◊')
            if bold and size >= 10.4 and not bullet:
                level = 'h2' if size >= 10.9 else 'h3'
                if cur and cur['t'] == level and cur.get('_y', 0) > y - 16:
                    cur['html'] += ' ' + html.escape(text.strip())
                    cur['_y'] = y
                    continue
                close()
                cur = {'t': level, 'html': html.escape(text.strip()), '_y': y}
                continue
            if cur and cur['t'] in ('h2', 'h3'):
                close()
            seg = ''.join(span_html(s) for s in spans)
            indent = x0 - margin
            numbered = bool(re.match(r'\s*\d+\.\s', text)) and ('Bold' in spans[0]['font'])
            if cur is None or cur['t'] in ('h2', 'h3') or bullet or numbered:
                new_para = True
            else:
                ended = bool(re.search(r'[.!?:;”"’)\]]\s*(</\w+>\s*)*$', cur['html']))
                if not ended:
                    new_para = False  # mid-sentence: always a continuation
                elif first_body_line:
                    new_para = indent > 6 or cur['t'] == 'li' or cur.get('_hang')
                elif cur['t'] == 'li' or cur.get('_hang'):
                    new_para = x0 < cur['_x0'] - 3 or abs(x0 - cur['_x0']) < 2 and x0 != cur['_x']
                else:
                    new_para = x0 > cur['_x'] + 6
            first_body_line = False
            if new_para:
                close()
                t = 'li' if bullet else 'p'
                if bullet:
                    seg = re.sub(r'^\s*[•◊]\s*', '', seg)
                cur = {'t': t, 'html': seg.strip(), '_x0': x0, '_x': x0, '_hang': numbered}
            else:
                left = cur['html'].rstrip()
                piece = seg.strip()
                cur['html'] = join_hyphen(left, piece) if left.endswith('-') else left + ' ' + piece
                cur['_x'] = x0
    close()
    for b in ch['blocks']:
        for k in ('_y', '_x', '_x0', '_hang'):
            b.pop(k, None)
        if 'html' in b:
            h = re.sub(r'\s+', ' ', b['html']).replace(' ,', ',')
            h = re.sub(r'<(strong|em)>\s*</\1>', ' ', h).strip()
            if b['t'] == 'p' and re.match(r'^(?:<\w+>)*\s*[•◊]', h):
                b['t'] = 'li'
            b['html'] = re.sub(r'^((?:<\w+>)*)\s*[•◊]\s*', r'\1', h)
    ch['blocks'] = [b for b in ch['blocks'] if b.get('html', 'x').strip() and re.sub(r'<[^>]+>', '', b.get('html', 'x')).strip()]
    chapters.append(ch)

# Short front matter worth keeping: the notice and dedication.
front = doc[0].get_text().split('\n\n')
_p0 = re.sub(r'\s+', ' ', doc[0].get_text())
notice = (re.search(r'This book is a restricted.*?directly\.', _p0) or [''])[0]
copyright = (re.search(r'Copyright ©[^.]*?DiPerna', _p0) or [''])[0]
dedication = ''
for pno in range(1, 6):
    t = doc[pno].get_text()
    if 'Dedication' in t:
        dedication = re.sub(r'\s+', ' ', t.split('Dedication', 1)[1]).strip()
        blurb = re.sub(r'\s+', ' ', t.split('Dedication', 1)[0]).strip()

book = {
    'title': 'Lamp of Wisdom',
    'subtitle': 'A Modern Guide to the Gradual Path of Enlightenment',
    'author': 'Dustin DiPerna',
    'notice': notice,
    'blurb': blurb,
    'dedication': dedication,
    'copyright': copyright,
    'chapters': chapters,
    'images': images,
}
with open(OUT, 'w') as f:
    json.dump(book, f, ensure_ascii=False)
words = sum(len(re.sub('<[^>]+>', '', b.get('html', '')).split()) for c in chapters for b in c['blocks'])
print(f'{len(chapters)} chapters, {words} words, {len(images)} images, {sum(len(c["notes"]) for c in chapters)} notes')
