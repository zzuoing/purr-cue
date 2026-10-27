using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[DataContract]
internal sealed class ReminderItem
{
    [DataMember] public string Id;
    [DataMember] public DateTime When;
    [DataMember] public string Message;
    [DataMember] public List<int> RepeatDays;
    [DataMember] public bool Enabled;
    [DataMember] public string LastTriggeredDate;
}

internal sealed class AnimalReminderForm : Form
{
    private enum SceneKind { General, Walking, Window, Water, Eating, Stretch, WorkStart, PackUp, Toilet }

    [StructLayout(LayoutKind.Sequential)]
    private struct NativePoint { public int X; public int Y; }

    [StructLayout(LayoutKind.Sequential)]
    private struct NativeSize { public int CX; public int CY; }

    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    private struct BlendFunction
    {
        public byte BlendOp;
        public byte BlendFlags;
        public byte SourceConstantAlpha;
        public byte AlphaFormat;
    }

    private const int WsExLayered = 0x00080000;
    private const int WsExNoActivate = 0x08000000;
    private const int UlwAlpha = 0x00000002;
    private const byte AcSrcOver = 0x00;
    private const byte AcSrcAlpha = 0x01;

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UpdateLayeredWindow(IntPtr hwnd, IntPtr hdcDst, ref NativePoint destination, ref NativeSize size, IntPtr hdcSrc, ref NativePoint source, int colorKey, ref BlendFunction blend, int flags);

    [DllImport("user32.dll")]
    private static extern IntPtr GetDC(IntPtr hwnd);

