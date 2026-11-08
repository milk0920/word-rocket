import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def path(*parts):
    return os.path.join(ROOT, *parts)


class BuildTest(unittest.TestCase):
    def test_index_html_matches_a_fresh_build(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, 'index.html')
            subprocess.run([sys.executable, '-I', path('tools', 'build_app.py'), path('data', 'dict.json'),
                            path('app.src.html'), out], check=True, stdout=subprocess.DEVNULL)
            with open(out, 'rb') as a, open(path('docs', 'index.html'), 'rb') as b:
                self.assertEqual(a.read(), b.read(), 'docs/index.html is stale; rerun tools/build_app.py')

    def test_ocr_assets_are_present(self):
        for name in ('ocr-worker.js', 'eng-fast.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'):
            self.assertGreater(os.path.getsize(path('docs', 'ocr', name)), 1000, name)


class DictionaryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(path('data', 'dict.json'), encoding='utf-8') as f:
            cls.d = json.load(f)

    def meaning(self, word):
        return self.d['words'][word][1]

    def test_kid_meanings(self):
        self.assertEqual(self.meaning('apple'), 'n. 蘋果')
        self.assertEqual(self.meaning('get up'), '起床、起立')
        self.assertEqual(self.meaning('ice cream'), 'n. 冰淇淋')
        self.assertIn('鐘', self.meaning('bell'))

    def test_inflected_forms_point_to_their_lemma(self):
        self.assertEqual(self.d['forms']['went'], ['go', '過去式'])
        self.assertEqual(self.d['forms']['teeth'], ['tooth', '複數'])

    def test_meanings_are_traditional_chinese(self):
        simplified = set('们这个来时说过还没对发经动们见长门问书')
        bad = [w for w, v in self.d['words'].items() if simplified & set(v[1])]
        self.assertEqual(bad, [])


if __name__ == '__main__':
    unittest.main()
