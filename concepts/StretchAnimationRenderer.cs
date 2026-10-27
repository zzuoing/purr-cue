using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

internal static class StretchAnimationRenderer
{
    private static void Main(string[] args)
    {
        string outputDirectory = args.Length > 0 ? args[0] : "stretch-frames";
        Directory.CreateDirectory(outputDirectory);

        const int frameCount = 16;
        for (int frame = 0; frame < frameCount; frame++)
        {
            float pose;
            if (frame < 6) pose = Ease(frame / 5F);
            else if (frame < 10) pose = 1F;
            else pose = Ease((15F - frame) / 5F);

            using (Bitmap bitmap = new Bitmap(480, 280, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(bitmap))
            {
                g.Clear(Color.Transparent);
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawBackground(g, frame);
                g.TranslateTransform(96F, 53F);
                g.ScaleTransform(1.75F, 1.75F);
                DrawStretchCat(g, 10F, 7F, pose, frame);
                bitmap.Save(Path.Combine(outputDirectory, "frame" + frame.ToString("00") + ".png"), ImageFormat.Png);
            }
        }
    }

    private static float Ease(float value)
    {
        value = Math.Max(0F, Math.Min(1F, value));
        return value * value * (3F - 2F * value);
    }

    private static float Mix(float start, float end, float amount)
    {
        return start + (end - start) * amount;
    }

    private static void DrawBackground(Graphics g, int frame)
    {
        Color outline = Color.FromArgb(92, 79, 69);
        using (SolidBrush floor = new SolidBrush(Color.FromArgb(215, 230, 222)))
        using (SolidBrush mat = new SolidBrush(Color.FromArgb(142, 193, 181)))
        using (SolidBrush matEdge = new SolidBrush(Color.FromArgb(91, 157, 145)))
        using (SolidBrush mirror = new SolidBrush(Color.FromArgb(72, 188, 215, 220)))
        using (SolidBrush mirrorShine = new SolidBrush(Color.FromArgb(62, 238, 249, 248)))
        using (SolidBrush gymBall = new SolidBrush(Color.FromArgb(161, 127, 168, 184)))
        using (SolidBrush bench = new SolidBrush(Color.FromArgb(105, 100, 112, 120)))
        using (Pen pen = new Pen(outline, 1.8F))
        using (Pen sun = new Pen(Color.FromArgb(155, 219, 177, 83), 2F))
        {
            g.FillRectangle(floor, 0F, 239F, 480F, 41F);
            PointF[] matShape =
            {
                new PointF(37F, 219F), new PointF(431F, 219F),
                new PointF(450F, 249F), new PointF(24F, 249F)
            };
            g.FillPolygon(mat, matShape);
            g.DrawPolygon(pen, matShape);
            g.FillPolygon(matEdge, new[]
            {
                new PointF(24F, 249F), new PointF(450F, 249F),
                new PointF(442F, 255F), new PointF(31F, 255F)
            });

            RectangleF mirrorArea = new RectangleF(12F, 111F, 86F, 67F);
            g.FillRectangle(mirror, mirrorArea);
            g.DrawRectangle(pen, mirrorArea.X, mirrorArea.Y, mirrorArea.Width, mirrorArea.Height);
            g.FillPolygon(mirrorShine, new[]
            {
                new PointF(18F, 116F), new PointF(39F, 116F),
                new PointF(71F, 173F), new PointF(50F, 173F)
            });
            g.DrawLine(pen, 55F, 111F, 55F, 178F);

            g.FillEllipse(gymBall, 19F, 181F, 47F, 47F);
            g.DrawEllipse(pen, 19F, 181F, 47F, 47F);
            g.DrawArc(pen, 27F, 190F, 30F, 28F, 205, 130);
            g.FillRectangle(bench, 68F, 198F, 42F, 9F);
            g.DrawRectangle(pen, 68F, 198F, 42F, 9F);
            g.DrawLine(pen, 75F, 207F, 72F, 223F);
            g.DrawLine(pen, 102F, 207F, 105F, 223F);

            g.DrawArc(sun, 25F, 26F, 42F, 42F, 205, 130);
            g.DrawLine(sun, 31F, 64F, 24F, 73F);
            g.DrawLine(sun, 47F, 70F, 46F, 81F);
            g.DrawLine(sun, 62F, 65F, 69F, 74F);
        }
    }

    private static void DrawStretchCat(Graphics g, float x, float y, float pose, int frame)
    {
        Color orange = Color.FromArgb(230, 145, 62);
        Color light = Color.FromArgb(251, 220, 170);
        Color outline = Color.FromArgb(72, 61, 55);

        float breathe = (float)Math.Sin(frame * Math.PI / 2F) * 0.7F * pose;
        float bodyX = x + Mix(30F, 24F, pose);
        float bodyY = y + Mix(28F, 39F, pose) + breathe;
        float bodyW = Mix(82F, 108F, pose);
        float bodyH = Mix(48F, 39F, pose);
        float headX = x + Mix(84F, 116F, pose);
        float headY = y + Mix(4F, 31F, pose) + breathe;
        float headW = Mix(48F, 44F, pose);
        float headH = Mix(48F, 42F, pose);

        using (SolidBrush body = new SolidBrush(orange))
        using (SolidBrush muzzle = new SolidBrush(light))
        using (SolidBrush dark = new SolidBrush(outline))
        using (Pen pen = new Pen(outline, 2.15F))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;

            using (GraphicsPath tail = new GraphicsPath())
            {
                tail.AddBezier(
                    bodyX + 3F, bodyY + 22F,
                    x + Mix(12F, 5F, pose), y + Mix(42F, 28F, pose),
                    x + Mix(0F, 5F, pose), y + Mix(28F, 0F, pose),
                    x + Mix(14F, 29F, pose), y + Mix(22F, 12F, pose));
                g.DrawPath(pen, tail);
            }

            g.FillEllipse(body, bodyX, bodyY, bodyW, bodyH);
            g.DrawEllipse(pen, bodyX, bodyY, bodyW, bodyH);

            g.FillEllipse(body, headX, headY, headW, headH);
            g.DrawEllipse(pen, headX, headY, headW, headH);

            PointF leftEar = new PointF(headX + 8F, headY + 8F);
            PointF rightEar = new PointF(headX + headW - 8F, headY + 9F);
            PointF[] earOne =
            {
                leftEar,
                new PointF(leftEar.X + 2F, leftEar.Y - 20F),
                new PointF(leftEar.X + 15F, leftEar.Y - 5F)
            };
            PointF[] earTwo =
            {
                new PointF(rightEar.X - 12F, rightEar.Y - 4F),
                new PointF(rightEar.X + 1F, rightEar.Y - 20F),
                rightEar
            };
            g.FillPolygon(body, earOne);
            g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne);
            g.DrawPolygon(pen, earTwo);

            float muzzleX = headX + headW * 0.34F;
            float muzzleY = headY + headH * 0.55F;
            g.FillEllipse(muzzle, muzzleX, muzzleY, 21F, 14F);

            if (pose > 0.72F)
            {
                g.DrawArc(pen, headX + 11F, headY + 16F, 7F, 5F, 10, 160);
                g.DrawArc(pen, headX + 28F, headY + 16F, 7F, 5F, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, headX + 14F, headY + 17F, 4F, 6F);
                g.FillEllipse(dark, headX + 31F, headY + 17F, 4F, 6F);
            }
            g.FillEllipse(dark, muzzleX + 8F, muzzleY + 2F, 5F, 4F);

            float baseline = y + 93F;
            float hindOneX = x + 51F;
            float hindTwoX = x + 79F;
            float hindOneEndX = Mix(hindOneX - 2F, x + 19F, pose);
            float hindTwoEndX = Mix(hindTwoX + 2F, x + 34F, pose);
            g.DrawLine(pen, hindOneX, bodyY + bodyH - 7F, hindOneEndX, baseline);
            g.DrawLine(pen, hindTwoX, bodyY + bodyH - 7F, hindTwoEndX, baseline);
            g.DrawLine(pen, hindOneEndX - 7F, baseline, hindOneEndX + 3F, baseline);
            g.DrawLine(pen, hindTwoEndX - 7F, baseline, hindTwoEndX + 3F, baseline);

            float frontStartX = bodyX + bodyW - 18F;
            float frontStartY = bodyY + bodyH - 9F;
            float frontEndX = Mix(x + 95F, x + 154F, pose);
            float frontEndY = baseline;
            g.DrawLine(pen, frontStartX, frontStartY, frontEndX, frontEndY);
            g.DrawLine(pen, frontStartX - 9F, frontStartY - 1F, frontEndX - 13F, frontEndY);
            g.DrawLine(pen, frontEndX - 8F, frontEndY, frontEndX + 3F, frontEndY);
            g.DrawLine(pen, frontEndX - 21F, frontEndY, frontEndX - 10F, frontEndY);
        }
    }
}