    [DllImport("user32.dll")]
    private static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr obj);

    private readonly System.Windows.Forms.Timer animationTimer = new System.Windows.Forms.Timer();
    private readonly string message;
    private readonly string timeText;
    private readonly SceneKind scene;
    private Image sceneImage;
    private int tickCount;
    private float animalX;

    protected override CreateParams CreateParams
    {
        get
        {
            CreateParams parameters = base.CreateParams;
            parameters.ExStyle |= WsExLayered | WsExNoActivate;
            return parameters;
        }
    }

    public AnimalReminderForm(string reminderMessage, DateTime scheduled)
    {
        message = reminderMessage;
        timeText = scheduled.ToString("HH:mm");
        string normalized = reminderMessage.ToLowerInvariant();
        if (normalized.Contains("拉屎") || normalized.Contains("如厕") || normalized.Contains("厕所") || normalized.Contains("便便")) scene = SceneKind.Toilet;
        else if (normalized.Contains("下班") || normalized.Contains("收拾") || normalized.Contains("回家")) scene = SceneKind.PackUp;
        else if (normalized.Contains("上班") || normalized.Contains("开工") || normalized.Contains("开始工作")) scene = SceneKind.WorkStart;
        else if (normalized.Contains("走走") || normalized.Contains("散步") || normalized.Contains("活动") || normalized.Contains("走动") || normalized.Contains("出去")) scene = SceneKind.Walking;
        else if (normalized.Contains("伸懒腰") || normalized.Contains("拉伸") || normalized.Contains("伸展")) scene = SceneKind.Stretch;
        else if (normalized.Contains("吃饭") || normalized.Contains("用餐") || normalized.Contains("早餐") || normalized.Contains("午饭") || normalized.Contains("晚饭")) scene = SceneKind.Eating;
        else if (normalized.Contains("喝水") || normalized.Contains("饮水") || normalized.Contains("补水")) scene = SceneKind.Water;
        else if (normalized.Contains("透气") || normalized.Contains("通风") || normalized.Contains("窗")) scene = SceneKind.Window;
        else scene = SceneKind.General;

        Rectangle area = Screen.PrimaryScreen.WorkingArea;
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        Bounds = new Rectangle(area.Left, area.Bottom - 250, area.Width, 250);
        KeyPreview = true;
        DoubleBuffered = true;

        string assetName = scene == SceneKind.Stretch ? "stretch.gif" : null;
        if (assetName != null)
        {
            string assetPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", assetName);
            if (File.Exists(assetPath))
            {
                sceneImage = Image.FromFile(assetPath);
                if (ImageAnimator.CanAnimate(sceneImage)) ImageAnimator.Animate(sceneImage, OnSceneFrameChanged);
            }
        }

        animalX = scene == SceneKind.Walking ? -150F : area.Width / 2F - 55F;
        animationTimer.Interval = 33;
        animationTimer.Tick += Animate;
        Shown += delegate { animationTimer.Start(); RenderLayeredScene(); BringToFront(); };
        FormClosed += delegate
        {
            animationTimer.Stop();
            animationTimer.Dispose();
            if (sceneImage != null)
            {
                if (ImageAnimator.CanAnimate(sceneImage)) ImageAnimator.StopAnimate(sceneImage, OnSceneFrameChanged);
                sceneImage.Dispose();
            }
        };
        Click += delegate { Close(); };
        KeyDown += delegate(object sender, KeyEventArgs e) { if (e.KeyCode == Keys.Escape) Close(); };
    }

    protected override bool ShowWithoutActivation { get { return true; } }

    private void OnSceneFrameChanged(object sender, EventArgs e)
    {
        if (IsHandleCreated && !IsDisposed)
        {
            try { BeginInvoke((MethodInvoker)delegate { RenderLayeredScene(); }); }
            catch { }
        }
    }

    private void Animate(object sender, EventArgs e)
    {
        tickCount++;
        if (scene == SceneKind.Walking)
        {
            animalX += 3.2F;
            if (animalX > Width + 210) Close();
        }
        else if ((scene == SceneKind.Toilet && tickCount > 285)
            || (scene == SceneKind.WorkStart && tickCount > 330)
            || (scene == SceneKind.Eating && tickCount > 330)
            || (scene == SceneKind.PackUp && tickCount > 290)
            || (scene != SceneKind.Toilet && scene != SceneKind.WorkStart && scene != SceneKind.Eating && scene != SceneKind.PackUp && tickCount > 360))
        {
            Close();
        }
        RenderLayeredScene();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        RenderScene(e.Graphics);
    }

    private void RenderScene(Graphics g)
    {
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.CompositingMode = CompositingMode.SourceOver;
        g.CompositingQuality = CompositingQuality.HighQuality;

        if (scene == SceneKind.Walking)
        {
            DrawWalkingBackground(g, ClientSize.Width, ClientSize.Height, tickCount);
            DrawWalkingCat(g, animalX, 135F, tickCount * 0.48F);
            DrawWalkingMusicNotes(g, animalX, tickCount);
        }
        else if (scene == SceneKind.Window)
        {
            DrawAnimatedWindowScene(g, tickCount);
        }
        else if (scene == SceneKind.Water)
        {
            DrawAnimatedWaterScene(g, tickCount);
        }
        else if (scene == SceneKind.Eating)
        {
            DrawEatingScene(g, tickCount);
        }
        else if (scene == SceneKind.Stretch)
        {
            if (sceneImage != null) DrawSceneImage(g);
            else DrawGeneralCat(g);
        }
        else if (scene == SceneKind.WorkStart)
        {
            DrawOfficeScene(g, tickCount, true);
        }
        else if (scene == SceneKind.PackUp)
        {
            DrawOfficeScene(g, tickCount, false);
        }
        else if (scene == SceneKind.Toilet)
        {
            DrawToiletScene(g, tickCount);
        }
        else if (sceneImage != null)
        {
            DrawSceneImage(g);
        }
        else
        {
            DrawGeneralCat(g);
        }
        DrawMessage(g);
    }

    private void DrawGeneralCat(Graphics g)
    {
        GraphicsState state = g.Save();
        const float scale = 1.15F;
        g.TranslateTransform(ClientSize.Width / 2F - 82F, 142F);
        g.ScaleTransform(scale, scale);
        DrawCat(g, 0F, 0F, false, tickCount);
        g.Restore(state);
    }

    private void RenderLayeredScene()
    {
        if (!IsHandleCreated || IsDisposed || ClientSize.Width <= 0 || ClientSize.Height <= 0) return;

        using (Bitmap bitmap = new Bitmap(ClientSize.Width, ClientSize.Height, PixelFormat.Format32bppArgb))
        using (Graphics graphics = Graphics.FromImage(bitmap))
        {
            graphics.Clear(Color.Transparent);
            RenderScene(graphics);

            IntPtr screenDc = GetDC(IntPtr.Zero);
            IntPtr memoryDc = CreateCompatibleDC(screenDc);
            IntPtr bitmapHandle = bitmap.GetHbitmap(Color.FromArgb(0));
            IntPtr previous = SelectObject(memoryDc, bitmapHandle);
            try
            {
                NativePoint destination = new NativePoint { X = Left, Y = Top };
                NativePoint source = new NativePoint { X = 0, Y = 0 };
                NativeSize size = new NativeSize { CX = bitmap.Width, CY = bitmap.Height };
                BlendFunction blend = new BlendFunction
                {
                    BlendOp = AcSrcOver,
                    BlendFlags = 0,
                    SourceConstantAlpha = 255,
                    AlphaFormat = AcSrcAlpha
                };
                UpdateLayeredWindow(Handle, screenDc, ref destination, ref size, memoryDc, ref source, 0, ref blend, UlwAlpha);
            }
            finally
            {
                SelectObject(memoryDc, previous);
                DeleteObject(bitmapHandle);
                DeleteDC(memoryDc);
                ReleaseDC(IntPtr.Zero, screenDc);
            }
        }
    }

    private void DrawSceneImage(Graphics g)
    {
        if (ImageAnimator.CanAnimate(sceneImage)) ImageAnimator.UpdateFrames(sceneImage);
        float maxHeight = scene == SceneKind.Window ? 190F
            : scene == SceneKind.Water ? 170F
            : scene == SceneKind.Stretch ? 190F
            : 168F;
        float maxWidth = Math.Min(620F, ClientSize.Width - 40F);
        float scale = Math.Min(maxHeight / sceneImage.Height, maxWidth / sceneImage.Width);
        float width = sceneImage.Width * scale;
        float height = sceneImage.Height * scale;
        RectangleF destination = new RectangleF((ClientSize.Width - width) / 2F, ClientSize.Height - height - 3F, width, height);
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.DrawImage(sceneImage, destination);
    }

    private void DrawMessage(Graphics g)
    {
        Font timeFont = new Font("Microsoft YaHei UI", 13F, FontStyle.Bold);
        Font messageFont = new Font("Microsoft YaHei UI", 14F, FontStyle.Regular);
        string fullText = timeText + "  " + message;
        SizeF textSize = g.MeasureString(fullText, messageFont);
        const float horizontalPadding = 18F;
        float maxWidth = Math.Min(620F, ClientSize.Width - 40F);
        float width = Math.Min(maxWidth, Math.Max(138F, textSize.Width + horizontalPadding * 2F));
        float x = (ClientSize.Width - width) / 2F;
        RectangleF bubble = new RectangleF(x, 18, width, 52);
        using (GraphicsPath path = RoundedRectangle(bubble, 14F))
        using (SolidBrush shadow = new SolidBrush(Color.FromArgb(55, 0, 0, 0)))
        using (SolidBrush white = new SolidBrush(Color.FromArgb(248, 255, 255, 255)))
        using (Pen border = new Pen(Color.FromArgb(74, 94, 110), 1.4F))
        {
            Matrix matrix = new Matrix();
            matrix.Translate(0, 3);
            path.Transform(matrix);
            g.FillPath(shadow, path);
        }
        using (GraphicsPath path = RoundedRectangle(bubble, 14F))
        using (SolidBrush white = new SolidBrush(Color.FromArgb(250, 255, 255, 255)))
        using (Pen border = new Pen(Color.FromArgb(74, 94, 110), 1.4F))
        using (SolidBrush dark = new SolidBrush(Color.FromArgb(44, 54, 62)))
        {
            g.FillPath(white, path);
            g.DrawPath(border, path);
            StringFormat format = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center, Trimming = StringTrimming.EllipsisCharacter };
            g.DrawString(fullText, messageFont, dark, bubble, format);
        }
        timeFont.Dispose();
        messageFont.Dispose();
    }

    private static GraphicsPath RoundedRectangle(RectangleF rectangle, float radius)
    {
        GraphicsPath path = new GraphicsPath();
        float diameter = radius * 2F;
        path.AddArc(rectangle.Left, rectangle.Top, diameter, diameter, 180, 90);
        path.AddArc(rectangle.Right - diameter, rectangle.Top, diameter, diameter, 270, 90);
        path.AddArc(rectangle.Right - diameter, rectangle.Bottom - diameter, diameter, diameter, 0, 90);
        path.AddArc(rectangle.Left, rectangle.Bottom - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
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

    private void DrawFluidStretchScene(Graphics g, int frame)
    {
        int cycle = frame % 190;
        float pose = cycle < 48 ? Ease(cycle / 48F)
            : cycle < 132 ? 1F
            : Ease((190F - cycle) / 58F);
        GraphicsState state = g.Save();
        const float scale = 1.18F;
        g.TranslateTransform(ClientSize.Width / 2F - 165F * scale, ClientSize.Height - 5F - 158F * scale);
        g.ScaleTransform(scale, scale);
        DrawFluidStretchCat(g, pose, frame);
        g.Restore(state);
    }

    private static void DrawFluidStretchCat(Graphics g, float pose, int frame)
    {
        Color orange = Color.FromArgb(230, 145, 62);
        Color light = Color.FromArgb(251, 220, 170);
        Color outline = Color.FromArgb(72, 61, 55);
        float left = Mix(84F, 55F, pose);
        float right = Mix(208F, 241F, pose);
        float bodyTop = Mix(87F, 59F, pose);
        float bodyBottom = Mix(138F, 133F, pose);
        float headX = right - 8F;
        float headY = Mix(77F, 51F, pose) + (float)Math.Sin(frame * 0.14F) * 1.2F * pose;
        float baseline = 151F;

        using (SolidBrush body = new SolidBrush(orange))
        using (SolidBrush muzzle = new SolidBrush(light))
        using (SolidBrush dark = new SolidBrush(outline))
        using (Pen pen = new Pen(outline, 3F))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;
            using (GraphicsPath torso = new GraphicsPath())
            {
                torso.AddBezier(left, 114F, left + 40F, bodyTop - 5F, right - 48F, bodyTop - 8F, right, 108F);
                torso.AddBezier(right, 108F, right - 33F, bodyBottom + 4F, left + 43F, bodyBottom + 7F, left, 125F);
                torso.CloseFigure();
                g.FillPath(body, torso);
                g.DrawPath(pen, torso);
            }

            using (GraphicsPath tail = new GraphicsPath())
            {
                tail.AddBezier(left + 5F, 118F, left - 18F, 105F, left - 32F, Mix(89F, 49F, pose), left - 13F, Mix(79F, 37F, pose));
                tail.AddBezier(left - 13F, Mix(79F, 37F, pose), left - 3F, Mix(72F, 29F, pose), left + 2F, Mix(82F, 40F, pose), left + 3F, Mix(89F, 46F, pose));
                g.DrawPath(pen, tail);
            }

            g.FillEllipse(body, headX, headY, 50F, 48F);
            g.DrawEllipse(pen, headX, headY, 50F, 48F);
            PointF[] earOne = { new PointF(headX + 7F, headY + 9F), new PointF(headX + 10F, headY - 12F), new PointF(headX + 23F, headY + 3F) };
            PointF[] earTwo = { new PointF(headX + 29F, headY + 3F), new PointF(headX + 43F, headY - 12F), new PointF(headX + 47F, headY + 12F) };
            g.FillPolygon(body, earOne);
            g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne);
            g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, headX + 17F, headY + 28F, 23F, 14F);
            if (pose > 0.78F)
            {
                g.DrawArc(pen, headX + 11F, headY + 17F, 8F, 5F, 10, 160);
                g.DrawArc(pen, headX + 31F, headY + 17F, 8F, 5F, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, headX + 13F, headY + 18F, 4F, 6F);
                g.FillEllipse(dark, headX + 33F, headY + 18F, 4F, 6F);
            }
            g.FillEllipse(dark, headX + 26F, headY + 31F, 5F, 4F);

            float hindEndOne = Mix(left + 22F, left - 17F, pose);
            float hindEndTwo = Mix(left + 48F, left + 3F, pose);
            g.DrawLine(pen, left + 32F, 128F, hindEndOne, baseline);
            g.DrawLine(pen, left + 53F, 130F, hindEndTwo, baseline);
            g.DrawLine(pen, hindEndOne - 7F, baseline, hindEndOne + 4F, baseline);
            g.DrawLine(pen, hindEndTwo - 7F, baseline, hindEndTwo + 4F, baseline);

            float frontEndOne = Mix(right - 5F, right + 50F, pose);
            float frontEndTwo = Mix(right + 16F, right + 66F, pose);
            g.DrawLine(pen, right - 18F, 121F, frontEndOne, baseline);
            g.DrawLine(pen, right - 2F, 119F, frontEndTwo, baseline);
            g.DrawLine(pen, frontEndOne - 5F, baseline, frontEndOne + 7F, baseline);
            g.DrawLine(pen, frontEndTwo - 5F, baseline, frontEndTwo + 7F, baseline);
        }
    }

    private void DrawOfficeScene(Graphics g, int frame, bool startingWork)
    {
        GraphicsState state = g.Save();
        float scale = 1.18F;
        float center = startingWork ? 180F : 280F;
        g.TranslateTransform(ClientSize.Width / 2F - center * scale, ClientSize.Height - 4F - 160F * scale);
        g.ScaleTransform(scale, scale);
        DrawOfficeBackdrop(g, startingWork, frame);
        if (startingWork) DrawStartingWork(g, frame);
        else DrawLeavingWork(g, frame);
        g.Restore(state);
    }

    private static void DrawOfficeBackdrop(Graphics g, bool morning, int frame)
    {
        DrawWorkstation(g, frame, morning);
        if (!morning) DrawSlidingDoor(g, frame, false);
    }

    private static void DrawWorkstation(Graphics g, int frame, bool animateChair)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        using (Pen pen = new Pen(outline, 2.5F))
        using (SolidBrush rug = new SolidBrush(Color.FromArgb(209, 225, 224)))
        using (SolidBrush wood = new SolidBrush(Color.FromArgb(177, 126, 82)))
        using (SolidBrush woodDark = new SolidBrush(Color.FromArgb(150, 101, 68)))
        using (SolidBrush chair = new SolidBrush(Color.FromArgb(105, 139, 156)))
        using (SolidBrush folder = new SolidBrush(Color.FromArgb(83, 139, 121)))
        using (SolidBrush paper = new SolidBrush(Color.FromArgb(239, 238, 226)))
        using (SolidBrush coffee = new SolidBrush(Color.FromArgb(236, 226, 206)))
        using (SolidBrush coffeeDark = new SolidBrush(Color.FromArgb(114, 78, 55)))
        {
            g.FillEllipse(rug, 70F, 140F, 270F, 16F);

            float chairPull = animateChair ? Ease((frame - 198F) / 44F) : 1F;
            float chairShift = (1F - chairPull) * 24F;
            PointF[] chairBack = { new PointF(102F + chairShift, 75F), new PointF(135F + chairShift, 66F), new PointF(145F + chairShift, 97F), new PointF(111F + chairShift, 107F) };
            PointF[] chairSeat = { new PointF(111F + chairShift, 107F), new PointF(145F + chairShift, 97F), new PointF(164F + chairShift, 111F), new PointF(127F + chairShift, 122F) };
            g.FillPolygon(chair, chairBack); g.DrawPolygon(pen, chairBack);
            g.FillPolygon(chair, chairSeat); g.DrawPolygon(pen, chairSeat);
            g.DrawLine(pen, 127F + chairShift, 122F, 125F + chairShift, 141F);
            g.DrawLine(pen, 157F + chairShift, 112F, 160F + chairShift, 134F);

            PointF[] top = { new PointF(200F, 68F), new PointF(272F, 50F), new PointF(326F, 89F), new PointF(244F, 108F) };
            PointF[] apron = { new PointF(244F, 108F), new PointF(326F, 89F), new PointF(326F, 100F), new PointF(244F, 119F) };
            g.FillPolygon(wood, top);
            g.DrawLine(pen, top[0], top[3]);
            g.DrawLine(pen, top[3], top[2]);
            g.DrawLine(pen, top[2], top[1]);
            g.FillPolygon(woodDark, apron); g.DrawPolygon(pen, apron);
            g.DrawLine(pen, 250F, 117F, 248F, 145F);
            g.DrawLine(pen, 319F, 99F, 320F, 128F);
            g.DrawLine(pen, 206F, 70F, 207F, 96F);

            PointF[] folderShape = { new PointF(222F, 70F), new PointF(252F, 62F), new PointF(270F, 74F), new PointF(238F, 83F) };
            PointF[] paperShape = { new PointF(226F, 69F), new PointF(250F, 64F), new PointF(264F, 73F), new PointF(238F, 79F) };
            g.FillPolygon(folder, folderShape); g.DrawPolygon(pen, folderShape);
            g.FillPolygon(paper, paperShape);

            PointF[] cupBody = { new PointF(281F, 67F), new PointF(304F, 67F), new PointF(301F, 84F), new PointF(284F, 84F) };
            g.FillPolygon(coffee, cupBody);
            g.DrawPolygon(pen, cupBody);
            g.FillEllipse(coffee, 280F, 61F, 25F, 12F);
            g.DrawEllipse(pen, 280F, 61F, 25F, 12F);
            g.DrawArc(pen, 301F, 67F, 14F, 13F, 270, 180);
            g.FillEllipse(coffeeDark, 284F, 64F, 17F, 6F);
            float steam = (float)Math.Sin(frame * 0.11F) * 2F;
            using (Pen steamPen = new Pen(Color.FromArgb(130, 116, 102, 92), 1.4F))
            {
                g.DrawBezier(steamPen, 288F, 60F, 283F + steam, 55F, 294F - steam, 51F, 289F, 46F);
                g.DrawBezier(steamPen, 297F, 60F, 292F - steam, 54F, 303F + steam, 49F, 298F, 43F);
            }
        }
    }

    private static void DrawStartingWork(Graphics g, int frame)
    {
        float enter = Ease(frame / 194F);
        float settle = Ease((frame - 244F) / 42F);
        float catX = Mix(-120F, 65F, enter);
        float catY = Mix(47F, 52F, settle);
        bool walking = frame < 194;
        DrawOfficeCat(g, catX, catY, walking, settle, frame / 2, false, true, false);
        if (frame >= 194 && frame < 244)
        {
            using (Pen arm = new Pen(Color.FromArgb(72, 61, 55), 2.4F))
            {
                arm.StartCap = LineCap.Round;
                arm.EndCap = LineCap.Round;
                float tug = Ease((frame - 198F) / 44F);
                g.DrawLine(arm, catX + 84F, 118F, 141F + (1F - tug) * 20F, 108F);
            }
        }
        DrawHeartBreakSequence(g, catX + 105F, catY - 31F, 10F, frame);
    }

    private static void DrawLeavingWork(Graphics g, int frame)
    {
        float speed = 2.3F;
        float catX;
        bool walking;
        if (frame < 20)
        {
            catX = 65F;
            walking = false;
        }
        else if (frame < 122)
        {
            catX = 65F + (frame - 20F) * speed;
            walking = true;
        }
        else if (frame < 165)
        {
            catX = 300F;
            walking = false;
        }
        else
        {
            catX = 300F + (frame - 165F) * speed;
            walking = true;
        }

        float seated = 1F - Ease((frame - 5F) / 15F);
        if (catX < 585F)
        {
            DrawOfficeCat(g, catX, 47F, walking, seated, frame * 2, false, false, false);
            if (walking)
            {
                using (Pen speedLine = new Pen(Color.FromArgb(120, 91, 125, 142), 2F))
                {
                    speedLine.StartCap = LineCap.Round;
                    speedLine.EndCap = LineCap.Round;
                    g.DrawLine(speedLine, catX - 27F, 103F, catX - 7F, 103F);
                    g.DrawLine(speedLine, catX - 38F, 116F, catX - 10F, 116F);
                    g.DrawLine(speedLine, catX - 22F, 129F, catX - 4F, 129F);
                }
                DrawHappyBurst(g, catX + 112F, 66F, frame);
            }
        }
        DrawSlidingDoor(g, frame, true);
    }

    private static void DrawSlidingDoor(Graphics g, int frame, bool foreground)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        float open = Ease((frame - 138F) / 32F);
        const float left = 420F;
        const float top = 18F;
        const float width = 130F;
        const float height = 137F;
        const float panelWidth = 62F;
        const float panelOffset = 65F;
        using (Pen framePen = new Pen(outline, 2.7F))
        using (SolidBrush frameBrush = new SolidBrush(Color.FromArgb(96, 119, 126)))
        using (SolidBrush glass = new SolidBrush(Color.FromArgb(105, 181, 222, 235)))
        using (SolidBrush doorway = new SolidBrush(Color.FromArgb(225, 236, 234)))
        using (SolidBrush floor = new SolidBrush(Color.FromArgb(215, 224, 218)))
        {
            if (!foreground)
            {
                g.FillRectangle(floor, 0F, 145F, 560F, 11F);
                g.FillRectangle(doorway, left, top, width, height);
                GraphicsState clipState = g.Save();
                g.SetClip(new RectangleF(left + 3F, top + 14F, width - 6F, height - 17F), CombineMode.Intersect);
                float shift = 56F * open;
                RectangleF leftPanel = new RectangleF(left + 3F - shift, top + 14F, panelWidth, height - 17F);
                RectangleF rightPanel = new RectangleF(left + panelOffset + shift, top + 14F, panelWidth, height - 17F);
                g.FillRectangle(glass, leftPanel);
                g.FillRectangle(glass, rightPanel);
                g.DrawRectangle(framePen, leftPanel.X, leftPanel.Y, leftPanel.Width, leftPanel.Height);
                g.DrawRectangle(framePen, rightPanel.X, rightPanel.Y, rightPanel.Width, rightPanel.Height);
                g.Restore(clipState);
            }
            else
            {
                GraphicsState glassState = g.Save();
                g.SetClip(new RectangleF(left + 3F, top + 14F, width - 6F, height - 17F), CombineMode.Intersect);
                float shift = 56F * open;
                RectangleF leftPanel = new RectangleF(left + 3F - shift, top + 14F, panelWidth, height - 17F);
                g.FillRectangle(glass, leftPanel);
                g.DrawRectangle(framePen, leftPanel.X, leftPanel.Y, leftPanel.Width, leftPanel.Height);
                g.Restore(glassState);
            }

            g.FillRectangle(frameBrush, left - 3F, top, 6F, height);
            g.FillRectangle(frameBrush, left - 3F, top - 3F, width + 6F, 7F);
            g.DrawLine(framePen, left - 3F, top - 3F, left - 3F, top + height);
            g.DrawLine(framePen, left - 3F, top - 3F, left + width + 3F, top - 3F);
            if (!foreground)
            {
                g.FillRectangle(frameBrush, left + width - 3F, top, 6F, height);
                g.DrawLine(framePen, left + width + 3F, top - 3F, left + width + 3F, top + height);
            }

            using (SolidBrush sensor = new SolidBrush(Color.FromArgb(69, 82, 88)))
            using (Pen signal = new Pen(Color.FromArgb(190, 73, 151, 174), 1.5F))
            using (SolidBrush sign = new SolidBrush(Color.FromArgb(90, 119, 132)))
            using (SolidBrush white = new SolidBrush(Color.White))
            using (Font font = new Font("Arial", 7.5F, FontStyle.Bold))
            {
                g.FillRectangle(sensor, left + 55F, top - 10F, 20F, 8F);
                if (frame >= 122 && frame < 171)
                {
                    float pulse = 3F + Math.Abs((float)Math.Sin(frame * 0.22F)) * 5F;
                    g.DrawArc(signal, left + 65F - pulse, top - 2F, pulse * 2F, 11F, 200, 140);
                    g.DrawArc(signal, left + 65F - pulse * 1.5F, top - 4F, pulse * 3F, 16F, 205, 130);
                }
                RectangleF signRect = new RectangleF(left + 39F, top + 5F, 52F, 16F);
                g.FillRectangle(sign, signRect);
                g.DrawRectangle(framePen, signRect.X, signRect.Y, signRect.Width, signRect.Height);
                StringFormat centered = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
                g.DrawString("OFFICE", font, white, signRect, centered);
                centered.Dispose();
            }
        }
    }

    private static void DrawAlarmClock(Graphics g, float x, float y, int frame)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        float ring = (float)Math.Sin(frame * 0.48F) * 2F;
        using (Pen pen = new Pen(outline, 2.2F))
        using (Pen ringPen = new Pen(Color.FromArgb(180, 201, 128, 71), 1.8F))
        using (SolidBrush body = new SolidBrush(Color.FromArgb(239, 174, 83)))
        using (SolidBrush face = new SolidBrush(Color.FromArgb(247, 241, 221)))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.FillEllipse(body, x, y, 32F, 28F);
            g.DrawEllipse(pen, x, y, 32F, 28F);
            g.FillEllipse(face, x + 5F, y + 5F, 22F, 18F);
            g.DrawEllipse(pen, x + 5F, y + 5F, 22F, 18F);
            g.DrawLine(pen, x + 16F, y + 14F, x + 16F, y + 8F);
            g.DrawLine(pen, x + 16F, y + 14F, x + 21F, y + 17F);
            g.DrawArc(pen, x + 1F + ring, y - 8F, 12F, 12F, 190, 150);
            g.DrawArc(pen, x + 19F - ring, y - 8F, 12F, 12F, 200, 150);
            g.DrawLine(pen, x + 7F, y + 26F, x + 3F, y + 31F);
            g.DrawLine(pen, x + 25F, y + 26F, x + 29F, y + 31F);
            g.DrawLine(ringPen, x - 5F + ring, y - 3F, x - 10F + ring, y - 9F);
            g.DrawLine(ringPen, x + 37F - ring, y - 3F, x + 42F - ring, y - 9F);
        }
    }

    private static void DrawDoorForeground(Graphics g)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        using (Pen pen = new Pen(outline, 2.7F))
        using (SolidBrush door = new SolidBrush(Color.FromArgb(132, 94, 70)))
        using (SolidBrush sign = new SolidBrush(Color.FromArgb(90, 119, 132)))
        using (SolidBrush knob = new SolidBrush(Color.FromArgb(247, 211, 112)))
        using (SolidBrush white = new SolidBrush(Color.White))
        using (Font font = new Font("Arial", 7.5F, FontStyle.Bold))
        {
            PointF[] leaf = { new PointF(270F, 30F), new PointF(326F, 45F), new PointF(326F, 140F), new PointF(270F, 153F) };
            g.FillPolygon(door, leaf);
            g.DrawPolygon(pen, leaf);
            RectangleF signRect = new RectangleF(280F, 51F, 39F, 16F);
            g.FillRectangle(sign, signRect);
            g.DrawRectangle(pen, signRect.X, signRect.Y, signRect.Width, signRect.Height);
            StringFormat centered = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
            g.DrawString("OFFICE", font, white, signRect, centered);
            centered.Dispose();
            g.FillEllipse(knob, 316F, 96F, 5F, 5F);
        }
    }

    private static void DrawOfficeLaptop(Graphics g, float x, float deskY, float openAmount, bool hidden)
    {
        if (hidden) return;
        Color outline = Color.FromArgb(72, 61, 55);
        using (Pen pen = new Pen(outline, 2.5F))
        using (SolidBrush shell = new SolidBrush(Color.FromArgb(103, 138, 163)))
        using (SolidBrush screen = new SolidBrush(Color.FromArgb(188, 223, 237)))
        {
            float screenHeight = Mix(4F, 39F, openAmount);
            g.FillRectangle(shell, x, deskY - 5F, 55F, 6F);
            g.DrawRectangle(pen, x, deskY - 5F, 55F, 6F);
            if (screenHeight > 5F)
            {
                g.FillRectangle(screen, x + 5F, deskY - 5F - screenHeight, 45F, screenHeight);
                g.DrawRectangle(pen, x + 5F, deskY - 5F - screenHeight, 45F, screenHeight);
            }
        }
    }

    private static void DrawOfficeBag(Graphics g, float x, float y, float closeAmount, bool lifted)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        using (Pen pen = new Pen(outline, 2.5F))
        using (SolidBrush bag = new SolidBrush(Color.FromArgb(61, 126, 109)))
        using (SolidBrush flap = new SolidBrush(Color.FromArgb(101, 164, 145)))
        {
            g.FillRectangle(bag, x, y, 42F, 28F);
            g.DrawRectangle(pen, x, y, 42F, 28F);
            float flapY = y - Mix(10F, 0F, closeAmount);
            g.FillRectangle(flap, x, flapY, 42F, 10F);
            g.DrawRectangle(pen, x, flapY, 42F, 10F);
            g.DrawArc(pen, x + 12F, y - (lifted ? 14F : 8F), 18F, 16F, 180, 180);
        }
    }

    private static void DrawOfficeCat(Graphics g, float x, float y, bool walking, float seated, int frame, bool carrying, bool tired, bool happy)
    {
        GraphicsState state = g.Save();
        g.TranslateTransform(x, y + (walking ? (float)Math.Abs(Math.Sin(frame * 0.34F)) * -3F : 0F));
        g.ScaleTransform(1F, 1F);
        Color orange = Color.FromArgb(230, 145, 62);
        Color light = Color.FromArgb(251, 220, 170);
        Color outline = Color.FromArgb(72, 61, 55);
        using (SolidBrush body = new SolidBrush(orange))
        using (SolidBrush muzzle = new SolidBrush(light))
        using (SolidBrush dark = new SolidBrush(outline))
        using (SolidBrush eyeShadow = new SolidBrush(Color.FromArgb(120, 86, 82, 87)))
        using (Pen pen = new Pen(outline, 3F))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            float bodyY = seated * 8F;
            g.FillEllipse(body, 28F, 30F + bodyY, 82F, 48F);
            g.DrawEllipse(pen, 28F, 30F + bodyY, 82F, 48F);
            g.FillEllipse(body, 81F, 5F, 49F, 49F);
            g.DrawEllipse(pen, 81F, 5F, 49F, 49F);
            PointF[] earOne = { new PointF(89F, 13F), new PointF(93F, -8F), new PointF(106F, 6F) };
            PointF[] earTwo = { new PointF(111F, 5F), new PointF(125F, -8F), new PointF(128F, 16F) };
            g.FillPolygon(body, earOne); g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne); g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, 98F, 30F, 23F, 15F);
            if (tired)
            {
                g.FillEllipse(eyeShadow, 91F, 18F, 14F, 11F);
                g.FillEllipse(eyeShadow, 112F, 18F, 14F, 11F);
                g.DrawArc(pen, 94F, 20F, 9F, 5F, 10, 160);
                g.DrawArc(pen, 115F, 20F, 9F, 5F, 10, 160);
            }
            else if (happy)
            {
                g.DrawArc(pen, 94F, 19F, 9F, 6F, 10, 160);
                g.DrawArc(pen, 115F, 19F, 9F, 6F, 10, 160);
                g.DrawArc(pen, 103F, 33F, 14F, 9F, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, 97F, 20F, 4F, 6F);
                g.FillEllipse(dark, 117F, 20F, 4F, 6F);
            }
            g.FillEllipse(dark, 108F, 32F, 5F, 4F);
            float stride = walking ? (float)Math.Sin(frame * 0.34F) * 10F : 0F;
            if (walking)
            {
                DrawWalkingLeg(g, pen, 47F, 68F + bodyY, 43F + stride, 94F);
                DrawWalkingLeg(g, pen, 67F, 70F + bodyY, 70F - stride, 94F);
                DrawWalkingLeg(g, pen, 89F, 68F + bodyY, 87F - stride, 93F);
                DrawWalkingLeg(g, pen, 104F, 64F + bodyY, 105F + stride, 92F);
            }
            else
            {
                DrawWalkingLeg(g, pen, 52F, 69F + bodyY, 49F, 94F);
                DrawWalkingLeg(g, pen, 66F, 70F + bodyY, 64F, 94F);
                DrawWalkingLeg(g, pen, 96F, 66F + bodyY, 95F, 93F);
            }
            using (GraphicsPath tail = new GraphicsPath())
            {
                tail.AddBezier(31F, 57F + bodyY, 8F, 45F, -5F, 23F, 13F, 20F);
                g.DrawPath(pen, tail);
            }
            if (carrying) g.DrawArc(pen, 38F, 54F, 26F, 29F, 180, 180);
        }
        g.Restore(state);
    }

    private static void DrawHeartBreakSequence(Graphics g, float x, float y, float size, int frame)
    {
        float progress = (frame % 110) / 110F;
        float crackProgress = Ease((progress - 0.16F) / 0.30F);
        int alpha = progress > 0.78F
            ? (int)(235F * (1F - Ease((progress - 0.78F) / 0.22F)))
            : 235;
        DrawHeart(g, x, y, size, alpha);

        if (crackProgress > 0.02F && alpha > 0)
        {
            using (Pen crack = new Pen(Color.FromArgb(alpha, 246, 248, 251), 1.7F))
            {
                crack.StartCap = LineCap.Round;
                crack.EndCap = LineCap.Round;
                PointF p0 = new PointF(x, y + size * 0.18F);
                PointF p1 = new PointF(x - 2.3F, y + size * 0.42F);
                PointF p2 = new PointF(x + 2.2F, y + size * 0.60F);
                PointF p3 = new PointF(x - 1.2F, y + size * 0.79F);
                PointF p4 = new PointF(x + 0.5F, y + size * 0.98F);
                g.DrawLine(crack, p0, p1);
                if (crackProgress > 0.34F) g.DrawLine(crack, p1, p2);
                if (crackProgress > 0.62F) g.DrawLine(crack, p2, p3);
                if (crackProgress > 0.84F) g.DrawLine(crack, p3, p4);
            }
        }
    }

    private static void DrawHappyBurst(Graphics g, float x, float y, int frame)
    {
        float pulse = 0.8F + 0.2F * (float)Math.Sin(frame * 0.24F);
        using (Pen ray = new Pen(Color.FromArgb(225, 192, 125, 58), 2F))
        using (SolidBrush star = new SolidBrush(Color.FromArgb(239, 193, 77)))
        {
            for (int i = 0; i < 5; i++)
            {
                double angle = -Math.PI * 0.9D + i * Math.PI * 0.28D;
                float sx = x + (float)Math.Cos(angle) * 18F;
                float sy = y + (float)Math.Sin(angle) * 15F;
                g.DrawLine(ray, sx, sy, x + (float)Math.Cos(angle) * 26F, y + (float)Math.Sin(angle) * 23F);
            }
            g.FillEllipse(star, x + 19F, y - 16F, 6F * pulse, 6F * pulse);
            g.FillEllipse(star, x - 23F, y - 9F, 5F * pulse, 5F * pulse);
        }
        DrawMusicNote(g, x + 52F, y - 22F, 0.75F, 210);
    }

    private void DrawToiletScene(Graphics g, int frame)
    {
        GraphicsState state = g.Save();
        const float scale = 1.15F;
        g.TranslateTransform(ClientSize.Width / 2F - 150F * scale, ClientSize.Height - 4F - 156F * scale);
        g.ScaleTransform(scale, scale);
        DrawToiletAnimation(g, frame);
        g.Restore(state);
    }

    private static void DrawToiletAnimation(Graphics g, int frame)
    {
        float squat = frame < 45 ? Ease(frame / 45F) : 1F;
        float appear = Ease((frame - 62F) / 32F);
        float cover = Ease((frame - 128F) / 58F);
        using (SolidBrush mound = new SolidBrush(Color.FromArgb(145, 103, 72)))
        using (SolidBrush ground = new SolidBrush(Color.FromArgb(95, 154, 136, 113)))
        using (SolidBrush dirt = new SolidBrush(Color.FromArgb(211, 178, 127)))
        using (SolidBrush dust = new SolidBrush(Color.FromArgb(155, 211, 178, 127)))
        {
            g.FillEllipse(ground, 122F, 148F, 135F, 8F);
            if (appear > 0.02F)
            {
                float poopY = Mix(123F, 137F, appear);
                g.FillEllipse(mound, 201F, poopY + 8F, 24F, 9F);
                g.FillEllipse(mound, 205F, poopY + 3F, 17F, 10F);
                g.FillEllipse(mound, 209F, poopY, 10F, 8F);
                if (frame > 105 && cover < 0.5F)
                {
                    using (Pen scent = new Pen(Color.FromArgb(110, 117, 93, 78), 1.5F))
                    {
                        float sway = (float)Math.Sin(frame * 0.12F) * 2F;
                        g.DrawBezier(scent, 211F, poopY - 2F, 205F + sway, poopY - 9F, 218F - sway, poopY - 14F, 212F, poopY - 21F);
                        g.DrawBezier(scent, 220F, poopY, 214F - sway, poopY - 7F, 227F + sway, poopY - 12F, 221F, poopY - 19F);
                    }
                }
                if (frame > 84 && cover < 0.82F)
                {
                    float flyFade = 1F - Clamp01((cover - 0.55F) / 0.27F);
                    DrawFly(g, 196F + (float)Math.Sin(frame * 0.21F) * 7F, poopY - 13F + (float)Math.Cos(frame * 0.17F) * 5F, frame * 0.52F, flyFade);
                    DrawFly(g, 220F + (float)Math.Sin(frame * 0.18F + 1.7F) * 8F, poopY - 19F + (float)Math.Cos(frame * 0.23F) * 5F, frame * 0.61F, flyFade);
                    DrawFly(g, 230F + (float)Math.Sin(frame * 0.24F + 3.1F) * 6F, poopY - 8F + (float)Math.Cos(frame * 0.19F) * 4F, frame * 0.57F, flyFade);
                }
                if (cover > 0.01F)
                {
                    g.FillEllipse(dirt, 198F, poopY + 8F - cover * 3F, 31F, 6F + cover * 10F);
                    for (int i = 0; i < 7; i++)
                    {
                        float px = 179F + i * 8F + (float)Math.Sin(frame * 0.42F + i) * 5F;
                        float py = 137F - cover * (8F + i * 1.8F);
                        float size = 3F + i % 3;
                        g.FillEllipse(dust, px, py, size, size);
                    }
                }
            }
            if (frame < 190)
            {
                DrawSquattingCat(g, 67F, 53F + squat * 12F, squat, cover, frame);
            }
            else
            {
                float walkX = 67F - (frame - 190F) * 2.3F;
                GraphicsState walkState = g.Save();
                g.TranslateTransform(walkX + 132F, 0F);
                g.ScaleTransform(-1F, 1F);
                DrawWalkingCat(g, 0F, 55F, (frame - 190F) * 0.25F, 1.03F);
                g.Restore(walkState);
            }
        }
    }

    private static void DrawFly(Graphics g, float x, float y, float phase, float opacity)
    {
        int alpha = (int)(210F * Clamp01(opacity));
        float wing = 2.5F + Math.Abs((float)Math.Sin(phase)) * 2.2F;
        using (SolidBrush wings = new SolidBrush(Color.FromArgb(alpha, 207, 225, 226)))
        using (SolidBrush body = new SolidBrush(Color.FromArgb(alpha, 63, 58, 53)))
        using (Pen motion = new Pen(Color.FromArgb((int)(90F * Clamp01(opacity)), 83, 72, 62), 0.9F))
        {
            g.FillEllipse(wings, x - wing - 1F, y - 3F, wing + 2F, 5F);
            g.FillEllipse(wings, x + 1F, y - 3F, wing + 2F, 5F);
            g.FillEllipse(body, x - 1.5F, y - 1.5F, 4F, 7F);
            g.DrawArc(motion, x - 8F, y - 8F, 7F, 7F, 30, 150);
        }
    }

    private static void DrawSquattingCat(Graphics g, float x, float y, float squat, float cover, int frame)
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
            g.FillEllipse(body, x + 25F, y + 28F, 92F, 48F - squat * 6F);
            g.DrawEllipse(pen, x + 25F, y + 28F, 92F, 48F - squat * 6F);
            g.FillEllipse(body, x, y + 7F, 50F, 50F);
            g.DrawEllipse(pen, x, y + 7F, 50F, 50F);
            PointF[] earOne = { new PointF(x + 7F, y + 15F), new PointF(x + 9F, y - 7F), new PointF(x + 23F, y + 8F) };
            PointF[] earTwo = { new PointF(x + 29F, y + 8F), new PointF(x + 43F, y - 7F), new PointF(x + 47F, y + 17F) };
            g.FillPolygon(body, earOne); g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne); g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, x + 13F, y + 34F, 24F, 14F);
            g.DrawArc(pen, x + 8F, y + 23F, 8F, 5F, 10, 160);
            g.DrawArc(pen, x + 32F, y + 23F, 8F, 5F, 10, 160);
            g.FillEllipse(dark, x + 22F, y + 36F, 5F, 4F);
            float kick = cover > 0F ? (float)Math.Sin(frame * 0.55F) * 12F * (1F - cover * 0.4F) : 0F;
            DrawWalkingLeg(g, pen, x + 88F, y + 65F, x + 92F + kick, y + 91F);
            DrawWalkingLeg(g, pen, x + 106F, y + 62F, x + 111F - kick, y + 89F);
            DrawWalkingLeg(g, pen, x + 46F, y + 68F, x + 39F, y + 91F);
            using (GraphicsPath tail = new GraphicsPath())
            {
                float wag = (float)Math.Sin(frame * 0.12F) * 5F;
                tail.AddBezier(x + 108F, y + 45F, x + 142F, y + 26F, x + 132F + wag, y - 7F, x + 119F + wag, y + 3F);
                g.DrawPath(pen, tail);
            }
        }
    }

    private void DrawEatingScene(Graphics g, int frame)
    {
        GraphicsState state = g.Save();
        const float scale = 0.90F;
        g.TranslateTransform(ClientSize.Width / 2F - 165F * scale, ClientSize.Height - 4F - 158F * scale);
        g.ScaleTransform(scale, scale);
        DrawEatingAnimation(g, frame);
        g.Restore(state);
    }

    private static void DrawEatingAnimation(Graphics g, int frame)
    {
        bool eating = frame >= 28 && frame < 266;
        float bite = eating ? (0.5F - 0.5F * (float)Math.Cos((frame - 28F) * 0.24F)) : 0F;
        float finish = Ease((frame - 266F) / 38F);
        float foodRemaining = 1F - Clamp01((frame - 40F) / 220F);
        float headX = Mix(139F, 169F, bite * (1F - finish));
        float headY = Mix(46F, 73F, bite * (1F - finish));
        float tailSway = (float)Math.Sin(frame * 0.10F) * 8F;
        Color orange = Color.FromArgb(230, 145, 62);
        Color light = Color.FromArgb(251, 220, 170);
        Color outline = Color.FromArgb(72, 61, 55);

        using (SolidBrush mat = new SolidBrush(Color.FromArgb(213, 226, 216)))
        using (SolidBrush body = new SolidBrush(orange))
        using (SolidBrush muzzle = new SolidBrush(light))
        using (SolidBrush dark = new SolidBrush(outline))
        using (SolidBrush tongue = new SolidBrush(Color.FromArgb(225, 126, 137)))
        using (Pen pen = new Pen(outline, 3F))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;
            g.FillEllipse(mat, 53F, 139F, 226F, 16F);

            using (GraphicsPath tail = new GraphicsPath())
            {
                tail.AddBezier(86F, 111F, 43F, 111F + tailSway, 42F, 67F - tailSway, 70F, 72F);
                g.DrawPath(pen, tail);
            }
            g.FillEllipse(body, 78F, 77F, 104F, 61F);
            g.DrawEllipse(pen, 78F, 77F, 104F, 61F);
            DrawWalkingLeg(g, pen, 105F, 126F, 100F, 148F);
            DrawWalkingLeg(g, pen, 117F, 128F, 116F, 149F);
            DrawWalkingLeg(g, pen, 137F, 128F, 140F, 148F);

            g.FillEllipse(body, headX, headY, 56F, 54F);
            g.DrawEllipse(pen, headX, headY, 56F, 54F);
            PointF[] earOne = { new PointF(headX + 8F, headY + 10F), new PointF(headX + 10F, headY - 13F), new PointF(headX + 26F, headY + 4F) };
            PointF[] earTwo = { new PointF(headX + 32F, headY + 4F), new PointF(headX + 47F, headY - 13F), new PointF(headX + 52F, headY + 13F) };
            g.FillPolygon(body, earOne); g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne); g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, headX + 20F, headY + 32F, 25F, 15F);
            if (bite > 0.76F && eating)
            {
                g.DrawArc(pen, headX + 13F, headY + 21F, 9F, 5F, 10, 160);
                g.DrawArc(pen, headX + 35F, headY + 21F, 9F, 5F, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, headX + 15F, headY + 20F, 4F, 6F);
                g.FillEllipse(dark, headX + 37F, headY + 20F, 4F, 6F);
            }
            g.FillEllipse(dark, headX + 30F, headY + 35F, 5F, 4F);
            if (finish > 0.15F)
            {
                float lick = Math.Abs((float)Math.Sin(frame * 0.25F));
                g.FillEllipse(tongue, headX + 31F, headY + 39F, 6F, 3F + lick * 5F);
            }
        }

        DrawFoodBowl(g, foodRemaining, frame);
        if (finish > 0.08F)
        {
            float rise = finish * 24F;
            DrawHeart(g, 220F + (float)Math.Sin(frame * 0.10F) * 3F, 91F - rise, 7F, (int)(220F * (1F - finish * 0.45F)));
        }
        DrawEatingFirework(g, headX + 28F, headY - 17F, 18F, frame);
    }

    private static void DrawEatingFirework(Graphics g, float x, float startY, float burstY, int frame)
    {
        float progress = Clamp01((frame - 210F) / 108F);
        if (progress <= 0F || progress >= 1F) return;

        if (progress < 0.57F)
        {
            float rise = Ease(progress / 0.57F);
            float rocketY = Mix(startY, burstY, rise);
            using (Pen trail = new Pen(Color.FromArgb(190, 220, 143, 72), 1.6F))
            using (SolidBrush spark = new SolidBrush(Color.FromArgb(244, 188, 67)))
            {
                trail.StartCap = LineCap.Round;
                trail.EndCap = LineCap.Round;
                g.DrawLine(trail, x, rocketY + 18F, x, rocketY + 3F);
                g.FillEllipse(spark, x - 2.5F, rocketY - 2.5F, 5F, 5F);
            }
            return;
        }

        float burst = Clamp01((progress - 0.57F) / 0.43F);
        float radius = 4F + Ease(burst) * 20F;
        int alpha = (int)(235F * (1F - burst));
        Color[] colors =
        {
            Color.FromArgb(alpha, 234, 105, 104),
            Color.FromArgb(alpha, 239, 184, 72),
            Color.FromArgb(alpha, 91, 164, 181)
        };
        for (int i = 0; i < 12; i++)
        {
            double angle = -Math.PI / 2D + i * Math.PI * 2D / 12D;
            float inner = radius * 0.38F;
            float x1 = x + (float)Math.Cos(angle) * inner;
            float y1 = burstY + (float)Math.Sin(angle) * inner;
            float bend = (i % 2 == 0 ? 1F : -1F) * 0.10F * burst;
            float middleRadius = radius * 0.68F;
            float middleAngle = (float)angle + bend * 0.35F;
            float endAngle = (float)angle + bend;
            float middleX = x + (float)Math.Cos(middleAngle) * middleRadius;
            float middleY = burstY + (float)Math.Sin(middleAngle) * middleRadius + burst * burst * 1.5F;
            float x2 = x + (float)Math.Cos(endAngle) * radius;
            float y2 = burstY + (float)Math.Sin(endAngle) * radius + burst * burst * 3F;
            using (Pen ray = new Pen(colors[i % colors.Length], 1.55F))
            {
                ray.StartCap = LineCap.Round;
                ray.EndCap = LineCap.Round;
                g.DrawLine(ray, x1, y1, middleX, middleY);
                g.DrawLine(ray, middleX, middleY, x2, y2);
            }
        }
    }

    private static void DrawFoodBowl(Graphics g, float remaining, int frame)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        using (Pen pen = new Pen(outline, 2.7F))
        using (SolidBrush bowl = new SolidBrush(Color.FromArgb(101, 163, 178)))
        using (SolidBrush rim = new SolidBrush(Color.FromArgb(183, 220, 225)))
        using (SolidBrush foodOne = new SolidBrush(Color.FromArgb(195, 129, 76)))
        using (SolidBrush foodTwo = new SolidBrush(Color.FromArgb(229, 176, 87)))
        {
            PointF[] bowlBody = { new PointF(206F, 116F), new PointF(270F, 116F), new PointF(260F, 145F), new PointF(217F, 145F) };
            g.FillPolygon(bowl, bowlBody);
            g.DrawPolygon(pen, bowlBody);
            g.FillEllipse(rim, 204F, 111F, 68F, 14F);
            g.DrawEllipse(pen, 204F, 111F, 68F, 14F);
            for (int i = 0; i < 8; i++)
            {
                if ((i + 1) / 8F > remaining) continue;
                float foodX = 213F + (i * 13 % 46);
                float foodY = 108F - (i % 3) * 4F + (float)Math.Sin(frame * 0.08F + i) * 0.8F;
                g.FillEllipse(i % 2 == 0 ? foodOne : foodTwo, foodX, foodY, 9F, 7F);
                g.DrawEllipse(pen, foodX, foodY, 9F, 7F);
            }
            if (remaining < 0.08F)
            {
                g.DrawLine(pen, 225F, 116F, 249F, 116F);
                g.DrawLine(pen, 225F, 116F, 218F, 111F);
                g.DrawLine(pen, 225F, 116F, 218F, 121F);
                g.DrawLine(pen, 249F, 116F, 255F, 112F);
                g.DrawLine(pen, 249F, 116F, 255F, 120F);
            }
        }
    }

    private void DrawAnimatedWindowScene(Graphics g, int frame)
    {
        const float scale = 1.2F;
        float phase = frame * 0.09F;
        GraphicsState state = g.Save();
        g.TranslateTransform(ClientSize.Width / 2F - 219F * scale, ClientSize.Height - 3F - 181F * scale);
        g.ScaleTransform(scale, scale);
        DrawAnimatedWindow(g, 150F, 28F, phase);
        DrawRestingCat(g, 112F, 92F, frame, false, true);
        DrawFloatingHearts(g, frame);
        g.Restore(state);
    }

    private void DrawAnimatedWaterScene(Graphics g, int frame)
    {
        const float scale = 1.20F;
        GraphicsState state = g.Save();
        g.TranslateTransform(ClientSize.Width / 2F - 207F * scale, ClientSize.Height - 3F - 199F * scale);
        g.ScaleTransform(scale, scale);
        DrawRestingCat(g, 112F, 92F, frame, true, false);
        DrawAnimatedWaterGlass(g, 249F, 137F, frame);
        g.Restore(state);
    }

    private static void DrawAnimatedWindow(Graphics g, float x, float y, float phase)
    {
        float curtainSway = (float)Math.Sin(phase) * 4F;
        float windSway = (float)Math.Sin(phase * 1.3F) * 5F;
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

        using (SolidBrush frameBrush = new SolidBrush(Color.FromArgb(117, 82, 55)))
        using (SolidBrush sky = new SolidBrush(Color.FromArgb(193, 228, 241)))
        using (SolidBrush curtain = new SolidBrush(Color.FromArgb(232, 239, 222)))
        using (Pen outline = new Pen(Color.FromArgb(72, 58, 48), 3F))
        using (Pen breeze = new Pen(Color.FromArgb(91, 176, 211), 3F))
        {
            outline.LineJoin = LineJoin.Round;
            breeze.StartCap = LineCap.Round;
            breeze.EndCap = LineCap.Round;

            g.FillPolygon(frameBrush, outerFrame);
            g.DrawPolygon(outline, outerFrame);
            g.FillPolygon(sky, opening);
            g.DrawPolygon(outline, opening);
            g.DrawLine(outline, x + 96, y + 21, x + 96, y + 102);
            g.DrawLine(outline, x + 35, y + 66, x + 157, y + 56);
            g.FillPolygon(frameBrush, sill);
            g.DrawPolygon(outline, sill);

            using (GraphicsPath curtainPath = new GraphicsPath())
            {
                curtainPath.AddBezier(x + 27, y + 17, x + 18 + curtainSway, y + 45, x + 47 + curtainSway, y + 57, x + 29, y + 91);
                curtainPath.AddBezier(x + 29, y + 91, x + 48 + curtainSway, y + 84, x + 55 + curtainSway, y + 48, x + 47, y + 22);
                curtainPath.CloseFigure();
                g.FillPath(curtain, curtainPath);
                g.DrawPath(outline, curtainPath);
            }

            g.DrawBezier(breeze, x + 213 + windSway, y + 40, x + 189, y + 31, x + 174, y + 46, x + 145, y + 40);
            g.DrawBezier(breeze, x + 218 - windSway, y + 73, x + 190, y + 64, x + 174, y + 82, x + 146, y + 73);
        }
    }

    private static void DrawAnimatedWaterGlass(Graphics g, float x, float y, int frame)
    {
        Color outline = Color.FromArgb(72, 61, 55);
        Color glass = Color.FromArgb(205, 235, 245);
        Color water = Color.FromArgb(104, 190, 224);
        float wave = (float)Math.Sin(frame * 0.16F) * 1.7F;
        float bubbleProgress = (frame % 48) / 48F;
        using (Pen outlinePen = new Pen(outline, 3F))
        using (Pen strawPen = new Pen(Color.FromArgb(72, 144, 178), 3F))
        using (Pen wavePen = new Pen(Color.FromArgb(68, 166, 207), 1.5F))
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
                new PointF(x + 4, y + 24 + wave), new PointF(x + 14, y + 23 - wave),
                new PointF(x + 27, y + 24 + wave), new PointF(x + 40, y + 24 - wave),
                new PointF(x + 36, y + 57), new PointF(x + 9, y + 57)
            };
            g.FillPolygon(glassBrush, cup);
            g.FillPolygon(waterBrush, waterArea);
            g.DrawPolygon(outlinePen, cup);
            g.DrawBezier(wavePen, x + 5, y + 24 + wave, x + 15, y + 21 - wave, x + 29, y + 27 + wave, x + 39, y + 24 - wave);
            g.DrawLine(strawPen, x + 27, y + 47, x + 27, y - 16);
            g.DrawLine(strawPen, x + 27, y - 16, x - 25, y - 9);

            GraphicsState bubbleState = g.Save();
            using (GraphicsPath waterClip = new GraphicsPath())
            {
                waterClip.AddPolygon(waterArea);
                g.SetClip(waterClip, CombineMode.Intersect);
                using (Pen bubbleOutline = new Pen(Color.FromArgb(190, 232, 248), 1.2F))
                using (SolidBrush bubbleLight = new SolidBrush(Color.FromArgb(120, 235, 250, 255)))
                {
                    for (int i = 0; i < 10; i++)
                    {
                        float progress = ((frame * (0.018F + i * 0.0016F)) + i * 0.137F) % 1F;
                        float bubbleX = x + 8F + ((i * 17) % 29) + (float)Math.Sin(frame * 0.08F + i) * 1.5F;
                        float bubbleY = y + 55F - progress * 34F;
                        float bubbleSize = 2.2F + (i % 4) * 0.9F;
                        g.FillEllipse(bubbleLight, bubbleX, bubbleY, bubbleSize, bubbleSize);
                        g.DrawEllipse(bubbleOutline, bubbleX, bubbleY, bubbleSize, bubbleSize);
                    }
                }
            }
            g.Restore(bubbleState);

            float strawBubbleY = y + 43F - bubbleProgress * 52F;
            g.FillEllipse(dropBrush, x + 24.7F, strawBubbleY, 4.5F, 6F);
            float pulse = 0.75F + 0.25F * (float)Math.Sin(frame * 0.20F);
            g.FillEllipse(dropBrush, x + 49, y + 13, 7F * pulse, 10F * pulse);
            g.FillEllipse(dropBrush, x + 58, y + 29, 5F * pulse, 8F * pulse);
        }
    }

    private static void DrawRestingCat(Graphics g, float x, float y, int frame, bool sipping, bool swayHead)
    {
        float phase = frame * 0.08F;
        float headBob = sipping ? (float)Math.Sin(phase * 1.5F) * 0.8F : (float)Math.Sin(phase) * 1.2F;
        float headSway = swayHead ? (float)Math.Sin(phase * 1.15F) * 5F : 0F;
        float tailSway = (float)Math.Sin(phase * 1.2F) * 5F;
        bool blink = frame % 110 > 101;
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
            using (GraphicsPath tail = new GraphicsPath())
            {
                tail.AddBezier(x + 32, y + 52, x + 7, y + 40 + tailSway, x - 5, y + 20 - tailSway, x + 13, y + 20);
                g.DrawPath(pen, tail);
            }
            g.FillEllipse(body, x + 30, y + 28, 82, 48);
            g.DrawEllipse(pen, x + 30, y + 28, 82, 48);
            float headX = x + 84 + headSway;
            float headY = y + 4 + headBob;
            g.FillEllipse(body, headX, headY, 48, 48);
            g.DrawEllipse(pen, headX, headY, 48, 48);
            PointF[] earOne = { new PointF(x + 91 + headSway, y + 12 + headBob), new PointF(x + 94 + headSway, y - 9 + headBob), new PointF(x + 108 + headSway, y + 5 + headBob) };
            PointF[] earTwo = { new PointF(x + 113 + headSway, y + 4 + headBob), new PointF(x + 126 + headSway, y - 9 + headBob), new PointF(x + 129 + headSway, y + 15 + headBob) };
            g.FillPolygon(body, earOne);
            g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne);
            g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, x + 100 + headSway, y + 29 + headBob, 23, 15);
            if (blink)
            {
                g.DrawArc(pen, x + 97 + headSway, y + 20 + headBob, 8, 4, 10, 160);
                g.DrawArc(pen, x + 116 + headSway, y + 20 + headBob, 8, 4, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, x + 99 + headSway, y + 19 + headBob, 4, 6);
                g.FillEllipse(dark, x + 118 + headSway, y + 19 + headBob, 4, 6);
            }
            g.FillEllipse(dark, x + 109 + headSway, y + 31 + headBob, 5, 4);
            if (sipping) g.DrawEllipse(pen, x + 110 + headSway, y + 36 + headBob, 5, 3);
            DrawWalkingLeg(g, pen, x + 54, y + 66, x + 51, y + 89);
            DrawWalkingLeg(g, pen, x + 68, y + 68, x + 66, y + 89);
            DrawWalkingLeg(g, pen, x + 98, y + 64, x + 95, y + 88);
        }
    }

    private static void DrawFloatingHearts(Graphics g, int frame)
    {
        int cycle = frame % 150;
        if (cycle > 82) return;
        float progress = cycle / 82F;
        DrawHeart(g, 246F + (float)Math.Sin(progress * Math.PI * 2F) * 5F, 123F - progress * 45F, 9F, (int)(220F * (1F - progress)));
        if (cycle > 24)
        {
            float second = (cycle - 24) / 70F;
            DrawHeart(g, 263F + (float)Math.Sin(second * Math.PI * 2F + 1F) * 5F, 137F - second * 38F, 6.5F, (int)(190F * (1F - second)));
        }
    }

    private static void DrawHeart(Graphics g, float x, float y, float size, int alpha)
    {
        alpha = Math.Max(0, Math.Min(255, alpha));
        using (GraphicsPath heart = new GraphicsPath())
        using (SolidBrush brush = new SolidBrush(Color.FromArgb(alpha, 225, 102, 126)))
        using (Pen outline = new Pen(Color.FromArgb(alpha, 145, 76, 88), 1.2F))
        {
            heart.AddBezier(x, y + size * 0.28F, x - size * 0.75F, y - size * 0.35F, x - size, y + size * 0.55F, x, y + size);
            heart.AddBezier(x, y + size, x + size, y + size * 0.55F, x + size * 0.75F, y - size * 0.35F, x, y + size * 0.28F);
            heart.CloseFigure();
            g.FillPath(brush, heart);
            g.DrawPath(outline, heart);
        }
    }

    private static void DrawWalkingBackground(Graphics g, int width, int height, int frame)
    {
        float bottomShift = height - 280F;
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
                new PointF(0, 211 + bottomShift), new PointF(width * 0.15F, 197 + bottomShift),
                new PointF(width * 0.33F, 208 + bottomShift), new PointF(width * 0.51F, 191 + bottomShift),
                new PointF(width * 0.72F, 205 + bottomShift), new PointF(width, 193 + bottomShift),
                new PointF(width, height), new PointF(0, height)
            };
            g.FillPolygon(grassBrush, lawn);

            PointF[] path =
            {
                new PointF(0, height - 22F), new PointF(width * 0.22F, height - 27F),
                new PointF(width * 0.45F, height - 23F), new PointF(width * 0.68F, height - 29F),
                new PointF(width, height - 24F), new PointF(width, height), new PointF(0, height)
            };
            g.FillPolygon(pathBrush, path);

            DrawWalkingTree(g, width * 0.12F, 96F + bottomShift, 1F, treeTrunk, grassDark, outlinePen);
            DrawWalkingTree(g, width * 0.47F, 128F + bottomShift, 0.58F, treeTrunk, grassDark, outlinePen);
            DrawWalkingTree(g, width * 0.82F, 112F + bottomShift, 0.82F, treeTrunk, grassDark, outlinePen);
            g.FillEllipse(grassDark, width * 0.27F, 186 + bottomShift, 75, 32);
            g.FillEllipse(grassDark, width * 0.34F, 190 + bottomShift, 58, 27);
            g.FillEllipse(grassDark, width * 0.53F, 188 + bottomShift, 68, 29);
            g.FillEllipse(grassDark, width * 0.73F, 192 + bottomShift, 58, 26);
            g.FillEllipse(grassDark, width * 0.90F, 184 + bottomShift, 80, 34);

            DrawWalkingLamp(g, width * 0.37F, 126F + bottomShift, outlinePen);
            DrawWalkingFlowers(g, width * 0.20F, 204F + bottomShift);
            DrawWalkingFlowers(g, width * 0.58F, 202F + bottomShift);
            DrawWalkingFlowers(g, width * 0.76F, 207F + bottomShift);
            DrawButterfly(g, width * 0.28F + (float)Math.Sin(frame * 0.035F) * 45F, 143F + bottomShift + (float)Math.Sin(frame * 0.09F) * 10F, frame * 0.20F, Color.FromArgb(229, 145, 89));
            DrawButterfly(g, width * 0.56F + (float)Math.Sin(frame * 0.027F + 2F) * 58F, 125F + bottomShift + (float)Math.Sin(frame * 0.075F + 1F) * 12F, frame * 0.17F + 1F, Color.FromArgb(129, 153, 213));
            DrawButterfly(g, width * 0.88F + (float)Math.Sin(frame * 0.031F + 4F) * 36F, 158F + bottomShift + (float)Math.Sin(frame * 0.10F + 2F) * 8F, frame * 0.23F + 2F, Color.FromArgb(224, 122, 142));

            float benchX = width * 0.64F;
            float benchY = 174F + bottomShift;
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

    private static void DrawWalkingLamp(Graphics g, float x, float y, Pen outline)
    {
        using (SolidBrush lamp = new SolidBrush(Color.FromArgb(244, 210, 108)))
        {
            g.DrawLine(outline, x, y + 24F, x, y + 94F);
            g.DrawLine(outline, x - 7F, y + 94F, x + 7F, y + 94F);
            g.FillEllipse(lamp, x - 10F, y + 4F, 20F, 22F);
            g.DrawEllipse(outline, x - 10F, y + 4F, 20F, 22F);
            g.DrawLine(outline, x - 12F, y + 4F, x + 12F, y + 4F);
        }
    }

    private static void DrawWalkingFlowers(Graphics g, float x, float y)
    {
        using (Pen stem = new Pen(Color.FromArgb(96, 149, 95), 2F))
        using (SolidBrush yellow = new SolidBrush(Color.FromArgb(239, 193, 77)))
        using (SolidBrush coral = new SolidBrush(Color.FromArgb(220, 128, 112)))
        {
            g.DrawLine(stem, x, y, x, y - 13F);
            g.DrawLine(stem, x + 15F, y + 1F, x + 15F, y - 10F);
            g.DrawLine(stem, x + 30F, y, x + 30F, y - 14F);
            g.FillEllipse(yellow, x - 4F, y - 18F, 9F, 9F);
            g.FillEllipse(coral, x + 11F, y - 15F, 9F, 9F);
            g.FillEllipse(yellow, x + 26F, y - 19F, 9F, 9F);
        }
    }

    private static void DrawButterfly(Graphics g, float x, float y, float phase, Color wingColor)
    {
        float flap = 3.5F + Math.Abs((float)Math.Sin(phase)) * 4.5F;
        using (SolidBrush wings = new SolidBrush(Color.FromArgb(210, wingColor)))
        using (SolidBrush body = new SolidBrush(Color.FromArgb(83, 72, 62)))
        using (Pen detail = new Pen(Color.FromArgb(120, 83, 72, 62), 1F))
        {
            g.FillEllipse(wings, x - flap - 2F, y - 5F, flap + 3F, 8F);
            g.FillEllipse(wings, x + 1F, y - 5F, flap + 3F, 8F);
            g.FillEllipse(wings, x - flap, y + 1F, flap + 1F, 6F);
            g.FillEllipse(wings, x + 1F, y + 1F, flap + 1F, 6F);
            g.FillEllipse(body, x - 1.2F, y - 3F, 3F, 10F);
            g.DrawArc(detail, x - 5F, y - 9F, 5F, 8F, 180, 80);
            g.DrawArc(detail, x + 1F, y - 9F, 5F, 8F, 280, 80);
        }
    }

    private static void DrawWalkingMusicNotes(Graphics g, float catX, int frame)
    {
        float progress = (frame % 82) / 82F;
        DrawMusicNote(g, catX + 165F + (float)Math.Sin(progress * Math.PI * 2F) * 5F, 133F - progress * 30F, 1F, (int)(205F * (1F - progress)));
        float second = ((frame + 42) % 104) / 104F;
        if (second < 0.72F)
        {
            DrawMusicNote(g, catX + 182F + (float)Math.Sin(second * Math.PI * 2F + 1F) * 4F, 145F - second * 34F, 0.75F, (int)(175F * (1F - second / 0.72F)));
        }
    }

    private static void DrawMusicNote(Graphics g, float x, float y, float scale, int alpha)
    {
        alpha = Math.Max(0, Math.Min(255, alpha));
        using (SolidBrush brush = new SolidBrush(Color.FromArgb(alpha, 82, 108, 137)))
        using (Pen pen = new Pen(Color.FromArgb(alpha, 82, 108, 137), 2F * scale))
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.FillEllipse(brush, x, y + 11F * scale, 7F * scale, 5F * scale);
            g.DrawLine(pen, x + 6F * scale, y + 13F * scale, x + 6F * scale, y);
            g.DrawLine(pen, x + 6F * scale, y, x + 13F * scale, y + 3F * scale);
        }
    }

    private static void DrawWalkingTree(Graphics g, float x, float y, float scale, Brush trunk, Brush leaves, Pen outline)
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

    private static void DrawWalkingCat(Graphics g, float x, float y, float phase, float scale = 1.18F)
    {
        Color orange = Color.FromArgb(230, 145, 62);
        Color light = Color.FromArgb(251, 220, 170);
        Color outline = Color.FromArgb(72, 61, 55);
        float bounce = (float)Math.Abs(Math.Sin(phase)) * -4F;
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
            DrawWalkingLeg(g, pen, 52F, 66F, 47F + stride, 91F);
            DrawWalkingLeg(g, pen, 72F, 68F, 72F + oppositeStride, 91F);
            DrawWalkingLeg(g, pen, 94F, 65F, 94F + oppositeStride, 89F);
            DrawWalkingLeg(g, pen, 106F, 61F, 108F + stride, 88F);
        }
        g.Restore(state);
    }

    private static void DrawWalkingLeg(Graphics g, Pen pen, float startX, float startY, float endX, float endY)
    {
        g.DrawLine(pen, startX, startY, endX, endY);
        float direction = endX >= startX ? 1F : -1F;
        g.DrawLine(pen, endX, endY, endX + direction * 8F, endY);
    }

    private static void DrawWindow(Graphics g, float x, float y)
    {
        PointF[] opening =
        {
            new PointF(x + 22, y + 14),
            new PointF(x + 170, y),
            new PointF(x + 181, y + 101),
            new PointF(x + 8, y + 116)
        };
        PointF[] inner =
        {
            new PointF(x + 32, y + 24),
            new PointF(x + 160, y + 12),
            new PointF(x + 169, y + 91),
            new PointF(x + 19, y + 104)
        };
        PointF[] openPane =
        {
            new PointF(x + 170, y),
            new PointF(x + 222, y + 23),
            new PointF(x + 230, y + 111),
            new PointF(x + 181, y + 101)
        };

        using (SolidBrush frame = new SolidBrush(Color.FromArgb(101, 72, 50)))
        using (SolidBrush sky = new SolidBrush(Color.FromArgb(184, 225, 242)))
        using (SolidBrush glass = new SolidBrush(Color.FromArgb(202, 235, 246)))
        using (SolidBrush curtain = new SolidBrush(Color.FromArgb(228, 236, 218)))
        using (Pen outline = new Pen(Color.FromArgb(72, 58, 48), 3F))
        using (Pen breeze = new Pen(Color.FromArgb(91, 176, 211), 3F))
        {
            outline.LineJoin = LineJoin.Round;
            breeze.StartCap = LineCap.Round;
            breeze.EndCap = LineCap.Round;

            g.FillPolygon(frame, opening);
            g.DrawPolygon(outline, opening);
            g.FillPolygon(sky, inner);
            g.DrawPolygon(outline, inner);
            g.DrawLine(outline, x + 96, y + 18, x + 101, y + 97);
            g.DrawLine(outline, x + 25, y + 64, x + 165, y + 52);

            g.FillPolygon(frame, openPane);
            g.DrawPolygon(outline, openPane);
            PointF[] paneGlass =
            {
                new PointF(x + 179, y + 13),
                new PointF(x + 213, y + 29),
                new PointF(x + 219, y + 98),
                new PointF(x + 188, y + 91)
            };
            g.FillPolygon(glass, paneGlass);
            g.DrawPolygon(outline, paneGlass);

            g.FillPolygon(curtain, new[] { new PointF(x + 3, y + 5), new PointF(x + 42, y + 16), new PointF(x + 30, y + 105), new PointF(x - 8, y + 119) });
            g.DrawBezier(breeze, x + 202, y + 42, x + 174, y + 30, x + 156, y + 48, x + 134, y + 39);
            g.DrawBezier(breeze, x + 218, y + 70, x + 186, y + 61, x + 169, y + 79, x + 147, y + 72);
        }
    }

    private static void DrawCat(Graphics g, float x, float y, bool walking, int frame)
    {
        float bounce = walking ? (float)Math.Sin(frame * 0.45) * 3F : (float)Math.Sin(frame * 0.08) * 1.5F;
        y += bounce;
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

            float stride = walking ? (float)Math.Sin(frame * 0.45) * 7F : 0F;
            if (walking)
            {
                DrawWalkingLeg(g, pen, x + 48, y + 66, x + 44 + stride, y + 89);
                DrawWalkingLeg(g, pen, x + 67, y + 68, x + 70 - stride, y + 89);
                DrawWalkingLeg(g, pen, x + 88, y + 66, x + 86 - stride, y + 88);
                DrawWalkingLeg(g, pen, x + 103, y + 63, x + 104 + stride, y + 87);
            }
            else
            {
                DrawWalkingLeg(g, pen, x + 54, y + 66, x + 51, y + 89);
                DrawWalkingLeg(g, pen, x + 68, y + 68, x + 66, y + 89);
                DrawWalkingLeg(g, pen, x + 98, y + 64, x + 95, y + 88);
            }
            g.DrawArc(pen, x - 10, y + 28, 52, 48, 160, 190);
        }
    }
}

