"""Compare native and JS geometry traces; rerunnable after export/verify scripts."""
import json
from pathlib import Path
root = Path(__file__).resolve().parent.parent
original = json.loads((root / 'work/reference-traces.json').read_text(encoding='utf-8-sig'))
canvas = json.loads((root / 'work/canvas-traces.json').read_text())
errors, numbers, maximum = [], 0, 0
def compare(x, y, label, key=''):
    global numbers, maximum
    if isinstance(x, list) and isinstance(y, list):
        if len(x) != len(y):
            errors.append([label, key, 'length', len(x), len(y)])
            return
        for i, (a, b) in enumerate(zip(x, y)): compare(a, b, label, key + '/' + str(i))
    elif isinstance(x, (int, float)) and isinstance(y, (int, float)):
        difference = abs(x - y)
        maximum = max(maximum, difference)
        numbers += 1
        # Float32 vs JS double: <0.02 logical px is permitted, opacity bytes must match.
        if difference > 0.02: errors.append([label, key, x, y, difference])
    elif x != y: errors.append([label, key, x, y])
assert len(original) == len(canvas)
for a, b in zip(original, canvas):
    label = f"{a['scene']}-{a['width']}-{a['frame']}"
    assert (a['scene'], a['width'], a['frame']) == (b['scene'], b['width'], b['frame'])
    compare(a['calls'], b['calls'], label)
result = dict(traces=len(original), numbers=numbers, maxDifference=maximum, errors=errors)
(root / 'work/trace-comparison.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result))
assert not errors, 'Animation geometry diverged from original'
