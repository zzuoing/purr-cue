using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

internal static class WaterConceptRenderer
{
    private static void Main(string[] args)
    {
        string output = args.Length > 0 ? args[0] : "water-geometric-cat.png";
        using (Bitmap bitmap = new Bitmap(900, 450, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bitmap))
        {
            g.Clear(Color.Transparent);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.ScaleTransform(2.15F, 2.15F);
            DrawCat(g, 112F, 92F);
            DrawWaterGlass(g, 249F, 137F);
            bitmap.Save(output, ImageFormat.Png);
        }
    }

    private static void DrawWaterGlass(Graphics g, float x, float y)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        Color glass = Color.FromArgb(205, 235, 245);
        Color water = Color.FromArgb(104, 190, 224);
        using (Pen outlinePen = new Pen(outline, 3F))
        using (Pen strawPen = new Pen(Color.FromArgb(72, 144, 178), 3F))
        using (SolidBrush glassBrush = new SolidBrush(Color.FromArgb(175, glass)))
        using (SolidBrush waterBrush = new SolidBrush(Color.FromArgb(205, water)))
        using (SolidBrush dropBrush = new SolidBrush(water))
        {
            outlinePen.LineJoin = LineJoin.Round;
            strawPen.StartCap = LineCap.Round;
            strawPen.EndCap = LineCap.Round;

            PointF[] cup =
            {
                new PointF(x, y), new PointF(x + 44, y),
                new PointF(x + 38, y + 62), new PointF(x + 7, y + 62)
            };
            PointF[] waterArea =
            {
                new PointF(x + 4, y + 24), new PointF(x + 40, y + 24),
                new PointF(x + 36, y + 57), new PointF(x + 9, y + 57)
            };
            g.FillPolygon(glassBrush, cup);
            g.FillPolygon(waterBrush, waterArea);
            g.DrawPolygon(outlinePen, cup);
            g.DrawLine(strawPen, x + 27, y + 47, x + 27, y - 16);
            g.DrawLine(strawPen, x + 27, y - 16, x - 25, y - 9);

            g.FillEllipse(dropBrush, x + 49, y + 13, 7, 10);
            g.FillEllipse(dropBrush, x + 58, y + 29, 5, 8);

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
