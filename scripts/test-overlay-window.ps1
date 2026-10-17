param([Parameter(Mandatory=$true)][string]$Executable, [string]$Output = 'build/native-report')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
if (-not ('NaviWindowTest' -as [type])) {
 Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NaviWindowTest {
 public delegate bool EnumProc(IntPtr hwnd, IntPtr state);
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left, Top, Right, Bottom;}
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr state);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd,System.Text.StringBuilder text,int count);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd,System.Text.StringBuilder text,int count);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hwnd,uint message,IntPtr wparam,IntPtr lparam);
 public static IntPtr FindBubble(uint pid) {IntPtr found=IntPtr.Zero;EnumWindows((h,s)=>{uint owner;GetWindowThreadProcessId(h,out owner);if(owner==pid){var text=new System.Text.StringBuilder(64);GetClassName(h,text,64);if(text.ToString()=="tooltips_class32")found=h;}return true;},IntPtr.Zero);return found;}
 public static IntPtr Find(uint pid) {IntPtr found=IntPtr.Zero;EnumWindows((h,s)=>{uint owner;GetWindowThreadProcessId(h,out owner);if(owner==pid){var text=new System.Text.StringBuilder(64);GetWindowText(h,text,64);if(text.ToString()=="NAVI Fairy")found=h;}return true;},IntPtr.Zero);return found;}
 public static Rect Bounds(IntPtr hwnd) {Rect r;GetWindowRect(hwnd,out r);return r;}
}
'@
}
function Pump([int]$Milliseconds) {
 $naviWatch = [Diagnostics.Stopwatch]::StartNew()
 while ($naviWatch.ElapsedMilliseconds -lt $Milliseconds) {[Windows.Forms.Application]::DoEvents();Start-Sleep -Milliseconds 10}
}
function Require([bool]$Condition,[string]$Message) {if(-not $Condition){throw $Message}}
function ReadFrame([Diagnostics.Process]$Process,[int]$TimeoutMs) {
 $naviWatch = [Diagnostics.Stopwatch]::StartNew()
 while ($naviWatch.ElapsedMilliseconds -lt $TimeoutMs) {
  $naviRead = $Process.StandardOutput.ReadLineAsync()
  $naviRemaining = $TimeoutMs - [int]$naviWatch.ElapsedMilliseconds
  if (-not $naviRead.Wait($naviRemaining)) {return $null}
  $naviLine = $naviRead.Result
  if ($null -eq $naviLine) {return $null}
  $naviMessage = $naviLine | ConvertFrom-Json
  if ($naviMessage.type -eq 'frame') {return $naviMessage}
  if ($naviMessage.type -ne 'attached') {throw "Unexpected native helper message: $naviLine"}
 }
 return $null
}
$naviOwner = New-Object Windows.Forms.Form
$naviOwner.Text = 'NAVI native test owner'
$naviOwner.StartPosition = 'Manual'
$naviOwner.SetBounds(80,80,1000,700)
$naviOther = New-Object Windows.Forms.Form
$naviOther.Text = 'NAVI native test other window'
$naviOther.StartPosition = 'Manual'
$naviOther.SetBounds(180,180,600,400)
$naviProcess = $null
try {
 $naviOwner.Show();$naviOwner.Activate();[NaviWindowTest]::SetForegroundWindow($naviOwner.Handle)|Out-Null;Pump 200
 Require ([NaviWindowTest]::GetForegroundWindow() -eq $naviOwner.Handle) 'Could not activate native test owner'
 $naviInfo = New-Object Diagnostics.ProcessStartInfo
 $naviInfo.FileName = (Resolve-Path $Executable).Path
 $naviInfo.Arguments = "--host-pid $PID --diagnostics"
 $naviInfo.UseShellExecute = $false
 $naviInfo.CreateNoWindow = $true
 $naviInfo.RedirectStandardInput = $true
 $naviInfo.RedirectStandardOutput = $true
 $naviInfo.RedirectStandardError = $true
 $naviProcess = [Diagnostics.Process]::Start($naviInfo)
 $naviReady = $naviProcess.StandardOutput.ReadLineAsync()
 Require ($naviReady.Wait(4000)) 'No readiness response'
 Require ($naviReady.Result -match 'ready') 'Unexpected readiness response'
 $naviProcess.StandardInput.WriteLine('{"type":"configure","enabled":true,"eco":false,"respectReducedMotion":false}')
 $naviProcess.StandardInput.WriteLine('{"type":"focus","focused":true}')
 $naviProcess.StandardInput.Flush()
 Pump 300
 $naviWindow = [NaviWindowTest]::Find([uint32]$naviProcess.Id)
 Require ($naviWindow -ne [IntPtr]::Zero) 'No overlay window found'
 Require ([NaviWindowTest]::IsWindowVisible($naviWindow)) 'Overlay did not attach to the active owner'
 Require ([NaviWindowTest]::GetForegroundWindow() -eq $naviOwner.Handle) 'Overlay stole focus'
 $naviFirstFrame = ReadFrame $naviProcess 3000
 Require ($null -ne $naviFirstFrame) 'Active overlay produced no animation frame diagnostics'
 $naviSecondFrame = ReadFrame $naviProcess 3000
 Require ($null -ne $naviSecondFrame -and $naviSecondFrame.count -gt $naviFirstFrame.count) 'Animation frame counter did not advance'
 $naviProcess.StandardInput.WriteLine('{"type":"speech","message":"Hallo! Ich mache deiner Maus Platz."}')
 $naviProcess.StandardInput.Flush();Pump 200
 $naviBubble = [NaviWindowTest]::FindBubble([uint32]$naviProcess.Id)
 Require ($naviBubble -ne [IntPtr]::Zero -and [NaviWindowTest]::IsWindowVisible($naviBubble)) 'Speech bubble did not appear'
 Require ([NaviWindowTest]::GetForegroundWindow() -eq $naviOwner.Handle) 'Speech bubble stole focus'
 Require ([NaviWindowTest]::SendMessage($naviBubble,0x84,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64() -eq -1) 'Speech bubble intercepts clicks'
 $naviProcess.StandardInput.WriteLine('{"type":"configure","enabled":false,"eco":true,"respectReducedMotion":false}')
 $naviProcess.StandardInput.Flush()
 Pump 200
 $naviBefore = [NaviWindowTest]::Bounds($naviWindow)
 $naviBubbleBefore = [NaviWindowTest]::Bounds($naviBubble)
 $naviOwner.SetDesktopLocation(200,160);Pump 300
 $naviAfter = [NaviWindowTest]::Bounds($naviWindow)
 $naviBubbleAfter = [NaviWindowTest]::Bounds($naviBubble)
 Require ([Math]::Abs(($naviBubbleAfter.Left-$naviBubbleBefore.Left)-120) -le 2 -and [Math]::Abs(($naviBubbleAfter.Top-$naviBubbleBefore.Top)-80) -le 2) 'Paused speech bubble did not follow owner movement'
 Require ([Math]::Abs(($naviAfter.Left-$naviBefore.Left)-120) -le 2) 'Paused overlay did not follow horizontal window move'
 Require ([Math]::Abs(($naviAfter.Top-$naviBefore.Top)-80) -le 2) 'Paused overlay did not follow vertical window move'
 $naviOwnerBounds = [NaviWindowTest]::Bounds($naviOwner.Handle)
 Require ($naviAfter.Left -ge $naviOwnerBounds.Left -and $naviAfter.Right -le $naviOwnerBounds.Right -and $naviAfter.Top -ge $naviOwnerBounds.Top -and $naviAfter.Bottom -le $naviOwnerBounds.Bottom) 'Overlay left the owner bounds'
 $naviOther.Show();$naviOther.Activate();[NaviWindowTest]::SetForegroundWindow($naviOther.Handle)|Out-Null;Pump 300
 Require (-not [NaviWindowTest]::IsWindowVisible($naviWindow)) 'Overlay remained visible over another window'
 Require (-not [NaviWindowTest]::IsWindowVisible($naviBubble)) 'Speech bubble remained visible over another window'
 $naviOwner.Activate();[NaviWindowTest]::SetForegroundWindow($naviOwner.Handle)|Out-Null;Pump 300
 Require ([NaviWindowTest]::IsWindowVisible($naviWindow)) 'Overlay did not return to its owner'
 $naviOwner.WindowState = 'Minimized';Pump 300
 Require (-not [NaviWindowTest]::IsWindowVisible($naviWindow)) 'Overlay remained visible while minimized'
 $naviOwner.WindowState = 'Normal';$naviOwner.Activate();[NaviWindowTest]::SetForegroundWindow($naviOwner.Handle)|Out-Null;Pump 300
 Require ([NaviWindowTest]::IsWindowVisible($naviWindow)) 'Overlay did not return after restore'
 $naviProcess.StandardInput.WriteLine('{"type":"stop"}');$naviProcess.StandardInput.Close()
 Require ($naviProcess.WaitForExit(4000)) 'Overlay did not stop'
 Require ($naviProcess.ExitCode -eq 0) ($naviProcess.StandardError.ReadToEnd())
 New-Item -ItemType Directory -Force $Output|Out-Null
 @{windowIntegration='passed';speechBubble=$true;speechClickThrough=$true;speechOwnerTracking=$true;ownerTracking=$true;noFocusStealing=$true;pausedWindowMove=$true;staysInBounds=$true;otherWindowHidden=$true;minimizeRestore=$true;cleanShutdown=$true;scope='native WinForms host; not a VS Code end-to-end session'}|ConvertTo-Json|Set-Content (Join-Path $Output 'native-window-integration.json')
 Get-Content (Join-Path $Output 'native-window-integration.json')
} finally {
 if($naviProcess -and -not $naviProcess.HasExited){$naviProcess.Kill()}
 $naviOwner.Dispose();$naviOther.Dispose()
}