internal sealed class ReminderForm : Form
{
    private static readonly Color Accent = Color.FromArgb(230, 145, 62);
    private static readonly Color AccentDark = Color.FromArgb(151, 86, 36);
    private static readonly Color AccentPale = Color.FromArgb(255, 246, 236);
    private static readonly Color WarmBackground = Color.FromArgb(249, 247, 243);
    private static readonly Color TextDark = Color.FromArgb(65, 58, 52);
    private readonly string dataDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DesktopReminder");
    private readonly string dataFile;
    private readonly DateTimePicker oncePicker = new DateTimePicker();
    private readonly DateTimePicker repeatPicker = new DateTimePicker();
    private readonly TextBox messageBox = new TextBox();
    private readonly ListBox reminderList = new ListBox();
    private readonly Button onceButton = new Button();
    private readonly Button repeatButton = new Button();
    private readonly Label repeatLabel = new Label();
    private readonly List<Button> dayButtons = new List<Button>();
    private readonly HashSet<int> selectedDays = new HashSet<int>();
    private readonly List<string> listIds = new List<string>();
    private readonly NotifyIcon notifyIcon = new NotifyIcon();
    private readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
    private List<ReminderItem> reminders = new List<ReminderItem>();
    private bool repeatMode;
    private bool allowExit;
    private bool popupOpen;

