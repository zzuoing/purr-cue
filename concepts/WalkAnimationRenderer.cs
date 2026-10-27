using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

internal static class WalkAnimationRenderer
{
    private static void Main(string[] args)
    {
        string outputDirectory = args.Length > 0 ? args[0] : "walk-frames";
        Directory.CreateDirectory(outputDirectory);

        const int frameCount = 44;
        const int width = 960;
        const int height = 280;
        for (int frame = 0; frame < frameCount; frame++)
        {
            using (Bitmap bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(bitmap))
            {
                g.Clear(Color.Transparent);
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawBackground(g, width, height);
                float progress = frame / (float)(frameCount - 1);
                float x = -185F + progress * (width + 220F);
                float phase = frame * 0.72F;
                DrawWalkingCat(g, x, 92F, phase);
                bitmap.Save(Path.Combine(outputDirectory, "frame" + frame.ToString("00") + ".png"), ImageFormat.Png);
            }
        }
    }

    private static void DrawBackground(Graphics g, int width, int height)
    {
        Color outline = Color.FromArgb(83, 92, 82);
        using (SolidBrush pathBrush = new SolidBrush(Color.FromArgb(232, 219, 190)))
        using (SolidBrush grassBrush = new SolidBrush(Color.FromArgb(189, 216, 164)))
        using (SolidBrush grassDark = new SolidBrush(Color.FromArgb(132, 177, 124)))
        using (SolidBrush treeTrunk = new SolidBrush(Color.FromArgb(154, 112, 74)))
        using (SolidBrush benchBrush = new SolidBrush(Color.FromArgb(176, 121, 76)))
        using (Pen outlinePen = new Pen(outline, 3F))
        {
            PointF[] lawn =
            {
                new PointF(0, 211), new PointF(140, 197), new PointF(305, 208),
                new PointF(485, 191), new PointF(680, 205), new PointF(width, 193),
                new PointF(width, height), new PointF(0, height)
            };
            g.FillPolygon(grassBrush, lawn);

            PointF[] path =
            {
                new PointF(0, 238), new PointF(210, 226), new PointF(430, 235),
                new PointF(650, 222), new PointF(width, 232),
                new PointF(width, height), new PointF(0, height)
            };
            g.FillPolygon(pathBrush, path);

            DrawTree(g, 112F, 96F, 1F, treeTrunk, grassDark, outlinePen);
            DrawTree(g, 790F, 112F, 0.82F, treeTrunk, grassDark, outlinePen);

            g.FillEllipse(grassDark, 250, 186, 75, 32);
            g.FillEllipse(grassDark, 316, 190, 58, 27);
            g.FillEllipse(grassDark, 860, 184, 80, 34);

            float benchX = 618F;
            float benchY = 174F;
            g.FillRectangle(benchBrush, benchX, benchY, 105F, 13F);
            g.DrawRectangle(outlinePen, benchX, benchY, 105F, 13F);
            g.FillRectangle(benchBrush, benchX + 5F, benchY + 27F, 95F, 11F);
            g.DrawRectangle(outlinePen, benchX + 5F, benchY + 27F, 95F, 11F);
            g.DrawLine(outlinePen, benchX + 17F, benchY + 38F, benchX + 12F, benchY + 58F);
            g.DrawLine(outlinePen, benchX + 87F, benchY + 38F, benchX + 92F, benchY + 58F);
            g.DrawLine(outlinePen, benchX + 15F, benchY + 13F, benchX + 15F, benchY + 27F);
            g.DrawLine(outlinePen, benchX + 90F, benchY + 13F, benchX + 90F, benchY + 27F);
        }
    }

    private static void DrawTree(Graphics g, float x, float y, float scale, Brush trunk, Brush leaves, Pen outline)
    {
        RectangleF trunkRect = new RectangleF(x + 31F * scale, y + 52F * scale, 20F * scale, 68F * scale);
        g.FillRectangle(trunk, trunkRect);
        g.DrawRectangle(outline, trunkRect.X, trunkRect.Y, trunkRect.Width, trunkRect.Height);
        RectangleF crownOne = new RectangleF(x, y + 12F * scale, 68F * scale, 62F * scale);
        RectangleF crownTwo = new RectangleF(x + 28F * scale, y, 66F * scale, 67F * scale);
        g.FillEllipse(leaves, crownOne);
        g.FillEllipse(leaves, crownTwo);
        g.DrawEllipse(outline, crownOne);
        g.DrawEllipse(outline, crownTwo);
    }

    private static void DrawWalkingCat(Graphics g, float x, float y, float phase)
    {
        Color orange = Color.FromArgb(230, 145, 62);
        Color light = Color.FromArgb(251, 220, 170);
        Color outline = Color.FromArgb(72, 61, 55);
        float scale = 1.65F;
        float bounce = (float)Math.Abs(Math.Sin(phase)) * -5F;
        float stride = (float)Math.Sin(phase) * 13F;
        float oppositeStride = (float)Math.Sin(phase + Math.PI) * 13F;
        float tailLift = (float)Math.Sin(phase * 0.5F) * 8F;

        GraphicsState state = g.Save();
        g.TranslateTransform(x, y + bounce);
        g.ScaleTransform(scale, scale);

        using (SolidBrush body = new SolidBrush(orange))
        using (SolidBrush muzzle = new SolidBrush(light))
        using (SolidBrush dark = new SolidBrush(outline))
        using (Pen pen = new Pen(outline, 3F))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;

            using (GraphicsPath tail = new GraphicsPath())
            {
                tail.AddBezier(32F, 56F, 4F, 52F + tailLift, -4F, 20F - tailLift, 17F, 22F);
                g.DrawPath(pen, tail);
            }

            g.FillEllipse(body, 30F, 28F, 82F, 48F);
            g.DrawEllipse(pen, 30F, 28F, 82F, 48F);
            g.FillEllipse(body, 84F, 4F, 48F, 48F);
            g.DrawEllipse(pen, 84F, 4F, 48F, 48F);

            PointF[] earOne = { new PointF(91F, 12F), new PointF(94F, -9F), new PointF(108F, 5F) };
            PointF[] earTwo = { new PointF(113F, 4F), new PointF(126F, -9F), new PointF(129F, 15F) };
            g.FillPolygon(body, earOne);
            g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne);
            g.DrawPolygon(pen, earTwo);

            g.FillEllipse(muzzle, 100F, 29F, 23F, 15F);
            g.FillEllipse(dark, 99F, 19F, 4F, 6F);
            g.FillEllipse(dark, 118F, 19F, 4F, 6F);
            g.FillEllipse(dark, 109F, 31F, 5F, 4F);

            DrawLeg(g, pen, 52F, 66F, 47F + stride, 91F);
            DrawLeg(g, pen, 72F, 68F, 72F + oppositeStride, 91F);
            DrawLeg(g, pen, 94F, 65F, 94F + oppositeStride, 89F);
            DrawLeg(g, pen, 106F, 61F, 108F + stride, 88F);
        }
        g.Restore(state);
    }

    private static void DrawLeg(Graphics g, Pen pen, float startX, float startY, float endX, float endY)
    {
        g.DrawLine(pen, startX, startY, endX, endY);
        float direction = endX >= startX ? 1F : -1F;
        g.DrawLine(pen, endX, endY, endX + direction * 8F, endY);
    }
}
