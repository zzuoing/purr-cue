"""One-time, auditable mechanical port of the original GDI+ animation bodies.
The shipped app runs JavaScript only; this script is not part of builds.
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root / 'legacy' / 'DesktopReminderApp.cs').read_text(encoding='utf-8-sig')
start = source.index('    private static float Clamp01')
end = source.index('\ninternal sealed class ReminderForm')
text = source[start:end].rstrip().removesuffix('}').rstrip()
# Keep each using scope, but GC replaces IDisposable resource management.
lines = []
for line in text.splitlines():
    if 'using (' in line:
        line = line.replace('using (', '', 1).rstrip()
        assert line.endswith(')'), line
        line = line[:-1] + ';'
    lines.append(line)
text = '\n'.join(lines)
types = r'(?:float|double|int|bool|Color|Graphics|GraphicsState|SolidBrush|Brush|Pen|PointF|RectangleF|GraphicsPath|Font|StringFormat)'
names = re.findall(r'private (?:static )?\w+ (\w+)\(', text)
text = re.sub(r'private (?:static )?\w+ (\w+)\(([^\n]*)\)',
              lambda m: 'function ' + m[1] + '(' + re.sub(types + r'\s+', '', m[2]) + ')', text)
# C# array initializers -> JS arrays (including anonymous new[] arguments).
text = re.sub(r'\b' + types + r'\[\]\s+(\w+)\s*=\s*\{([\s\S]*?)\};', r'let \1 = [\2];', text)
text = re.sub(r'new\[\]\s*\{([^}]+)\}', r'[\1]', text)
text = re.sub(r'new StringFormat\s*\{([^}]+)\}', lambda m: '({' + m[1].replace(' = ', ': ') + '})', text)
# Integer casts must truncate; float casts become f32 to retain original precision.
def cast_replace(s, typ, fn):
    token = '(' + typ + ')'
    while token in s:
        p = s.index(token)
        a = p + len(token)
        if s[a] == '(':
            depth, b = 1, a + 1
            while depth:
                if s[b] == '(': depth += 1
                if s[b] == ')': depth -= 1
                b += 1
        else:
            match = re.match(r'[\w.]+(?:\([^;]*?\))?', s[a:])
            b = a + len(match[0])
        s = s[:p] + fn + '(' + s[a:b] + ')' + s[b:]
    return s
text = cast_replace(text, 'int', 'Math.trunc')
text = text.replace('(float)', '')
text = re.sub(r'\w+\.Dispose\(\);', '', text)
text = re.sub(r'\bconst\s+' + types + r'\s+', 'const ', text)
text = re.sub(r'\b' + types + r'\s+(\w+)', r'let \1', text)
text = re.sub(r'(?<=\d)[FD]\b', '', text)
for a, b in [('Sin','sin'), ('Cos','cos'), ('Abs','abs'), ('Max','max'), ('Min','min')]:
    text = text.replace('Math.' + a, 'Math.' + b)
text = text.replace('.Length', '.length')
# The original int frame / 2 expression uses integer division.
text = text.replace('frame / 2,', 'Math.trunc(frame / 2),')
# Preserve float32 arithmetic before integer opacity casts in walking music notes.
# Without it, repeating rational values can truncate on the opposite side of an integer.
text = text.replace('let progress = (frame % 82) / 82;', 'let progress = Math.fround((frame % 82) / 82);')
text = text.replace('let second = ((frame + 42) % 104) / 104;', 'let second = Math.fround(((frame + 42) % 104) / 104);')
text = text.replace('Math.trunc((205 * (1 - progress)))', 'Math.trunc(Math.fround(205 * Math.fround(1 - progress)))')
text = text.replace('Math.trunc((175 * (1 - second / 0.72)))', 'Math.trunc(Math.fround(175 * Math.fround(1 - Math.fround(second / Math.fround(0.72)))))')
header = '''// Ported from legacy/DesktopReminderApp.cs. Same geometry, colors, formulas and ordering.
// Canvas rasterization/font antialiasing can differ from GDI+; no scene is substituted.
import { Color, SolidBrush, Pen, PointF, RectangleF, GraphicsPath, Font,
  LineCap, LineJoin, StringAlignment, CombineMode, FontStyle } from './graphics.js';
export function createScenes(ClientSize) {
'''
exports = '\nreturn { ' + ', '.join(names) + ' };\n}\n'
(root / 'src' / 'animation' / 'scenes.js').write_text(header + text + exports, encoding='utf-8')
print('Ported', len(names), 'animation functions')