    public ReminderForm()
    {
        dataFile = Path.Combine(dataDirectory, "reminders-v2.json");
        Directory.CreateDirectory(dataDirectory);
        reminders = LoadReminders();

        Text = "桌面提醒";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(736, 390);
        MinimumSize = MaximumSize = new Size(752, 429);
        BackColor = WarmBackground;
        Font = new Font("Microsoft YaHei UI", 9F);
        string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "cat-head.ico");
        Icon = File.Exists(iconPath) ? new Icon(iconPath) : SystemIcons.Application;
        ShowInTaskbar = true;

        BuildInterface();
        BuildTray();
        timer.Interval = 15000;
        timer.Tick += delegate { CheckDueReminders(); };
        timer.Start();
        Shown += delegate { WindowState = FormWindowState.Normal; Activate(); BringToFront(); CheckDueReminders(); };
        FormClosing += OnFormClosing;
    }

    private static Font UiFont(float size, FontStyle style)
    {
        return new Font("Microsoft YaHei UI", size, style);
    }

    private void BuildInterface()
    {
        Controls.Add(new Label { Text = "设置提醒", Font = UiFont(11F, FontStyle.Bold), ForeColor = TextDark, AutoSize = true, Location = new Point(20, 17) });

        Panel modes = new Panel { Location = new Point(20, 47), Size = new Size(480, 42), BackColor = Color.FromArgb(244, 239, 232) };
        ConfigureModeButton(onceButton, "一次提醒", new Point(4, 4));
        ConfigureModeButton(repeatButton, "重复提醒", new Point(242, 4));
        onceButton.Click += delegate { repeatMode = false; UpdateMode(); };
        repeatButton.Click += delegate { repeatMode = true; UpdateMode(); };
        modes.Controls.Add(onceButton);
        modes.Controls.Add(repeatButton);
        Controls.Add(modes);

        Panel editor = new Panel { Location = new Point(20, 99), Size = new Size(480, 238), BackColor = Color.White, BorderStyle = BorderStyle.FixedSingle };
        editor.Controls.Add(new Label { Text = "提醒时间", AutoSize = true, Location = new Point(18, 16) });

        oncePicker.Format = DateTimePickerFormat.Custom;
        oncePicker.CustomFormat = "yyyy-MM-dd  HH:mm";
        oncePicker.ShowUpDown = true;
        oncePicker.Width = 158;
        oncePicker.Location = new Point(18, 40);
        oncePicker.Value = DateTime.Now.AddMinutes(5);
        editor.Controls.Add(oncePicker);

        repeatPicker.Format = DateTimePickerFormat.Custom;
        repeatPicker.CustomFormat = "HH:mm";
        repeatPicker.ShowUpDown = true;
        repeatPicker.Width = 78;
        repeatPicker.Location = new Point(18, 40);
        repeatPicker.Value = DateTime.Today.AddHours(16);
        editor.Controls.Add(repeatPicker);

        repeatLabel.Text = "重复日期";
        repeatLabel.AutoSize = true;
        repeatLabel.Location = new Point(108, 16);
        editor.Controls.Add(repeatLabel);

        string[] names = { "一", "二", "三", "四", "五", "六", "日" };
        int[] values = { 1, 2, 3, 4, 5, 6, 0 };
        for (int i = 0; i < names.Length; i++)
        {
            Button day = new Button { Text = names[i], Tag = values[i], FlatStyle = FlatStyle.Flat, Size = new Size(48, 30), Location = new Point(108 + i * 52, 39), BackColor = Color.White, ForeColor = TextDark, Cursor = Cursors.Hand };
            day.FlatAppearance.BorderColor = Color.FromArgb(219, 202, 184);
            day.Click += ToggleDay;
            dayButtons.Add(day);
            editor.Controls.Add(day);
        }

        editor.Controls.Add(new Label { Text = "快捷状态", AutoSize = true, Location = new Point(18, 82) });
        string[] quickStateLabels = { "上班", "透气", "喝水", "吃饭", "拉伸", "散步", "如厕", "下班" };
        string[] quickStateMessages = { "上班", "透气", "喝水", "吃饭", "拉伸", "散步", "如厕", "下班" };
        for (int i = 0; i < quickStateLabels.Length; i++)
        {
            Button quickState = new Button
            {
                Text = quickStateLabels[i],
                Tag = quickStateMessages[i],
                FlatStyle = FlatStyle.Flat,
                BackColor = AccentPale,
                ForeColor = AccentDark,
                Size = new Size(48, 30),
                Location = new Point(18 + i * 57, 106),
                Cursor = Cursors.Hand
            };
            quickState.FlatAppearance.BorderColor = Color.FromArgb(224, 177, 134);
            quickState.Click += delegate(object sender, EventArgs eventArgs)
            {
                messageBox.Text = Convert.ToString(((Button)sender).Tag);
                messageBox.Focus();
                messageBox.SelectionStart = messageBox.TextLength;
            };
            editor.Controls.Add(quickState);
        }

        editor.Controls.Add(new Label { Text = "提醒内容", AutoSize = true, Location = new Point(18, 157) });
        messageBox.Location = new Point(18, 181);
        messageBox.Size = new Size(318, 25);
        messageBox.Text = "提醒今天喝水进度";
        editor.Controls.Add(messageBox);

        Button add = new Button { Text = "保存提醒", FlatStyle = FlatStyle.Flat, BackColor = Accent, ForeColor = Color.White, Size = new Size(108, 36), Location = new Point(357, 174), Cursor = Cursors.Hand };
        add.FlatAppearance.BorderSize = 0;
        add.Click += AddReminder;
        editor.Controls.Add(add);
        Controls.Add(editor);

        Controls.Add(new Panel { Location = new Point(506, 18), Size = new Size(1, 352), BackColor = Color.FromArgb(225, 216, 207) });
        Controls.Add(new Label { Text = "已设置的提醒", Font = UiFont(11F, FontStyle.Bold), ForeColor = TextDark, AutoSize = true, Location = new Point(518, 17) });
        reminderList.Location = new Point(518, 47);
        reminderList.Size = new Size(210, 290);
        reminderList.Font = UiFont(10F, FontStyle.Regular);
        reminderList.IntegralHeight = false;
        reminderList.HorizontalScrollbar = true;
        reminderList.BackColor = Color.White;
        Controls.Add(reminderList);

        Button delete = new Button { Text = "删除选中", FlatStyle = FlatStyle.Flat, ForeColor = AccentDark, BackColor = Color.White, Size = new Size(92, 30), Location = new Point(518, 348), Cursor = Cursors.Hand };
        delete.FlatAppearance.BorderColor = Color.FromArgb(224, 177, 134);
        delete.Click += DeleteReminder;
        Controls.Add(delete);

        CheckBox autoStart = new CheckBox { Text = "开机自动启动", AutoSize = true, ForeColor = TextDark, Location = new Point(20, 356), Checked = IsAutoStartEnabled() };
        autoStart.CheckedChanged += delegate { SetAutoStart(autoStart.Checked); };
        Controls.Add(autoStart);
        Controls.Add(new Label { Text = "关闭窗口后仍在托盘运行", AutoSize = true, ForeColor = Color.FromArgb(112, 104, 96), Location = new Point(263, 357) });

        UpdateMode();
        RefreshReminderList();
    }

    private static void ConfigureModeButton(Button button, string text, Point location)
    {
        button.Text = text;
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderSize = 0;
        button.Size = new Size(234, 34);
        button.Location = location;
        button.Cursor = Cursors.Hand;
    }

    private void BuildTray()
    {
        notifyIcon.Icon = Icon;
        notifyIcon.Text = "桌面提醒";
        notifyIcon.Visible = true;
        ContextMenuStrip menu = new ContextMenuStrip();
        ToolStripItem open = menu.Items.Add("打开桌面提醒");
        ToolStripItem exit = menu.Items.Add("退出");
        open.Click += delegate { ShowMainWindow(); };
        exit.Click += delegate { allowExit = true; notifyIcon.Visible = false; Close(); };
        notifyIcon.ContextMenuStrip = menu;
        notifyIcon.DoubleClick += delegate { ShowMainWindow(); };
    }

    private void ShowMainWindow()
    {
        Show();
        WindowState = FormWindowState.Normal;
        Activate();
        BringToFront();
    }

    private void OnFormClosing(object sender, FormClosingEventArgs e)
    {
        if (!allowExit)
        {
            e.Cancel = true;
            Hide();
            notifyIcon.ShowBalloonTip(2500, "桌面提醒", "程序仍在后台运行，到点会弹出提醒。", ToolTipIcon.Info);
        }
        else
        {
            timer.Stop();
            notifyIcon.Dispose();
        }
    }

    private void UpdateMode()
    {
        oncePicker.Visible = !repeatMode;
        repeatPicker.Visible = repeatMode;
        repeatLabel.Visible = repeatMode;
        foreach (Button day in dayButtons) day.Visible = repeatMode;
        onceButton.BackColor = repeatMode ? Color.FromArgb(244, 239, 232) : Accent;
        repeatButton.BackColor = repeatMode ? Accent : Color.FromArgb(244, 239, 232);
        onceButton.ForeColor = repeatMode ? TextDark : Color.White;
        repeatButton.ForeColor = repeatMode ? Color.White : TextDark;
    }

    private void ToggleDay(object sender, EventArgs e)
    {
        Button button = (Button)sender;
        int day = (int)button.Tag;
        if (selectedDays.Contains(day))
        {
            selectedDays.Remove(day);
            button.BackColor = Color.White;
            button.ForeColor = TextDark;
        }
        else
        {
            selectedDays.Add(day);
            button.BackColor = Accent;
            button.ForeColor = Color.White;
        }
    }

    private void AddReminder(object sender, EventArgs e)
    {
        string message = messageBox.Text.Trim();
        if (message.Length == 0) { MessageBox.Show("请填写提醒内容。", "桌面提醒", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
        if (!repeatMode && oncePicker.Value <= DateTime.Now) { MessageBox.Show("一次提醒的时间必须晚于现在。", "桌面提醒", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
        if (repeatMode && selectedDays.Count == 0) { MessageBox.Show("请至少选择一个重复日期。", "桌面提醒", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

        reminders.Add(new ReminderItem
        {
            Id = Guid.NewGuid().ToString("N"),
            When = repeatMode ? repeatPicker.Value : oncePicker.Value,
            Message = message,
            RepeatDays = repeatMode ? selectedDays.ToList() : new List<int>(),
            Enabled = true
        });
        SaveReminders();
        RefreshReminderList();
        messageBox.SelectAll();
    }

    private void DeleteReminder(object sender, EventArgs e)
    {
        if (reminderList.SelectedIndex < 0) return;
        string id = listIds[reminderList.SelectedIndex];
        reminders.RemoveAll(delegate(ReminderItem item) { return item.Id == id; });
        SaveReminders();
        RefreshReminderList();
    }

    private void RefreshReminderList()
    {
        reminderList.Items.Clear();
        listIds.Clear();
        string[] names = { "日", "一", "二", "三", "四", "五", "六" };
        foreach (ReminderItem item in reminders.OrderBy(r => r.When))
        {
            string prefix;
            if (item.RepeatDays != null && item.RepeatDays.Count > 0)
            {
                int[] order = { 1, 2, 3, 4, 5, 6, 0 };
                bool isWorkday = item.RepeatDays.Distinct().Count() == 5
                    && new[] { 1, 2, 3, 4, 5 }.All(d => item.RepeatDays.Contains(d));
                string days = isWorkday
                    ? "工作日"
                    : string.Join(" ", order.Where(d => item.RepeatDays.Contains(d)).Select(d => "周" + names[d]));
                prefix = item.When.ToString("HH:mm") + "  " + days;
            }
            else prefix = item.When.ToString("MM-dd  HH:mm");
            string suffix = !item.Enabled ? "（已完成）" : (item.RepeatDays.Count == 0 && item.When < DateTime.Now ? "（已过期）" : "");
            reminderList.Items.Add(prefix + "    " + item.Message + suffix);
            listIds.Add(item.Id);
        }
    }

    private void CheckDueReminders()
    {
        if (popupOpen) return;
        DateTime now = DateTime.Now;
        foreach (ReminderItem item in reminders.ToList())
        {
            if (!item.Enabled) continue;
            DateTime scheduled = item.When;
            bool repeats = item.RepeatDays != null && item.RepeatDays.Count > 0;
            bool due;
            if (repeats)
            {
                scheduled = DateTime.Today.AddHours(item.When.Hour).AddMinutes(item.When.Minute);
                due = item.RepeatDays.Contains((int)now.DayOfWeek) && now >= scheduled && now < scheduled.AddHours(6) && item.LastTriggeredDate != now.ToString("yyyy-MM-dd");
            }
            else due = now >= scheduled && now < scheduled.AddHours(24);
            if (!due) continue;

            if (repeats) item.LastTriggeredDate = now.ToString("yyyy-MM-dd");
            else item.Enabled = false;
            SaveReminders();
            RefreshReminderList();
            ShowReminderPopup(item.Message, scheduled, repeats ? null : item.Id);
            break;
        }
    }

    private void ShowReminderPopup(string message, DateTime scheduled, string removeAfterCloseId)
    {
        popupOpen = true;
        AnimalReminderForm scene = new AnimalReminderForm(message, scheduled);
        scene.FormClosed += delegate
        {
            popupOpen = false;
            if (!string.IsNullOrEmpty(removeAfterCloseId))
            {
                reminders.RemoveAll(delegate(ReminderItem item) { return item.Id == removeAfterCloseId; });
                SaveReminders();
                RefreshReminderList();
            }
        };
        scene.Show();
    }

    private List<ReminderItem> LoadReminders()
    {
        if (!File.Exists(dataFile)) return new List<ReminderItem>();
        try
        {
            using (FileStream stream = File.OpenRead(dataFile))
            {
                DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<ReminderItem>));
                List<ReminderItem> result = (List<ReminderItem>)serializer.ReadObject(stream);
                foreach (ReminderItem item in result)
                {
                    if (item.RepeatDays == null) item.RepeatDays = new List<int>();
                    if (string.IsNullOrEmpty(item.Id)) item.Id = Guid.NewGuid().ToString("N");
                }
                return result;
            }
        }
        catch
        {
            File.Copy(dataFile, dataFile + ".broken-" + DateTime.Now.ToString("yyyyMMdd-HHmmss"), true);
            return new List<ReminderItem>();
        }
    }

    private void SaveReminders()
    {
        string temporary = dataFile + ".tmp";
        using (FileStream stream = File.Create(temporary))
        {
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<ReminderItem>));
            serializer.WriteObject(stream, reminders);
        }
        if (File.Exists(dataFile)) File.Delete(dataFile);
        File.Move(temporary, dataFile);
    }

    private bool IsAutoStartEnabled()
    {
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))
            return key != null && key.GetValue("DesktopReminder") != null;
    }

    private void SetAutoStart(bool enabled)
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))
        {
            if (enabled) key.SetValue("DesktopReminder", "\"" + Application.ExecutablePath + "\"");
            else key.DeleteValue("DesktopReminder", false);
        }
    }
}

