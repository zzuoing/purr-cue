import { createScenes } from '../src/animation/scenes.js';
import { walkingX } from '../src/animation/player.js';
import { Color, SolidBrush, Pen, PointF, RectangleF, GraphicsPath, Font } from '../src/animation/graphics.js';
function normalize(value) {
  if (value instanceof Color) return ['color', value.r, value.g, value.b, value.a];
  if (value instanceof Pen) return ['pen', normalize(value.color), value.width, value.StartCap === 'round' ? 2 : 0, value.EndCap === 'round' ? 2 : 0, value.LineJoin === 'round' ? 2 : 0];
  if (value instanceof SolidBrush) return ['brush', normalize(value.color)];
  if (value instanceof PointF) return [value.X, value.Y];
  if (value instanceof RectangleF) return ['rect', value.X, value.Y, value.Width, value.Height];
  if (value instanceof GraphicsPath) return ['path', value.points, value.types];
  if (value instanceof Font) return ['font', value.name, value.size, value.style === 'bold' ? 1 : 0];
  if (Array.isArray(value)) return value.map(normalize);
  if (value === 'intersect') return 1;
  if (typeof value === 'object' && value) return ['format'];
  return value;
}
export function trace(scene, width, frame) {
  const calls = [];
  const g = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, name === 'Restore' ? [] : normalize(args)]); } });
  const s = createScenes({ Width: width, Height: 250 });
  if (scene === 'Walking') {
    const x = walkingX(frame);
    s.DrawWalkingBackground(g, width, 250, frame); s.DrawWalkingCat(g, x, 135, frame * 0.48); s.DrawWalkingMusicNotes(g, x, frame);
  } else if (scene === 'Window') s.DrawAnimatedWindowScene(g, frame);
  else if (scene === 'Water') s.DrawAnimatedWaterScene(g, frame);
  else if (scene === 'Eating') s.DrawEatingScene(g, frame);
  else if (scene === 'WorkStart' || scene === 'PackUp') s.DrawOfficeScene(g, frame, scene === 'WorkStart');
  else if (scene === 'Toilet') s.DrawToiletScene(g, frame);
  else { g.Save(); g.TranslateTransform(width / 2 - 82, 142); g.ScaleTransform(1.15, 1.15); s.DrawCat(g, 0, 0, false, frame); g.Restore(); }
  return calls;
}
