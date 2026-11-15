"""Build the kid dictation dictionary from ECDICT (MIT) + OpenCC tables (Apache-2.0). Stdlib only.

Usage: python3 -I tools/build_dict.py .cache/src data
"""
import csv, json, re, sys, os

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
csv.field_size_limit(10**8)

# ---------------- OpenCC s2twp (simplified -> Taiwan traditional with phrases) ----------------
def load(name):
    d = {}
    with open(os.path.join(SRC, 'OpenCC/data/dictionary', name), encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if not line or line.startswith('#'):
                continue
            k, v = line.split('\t', 1)
            d[k] = v.split(' ')[0]
    if name == 'STCharacters.txt':
        d['钟'] = '鐘'  # clock/bell far more common than the surname 鍾
    return d

def maxmatch(text, table, maxlen):
    out, i = [], 0
    while i < len(text):
        for L in range(min(maxlen, len(text) - i), 0, -1):
            seg = text[i:i + L]
            if seg in table:
                out.append(table[seg]); i += L; break
        else:
            out.append(text[i]); i += 1
    return ''.join(out)

st = load('STCharacters.txt'); st.update(load('STPhrases.txt'))
tw_ph = load('TWPhrases.txt'); tw_var = load('TWVariants.txt')
for bad in ('萬象', '觸摸'):  # TWPhrases maps 万象->永珍 (Vientiane); wrong in "包羅萬象"
    tw_ph.pop(bad, None)
ML1 = max(map(len, st)); ML2 = max(map(len, tw_ph)); ML3 = max(map(len, tw_var))
def s2twp(t):
    return maxmatch(maxmatch(maxmatch(t, st, ML1), tw_ph, ML2), tw_var, ML3)

# ---------------- meaning cleanup ----------------
POS_OK = re.compile(r'^(n|v|vt|vi|a|adj|adv|ad|prep|conj|pron|int|interj|art|num|aux|abbr)\.\s*')
POS_MAP = {'a': 'adj', 'ad': 'adv', 'vt': 'v', 'vi': 'v', 'interj': 'int'}
def clean_meaning(tr, max_pos=2, max_each=3):
    groups = []  # [(pos, [meanings])]
    for line in tr.replace('\\n', '\n').split('\n'):
        line = line.strip()
        if not line or line.startswith('['):
            continue
        if re.search(r'的(过去式|过去分词|现在分词|复数|第三人称|比较级|最高级)', line):
            continue
        m = POS_OK.match(line)
        pos = POS_MAP.get(m.group(1), m.group(1)) if m else ''
        body = line[m.end():] if m else line
        body = re.sub(r'\[[^\]]*\]|\([^)]*\)|（[^）]*）', '', body)
        items = [x.strip() for x in re.split(r'[,，;；]', body) if x.strip()]
        items = [x for x in items if not re.search(r'[A-Za-z]{3,}', x)]  # drop english-y glosses
        if not items:
            continue
        for g in groups:          # merge vt/vi into one "v."
            if g[0] == pos:
                g[1].extend(i for i in items if i not in g[1]); break
        else:
            groups.append((pos, items))
    groups = groups[:max_pos]
    parts = []
    for n, (pos, items) in enumerate(groups):
        conv = []
        for it in items:  # dedupe after conversion (自行车/脚踏车 -> 腳踏車 twice)
            c = s2twp(it)
            if c not in conv:
                conv.append(c)
        txt = '、'.join(conv[:max_each if n == 0 else 2])
        parts.append((pos + '. ' if pos else '') + txt)
    return '；'.join(parts)

def clean_phon(p):
    p = p.replace('ә', 'ə').replace('є', 'ɛ').replace("'", 'ˈ').replace(',', 'ˌ').strip()
    return p

# ---------------- select words ----------------
rows = {}
phrase_rows = []
with open(os.path.join(SRC, 'ECDICT/ecdict.csv'), encoding='utf-8') as f:
    for r in csv.DictReader(f):
        w = r['word']
        if not re.fullmatch(r"[A-Za-z][A-Za-z' -]*[A-Za-z]|[A-Za-z]", w):
            continue
        key = w.lower()
        tags = r['tag'].split()
        frq = int(r['frq'] or 0); bnc = int(r['bnc'] or 0)
        school = 'zk' in tags or 'gk' in tags
        common = (0 < frq <= 6000) or (0 < bnc <= 6000)
        phrase = ' ' in w
        if phrase and w == key and len(w.split()) <= 3 and r['translation'].strip():
            phrase_rows.append(r)        # decided after single words are known
        if not (school or (common and not phrase)):
            continue
        if not r['translation'].strip():
            continue
        # prefer the lowercase headword when both cases exist
        if key in rows and rows[key]['word'] == key and w != key:
            continue
        rows[key] = r

dic, infl = {}, {}
for key, r in rows.items():
    m = clean_meaning(r['translation'])
    if not m:
        continue
    lvl = 1 if 'zk' in r['tag'].split() else 2 if 'gk' in r['tag'].split() else 3
    dic[key] = [clean_phon(r['phonetic']), m, lvl]
# phrases made only of junior-level words (get up, go to bed, school bus ...), level 4
basic = {k for k, v in dic.items() if v[2] == 1}
for r in phrase_rows:
    key = r['word']
    if key in dic or not all(t in basic for t in key.split()):
        continue
    m = clean_meaning(r['translation'], max_pos=1, max_each=2)
    if m:
        dic[key] = ['', m, 4]
HERE = os.path.dirname(os.path.abspath(__file__))
for fname, src in (('overrides.json', 'override'), ('supplement.json', 'supplement')):
    for k, v in json.load(open(os.path.join(HERE, fname), encoding='utf-8')).items():
        if k.startswith('_'):
            continue
        if k in dic:
            dic[k] = [v[0] if v[0] is not None else dic[k][0], v[1], dic[k][2]]
        else:
            dic[k] = [v[0] or '', v[1], 1]
FORMS = {'p': '過去式', 'd': '過去分詞', 'i': '-ing 形式', '3': '第三人稱單數', 's': '複數', 'r': '比較級', 't': '最高級'}
for key, r in rows.items():
    if key not in dic:
        continue
    for part in r['exchange'].split('/'):
        if ':' not in part:
            continue
        k, v = part.split(':', 1)
        v = v.lower()
        if k in FORMS and v and v not in dic and re.fullmatch(r"[a-z'-]+", v):
            infl.setdefault(v, [key, FORMS[k]])

with open(os.path.join(OUT, 'dict.json'), 'w', encoding='utf-8') as f:
    json.dump({'v': 1, 'words': dic, 'forms': infl}, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
lv = [0, 0, 0, 0, 0]
for v in dic.values(): lv[v[2]] += 1
print('words', len(dic), 'level zk/gk/common/phrase', lv[1:], 'forms', len(infl),
      'bytes', os.path.getsize(os.path.join(OUT, 'dict.json')))
