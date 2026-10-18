$ErrorActionPreference='Stop'
# The deliberately named isolated test profile is the only eligible window.
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NaviFixtureFocus {
 delegate bool Callback(IntPtr window,IntPtr state);
 [DllImport("user32.dll")] static extern bool EnumWindows(Callback callback,IntPtr state);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window,StringBuilder text,int count);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window,out uint pid);
 [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] static extern bool AttachThreadInput(uint first,uint second,bool attach);
 [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
 [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window,int command);
 [DllImport("user32.dll")] static extern bool PeekMessage(IntPtr message,IntPtr window,uint min,uint max,uint remove);
 public static string Activate() {
  IntPtr found=IntPtr.Zero;
  EnumWindows((window,state)=>{var text=new StringBuilder(1024);GetWindowText(window,text,1024);if(text.ToString().Contains("NAVI Pixel Anchor Test")&&text.ToString().Contains("pixel-anchor-fixture.ts"))found=window;return true;},IntPtr.Zero);
  if(found==IntPtr.Zero)return "isolated native window not found";
  // AttachThreadInput requires this test caller to own a Win32 message queue.
  IntPtr message=Marshal.AllocHGlobal(64);try{PeekMessage(message,IntPtr.Zero,0,0,0);}finally{Marshal.FreeHGlobal(message);}
  uint ignored;uint current=GetCurrentThreadId(),foreground=GetWindowThreadProcessId(GetForegroundWindow(),out ignored);
  bool attached=foreground!=0&&foreground!=current&&AttachThreadInput(current,foreground,true);
  try{ShowWindow(found,9);SetForegroundWindow(found);return GetForegroundWindow()==found?"activated":"native foreground activation denied";}finally{if(attached)AttachThreadInput(current,foreground,false);}
 }
}
'@
$naviFixtureResult=[NaviFixtureFocus]::Activate()
if($naviFixtureResult -ne 'activated'){throw $naviFixtureResult}
