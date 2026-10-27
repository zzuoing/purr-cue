using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

internal static class BreatheConceptRenderer
{
    private static void Main(string[] args)
    {
        string output = args.Length > 0 ? args[0] : "breathe-geometric-cat.png";
        using (Bitmap bitmap = new Bitmap(900, 450, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bitmap))
        {
            g.Clear(Color.Transparent);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.ScaleTransform(2.15F, 2.15F);
            DrawWindow(g, 150F, 28F);
            DrawCat(g, 112F, 92F);
            bitmap.Save(output, ImageFormat.Png);
        }
    }

    private static void DrawWindow(Graphics g, float x, float y)
    {
        PointF[] outerFrame =
        {
            new PointF(x + 24, y + 15), new PointF(x + 169, y + 4),
            new PointF(x + 169, y + 108), new PointF(x + 24, y + 121)
        };
        PointF[] opening =
        {
            new PointF(x + 35, y + 25), new PointF(x + 157, y + 16),
            new PointF(x + 157, y + 96), new PointF(x + 35, y + 107)
        };
        PointF[] sill =
        {
            new PointF(x + 17, y + 121), new PointF(x + 169, y + 108),
            new PointF(x + 187, y + 118), new PointF(x + 34, y + 134)
        };

        using (SolidBrush frame = new SolidBrush(Color.FromArgb(117, 82, 55)))
        using (SolidBrush sky = new SolidBrush(Color.FromArgb(193, 228, 241)))
        using (SolidBrush curtain = new SolidBrush(Color.FromArgb(232, 239, 222)))
        using (Pen outline = new Pen(Color.FromArgb(72, 58, 48), 3F))
        using (Pen breeze = new Pen(Color.FromArgb(91, 176, 211), 3F))
        {
            outline.LineJoin = LineJoin.Round;
            breeze.StartCap = LineCap.Round;
            breeze.EndCap = LineCap.Round;

            g.FillPolygon(frame, outerFrame);
            g.DrawPolygon(outline, outerFrame);
            g.FillPolygon(sky, opening);
            g.DrawPolygon(outline, opening);
            g.DrawLine(outline, x + 96, y + 21, x + 96, y + 102);
            g.DrawLine(outline, x + 35, y + 66, x + 157, y + 56);

            g.FillPolygon(frame, sill);
            g.DrawPolygon(outline, sill);

            using (GraphicsPath curtainPath = new GraphicsPath())
            {
                curtainPath.AddBezier(x + 27, y + 17, x + 18, y + 45, x + 47, y + 57, x + 29, y + 91);
                curtainPath.AddBezier(x + 29, y + 91, x + 48, y + 84, x + 55, y + 48, x + 47, y + 22);
                curtainPath.CloseFigure();
                g.FillPath(curtain, curtainPath);
                g.DrawPath(outline, curtainPath);
            }

            g.DrawBezier(breeze, x + 213, y + 40, x + 189, y + 31, x + 174, y + 46, x + 145, y + 40);
            g.DrawBezier(breeze, x + 218, y + 73, x + 190, y + 64, x + 174, y + 82, x + 146, y + 73);
        }
    }

    private static void DrawCat(Graphics g, float x, float y)
    {
        Color orange = Color.FromArgb(230, 145, 62);
        Color light = Color.FromArgb(251, 220, 170);
        Color outline = Color.FromArgb(72, 61, 55);
        using (SolidBrush body = new SolidBrush(orange))
        using (SolidBrush muzzle = new SolidBrush(light))
        using (SolidBrush dark = new SolidBrush(outline))
        using (Pen pen = new Pen(outline, 3F))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.FillEllipse(body, x + 30, y + 28, 82, 48);
            g.DrawEllipse(pen, x + 30, y + 28, 82, 48);
            g.FillEllipse(body, x + 84, y + 4, 48, 48);
            g.DrawEllipse(pen, x + 84, y + 4, 48, 48);
            g.FillPolygon(body, new[] { new PointF(x + 91, y + 12), new PointF(x + 94, y - 9), new PointF(x + 108, y + 5) });
            g.FillPolygon(body, new[] { new PointF(x + 113, y + 4), new PointF(x + 126, y - 9), new PointF(x + 129, y + 15) });
            g.DrawPolygon(pen, new[] { new PointF(x + 91, y + 12), new PointF(x + 94, y - 9), new PointF(x + 108, y + 5) });
            g.DrawPolygon(pen, new[] { new PointF(x + 113, y + 4), new PointF(x + 126, y - 9), new PointF(x + 129, y + 15) });
            g.FillEllipse(muzzle, x + 100, y + 29, 23, 15);
            g.FillEllipse(dark, x + 99, y + 19, 4, 6);
            g.FillEllipse(dark, x + 118, y + 19, 4, 6);
            g.FillEllipse(dark, x + 109, y + 31, 5, 4);
            g.DrawLine(pen, x + 54, y + 66, x + 51, y + 89);
            g.DrawLine(pen, x + 76, y + 67, x + 79, y + 89);
            g.DrawLine(pen, x + 98, y + 64, x + 95, y + 88);
            g.DrawArc(pen, x - 10, y + 28, 52, 48, 160, 190);
        }
    }
}
