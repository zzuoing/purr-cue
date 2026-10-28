"""Render original GDI+ scenes on Windows for independent visual comparison.
This is a verification tool, never a runtime/build dependency of Electron.
"""
from pathlib import Path
import subprocess
import os

root = Path(__file__).resolve().parent.parent
source = (root / 'legacy/DesktopReminderApp.cs').read_text(encoding='utf-8-sig')
body = source[source.index('    private static float Clamp01'):source.index('\ninternal sealed class ReminderForm')].rstrip().removesuffix('}')
general = source[source.index('    private void DrawGeneralCat'):source.index('    private void RenderLayeredScene')]
header = '''using System; using System.IO; using System.Drawing; using System.Drawing.Drawing2D; using System.Drawing.Imaging;
class Reference {
Size ClientSize = new Size(1920,250); int tickCount;
'''
main = '''
static void Main(string[] args) {
  Directory.CreateDirectory(args[0]);
  Reference r = new Reference();
  int[] frames = { 0, 1, 28, 44, 62, 110, 138, 169, 194, 210, 242, 265, 285, 290, 304, 330, 360 };
  string[] scenes = { "General", "Walking", "Window", "Water", "Eating", "WorkStart", "PackUp", "Toilet" };
  foreach(int width in new int[]{1280,1920}) foreach(string scene in scenes) foreach(int frame in frames) {
    r.ClientSize = new Size(width,250); r.tickCount = frame;
    using(Bitmap b = new Bitmap(width,250,PixelFormat.Format32bppArgb)) using(Graphics g = Graphics.FromImage(b)) {
      g.Clear(Color.Transparent); g.SmoothingMode = SmoothingMode.AntiAlias;
      g.CompositingMode = CompositingMode.SourceOver; g.CompositingQuality = CompositingQuality.HighQuality;
      if(scene=="Walking") { float x=-150F; for(int i=0;i<frame;i++)x+=3.2F; DrawWalkingBackground(g,width,250,frame); DrawWalkingCat(g,x,135F,frame*0.48F); DrawWalkingMusicNotes(g,x,frame); }
      else if(scene=="Window")r.DrawAnimatedWindowScene(g,frame);
      else if(scene=="Water")r.DrawAnimatedWaterScene(g,frame);
      else if(scene=="Eating")r.DrawEatingScene(g,frame);
      else if(scene=="WorkStart"||scene=="PackUp")r.DrawOfficeScene(g,frame,scene=="WorkStart");
      else if(scene=="Toilet")r.DrawToiletScene(g,frame);
      else r.DrawGeneralCat(g);
      b.Save(Path.Combine(args[0],scene+"-"+width+"-"+frame+".png"),ImageFormat.Png);
    }
  }
}
}
'''
work = root / 'work/reference'
work.mkdir(parents=True, exist_ok=True)
cs = work / 'Reference.cs'
cs.write_text(header + general + body + main, encoding='utf-8-sig')
csc = Path(os.environ['WINDIR']) / 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
subprocess.run([str(csc), '/nologo', '/r:System.Drawing.dll', '/out:' + str(work / 'Reference.exe'), str(cs)], check=True)
subprocess.run([str(work / 'Reference.exe'), str(work)], check=True)
print('Exported 272 original GDI+ reference frames')