internal static class DesktopReminderProgram
{
    private static Mutex mutex;

    [STAThread]
    private static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        string executableName = Path.GetFileNameWithoutExtension(Application.ExecutablePath);
        if ((args.Length > 0 && args[0] == "--preview") || executableName.Contains("预览"))
        {
            string previewMessage = args.Length > 1 ? args[1]
                : executableName.Contains("散步") ? "散步"
                : executableName.Contains("喝水") ? "喝水"
                : executableName.Contains("吃饭") ? "吃饭"
                : executableName.Contains("拉伸") ? "拉伸"
                : executableName.Contains("上班") ? "开始上班"
                : executableName.Contains("如厕") ? "猫猫如厕"
                : executableName.Contains("下班") ? "准备下班"
                : "透气";
            Application.Run(new AnimalReminderForm(previewMessage, DateTime.Now));
            return;
        }

        bool createdNew;
        mutex = new Mutex(true, @"Local\ZuoJiahuiDesktopReminderV2", out createdNew);
        if (!createdNew) { MessageBox.Show("桌面提醒已经在运行，请查看任务栏右下角托盘。", "桌面提醒"); return; }
        try { Application.Run(new ReminderForm()); }
        finally { mutex.ReleaseMutex(); mutex.Dispose(); }
    }
}
