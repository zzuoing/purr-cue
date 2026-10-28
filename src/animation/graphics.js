// Small GDI+ compatibility layer. Scene bodies retain the original drawing order.
export class Color {
  constructor(r, g, b, a = 255) { Object.assign(this, { r, g, b, a }); }
  static FromArgb(...v) {
    if (v.length === 2) return new Color(v[1].r, v[1].g, v[1].b, v[0]);
    return v.length === 3 ? new Color(...v) : new Color(v[1], v[2], v[3], v[0]);
  }
  static White = new Color(255, 255, 255);
  toString() { return `rgba(${this.r},${this.g},${this.b},${this.a / 255})`; }
}
export class SolidBrush { constructor(color) { this.color = color; } }
export class Pen {
  constructor(color, width = 1) { Object.assign(this, { color, width, StartCap: 'butt', EndCap: 'butt', LineJoin: 'miter' }); }
}
export const LineCap = { Round: 'round' };
export const LineJoin = { Round: 'round' };
export const StringAlignment = { Center: 'center' };
export const CombineMode = { Intersect: 'intersect' };
export const FontStyle = { Bold: 'bold', Regular: 'normal' };
export class Font {
  constructor(name, size, style = 'normal') { Object.assign(this, { name, size, style }); }
}
export class PointF { constructor(X, Y) { Object.assign(this, { X, Y }); } }
export class RectangleF {
  constructor(X, Y, Width, Height) { Object.assign(this, { X, Y, Width, Height }); }
  get Left() { return this.X; } get Top() { return this.Y; }
  get Right() { return this.X + this.Width; } get Bottom() { return this.Y + this.Height; }
}
export class GraphicsPath {
  constructor() { this.path = new Path2D(); this.started = false; this.end = null; this.points = []; this.types = []; }
  AddBezier(x, y, ...rest) {
    if (!this.started) { this.path.moveTo(x, y); this.points.push([x, y]); this.types.push(0); }
    else if (!this.end || this.end[0] !== x || this.end[1] !== y) { this.path.lineTo(x, y); this.points.push([x, y]); this.types.push(1); }
    this.path.bezierCurveTo(...rest); this.started = true; this.end = rest.slice(-2);
    for (let i = 0; i < rest.length; i += 2) { this.points.push([rest[i], rest[i + 1]]); this.types.push(3); }
  }
  AddPolygon(points) {
    this.path.moveTo(points[0].X, points[0].Y);
    for (const p of points.slice(1)) this.path.lineTo(p.X, p.Y);
    this.path.closePath(); this.started = false; this.end = null;
    this.points.push(...points.map(p => [p.X, p.Y])); this.types.push(...points.map((_, i) => i === 0 ? 0 : 1));
    this.types[this.types.length - 1] |= 128;
  }
  CloseFigure() { this.path.closePath(); this.started = false; this.end = null; if (this.types.length) this.types[this.types.length - 1] |= 128; }
}
function rect(v) { return v.length === 1 ? [v[0].X, v[0].Y, v[0].Width, v[0].Height] : v; }
function polygon(points) { const p = new GraphicsPath(); p.AddPolygon(points); return p.path; }
export class Graphics {
  constructor(context) { this.c = context; }
  Save() { this.c.save(); } Restore() { this.c.restore(); }
  // GDI+ prepends transforms: translate then scale maps local coordinates as T * S.
  TranslateTransform(x, y) { this.c.translate(x, y); }
  ScaleTransform(x, y) { this.c.scale(x, y); }
  SetClip(shape) {
    if (shape.path) this.c.clip(shape.path, 'evenodd');
    else { const p = new Path2D(); p.rect(...rect([shape])); this.c.clip(p); }
  }
  fill(brush, p) { this.c.fillStyle = String(brush.color); this.c.fill(p, 'evenodd'); }
  stroke(pen, p) {
    this.c.strokeStyle = String(pen.color); this.c.lineWidth = pen.width;
    this.c.lineCap = pen.StartCap; this.c.lineJoin = pen.LineJoin; this.c.miterLimit = 10;
    this.c.stroke(p);
  }
  ellipse(v) { const [x, y, w, h] = rect(v); const p = new Path2D(); p.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2); return p; }
  rectangle(v) { const p = new Path2D(); p.rect(...rect(v)); return p; }
  FillEllipse(b, ...v) { this.fill(b, this.ellipse(v)); }
  DrawEllipse(b, ...v) { this.stroke(b, this.ellipse(v)); }
  FillRectangle(b, ...v) { this.fill(b, this.rectangle(v)); }
  DrawRectangle(b, ...v) { this.stroke(b, this.rectangle(v)); }
  FillPolygon(b, points) { this.fill(b, polygon(points)); }
  DrawPolygon(b, points) { this.stroke(b, polygon(points)); }
  FillPath(b, p) { this.fill(b, p.path); }
  DrawPath(b, p) { this.stroke(b, p.path); }
  DrawLine(b, ...v) {
    if (v.length === 2) v = [v[0].X, v[0].Y, v[1].X, v[1].Y];
    const p = new Path2D(); p.moveTo(v[0], v[1]); p.lineTo(v[2], v[3]); this.stroke(b, p);
  }
  DrawBezier(b, x, y, ...v) { const p = new Path2D(); p.moveTo(x, y); p.bezierCurveTo(...v); this.stroke(b, p); }
  DrawArc(b, x, y, w, h, start, sweep) {
    // GDI+ angles are geometric angles from the ellipse center, not ellipse parameters.
    const parameter = degrees => {
      const a = degrees * Math.PI / 180;
      return Math.atan2(w * Math.sin(a), h * Math.cos(a));
    };
    const p = new Path2D();
    let a = parameter(start), z = parameter(start + sweep);
    if (sweep > 0 && z <= a) z += Math.PI * 2;
    if (sweep < 0 && z >= a) z -= Math.PI * 2;
    p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, a, z, sweep < 0);
    this.stroke(b, p);
  }
  DrawString(text, font, brush, r) {
    this.c.save(); this.c.font = `${font.style} ${font.size * 4 / 3}px "${font.name}", sans-serif`;
    this.c.fillStyle = String(brush.color); this.c.textAlign = 'center'; this.c.textBaseline = 'middle';
    this.c.fillText(text, r.X + r.Width / 2, r.Y + r.Height / 2); this.c.restore();
  }
}
