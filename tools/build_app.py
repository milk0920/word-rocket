"""Inject dict.json into app.src.html -> index.html (single file). Stdlib only.
Usage: python3 -I tools/build_app.py data/dict.json app.src.html docs/index.html"""
import json, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
names = sorted({v[1] for v in d['forms'].values()})
code = {n: str(i) for i, n in enumerate(names)}
out = {'w': {k: v[1] for k, v in d['words'].items()},
       'f': {k: [v[0], code[v[1]]] for k, v in d['forms'].items()},
       'fn': {c: n for n, c in code.items()}}
js = json.dumps(out, ensure_ascii=False, separators=(',', ':'), sort_keys=True).replace('</', '<\\/')
src = open(sys.argv[2], encoding='utf-8').read()
assert src.count('/*DICT*/') == 1
open(sys.argv[3], 'w', encoding='utf-8').write(src.replace('/*DICT*/', js))
print('bytes', len(src.replace('/*DICT*/', js).encode()))
