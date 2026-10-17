//go:build windows && amd64

package main

import (
	"fmt"
	"strings"
	"syscall"
	"unsafe"
)

var user32 = syscall.NewLazyDLL("user32.dll")
var kernel32 = syscall.NewLazyDLL("kernel32.dll")
var gdi32 = syscall.NewLazyDLL("gdi32.dll")
var gdiplus = syscall.NewLazyDLL("gdiplus.dll")
var (
	pGetCursorPos     = user32.NewProc("GetCursorPos")
	pDefWindowProc    = user32.NewProc("DefWindowProcW")
	pRegisterClass    = user32.NewProc("RegisterClassExW")
	pCreateWindow     = user32.NewProc("CreateWindowExW")
	pDestroyWindow    = user32.NewProc("DestroyWindow")
	pGetMessage       = user32.NewProc("GetMessageW")
	pTranslateMessage = user32.NewProc("TranslateMessage")
	pDispatchMessage  = user32.NewProc("DispatchMessageW")
	pPostMessage      = user32.NewProc("PostMessageW")
	pPostQuit         = user32.NewProc("PostQuitMessage")
	pGetForeground    = user32.NewProc("GetForegroundWindow")
	pGetAncestor      = user32.NewProc("GetAncestor")
	pGetWindowPID     = user32.NewProc("GetWindowThreadProcessId")
	pGetClientRect    = user32.NewProc("GetClientRect")
	pClientToScreen   = user32.NewProc("ClientToScreen")
	pIsWindow         = user32.NewProc("IsWindow")
	pIsVisible        = user32.NewProc("IsWindowVisible")
	pIsIconic         = user32.NewProc("IsIconic")
	pShowWindow       = user32.NewProc("ShowWindow")
	pSetWindowPos     = user32.NewProc("SetWindowPos")
	pSetTimer         = user32.NewProc("SetTimer")
	pKillTimer        = user32.NewProc("KillTimer")
	pSetHook          = user32.NewProc("SetWinEventHook")
	pUnhook           = user32.NewProc("UnhookWinEvent")
	pGetDPI           = user32.NewProc("GetDpiForWindow")
	pDPIAware         = user32.NewProc("SetProcessDpiAwarenessContext")
	pSystemParameters = user32.NewProc("SystemParametersInfoW")
	pGetWindowLong    = user32.NewProc("GetWindowLongPtrW")
	pGetDC            = user32.NewProc("GetDC")
	pReleaseDC        = user32.NewProc("ReleaseDC")
	pUpdateLayered    = user32.NewProc("UpdateLayeredWindow")
	pGetGUIResources  = user32.NewProc("GetGuiResources")
	pGetModule        = kernel32.NewProc("GetModuleHandleW")
	pSnapshot         = kernel32.NewProc("CreateToolhelp32Snapshot")
	pProcessFirst     = kernel32.NewProc("Process32FirstW")
	pProcessNext      = kernel32.NewProc("Process32NextW")
	pCloseHandle      = kernel32.NewProc("CloseHandle")
	pCurrentProcess   = kernel32.NewProc("GetCurrentProcess")
	pProcessMemory    = kernel32.NewProc("K32GetProcessMemoryInfo")
	pCreateDC         = gdi32.NewProc("CreateCompatibleDC")
	pCreateDIB        = gdi32.NewProc("CreateDIBSection")
	pSelectObject     = gdi32.NewProc("SelectObject")
	pDeleteObject     = gdi32.NewProc("DeleteObject")
	pDeleteDC         = gdi32.NewProc("DeleteDC")
)

const (
	wmDestroy       = 0x0002
	wmSettingChange = 0x001a
	wmTimer         = 0x0113
	wmNCHitTest     = 0x0084
	wmMouseActivate = 0x0021
	wmCommandLocal  = 0x8001
	wmGeometry      = 0x8002
	wmClose         = 0x0010
	wmRetryBudget   = 0x8003
	overlayExStyle  = 0x00080000 | 0x00000020 | 0x00000080 | 0x08000000
)

type point struct{ X, Y int32 }
type rect struct{ Left, Top, Right, Bottom int32 }
type size struct{ CX, CY int32 }
type blend struct{ Op, Flags, Alpha, Format byte }
type bitmapInfoHeader struct {
	Size                   uint32
	Width, Height          int32
	Planes, BitCount       uint16
	Compression, SizeImage uint32
	XPels, YPels           int32
	ClrUsed, ClrImportant  uint32
}
type bitmapInfo struct {
	Header bitmapInfoHeader
	Colors [1]uint32
}
type windowClass struct {
	Size, Style                        uint32
	WndProc                            uintptr
	ClsExtra, WndExtra                 int32
	Instance, Icon, Cursor, Background uintptr
	MenuName, ClassName                *uint16
	IconSmall                          uintptr
}
type message struct {
	Window         uintptr
	Message        uint32
	WParam, LParam uintptr
	Time           uint32
	Point          point
	Private        uint32
}
type processEntry struct {
	Size, Usage, ID             uint32
	DefaultHeap                 uintptr
	ModuleID, Threads, ParentID uint32
	Priority                    int32
	Flags                       uint32
	Exe                         [260]uint16
}

func utf16(s string) *uint16      { return syscall.StringToUTF16Ptr(s) }
func ptr[T any](value *T) uintptr { return uintptr(unsafe.Pointer(value)) }
func negative(v int32) uintptr    { return uintptr(int64(v)) }
func requireHandle(name string, value uintptr, err error) error {
	if value == 0 {
		return fmt.Errorf("%s: %v", name, err)
	}
	return nil
}
func ancestors(pid uint32) map[uint32]bool {
	result := map[uint32]bool{}
	parents := map[uint32]uint32{}
	names := map[uint32]string{}
	snapshot, _, _ := pSnapshot.Call(2, 0)
	if snapshot == ^uintptr(0) {
		return result
	}
	defer pCloseHandle.Call(snapshot)
	entry := processEntry{}
	entry.Size = uint32(unsafe.Sizeof(entry))
	ok, _, _ := pProcessFirst.Call(snapshot, uintptr(unsafe.Pointer(&entry)))
	for ok != 0 {
		parents[entry.ID] = entry.ParentID
		names[entry.ID] = strings.ToLower(syscall.UTF16ToString(entry.Exe[:]))
		ok, _, _ = pProcessNext.Call(snapshot, uintptr(unsafe.Pointer(&entry)))
	}
	name := names[pid]
	for i := 0; i < 32 && pid != 0 && name != "" && names[pid] == name; i++ {
		if result[pid] {
			break
		}
		result[pid] = true
		pid = parents[pid]
	}
	return result
}
func rootWindow(hwnd uintptr) uintptr {
	root, _, _ := pGetAncestor.Call(hwnd, 3)
	if root != 0 {
		return root
	}
	return hwnd
}
func animationsAllowed() bool {
	value := int32(1)
	ok, _, _ := pSystemParameters.Call(0x1042, 0, uintptr(unsafe.Pointer(&value)), 0)
	return ok == 0 || value != 0
}
