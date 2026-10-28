// Ported from legacy/DesktopReminderApp.cs. Same geometry, colors, formulas and ordering.
// Canvas rasterization/font antialiasing can differ from GDI+; no scene is substituted.
import { Color, SolidBrush, Pen, PointF, RectangleF, GraphicsPath, Font,
  LineCap, LineJoin, StringAlignment, CombineMode, FontStyle } from './graphics.js';
export function createScenes(ClientSize) {
    function Clamp01(value)
    {
        return Math.max(0, Math.min(1, value));
    }

    function Ease(value)
    {
        value = Clamp01(value);
        return value * value * (3 - 2 * value);
    }

    function Mix(start, end, amount)
    {
        return start + (end - start) * amount;
    }

    function DrawFluidStretchScene(g, frame)
    {
        let cycle = frame % 190;
        let pose = cycle < 48 ? Ease(cycle / 48)
            : cycle < 132 ? 1
            : Ease((190 - cycle) / 58);
        let state = g.Save();
        const scale = 1.18;
        g.TranslateTransform(ClientSize.Width / 2 - 165 * scale, ClientSize.Height - 5 - 158 * scale);
        g.ScaleTransform(scale, scale);
        DrawFluidStretchCat(g, pose, frame);
        g.Restore(state);
    }

    function DrawFluidStretchCat(g, pose, frame)
    {
        let orange = Color.FromArgb(230, 145, 62);
        let light = Color.FromArgb(251, 220, 170);
        let outline = Color.FromArgb(72, 61, 55);
        let left = Mix(84, 55, pose);
        let right = Mix(208, 241, pose);
        let bodyTop = Mix(87, 59, pose);
        let bodyBottom = Mix(138, 133, pose);
        let headX = right - 8;
        let headY = Mix(77, 51, pose) + Math.sin(frame * 0.14) * 1.2 * pose;
        let baseline = 151;

        let body = new SolidBrush(orange);
        let muzzle = new SolidBrush(light);
        let dark = new SolidBrush(outline);
        let pen = new Pen(outline, 3);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;
            let torso = new GraphicsPath();
            {
                torso.AddBezier(left, 114, left + 40, bodyTop - 5, right - 48, bodyTop - 8, right, 108);
                torso.AddBezier(right, 108, right - 33, bodyBottom + 4, left + 43, bodyBottom + 7, left, 125);
                torso.CloseFigure();
                g.FillPath(body, torso);
                g.DrawPath(pen, torso);
            }

            let tail = new GraphicsPath();
            {
                tail.AddBezier(left + 5, 118, left - 18, 105, left - 32, Mix(89, 49, pose), left - 13, Mix(79, 37, pose));
                tail.AddBezier(left - 13, Mix(79, 37, pose), left - 3, Mix(72, 29, pose), left + 2, Mix(82, 40, pose), left + 3, Mix(89, 46, pose));
                g.DrawPath(pen, tail);
            }

            g.FillEllipse(body, headX, headY, 50, 48);
            g.DrawEllipse(pen, headX, headY, 50, 48);
            let earOne = [ new PointF(headX + 7, headY + 9), new PointF(headX + 10, headY - 12), new PointF(headX + 23, headY + 3) ];
            let earTwo = [ new PointF(headX + 29, headY + 3), new PointF(headX + 43, headY - 12), new PointF(headX + 47, headY + 12) ];
            g.FillPolygon(body, earOne);
            g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne);
            g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, headX + 17, headY + 28, 23, 14);
            if (pose > 0.78)
            {
                g.DrawArc(pen, headX + 11, headY + 17, 8, 5, 10, 160);
                g.DrawArc(pen, headX + 31, headY + 17, 8, 5, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, headX + 13, headY + 18, 4, 6);
                g.FillEllipse(dark, headX + 33, headY + 18, 4, 6);
            }
            g.FillEllipse(dark, headX + 26, headY + 31, 5, 4);

            let hindEndOne = Mix(left + 22, left - 17, pose);
            let hindEndTwo = Mix(left + 48, left + 3, pose);
            g.DrawLine(pen, left + 32, 128, hindEndOne, baseline);
            g.DrawLine(pen, left + 53, 130, hindEndTwo, baseline);
            g.DrawLine(pen, hindEndOne - 7, baseline, hindEndOne + 4, baseline);
            g.DrawLine(pen, hindEndTwo - 7, baseline, hindEndTwo + 4, baseline);

            let frontEndOne = Mix(right - 5, right + 50, pose);
            let frontEndTwo = Mix(right + 16, right + 66, pose);
            g.DrawLine(pen, right - 18, 121, frontEndOne, baseline);
            g.DrawLine(pen, right - 2, 119, frontEndTwo, baseline);
            g.DrawLine(pen, frontEndOne - 5, baseline, frontEndOne + 7, baseline);
            g.DrawLine(pen, frontEndTwo - 5, baseline, frontEndTwo + 7, baseline);
        }
    }

    function DrawOfficeScene(g, frame, startingWork)
    {
        let state = g.Save();
        let scale = 1.18;
        let center = startingWork ? 180 : 280;
        g.TranslateTransform(ClientSize.Width / 2 - center * scale, ClientSize.Height - 4 - 160 * scale);
        g.ScaleTransform(scale, scale);
        DrawOfficeBackdrop(g, startingWork, frame);
        if (startingWork) DrawStartingWork(g, frame);
        else DrawLeavingWork(g, frame);
        g.Restore(state);
    }

    function DrawOfficeBackdrop(g, morning, frame)
    {
        DrawWorkstation(g, frame, morning);
        if (!morning) DrawSlidingDoor(g, frame, false);
    }

    function DrawWorkstation(g, frame, animateChair)
    {
        let outline = Color.FromArgb(72, 61, 55);
        let pen = new Pen(outline, 2.5);
        let rug = new SolidBrush(Color.FromArgb(209, 225, 224));
        let wood = new SolidBrush(Color.FromArgb(177, 126, 82));
        let woodDark = new SolidBrush(Color.FromArgb(150, 101, 68));
        let chair = new SolidBrush(Color.FromArgb(105, 139, 156));
        let folder = new SolidBrush(Color.FromArgb(83, 139, 121));
        let paper = new SolidBrush(Color.FromArgb(239, 238, 226));
        let coffee = new SolidBrush(Color.FromArgb(236, 226, 206));
        let coffeeDark = new SolidBrush(Color.FromArgb(114, 78, 55));
        {
            g.FillEllipse(rug, 70, 140, 270, 16);

            let chairPull = animateChair ? Ease((frame - 198) / 44) : 1;
            let chairShift = (1 - chairPull) * 24;
            let chairBack = [ new PointF(102 + chairShift, 75), new PointF(135 + chairShift, 66), new PointF(145 + chairShift, 97), new PointF(111 + chairShift, 107) ];
            let chairSeat = [ new PointF(111 + chairShift, 107), new PointF(145 + chairShift, 97), new PointF(164 + chairShift, 111), new PointF(127 + chairShift, 122) ];
            g.FillPolygon(chair, chairBack); g.DrawPolygon(pen, chairBack);
            g.FillPolygon(chair, chairSeat); g.DrawPolygon(pen, chairSeat);
            g.DrawLine(pen, 127 + chairShift, 122, 125 + chairShift, 141);
            g.DrawLine(pen, 157 + chairShift, 112, 160 + chairShift, 134);

            let top = [ new PointF(200, 68), new PointF(272, 50), new PointF(326, 89), new PointF(244, 108) ];
            let apron = [ new PointF(244, 108), new PointF(326, 89), new PointF(326, 100), new PointF(244, 119) ];
            g.FillPolygon(wood, top);
            g.DrawLine(pen, top[0], top[3]);
            g.DrawLine(pen, top[3], top[2]);
            g.DrawLine(pen, top[2], top[1]);
            g.FillPolygon(woodDark, apron); g.DrawPolygon(pen, apron);
            g.DrawLine(pen, 250, 117, 248, 145);
            g.DrawLine(pen, 319, 99, 320, 128);
            g.DrawLine(pen, 206, 70, 207, 96);

            let folderShape = [ new PointF(222, 70), new PointF(252, 62), new PointF(270, 74), new PointF(238, 83) ];
            let paperShape = [ new PointF(226, 69), new PointF(250, 64), new PointF(264, 73), new PointF(238, 79) ];
            g.FillPolygon(folder, folderShape); g.DrawPolygon(pen, folderShape);
            g.FillPolygon(paper, paperShape);

            let cupBody = [ new PointF(281, 67), new PointF(304, 67), new PointF(301, 84), new PointF(284, 84) ];
            g.FillPolygon(coffee, cupBody);
            g.DrawPolygon(pen, cupBody);
            g.FillEllipse(coffee, 280, 61, 25, 12);
            g.DrawEllipse(pen, 280, 61, 25, 12);
            g.DrawArc(pen, 301, 67, 14, 13, 270, 180);
            g.FillEllipse(coffeeDark, 284, 64, 17, 6);
            let steam = Math.sin(frame * 0.11) * 2;
            let steamPen = new Pen(Color.FromArgb(130, 116, 102, 92), 1.4);
            {
                g.DrawBezier(steamPen, 288, 60, 283 + steam, 55, 294 - steam, 51, 289, 46);
                g.DrawBezier(steamPen, 297, 60, 292 - steam, 54, 303 + steam, 49, 298, 43);
            }
        }
    }

    function DrawStartingWork(g, frame)
    {
        let enter = Ease(frame / 194);
        let settle = Ease((frame - 244) / 42);
        let catX = Mix(-120, 65, enter);
        let catY = Mix(47, 52, settle);
        let walking = frame < 194;
        DrawOfficeCat(g, catX, catY, walking, settle, Math.trunc(frame / 2), false, true, false);
        if (frame >= 194 && frame < 244)
        {
            let arm = new Pen(Color.FromArgb(72, 61, 55), 2.4);
            {
                arm.StartCap = LineCap.Round;
                arm.EndCap = LineCap.Round;
                let tug = Ease((frame - 198) / 44);
                g.DrawLine(arm, catX + 84, 118, 141 + (1 - tug) * 20, 108);
            }
        }
        DrawHeartBreakSequence(g, catX + 105, catY - 31, 10, frame);
    }

    function DrawLeavingWork(g, frame)
    {
        let speed = 2.3;
        let catX;
        let walking;
        if (frame < 20)
        {
            catX = 65;
            walking = false;
        }
        else if (frame < 122)
        {
            catX = 65 + (frame - 20) * speed;
            walking = true;
        }
        else if (frame < 165)
        {
            catX = 300;
            walking = false;
        }
        else
        {
            catX = 300 + (frame - 165) * speed;
            walking = true;
        }

        let seated = 1 - Ease((frame - 5) / 15);
        if (catX < 585)
        {
            DrawOfficeCat(g, catX, 47, walking, seated, frame * 2, false, false, false);
            if (walking)
            {
                let speedLine = new Pen(Color.FromArgb(120, 91, 125, 142), 2);
                {
                    speedLine.StartCap = LineCap.Round;
                    speedLine.EndCap = LineCap.Round;
                    g.DrawLine(speedLine, catX - 27, 103, catX - 7, 103);
                    g.DrawLine(speedLine, catX - 38, 116, catX - 10, 116);
                    g.DrawLine(speedLine, catX - 22, 129, catX - 4, 129);
                }
                DrawHappyBurst(g, catX + 112, 66, frame);
            }
        }
        DrawSlidingDoor(g, frame, true);
    }

    function DrawSlidingDoor(g, frame, foreground)
    {
        let outline = Color.FromArgb(72, 61, 55);
        let open = Ease((frame - 138) / 32);
        const left = 420;
        const top = 18;
        const width = 130;
        const height = 137;
        const panelWidth = 62;
        const panelOffset = 65;
        let framePen = new Pen(outline, 2.7);
        let frameBrush = new SolidBrush(Color.FromArgb(96, 119, 126));
        let glass = new SolidBrush(Color.FromArgb(105, 181, 222, 235));
        let doorway = new SolidBrush(Color.FromArgb(225, 236, 234));
        let floor = new SolidBrush(Color.FromArgb(215, 224, 218));
        {
            if (!foreground)
            {
                g.FillRectangle(floor, 0, 145, 560, 11);
                g.FillRectangle(doorway, left, top, width, height);
                let clipState = g.Save();
                g.SetClip(new RectangleF(left + 3, top + 14, width - 6, height - 17), CombineMode.Intersect);
                let shift = 56 * open;
                let leftPanel = new RectangleF(left + 3 - shift, top + 14, panelWidth, height - 17);
                let rightPanel = new RectangleF(left + panelOffset + shift, top + 14, panelWidth, height - 17);
                g.FillRectangle(glass, leftPanel);
                g.FillRectangle(glass, rightPanel);
                g.DrawRectangle(framePen, leftPanel.X, leftPanel.Y, leftPanel.Width, leftPanel.Height);
                g.DrawRectangle(framePen, rightPanel.X, rightPanel.Y, rightPanel.Width, rightPanel.Height);
                g.Restore(clipState);
            }
            else
            {
                let glassState = g.Save();
                g.SetClip(new RectangleF(left + 3, top + 14, width - 6, height - 17), CombineMode.Intersect);
                let shift = 56 * open;
                let leftPanel = new RectangleF(left + 3 - shift, top + 14, panelWidth, height - 17);
                g.FillRectangle(glass, leftPanel);
                g.DrawRectangle(framePen, leftPanel.X, leftPanel.Y, leftPanel.Width, leftPanel.Height);
                g.Restore(glassState);
            }

            g.FillRectangle(frameBrush, left - 3, top, 6, height);
            g.FillRectangle(frameBrush, left - 3, top - 3, width + 6, 7);
            g.DrawLine(framePen, left - 3, top - 3, left - 3, top + height);
            g.DrawLine(framePen, left - 3, top - 3, left + width + 3, top - 3);
            if (!foreground)
            {
                g.FillRectangle(frameBrush, left + width - 3, top, 6, height);
                g.DrawLine(framePen, left + width + 3, top - 3, left + width + 3, top + height);
            }

            let sensor = new SolidBrush(Color.FromArgb(69, 82, 88));
            let signal = new Pen(Color.FromArgb(190, 73, 151, 174), 1.5);
            let sign = new SolidBrush(Color.FromArgb(90, 119, 132));
            let white = new SolidBrush(Color.White);
            let font = new Font("Arial", 7.5, FontStyle.Bold);
            {
                g.FillRectangle(sensor, left + 55, top - 10, 20, 8);
                if (frame >= 122 && frame < 171)
                {
                    let pulse = 3 + Math.abs(Math.sin(frame * 0.22)) * 5;
                    g.DrawArc(signal, left + 65 - pulse, top - 2, pulse * 2, 11, 200, 140);
                    g.DrawArc(signal, left + 65 - pulse * 1.5, top - 4, pulse * 3, 16, 205, 130);
                }
                let signRect = new RectangleF(left + 39, top + 5, 52, 16);
                g.FillRectangle(sign, signRect);
                g.DrawRectangle(framePen, signRect.X, signRect.Y, signRect.Width, signRect.Height);
                let centered = ({ Alignment: StringAlignment.Center, LineAlignment: StringAlignment.Center });
                g.DrawString("OFFICE", font, white, signRect, centered);

            }
        }
    }

    function DrawAlarmClock(g, x, y, frame)
    {
        let outline = Color.FromArgb(72, 61, 55);
        let ring = Math.sin(frame * 0.48) * 2;
        let pen = new Pen(outline, 2.2);
        let ringPen = new Pen(Color.FromArgb(180, 201, 128, 71), 1.8);
        let body = new SolidBrush(Color.FromArgb(239, 174, 83));
        let face = new SolidBrush(Color.FromArgb(247, 241, 221));
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.FillEllipse(body, x, y, 32, 28);
            g.DrawEllipse(pen, x, y, 32, 28);
            g.FillEllipse(face, x + 5, y + 5, 22, 18);
            g.DrawEllipse(pen, x + 5, y + 5, 22, 18);
            g.DrawLine(pen, x + 16, y + 14, x + 16, y + 8);
            g.DrawLine(pen, x + 16, y + 14, x + 21, y + 17);
            g.DrawArc(pen, x + 1 + ring, y - 8, 12, 12, 190, 150);
            g.DrawArc(pen, x + 19 - ring, y - 8, 12, 12, 200, 150);
            g.DrawLine(pen, x + 7, y + 26, x + 3, y + 31);
            g.DrawLine(pen, x + 25, y + 26, x + 29, y + 31);
            g.DrawLine(ringPen, x - 5 + ring, y - 3, x - 10 + ring, y - 9);
            g.DrawLine(ringPen, x + 37 - ring, y - 3, x + 42 - ring, y - 9);
        }
    }

    function DrawDoorForeground(g)
    {
        let outline = Color.FromArgb(72, 61, 55);
        let pen = new Pen(outline, 2.7);
        let door = new SolidBrush(Color.FromArgb(132, 94, 70));
        let sign = new SolidBrush(Color.FromArgb(90, 119, 132));
        let knob = new SolidBrush(Color.FromArgb(247, 211, 112));
        let white = new SolidBrush(Color.White);
        let font = new Font("Arial", 7.5, FontStyle.Bold);
        {
            let leaf = [ new PointF(270, 30), new PointF(326, 45), new PointF(326, 140), new PointF(270, 153) ];
            g.FillPolygon(door, leaf);
            g.DrawPolygon(pen, leaf);
            let signRect = new RectangleF(280, 51, 39, 16);
            g.FillRectangle(sign, signRect);
            g.DrawRectangle(pen, signRect.X, signRect.Y, signRect.Width, signRect.Height);
            let centered = ({ Alignment: StringAlignment.Center, LineAlignment: StringAlignment.Center });
            g.DrawString("OFFICE", font, white, signRect, centered);

            g.FillEllipse(knob, 316, 96, 5, 5);
        }
    }

    function DrawOfficeLaptop(g, x, deskY, openAmount, hidden)
    {
        if (hidden) return;
        let outline = Color.FromArgb(72, 61, 55);
        let pen = new Pen(outline, 2.5);
        let shell = new SolidBrush(Color.FromArgb(103, 138, 163));
        let screen = new SolidBrush(Color.FromArgb(188, 223, 237));
        {
            let screenHeight = Mix(4, 39, openAmount);
            g.FillRectangle(shell, x, deskY - 5, 55, 6);
            g.DrawRectangle(pen, x, deskY - 5, 55, 6);
            if (screenHeight > 5)
            {
                g.FillRectangle(screen, x + 5, deskY - 5 - screenHeight, 45, screenHeight);
                g.DrawRectangle(pen, x + 5, deskY - 5 - screenHeight, 45, screenHeight);
            }
        }
    }

    function DrawOfficeBag(g, x, y, closeAmount, lifted)
    {
        let outline = Color.FromArgb(72, 61, 55);
        let pen = new Pen(outline, 2.5);
        let bag = new SolidBrush(Color.FromArgb(61, 126, 109));
        let flap = new SolidBrush(Color.FromArgb(101, 164, 145));
        {
            g.FillRectangle(bag, x, y, 42, 28);
            g.DrawRectangle(pen, x, y, 42, 28);
            let flapY = y - Mix(10, 0, closeAmount);
            g.FillRectangle(flap, x, flapY, 42, 10);
            g.DrawRectangle(pen, x, flapY, 42, 10);
            g.DrawArc(pen, x + 12, y - (lifted ? 14 : 8), 18, 16, 180, 180);
        }
    }

    function DrawOfficeCat(g, x, y, walking, seated, frame, carrying, tired, happy)
    {
        let state = g.Save();
        g.TranslateTransform(x, y + (walking ? Math.abs(Math.sin(frame * 0.34)) * -3 : 0));
        g.ScaleTransform(1, 1);
        let orange = Color.FromArgb(230, 145, 62);
        let light = Color.FromArgb(251, 220, 170);
        let outline = Color.FromArgb(72, 61, 55);
        let body = new SolidBrush(orange);
        let muzzle = new SolidBrush(light);
        let dark = new SolidBrush(outline);
        let eyeShadow = new SolidBrush(Color.FromArgb(120, 86, 82, 87));
        let pen = new Pen(outline, 3);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            let bodyY = seated * 8;
            g.FillEllipse(body, 28, 30 + bodyY, 82, 48);
            g.DrawEllipse(pen, 28, 30 + bodyY, 82, 48);
            g.FillEllipse(body, 81, 5, 49, 49);
            g.DrawEllipse(pen, 81, 5, 49, 49);
            let earOne = [ new PointF(89, 13), new PointF(93, -8), new PointF(106, 6) ];
            let earTwo = [ new PointF(111, 5), new PointF(125, -8), new PointF(128, 16) ];
            g.FillPolygon(body, earOne); g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne); g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, 98, 30, 23, 15);
            if (tired)
            {
                g.FillEllipse(eyeShadow, 91, 18, 14, 11);
                g.FillEllipse(eyeShadow, 112, 18, 14, 11);
                g.DrawArc(pen, 94, 20, 9, 5, 10, 160);
                g.DrawArc(pen, 115, 20, 9, 5, 10, 160);
            }
            else if (happy)
            {
                g.DrawArc(pen, 94, 19, 9, 6, 10, 160);
                g.DrawArc(pen, 115, 19, 9, 6, 10, 160);
                g.DrawArc(pen, 103, 33, 14, 9, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, 97, 20, 4, 6);
                g.FillEllipse(dark, 117, 20, 4, 6);
            }
            g.FillEllipse(dark, 108, 32, 5, 4);
            let stride = walking ? Math.sin(frame * 0.34) * 10 : 0;
            if (walking)
            {
                DrawWalkingLeg(g, pen, 47, 68 + bodyY, 43 + stride, 94);
                DrawWalkingLeg(g, pen, 67, 70 + bodyY, 70 - stride, 94);
                DrawWalkingLeg(g, pen, 89, 68 + bodyY, 87 - stride, 93);
                DrawWalkingLeg(g, pen, 104, 64 + bodyY, 105 + stride, 92);
            }
            else
            {
                DrawWalkingLeg(g, pen, 52, 69 + bodyY, 49, 94);
                DrawWalkingLeg(g, pen, 66, 70 + bodyY, 64, 94);
                DrawWalkingLeg(g, pen, 96, 66 + bodyY, 95, 93);
            }
            let tail = new GraphicsPath();
            {
                tail.AddBezier(31, 57 + bodyY, 8, 45, -5, 23, 13, 20);
                g.DrawPath(pen, tail);
            }
            if (carrying) g.DrawArc(pen, 38, 54, 26, 29, 180, 180);
        }
        g.Restore(state);
    }

    function DrawHeartBreakSequence(g, x, y, size, frame)
    {
        let progress = (frame % 110) / 110;
        let crackProgress = Ease((progress - 0.16) / 0.30);
        let alpha = progress > 0.78
            ? Math.trunc((235 * (1 - Ease((progress - 0.78) / 0.22))))
            : 235;
        DrawHeart(g, x, y, size, alpha);

        if (crackProgress > 0.02 && alpha > 0)
        {
            let crack = new Pen(Color.FromArgb(alpha, 246, 248, 251), 1.7);
            {
                crack.StartCap = LineCap.Round;
                crack.EndCap = LineCap.Round;
                let p0 = new PointF(x, y + size * 0.18);
                let p1 = new PointF(x - 2.3, y + size * 0.42);
                let p2 = new PointF(x + 2.2, y + size * 0.60);
                let p3 = new PointF(x - 1.2, y + size * 0.79);
                let p4 = new PointF(x + 0.5, y + size * 0.98);
                g.DrawLine(crack, p0, p1);
                if (crackProgress > 0.34) g.DrawLine(crack, p1, p2);
                if (crackProgress > 0.62) g.DrawLine(crack, p2, p3);
                if (crackProgress > 0.84) g.DrawLine(crack, p3, p4);
            }
        }
    }

    function DrawHappyBurst(g, x, y, frame)
    {
        let pulse = 0.8 + 0.2 * Math.sin(frame * 0.24);
        let ray = new Pen(Color.FromArgb(225, 192, 125, 58), 2);
        let star = new SolidBrush(Color.FromArgb(239, 193, 77));
        {
            for (let i = 0; i < 5; i++)
            {
                let angle = -Math.PI * 0.9 + i * Math.PI * 0.28;
                let sx = x + Math.cos(angle) * 18;
                let sy = y + Math.sin(angle) * 15;
                g.DrawLine(ray, sx, sy, x + Math.cos(angle) * 26, y + Math.sin(angle) * 23);
            }
            g.FillEllipse(star, x + 19, y - 16, 6 * pulse, 6 * pulse);
            g.FillEllipse(star, x - 23, y - 9, 5 * pulse, 5 * pulse);
        }
        DrawMusicNote(g, x + 52, y - 22, 0.75, 210);
    }

    function DrawToiletScene(g, frame)
    {
        let state = g.Save();
        const scale = 1.15;
        g.TranslateTransform(ClientSize.Width / 2 - 150 * scale, ClientSize.Height - 4 - 156 * scale);
        g.ScaleTransform(scale, scale);
        DrawToiletAnimation(g, frame);
        g.Restore(state);
    }

    function DrawToiletAnimation(g, frame)
    {
        let squat = frame < 45 ? Ease(frame / 45) : 1;
        let appear = Ease((frame - 62) / 32);
        let cover = Ease((frame - 128) / 58);
        let mound = new SolidBrush(Color.FromArgb(145, 103, 72));
        let ground = new SolidBrush(Color.FromArgb(95, 154, 136, 113));
        let dirt = new SolidBrush(Color.FromArgb(211, 178, 127));
        let dust = new SolidBrush(Color.FromArgb(155, 211, 178, 127));
        {
            g.FillEllipse(ground, 122, 148, 135, 8);
            if (appear > 0.02)
            {
                let poopY = Mix(123, 137, appear);
                g.FillEllipse(mound, 201, poopY + 8, 24, 9);
                g.FillEllipse(mound, 205, poopY + 3, 17, 10);
                g.FillEllipse(mound, 209, poopY, 10, 8);
                if (frame > 105 && cover < 0.5)
                {
                    let scent = new Pen(Color.FromArgb(110, 117, 93, 78), 1.5);
                    {
                        let sway = Math.sin(frame * 0.12) * 2;
                        g.DrawBezier(scent, 211, poopY - 2, 205 + sway, poopY - 9, 218 - sway, poopY - 14, 212, poopY - 21);
                        g.DrawBezier(scent, 220, poopY, 214 - sway, poopY - 7, 227 + sway, poopY - 12, 221, poopY - 19);
                    }
                }
                if (frame > 84 && cover < 0.82)
                {
                    let flyFade = 1 - Clamp01((cover - 0.55) / 0.27);
                    DrawFly(g, 196 + Math.sin(frame * 0.21) * 7, poopY - 13 + Math.cos(frame * 0.17) * 5, frame * 0.52, flyFade);
                    DrawFly(g, 220 + Math.sin(frame * 0.18 + 1.7) * 8, poopY - 19 + Math.cos(frame * 0.23) * 5, frame * 0.61, flyFade);
                    DrawFly(g, 230 + Math.sin(frame * 0.24 + 3.1) * 6, poopY - 8 + Math.cos(frame * 0.19) * 4, frame * 0.57, flyFade);
                }
                if (cover > 0.01)
                {
                    g.FillEllipse(dirt, 198, poopY + 8 - cover * 3, 31, 6 + cover * 10);
                    for (let i = 0; i < 7; i++)
                    {
                        let px = 179 + i * 8 + Math.sin(frame * 0.42 + i) * 5;
                        let py = 137 - cover * (8 + i * 1.8);
                        let size = 3 + i % 3;
                        g.FillEllipse(dust, px, py, size, size);
                    }
                }
            }
            if (frame < 190)
            {
                DrawSquattingCat(g, 67, 53 + squat * 12, squat, cover, frame);
            }
            else
            {
                let walkX = 67 - (frame - 190) * 2.3;
                let walkState = g.Save();
                g.TranslateTransform(walkX + 132, 0);
                g.ScaleTransform(-1, 1);
                DrawWalkingCat(g, 0, 55, (frame - 190) * 0.25, 1.03);
                g.Restore(walkState);
            }
        }
    }

    function DrawFly(g, x, y, phase, opacity)
    {
        let alpha = Math.trunc((210 * Clamp01(opacity)));
        let wing = 2.5 + Math.abs(Math.sin(phase)) * 2.2;
        let wings = new SolidBrush(Color.FromArgb(alpha, 207, 225, 226));
        let body = new SolidBrush(Color.FromArgb(alpha, 63, 58, 53));
        let motion = new Pen(Color.FromArgb(Math.trunc((90 * Clamp01(opacity))), 83, 72, 62), 0.9);
        {
            g.FillEllipse(wings, x - wing - 1, y - 3, wing + 2, 5);
            g.FillEllipse(wings, x + 1, y - 3, wing + 2, 5);
            g.FillEllipse(body, x - 1.5, y - 1.5, 4, 7);
            g.DrawArc(motion, x - 8, y - 8, 7, 7, 30, 150);
        }
    }

    function DrawSquattingCat(g, x, y, squat, cover, frame)
    {
        let orange = Color.FromArgb(230, 145, 62);
        let light = Color.FromArgb(251, 220, 170);
        let outline = Color.FromArgb(72, 61, 55);
        let body = new SolidBrush(orange);
        let muzzle = new SolidBrush(light);
        let dark = new SolidBrush(outline);
        let pen = new Pen(outline, 3);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;
            g.FillEllipse(body, x + 25, y + 28, 92, 48 - squat * 6);
            g.DrawEllipse(pen, x + 25, y + 28, 92, 48 - squat * 6);
            g.FillEllipse(body, x, y + 7, 50, 50);
            g.DrawEllipse(pen, x, y + 7, 50, 50);
            let earOne = [ new PointF(x + 7, y + 15), new PointF(x + 9, y - 7), new PointF(x + 23, y + 8) ];
            let earTwo = [ new PointF(x + 29, y + 8), new PointF(x + 43, y - 7), new PointF(x + 47, y + 17) ];
            g.FillPolygon(body, earOne); g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne); g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, x + 13, y + 34, 24, 14);
            g.DrawArc(pen, x + 8, y + 23, 8, 5, 10, 160);
            g.DrawArc(pen, x + 32, y + 23, 8, 5, 10, 160);
            g.FillEllipse(dark, x + 22, y + 36, 5, 4);
            let kick = cover > 0 ? Math.sin(frame * 0.55) * 12 * (1 - cover * 0.4) : 0;
            DrawWalkingLeg(g, pen, x + 88, y + 65, x + 92 + kick, y + 91);
            DrawWalkingLeg(g, pen, x + 106, y + 62, x + 111 - kick, y + 89);
            DrawWalkingLeg(g, pen, x + 46, y + 68, x + 39, y + 91);
            let tail = new GraphicsPath();
            {
                let wag = Math.sin(frame * 0.12) * 5;
                tail.AddBezier(x + 108, y + 45, x + 142, y + 26, x + 132 + wag, y - 7, x + 119 + wag, y + 3);
                g.DrawPath(pen, tail);
            }
        }
    }

    function DrawEatingScene(g, frame)
    {
        let state = g.Save();
        const scale = 0.90;
        g.TranslateTransform(ClientSize.Width / 2 - 165 * scale, ClientSize.Height - 4 - 158 * scale);
        g.ScaleTransform(scale, scale);
        DrawEatingAnimation(g, frame);
        g.Restore(state);
    }

    function DrawEatingAnimation(g, frame)
    {
        let eating = frame >= 28 && frame < 266;
        let bite = eating ? (0.5 - 0.5 * Math.cos((frame - 28) * 0.24)) : 0;
        let finish = Ease((frame - 266) / 38);
        let foodRemaining = 1 - Clamp01((frame - 40) / 220);
        let headX = Mix(139, 169, bite * (1 - finish));
        let headY = Mix(46, 73, bite * (1 - finish));
        let tailSway = Math.sin(frame * 0.10) * 8;
        let orange = Color.FromArgb(230, 145, 62);
        let light = Color.FromArgb(251, 220, 170);
        let outline = Color.FromArgb(72, 61, 55);

        let mat = new SolidBrush(Color.FromArgb(213, 226, 216));
        let body = new SolidBrush(orange);
        let muzzle = new SolidBrush(light);
        let dark = new SolidBrush(outline);
        let tongue = new SolidBrush(Color.FromArgb(225, 126, 137));
        let pen = new Pen(outline, 3);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;
            g.FillEllipse(mat, 53, 139, 226, 16);

            let tail = new GraphicsPath();
            {
                tail.AddBezier(86, 111, 43, 111 + tailSway, 42, 67 - tailSway, 70, 72);
                g.DrawPath(pen, tail);
            }
            g.FillEllipse(body, 78, 77, 104, 61);
            g.DrawEllipse(pen, 78, 77, 104, 61);
            DrawWalkingLeg(g, pen, 105, 126, 100, 148);
            DrawWalkingLeg(g, pen, 117, 128, 116, 149);
            DrawWalkingLeg(g, pen, 137, 128, 140, 148);

            g.FillEllipse(body, headX, headY, 56, 54);
            g.DrawEllipse(pen, headX, headY, 56, 54);
            let earOne = [ new PointF(headX + 8, headY + 10), new PointF(headX + 10, headY - 13), new PointF(headX + 26, headY + 4) ];
            let earTwo = [ new PointF(headX + 32, headY + 4), new PointF(headX + 47, headY - 13), new PointF(headX + 52, headY + 13) ];
            g.FillPolygon(body, earOne); g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne); g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, headX + 20, headY + 32, 25, 15);
            if (bite > 0.76 && eating)
            {
                g.DrawArc(pen, headX + 13, headY + 21, 9, 5, 10, 160);
                g.DrawArc(pen, headX + 35, headY + 21, 9, 5, 10, 160);
            }
            else
            {
                g.FillEllipse(dark, headX + 15, headY + 20, 4, 6);
                g.FillEllipse(dark, headX + 37, headY + 20, 4, 6);
            }
            g.FillEllipse(dark, headX + 30, headY + 35, 5, 4);
            if (finish > 0.15)
            {
                let lick = Math.abs(Math.sin(frame * 0.25));
                g.FillEllipse(tongue, headX + 31, headY + 39, 6, 3 + lick * 5);
            }
        }

        DrawFoodBowl(g, foodRemaining, frame);
        if (finish > 0.08)
        {
            let rise = finish * 24;
            DrawHeart(g, 220 + Math.sin(frame * 0.10) * 3, 91 - rise, 7, Math.trunc((220 * (1 - finish * 0.45))));
        }
        DrawEatingFirework(g, headX + 28, headY - 17, 18, frame);
    }

    function DrawEatingFirework(g, x, startY, burstY, frame)
    {
        let progress = Clamp01((frame - 210) / 108);
        if (progress <= 0 || progress >= 1) return;

        if (progress < 0.57)
        {
            let rise = Ease(progress / 0.57);
            let rocketY = Mix(startY, burstY, rise);
            let trail = new Pen(Color.FromArgb(190, 220, 143, 72), 1.6);
            let spark = new SolidBrush(Color.FromArgb(244, 188, 67));
            {
                trail.StartCap = LineCap.Round;
                trail.EndCap = LineCap.Round;
                g.DrawLine(trail, x, rocketY + 18, x, rocketY + 3);
                g.FillEllipse(spark, x - 2.5, rocketY - 2.5, 5, 5);
            }
            return;
        }

        let burst = Clamp01((progress - 0.57) / 0.43);
        let radius = 4 + Ease(burst) * 20;
        let alpha = Math.trunc((235 * (1 - burst)));
        let colors = [
            Color.FromArgb(alpha, 234, 105, 104),
            Color.FromArgb(alpha, 239, 184, 72),
            Color.FromArgb(alpha, 91, 164, 181)
        ];
        for (let i = 0; i < 12; i++)
        {
            let angle = -Math.PI / 2 + i * Math.PI * 2 / 12;
            let inner = radius * 0.38;
            let x1 = x + Math.cos(angle) * inner;
            let y1 = burstY + Math.sin(angle) * inner;
            let bend = (i % 2 == 0 ? 1 : -1) * 0.10 * burst;
            let middleRadius = radius * 0.68;
            let middleAngle = angle + bend * 0.35;
            let endAngle = angle + bend;
            let middleX = x + Math.cos(middleAngle) * middleRadius;
            let middleY = burstY + Math.sin(middleAngle) * middleRadius + burst * burst * 1.5;
            let x2 = x + Math.cos(endAngle) * radius;
            let y2 = burstY + Math.sin(endAngle) * radius + burst * burst * 3;
            let ray = new Pen(colors[i % colors.length], 1.55);
            {
                ray.StartCap = LineCap.Round;
                ray.EndCap = LineCap.Round;
                g.DrawLine(ray, x1, y1, middleX, middleY);
                g.DrawLine(ray, middleX, middleY, x2, y2);
            }
        }
    }

    function DrawFoodBowl(g, remaining, frame)
    {
        let outline = Color.FromArgb(72, 61, 55);
        let pen = new Pen(outline, 2.7);
        let bowl = new SolidBrush(Color.FromArgb(101, 163, 178));
        let rim = new SolidBrush(Color.FromArgb(183, 220, 225));
        let foodOne = new SolidBrush(Color.FromArgb(195, 129, 76));
        let foodTwo = new SolidBrush(Color.FromArgb(229, 176, 87));
        {
            let bowlBody = [ new PointF(206, 116), new PointF(270, 116), new PointF(260, 145), new PointF(217, 145) ];
            g.FillPolygon(bowl, bowlBody);
            g.DrawPolygon(pen, bowlBody);
            g.FillEllipse(rim, 204, 111, 68, 14);
            g.DrawEllipse(pen, 204, 111, 68, 14);
            for (let i = 0; i < 8; i++)
            {
                if ((i + 1) / 8 > remaining) continue;
                let foodX = 213 + (i * 13 % 46);
                let foodY = 108 - (i % 3) * 4 + Math.sin(frame * 0.08 + i) * 0.8;
                g.FillEllipse(i % 2 == 0 ? foodOne : foodTwo, foodX, foodY, 9, 7);
                g.DrawEllipse(pen, foodX, foodY, 9, 7);
            }
            if (remaining < 0.08)
            {
                g.DrawLine(pen, 225, 116, 249, 116);
                g.DrawLine(pen, 225, 116, 218, 111);
                g.DrawLine(pen, 225, 116, 218, 121);
                g.DrawLine(pen, 249, 116, 255, 112);
                g.DrawLine(pen, 249, 116, 255, 120);
            }
        }
    }

    function DrawAnimatedWindowScene(g, frame)
    {
        const scale = 1.2;
        let phase = frame * 0.09;
        let state = g.Save();
        g.TranslateTransform(ClientSize.Width / 2 - 219 * scale, ClientSize.Height - 3 - 181 * scale);
        g.ScaleTransform(scale, scale);
        DrawAnimatedWindow(g, 150, 28, phase);
        DrawRestingCat(g, 112, 92, frame, false, true);
        DrawFloatingHearts(g, frame);
        g.Restore(state);
    }

    function DrawAnimatedWaterScene(g, frame)
    {
        const scale = 1.20;
        let state = g.Save();
        g.TranslateTransform(ClientSize.Width / 2 - 207 * scale, ClientSize.Height - 3 - 199 * scale);
        g.ScaleTransform(scale, scale);
        DrawRestingCat(g, 112, 92, frame, true, false);
        DrawAnimatedWaterGlass(g, 249, 137, frame);
        g.Restore(state);
    }

    function DrawAnimatedWindow(g, x, y, phase)
    {
        let curtainSway = Math.sin(phase) * 4;
        let windSway = Math.sin(phase * 1.3) * 5;
        let outerFrame = [
            new PointF(x + 24, y + 15), new PointF(x + 169, y + 4),
            new PointF(x + 169, y + 108), new PointF(x + 24, y + 121)
        ];
        let opening = [
            new PointF(x + 35, y + 25), new PointF(x + 157, y + 16),
            new PointF(x + 157, y + 96), new PointF(x + 35, y + 107)
        ];
        let sill = [
            new PointF(x + 17, y + 121), new PointF(x + 169, y + 108),
            new PointF(x + 187, y + 118), new PointF(x + 34, y + 134)
        ];

        let frameBrush = new SolidBrush(Color.FromArgb(117, 82, 55));
        let sky = new SolidBrush(Color.FromArgb(193, 228, 241));
        let curtain = new SolidBrush(Color.FromArgb(232, 239, 222));
        let outline = new Pen(Color.FromArgb(72, 58, 48), 3);
        let breeze = new Pen(Color.FromArgb(91, 176, 211), 3);
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

            let curtainPath = new GraphicsPath();
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

    function DrawAnimatedWaterGlass(g, x, y, frame)
    {
        let outline = Color.FromArgb(72, 61, 55);
        let glass = Color.FromArgb(205, 235, 245);
        let water = Color.FromArgb(104, 190, 224);
        let wave = Math.sin(frame * 0.16) * 1.7;
        let bubbleProgress = (frame % 48) / 48;
        let outlinePen = new Pen(outline, 3);
        let strawPen = new Pen(Color.FromArgb(72, 144, 178), 3);
        let wavePen = new Pen(Color.FromArgb(68, 166, 207), 1.5);
        let glassBrush = new SolidBrush(Color.FromArgb(175, glass));
        let waterBrush = new SolidBrush(Color.FromArgb(205, water));
        let dropBrush = new SolidBrush(water);
        {
            outlinePen.LineJoin = LineJoin.Round;
            strawPen.StartCap = LineCap.Round;
            strawPen.EndCap = LineCap.Round;
            let cup = [
                new PointF(x, y), new PointF(x + 44, y),
                new PointF(x + 38, y + 62), new PointF(x + 7, y + 62)
            ];
            let waterArea = [
                new PointF(x + 4, y + 24 + wave), new PointF(x + 14, y + 23 - wave),
                new PointF(x + 27, y + 24 + wave), new PointF(x + 40, y + 24 - wave),
                new PointF(x + 36, y + 57), new PointF(x + 9, y + 57)
            ];
            g.FillPolygon(glassBrush, cup);
            g.FillPolygon(waterBrush, waterArea);
            g.DrawPolygon(outlinePen, cup);
            g.DrawBezier(wavePen, x + 5, y + 24 + wave, x + 15, y + 21 - wave, x + 29, y + 27 + wave, x + 39, y + 24 - wave);
            g.DrawLine(strawPen, x + 27, y + 47, x + 27, y - 16);
            g.DrawLine(strawPen, x + 27, y - 16, x - 25, y - 9);

            let bubbleState = g.Save();
            let waterClip = new GraphicsPath();
            {
                waterClip.AddPolygon(waterArea);
                g.SetClip(waterClip, CombineMode.Intersect);
                let bubbleOutline = new Pen(Color.FromArgb(190, 232, 248), 1.2);
                let bubbleLight = new SolidBrush(Color.FromArgb(120, 235, 250, 255));
                {
                    for (let i = 0; i < 10; i++)
                    {
                        let progress = ((frame * (0.018 + i * 0.0016)) + i * 0.137) % 1;
                        let bubbleX = x + 8 + ((i * 17) % 29) + Math.sin(frame * 0.08 + i) * 1.5;
                        let bubbleY = y + 55 - progress * 34;
                        let bubbleSize = 2.2 + (i % 4) * 0.9;
                        g.FillEllipse(bubbleLight, bubbleX, bubbleY, bubbleSize, bubbleSize);
                        g.DrawEllipse(bubbleOutline, bubbleX, bubbleY, bubbleSize, bubbleSize);
                    }
                }
            }
            g.Restore(bubbleState);

            let strawBubbleY = y + 43 - bubbleProgress * 52;
            g.FillEllipse(dropBrush, x + 24.7, strawBubbleY, 4.5, 6);
            let pulse = 0.75 + 0.25 * Math.sin(frame * 0.20);
            g.FillEllipse(dropBrush, x + 49, y + 13, 7 * pulse, 10 * pulse);
            g.FillEllipse(dropBrush, x + 58, y + 29, 5 * pulse, 8 * pulse);
        }
    }

    function DrawRestingCat(g, x, y, frame, sipping, swayHead)
    {
        let phase = frame * 0.08;
        let headBob = sipping ? Math.sin(phase * 1.5) * 0.8 : Math.sin(phase) * 1.2;
        let headSway = swayHead ? Math.sin(phase * 1.15) * 5 : 0;
        let tailSway = Math.sin(phase * 1.2) * 5;
        let blink = frame % 110 > 101;
        let orange = Color.FromArgb(230, 145, 62);
        let light = Color.FromArgb(251, 220, 170);
        let outline = Color.FromArgb(72, 61, 55);
        let body = new SolidBrush(orange);
        let muzzle = new SolidBrush(light);
        let dark = new SolidBrush(outline);
        let pen = new Pen(outline, 3);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;
            let tail = new GraphicsPath();
            {
                tail.AddBezier(x + 32, y + 52, x + 7, y + 40 + tailSway, x - 5, y + 20 - tailSway, x + 13, y + 20);
                g.DrawPath(pen, tail);
            }
            g.FillEllipse(body, x + 30, y + 28, 82, 48);
            g.DrawEllipse(pen, x + 30, y + 28, 82, 48);
            let headX = x + 84 + headSway;
            let headY = y + 4 + headBob;
            g.FillEllipse(body, headX, headY, 48, 48);
            g.DrawEllipse(pen, headX, headY, 48, 48);
            let earOne = [ new PointF(x + 91 + headSway, y + 12 + headBob), new PointF(x + 94 + headSway, y - 9 + headBob), new PointF(x + 108 + headSway, y + 5 + headBob) ];
            let earTwo = [ new PointF(x + 113 + headSway, y + 4 + headBob), new PointF(x + 126 + headSway, y - 9 + headBob), new PointF(x + 129 + headSway, y + 15 + headBob) ];
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

    function DrawFloatingHearts(g, frame)
    {
        let cycle = frame % 150;
        if (cycle > 82) return;
        let progress = cycle / 82;
        DrawHeart(g, 246 + Math.sin(progress * Math.PI * 2) * 5, 123 - progress * 45, 9, Math.trunc((220 * (1 - progress))));
        if (cycle > 24)
        {
            let second = (cycle - 24) / 70;
            DrawHeart(g, 263 + Math.sin(second * Math.PI * 2 + 1) * 5, 137 - second * 38, 6.5, Math.trunc((190 * (1 - second))));
        }
    }

    function DrawHeart(g, x, y, size, alpha)
    {
        alpha = Math.max(0, Math.min(255, alpha));
        let heart = new GraphicsPath();
        let brush = new SolidBrush(Color.FromArgb(alpha, 225, 102, 126));
        let outline = new Pen(Color.FromArgb(alpha, 145, 76, 88), 1.2);
        {
            heart.AddBezier(x, y + size * 0.28, x - size * 0.75, y - size * 0.35, x - size, y + size * 0.55, x, y + size);
            heart.AddBezier(x, y + size, x + size, y + size * 0.55, x + size * 0.75, y - size * 0.35, x, y + size * 0.28);
            heart.CloseFigure();
            g.FillPath(brush, heart);
            g.DrawPath(outline, heart);
        }
    }

    function DrawWalkingBackground(g, width, height, frame)
    {
        let bottomShift = height - 280;
        let outline = Color.FromArgb(83, 92, 82);
        let pathBrush = new SolidBrush(Color.FromArgb(232, 219, 190));
        let grassBrush = new SolidBrush(Color.FromArgb(189, 216, 164));
        let grassDark = new SolidBrush(Color.FromArgb(132, 177, 124));
        let treeTrunk = new SolidBrush(Color.FromArgb(154, 112, 74));
        let benchBrush = new SolidBrush(Color.FromArgb(176, 121, 76));
        let outlinePen = new Pen(outline, 3);
        {
            let lawn = [
                new PointF(0, 211 + bottomShift), new PointF(width * 0.15, 197 + bottomShift),
                new PointF(width * 0.33, 208 + bottomShift), new PointF(width * 0.51, 191 + bottomShift),
                new PointF(width * 0.72, 205 + bottomShift), new PointF(width, 193 + bottomShift),
                new PointF(width, height), new PointF(0, height)
            ];
            g.FillPolygon(grassBrush, lawn);

            let path = [
                new PointF(0, height - 22), new PointF(width * 0.22, height - 27),
                new PointF(width * 0.45, height - 23), new PointF(width * 0.68, height - 29),
                new PointF(width, height - 24), new PointF(width, height), new PointF(0, height)
            ];
            g.FillPolygon(pathBrush, path);

            DrawWalkingTree(g, width * 0.12, 96 + bottomShift, 1, treeTrunk, grassDark, outlinePen);
            DrawWalkingTree(g, width * 0.47, 128 + bottomShift, 0.58, treeTrunk, grassDark, outlinePen);
            DrawWalkingTree(g, width * 0.82, 112 + bottomShift, 0.82, treeTrunk, grassDark, outlinePen);
            g.FillEllipse(grassDark, width * 0.27, 186 + bottomShift, 75, 32);
            g.FillEllipse(grassDark, width * 0.34, 190 + bottomShift, 58, 27);
            g.FillEllipse(grassDark, width * 0.53, 188 + bottomShift, 68, 29);
            g.FillEllipse(grassDark, width * 0.73, 192 + bottomShift, 58, 26);
            g.FillEllipse(grassDark, width * 0.90, 184 + bottomShift, 80, 34);

            DrawWalkingLamp(g, width * 0.37, 126 + bottomShift, outlinePen);
            DrawWalkingFlowers(g, width * 0.20, 204 + bottomShift);
            DrawWalkingFlowers(g, width * 0.58, 202 + bottomShift);
            DrawWalkingFlowers(g, width * 0.76, 207 + bottomShift);
            DrawButterfly(g, width * 0.28 + Math.sin(frame * 0.035) * 45, 143 + bottomShift + Math.sin(frame * 0.09) * 10, frame * 0.20, Color.FromArgb(229, 145, 89));
            DrawButterfly(g, width * 0.56 + Math.sin(frame * 0.027 + 2) * 58, 125 + bottomShift + Math.sin(frame * 0.075 + 1) * 12, frame * 0.17 + 1, Color.FromArgb(129, 153, 213));
            DrawButterfly(g, width * 0.88 + Math.sin(frame * 0.031 + 4) * 36, 158 + bottomShift + Math.sin(frame * 0.10 + 2) * 8, frame * 0.23 + 2, Color.FromArgb(224, 122, 142));

            let benchX = width * 0.64;
            let benchY = 174 + bottomShift;
            g.FillRectangle(benchBrush, benchX, benchY, 105, 13);
            g.DrawRectangle(outlinePen, benchX, benchY, 105, 13);
            g.FillRectangle(benchBrush, benchX + 5, benchY + 27, 95, 11);
            g.DrawRectangle(outlinePen, benchX + 5, benchY + 27, 95, 11);
            g.DrawLine(outlinePen, benchX + 17, benchY + 38, benchX + 12, benchY + 58);
            g.DrawLine(outlinePen, benchX + 87, benchY + 38, benchX + 92, benchY + 58);
            g.DrawLine(outlinePen, benchX + 15, benchY + 13, benchX + 15, benchY + 27);
            g.DrawLine(outlinePen, benchX + 90, benchY + 13, benchX + 90, benchY + 27);
        }
    }

    function DrawWalkingLamp(g, x, y, outline)
    {
        let lamp = new SolidBrush(Color.FromArgb(244, 210, 108));
        {
            g.DrawLine(outline, x, y + 24, x, y + 94);
            g.DrawLine(outline, x - 7, y + 94, x + 7, y + 94);
            g.FillEllipse(lamp, x - 10, y + 4, 20, 22);
            g.DrawEllipse(outline, x - 10, y + 4, 20, 22);
            g.DrawLine(outline, x - 12, y + 4, x + 12, y + 4);
        }
    }

    function DrawWalkingFlowers(g, x, y)
    {
        let stem = new Pen(Color.FromArgb(96, 149, 95), 2);
        let yellow = new SolidBrush(Color.FromArgb(239, 193, 77));
        let coral = new SolidBrush(Color.FromArgb(220, 128, 112));
        {
            g.DrawLine(stem, x, y, x, y - 13);
            g.DrawLine(stem, x + 15, y + 1, x + 15, y - 10);
            g.DrawLine(stem, x + 30, y, x + 30, y - 14);
            g.FillEllipse(yellow, x - 4, y - 18, 9, 9);
            g.FillEllipse(coral, x + 11, y - 15, 9, 9);
            g.FillEllipse(yellow, x + 26, y - 19, 9, 9);
        }
    }

    function DrawButterfly(g, x, y, phase, wingColor)
    {
        let flap = 3.5 + Math.abs(Math.sin(phase)) * 4.5;
        let wings = new SolidBrush(Color.FromArgb(210, wingColor));
        let body = new SolidBrush(Color.FromArgb(83, 72, 62));
        let detail = new Pen(Color.FromArgb(120, 83, 72, 62), 1);
        {
            g.FillEllipse(wings, x - flap - 2, y - 5, flap + 3, 8);
            g.FillEllipse(wings, x + 1, y - 5, flap + 3, 8);
            g.FillEllipse(wings, x - flap, y + 1, flap + 1, 6);
            g.FillEllipse(wings, x + 1, y + 1, flap + 1, 6);
            g.FillEllipse(body, x - 1.2, y - 3, 3, 10);
            g.DrawArc(detail, x - 5, y - 9, 5, 8, 180, 80);
            g.DrawArc(detail, x + 1, y - 9, 5, 8, 280, 80);
        }
    }

    function DrawWalkingMusicNotes(g, catX, frame)
    {
        let progress = Math.fround((frame % 82) / 82);
        DrawMusicNote(g, catX + 165 + Math.sin(progress * Math.PI * 2) * 5, 133 - progress * 30, 1, Math.trunc(Math.fround(205 * Math.fround(1 - progress))));
        let second = Math.fround(((frame + 42) % 104) / 104);
        if (second < 0.72)
        {
            DrawMusicNote(g, catX + 182 + Math.sin(second * Math.PI * 2 + 1) * 4, 145 - second * 34, 0.75, Math.trunc(Math.fround(175 * Math.fround(1 - Math.fround(second / Math.fround(0.72))))));
        }
    }

    function DrawMusicNote(g, x, y, scale, alpha)
    {
        alpha = Math.max(0, Math.min(255, alpha));
        let brush = new SolidBrush(Color.FromArgb(alpha, 82, 108, 137));
        let pen = new Pen(Color.FromArgb(alpha, 82, 108, 137), 2 * scale);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.FillEllipse(brush, x, y + 11 * scale, 7 * scale, 5 * scale);
            g.DrawLine(pen, x + 6 * scale, y + 13 * scale, x + 6 * scale, y);
            g.DrawLine(pen, x + 6 * scale, y, x + 13 * scale, y + 3 * scale);
        }
    }

    function DrawWalkingTree(g, x, y, scale, trunk, leaves, outline)
    {
        let trunkRect = new RectangleF(x + 31 * scale, y + 52 * scale, 20 * scale, 68 * scale);
        g.FillRectangle(trunk, trunkRect);
        g.DrawRectangle(outline, trunkRect.X, trunkRect.Y, trunkRect.Width, trunkRect.Height);
        let crownOne = new RectangleF(x, y + 12 * scale, 68 * scale, 62 * scale);
        let crownTwo = new RectangleF(x + 28 * scale, y, 66 * scale, 67 * scale);
        g.FillEllipse(leaves, crownOne);
        g.FillEllipse(leaves, crownTwo);
        g.DrawEllipse(outline, crownOne);
        g.DrawEllipse(outline, crownTwo);
    }

    function DrawWalkingCat(g, x, y, phase, scale = 1.18)
    {
        let orange = Color.FromArgb(230, 145, 62);
        let light = Color.FromArgb(251, 220, 170);
        let outline = Color.FromArgb(72, 61, 55);
        let bounce = Math.abs(Math.sin(phase)) * -4;
        let stride = Math.sin(phase) * 13;
        let oppositeStride = Math.sin(phase + Math.PI) * 13;
        let tailLift = Math.sin(phase * 0.5) * 8;

        let state = g.Save();
        g.TranslateTransform(x, y + bounce);
        g.ScaleTransform(scale, scale);
        let body = new SolidBrush(orange);
        let muzzle = new SolidBrush(light);
        let dark = new SolidBrush(outline);
        let pen = new Pen(outline, 3);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            pen.LineJoin = LineJoin.Round;
            let tail = new GraphicsPath();
            {
                tail.AddBezier(32, 56, 4, 52 + tailLift, -4, 20 - tailLift, 17, 22);
                g.DrawPath(pen, tail);
            }
            g.FillEllipse(body, 30, 28, 82, 48);
            g.DrawEllipse(pen, 30, 28, 82, 48);
            g.FillEllipse(body, 84, 4, 48, 48);
            g.DrawEllipse(pen, 84, 4, 48, 48);
            let earOne = [ new PointF(91, 12), new PointF(94, -9), new PointF(108, 5) ];
            let earTwo = [ new PointF(113, 4), new PointF(126, -9), new PointF(129, 15) ];
            g.FillPolygon(body, earOne);
            g.FillPolygon(body, earTwo);
            g.DrawPolygon(pen, earOne);
            g.DrawPolygon(pen, earTwo);
            g.FillEllipse(muzzle, 100, 29, 23, 15);
            g.FillEllipse(dark, 99, 19, 4, 6);
            g.FillEllipse(dark, 118, 19, 4, 6);
            g.FillEllipse(dark, 109, 31, 5, 4);
            DrawWalkingLeg(g, pen, 52, 66, 47 + stride, 91);
            DrawWalkingLeg(g, pen, 72, 68, 72 + oppositeStride, 91);
            DrawWalkingLeg(g, pen, 94, 65, 94 + oppositeStride, 89);
            DrawWalkingLeg(g, pen, 106, 61, 108 + stride, 88);
        }
        g.Restore(state);
    }

    function DrawWalkingLeg(g, pen, startX, startY, endX, endY)
    {
        g.DrawLine(pen, startX, startY, endX, endY);
        let direction = endX >= startX ? 1 : -1;
        g.DrawLine(pen, endX, endY, endX + direction * 8, endY);
    }

    function DrawWindow(g, x, y)
    {
        let opening = [
            new PointF(x + 22, y + 14),
            new PointF(x + 170, y),
            new PointF(x + 181, y + 101),
            new PointF(x + 8, y + 116)
        ];
        let inner = [
            new PointF(x + 32, y + 24),
            new PointF(x + 160, y + 12),
            new PointF(x + 169, y + 91),
            new PointF(x + 19, y + 104)
        ];
        let openPane = [
            new PointF(x + 170, y),
            new PointF(x + 222, y + 23),
            new PointF(x + 230, y + 111),
            new PointF(x + 181, y + 101)
        ];

        let frame = new SolidBrush(Color.FromArgb(101, 72, 50));
        let sky = new SolidBrush(Color.FromArgb(184, 225, 242));
        let glass = new SolidBrush(Color.FromArgb(202, 235, 246));
        let curtain = new SolidBrush(Color.FromArgb(228, 236, 218));
        let outline = new Pen(Color.FromArgb(72, 58, 48), 3);
        let breeze = new Pen(Color.FromArgb(91, 176, 211), 3);
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
            let paneGlass = [
                new PointF(x + 179, y + 13),
                new PointF(x + 213, y + 29),
                new PointF(x + 219, y + 98),
                new PointF(x + 188, y + 91)
            ];
            g.FillPolygon(glass, paneGlass);
            g.DrawPolygon(outline, paneGlass);

            g.FillPolygon(curtain, [ new PointF(x + 3, y + 5), new PointF(x + 42, y + 16), new PointF(x + 30, y + 105), new PointF(x - 8, y + 119) ]);
            g.DrawBezier(breeze, x + 202, y + 42, x + 174, y + 30, x + 156, y + 48, x + 134, y + 39);
            g.DrawBezier(breeze, x + 218, y + 70, x + 186, y + 61, x + 169, y + 79, x + 147, y + 72);
        }
    }

    function DrawCat(g, x, y, walking, frame)
    {
        let bounce = walking ? Math.sin(frame * 0.45) * 3 : Math.sin(frame * 0.08) * 1.5;
        y += bounce;
        let orange = Color.FromArgb(230, 145, 62);
        let light = Color.FromArgb(251, 220, 170);
        let outline = Color.FromArgb(72, 61, 55);
        let body = new SolidBrush(orange);
        let muzzle = new SolidBrush(light);
        let dark = new SolidBrush(outline);
        let pen = new Pen(outline, 3);
        {
            pen.StartCap = LineCap.Round;
            pen.EndCap = LineCap.Round;
            g.FillEllipse(body, x + 30, y + 28, 82, 48);
            g.DrawEllipse(pen, x + 30, y + 28, 82, 48);
            g.FillEllipse(body, x + 84, y + 4, 48, 48);
            g.DrawEllipse(pen, x + 84, y + 4, 48, 48);
            g.FillPolygon(body, [ new PointF(x + 91, y + 12), new PointF(x + 94, y - 9), new PointF(x + 108, y + 5) ]);
            g.FillPolygon(body, [ new PointF(x + 113, y + 4), new PointF(x + 126, y - 9), new PointF(x + 129, y + 15) ]);
            g.DrawPolygon(pen, [ new PointF(x + 91, y + 12), new PointF(x + 94, y - 9), new PointF(x + 108, y + 5) ]);
            g.DrawPolygon(pen, [ new PointF(x + 113, y + 4), new PointF(x + 126, y - 9), new PointF(x + 129, y + 15) ]);
            g.FillEllipse(muzzle, x + 100, y + 29, 23, 15);
            g.FillEllipse(dark, x + 99, y + 19, 4, 6);
            g.FillEllipse(dark, x + 118, y + 19, 4, 6);
            g.FillEllipse(dark, x + 109, y + 31, 5, 4);

            let stride = walking ? Math.sin(frame * 0.45) * 7 : 0;
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
return { Clamp01, Ease, Mix, DrawFluidStretchScene, DrawFluidStretchCat, DrawOfficeScene, DrawOfficeBackdrop, DrawWorkstation, DrawStartingWork, DrawLeavingWork, DrawSlidingDoor, DrawAlarmClock, DrawDoorForeground, DrawOfficeLaptop, DrawOfficeBag, DrawOfficeCat, DrawHeartBreakSequence, DrawHappyBurst, DrawToiletScene, DrawToiletAnimation, DrawFly, DrawSquattingCat, DrawEatingScene, DrawEatingAnimation, DrawEatingFirework, DrawFoodBowl, DrawAnimatedWindowScene, DrawAnimatedWaterScene, DrawAnimatedWindow, DrawAnimatedWaterGlass, DrawRestingCat, DrawFloatingHearts, DrawHeart, DrawWalkingBackground, DrawWalkingLamp, DrawWalkingFlowers, DrawButterfly, DrawWalkingMusicNotes, DrawMusicNote, DrawWalkingTree, DrawWalkingCat, DrawWalkingLeg, DrawWindow, DrawCat };
}
