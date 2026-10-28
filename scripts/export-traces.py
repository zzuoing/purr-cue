"""Independent original C# geometry traces, including colors and path control points."""
from pathlib import Path
import os, subprocess
root = Path(__file__).resolve().parent.parent
source = (root / 'work/reference/Reference.cs').read_text(encoding='utf-8-sig')
body = source[:source.index('static void Main')]
body = body.replace('using System;', 'using System; using System.Collections.Generic; using System.Web.Script.Serialization;')
body = body.replace('Graphics g', 'TraceGraphics g').replace('GraphicsState ', 'int ')
methods = ['FillEllipse','DrawEllipse','FillRectangle','DrawRectangle','FillPolygon','DrawPolygon','FillPath','DrawPath','DrawLine','DrawBezier','DrawArc','DrawString','TranslateTransform','ScaleTransform','SetClip']
tracer = '''
class TraceGraphics {
public List<object> Calls = new List<object>();
public int Save() { Calls.Add(new object[]{"Save",new object[]{}}); return 0; }
public void Restore(int ignored) { Calls.Add(new object[]{"Restore",new object[]{}}); }
object N(object v) {
 if(v is Color) { Color c=(Color)v; return new object[]{"color",c.R,c.G,c.B,c.A}; }
 if(v is Pen) {Pen p=(Pen)v;return new object[]{"pen",N(p.Color),p.Width,(int)p.StartCap,(int)p.EndCap,(int)p.LineJoin};}
 if(v is SolidBrush)return new object[]{"brush",N(((SolidBrush)v).Color)};
 if(v is PointF){PointF p=(PointF)v;return new object[]{p.X,p.Y};}
 if(v is RectangleF){RectangleF r=(RectangleF)v;return new object[]{"rect",r.X,r.Y,r.Width,r.Height};}
 if(v is GraphicsPath){GraphicsPath p=(GraphicsPath)v;return new object[]{"path",N(p.PathPoints),p.PathTypes};}
 if(v is Font){Font f=(Font)v;return new object[]{"font",f.Name,f.Size,(int)f.Style};}
 if(v is StringFormat)return new object[]{"format"};
 if(v is Array){List<object> a=new List<object>();foreach(object x in (Array)v)a.Add(N(x));return a;}
 if(v is Enum)return Convert.ToInt32(v);
 return v;
}
void Record(string name, object[] args) {Calls.Add(new object[]{name,N(args)});}
'''
for name in methods:
    tracer += 'public void '+name+'(params object[] args){Record("'+name+'",args);}\n'
tracer += '}\n'
main = '''
static void Main(string[] args) {
 Reference r=new Reference(); List<object> records=new List<object>();
 foreach(int width in new int[]{1280,1920}) foreach(string scene in new string[]{"General","Walking","Window","Water","Eating","WorkStart","PackUp","Toilet"})
 foreach(int frame in new int[]{0,1,28,44,62,110,138,169,194,210,242,265,285,290,304,330,360}) {
  r.ClientSize=new Size(width,250);r.tickCount=frame;TraceGraphics g=new TraceGraphics();
  if(scene=="Walking"){float x=-150F;for(int i=0;i<frame;i++)x+=3.2F;DrawWalkingBackground(g,width,250,frame);DrawWalkingCat(g,x,135F,frame*0.48F);DrawWalkingMusicNotes(g,x,frame);}
  else if(scene=="Window")r.DrawAnimatedWindowScene(g,frame);
  else if(scene=="Water")r.DrawAnimatedWaterScene(g,frame);
  else if(scene=="Eating")r.DrawEatingScene(g,frame);
  else if(scene=="WorkStart"||scene=="PackUp")r.DrawOfficeScene(g,frame,scene=="WorkStart");
  else if(scene=="Toilet")r.DrawToiletScene(g,frame);else r.DrawGeneralCat(g);
  records.Add(new {scene=scene,width=width,frame=frame,calls=g.Calls});
 }
 JavaScriptSerializer serializer=new JavaScriptSerializer();serializer.MaxJsonLength=int.MaxValue;
 File.WriteAllText(args[0],serializer.Serialize(records));
}
}
'''
cs = root / 'work/reference/Trace.cs'
cs.write_text(body + main + tracer, encoding='utf-8-sig')
exe = root / 'work/reference/Trace.exe'
csc = Path(os.environ['WINDIR']) / 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
subprocess.run([str(csc),'/nologo','/r:System.Drawing.dll','/r:System.Web.Extensions.dll','/out:'+str(exe),str(cs)],check=True)
subprocess.run([str(exe),str(root / 'work/reference-traces.json')],check=True)
print('Exported original geometry traces')
