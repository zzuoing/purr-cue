using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

internal static class PackUpAnimationRenderer
{
    private static void Main(string[] args)
    {
        string outputDirectory = args.Length > 0 ? args[0] : "packup-frames";
        Directory.CreateDirectory(outputDirectory);

        const int frameCount = 30;
        for (int frame = 0; frame < frameCount; frame++)
        {
            using (Bitmap bitmap = new Bitmap(560, 300, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(bitmap))
            {
                g.Clear(Color.Transparent);
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TranslateTransform(24F, 24F);
                g.ScaleTransform(2.25F, 2.25F);
                DrawScene(g, frame);
                bitmap.Save(Path.Combine(outputDirectory, "frame" + frame.ToString("00") + ".png"), ImageFormat.Png);
            }
        }
    }

    private static float Clamp01(float value)
    {
        return Math.Max(0F, Math.Min(1F, value));
    }

    private static float Ease(float value)
    {
        value = Clamp01(value);
        return value * value * (3F - 2F * value);
    }

    private static float Mix(float start, float end, float amount)
    {
        return start + (end - start) * amount;
    }

    private static void DrawScene(Graphics g, int frame)
    {
        float closeLaptop = Ease((frame - 4F) / 5F);
        float moveLaptop = Ease((frame - 10F) / 7F);
        float closeBag = Ease((frame - 18F) / 4F);
        float liftBag = Ease((frame - 23F) / 4F);

        DrawDesk(g, 145F, 46F);
        DrawCat(g, 4F, 19F, frame, moveLaptop, liftBag);
        DrawBag(g, Mix(151F, 122F, liftBag), Mix(83F, 67F, liftBag), closeBag, liftBag);
        if (moveLaptop < 0.92F)
        {
            DrawLaptop(g, Mix(157F, 158F, moveLaptop), Mix(44F, 86F, moveLaptop), closeLaptop, moveLaptop);
        }
    }

    private static void DrawDesk(Graphics g, float x, float y)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        Color wood = Color.FromArgb(178, 126, 80);
        using (Pen pen = new Pen(outline, 3F))
        using (SolidBrush brush = new SolidBrush(wood))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.FillRectangle(brush, x, y, 78F, 9F);
            g.DrawRectangle(pen, x, y, 78F, 9F);
            g.DrawLine(pen, x + 8F, y + 9F, x + 8F, y + 92F);
            g.DrawLine(pen, x + 69F, y + 9F, x + 69F, y + 92F);
        }
    }

    private static void DrawLaptop(Graphics g, float x, float y, float closeAmount, float moveAmount)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        Color shell = Color.FromArgb(103, 138, 163);
        Color screen = Color.FromArgb(188, 223, 237);
        using (Pen pen = new Pen(outline, 3F))
        using (SolidBrush shellBrush = new SolidBrush(shell))
        using (SolidBrush screenBrush = new SolidBrush(screen))
        {
            float baseWidth = Mix(51F, 41F, moveAmount);
            float baseHeight = Mix(6F, 25F, moveAmount);
            RectangleF laptopBase = new RectangleF(x, y, baseWidth, baseHeight);
            g.FillRectangle(shellBrush, laptopBase);
            g.DrawRectangle(pen, laptopBase.X, laptopBase.Y, laptopBase.Width, laptopBase.Height);

            if (moveAmount < 0.15F)
            {
                float screenHeight = Mix(35F, 4F, closeAmount);
                RectangleF screenRect = new RectangleF(x + 4F, y - screenHeight, 43F, screenHeight);
                g.FillRectangle(screenBrush, screenRect);
                g.DrawRectangle(pen, screenRect.X, screenRect.Y, screenRect.Width, screenRect.Height);
            }
        }
    }

    private static void DrawBag(Graphics g, float x, float y, float closeAmount, float liftAmount)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        Color bag = Color.FromArgb(61, 126, 109);
        Color bagLight = Color.FromArgb(101, 164, 145);
        using (Pen pen = new Pen(outline, 3F))
        using (SolidBrush bagBrush = new SolidBrush(bag))
        using (SolidBrush lightBrush = new SolidBrush(bagLight))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            RectangleF body = new RectangleF(x, y, 55F, 35F);
            g.FillRectangle(bagBrush, body);
            g.DrawRectangle(pen, body.X, body.Y, body.Width, body.Height);

            float lidY = Mix(y - 13F, y, closeAmount);
            g.FillRectangle(lightBrush, x, lidY, 55F, 12F);
            g.DrawRectangle(pen, x, lidY, 55F, 12F);

            float handleTop = y - Mix(1F, 13F, closeAmount);
            g.DrawArc(pen, x + 17F, handleTop, 21F, 18F, 180, 180);
            if (liftAmount > 0.75F)
            {
                g.FillEllipse(lightBrush, x + 23F, y + 16F, 9F, 6F);
            }
        }
    }

    private static void DrawCat(Graphics g, float x, float y, int frame, float reachAmount, float liftAmount)
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
            pen.LineJoin = LineJoin.Round;

            g.FillEllipse(body, x + 30F, y + 28F, 82F, 48F);
            g.DrawEllipse(pen, x + 30F, y + 28F, 82F, 48F);
            g.FillEllipse(body, x + 84F, y + 4F, 48F, 48F);
            g.DrawEllipse(pen, x + 84F, y + 4F, 48F, 48F);

            PointF[] earOne = { new PointF(x + 91F, y + 12F), new PointF(x + 94F, y - 9F), new PointF(x + 108F, y + 5F) };
            PointF[] earTwo = { new PointF(x + 113F, y + 4F), new PointF(x + 126F, y - 9F), new PointF(x + 129F, y + 15F) };
            g.FillPolygon(body, earOne);
            g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne);
            g.DrawPolygon(pen, earTwo);

            g.FillEllipse(muzzle, x + 100F, y + 29F, 23F, 15F);
            g.FillEllipse(dark, x + 99F, y + 19F, 4F, 6F);
            g.FillEllipse(dark, x + 118F, y + 19F, 4F, 6F);
            g.FillEllipse(dark, x + 109F, y + 31F, 5F, 4F);

            float pawX = Mix(x + 96F, x + 144F, Math.Max(reachAmount, liftAmount));
            float pawY = Mix(y + 75F, y + 66F, reachAmount);
            pawY = Mix(pawY, y + 74F, liftAmount);
            g.DrawLine(pen, x + 99F, y + 62F, pawX, pawY);
            g.FillEllipse(body, pawX - 6F, pawY - 5F, 12F, 10F);
            g.DrawEllipse(pen, pawX - 6F, pawY - 5F, 12F, 10F);

            g.DrawLine(pen, x + 54F, y + 66F, x + 51F, y + 93F);
            g.DrawLine(pen, x + 78F, y + 67F, x + 81F, y + 93F);
            g.DrawArc(pen, x - 10F, y + 28F, 52F, 48F, 160, 190);
        }
    }
}
