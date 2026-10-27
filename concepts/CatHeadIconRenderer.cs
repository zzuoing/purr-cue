using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

internal static class CatHeadIconRenderer
{
    private static void Main(string[] args)
    {
        string output = args.Length > 0 ? args[0] : "cat-head.png";
        using (Bitmap bitmap = new Bitmap(256, 256, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bitmap))
        {
            g.Clear(Color.Transparent);
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Color orange = Color.FromArgb(230, 145, 62);
            Color light = Color.FromArgb(251, 220, 170);
            Color outline = Color.FromArgb(72, 61, 55);
            using (SolidBrush body = new SolidBrush(orange))
            using (SolidBrush muzzle = new SolidBrush(light))
            using (SolidBrush dark = new SolidBrush(outline))
            using (Pen pen = new Pen(outline, 11F))
            {
                pen.LineJoin = LineJoin.Round;
                PointF[] leftEar =
                {
                    new PointF(55F, 76F), new PointF(72F, 14F), new PointF(116F, 63F)
                };
                PointF[] rightEar =
                {
                    new PointF(140F, 63F), new PointF(185F, 14F), new PointF(202F, 80F)
                };
                g.FillPolygon(body, leftEar);
                g.FillPolygon(body, rightEar);
                g.DrawPolygon(pen, leftEar);
                g.DrawPolygon(pen, rightEar);

                g.FillEllipse(body, 34F, 48F, 188F, 180F);
                g.DrawEllipse(pen, 34F, 48F, 188F, 180F);
                g.FillEllipse(muzzle, 86F, 142F, 84F, 58F);
                g.FillEllipse(dark, 79F, 111F, 13F, 18F);
                g.FillEllipse(dark, 164F, 111F, 13F, 18F);
                g.FillEllipse(dark, 121F, 153F, 16F, 12F);
                using (Pen mouth = new Pen(outline, 6F))
                {
                    mouth.StartCap = LineCap.Round;
                    mouth.EndCap = LineCap.Round;
                    g.DrawArc(mouth, 103F, 155F, 28F, 27F, 10, 85);
                    g.DrawArc(mouth, 126F, 155F, 28F, 27F, 85, 85);
                }
            }
            bitmap.Save(output, ImageFormat.Png);
        }
    }
}
