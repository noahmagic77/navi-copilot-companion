//go:build windows && amd64

package main

import (
	"math"
	"navi/overlay/internal/anchor"
	"runtime"
	"syscall"
	"testing"
	"unsafe"
)

// A real layered HWND covers the beacon. Excluding only our overlay from
// capture must reveal the marker while the overlay remains visible to the user.
func TestCaptureOwnerBeaconBehindLayeredOverlay(t *testing.T) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	pDPIAware.Call(negative(-4))
	const width, height = 320, 240
	const colour uint32 = 0x5868ae
	desktop, _, _ := pGetDC.Call(0)
	if desktop == 0 {
		t.Fatal("No fixture display DC")
	}
	defer pReleaseDC.Call(0, desktop)
	var bits uintptr
	info := bitmapInfo{Header: bitmapInfoHeader{Size: 40, Width: width, Height: -height, Planes: 1, BitCount: 32}}
	bitmap, _, err := pCreateDIB.Call(desktop, uintptr(unsafe.Pointer(&info)), 0, uintptr(unsafe.Pointer(&bits)), 0, 0)
	if bitmap == 0 {
		t.Fatal(err)
	}
	defer pDeleteObject.Call(bitmap)
	pixels := unsafe.Slice((*byte)(unsafe.Pointer(bits)), width*height*4)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			c := uint32(0x182030)
			if x >= 140 && x < 160 && y >= 100 && y < 120 {
				c = anchor.Border
			}
			if x >= 143 && x < 157 && y >= 103 && y < 117 {
				c = colour
			}
			i := (y*width + x) * 4
			pixels[i], pixels[i+1], pixels[i+2], pixels[i+3] = byte(c), byte(c>>8), byte(c>>16), 255
		}
	}
	owner, _, err := pCreateWindow.Call(0x08000080, uintptrPointer(utf16("STATIC")), uintptrPointer(utf16("NAVI anchor capture fixture")), 0x8000000e, 40, 40, width, height, 0, 0, 0, 0)
	if owner == 0 {
		t.Fatal(err)
	}
	defer pDestroyWindow.Call(owner)
	pSendMessage.Call(owner, 0x0172, 0, bitmap) // STM_SETIMAGE, IMAGE_BITMAP
	pSetWindowPos.Call(owner, ^uintptr(0), 40, 40, width, height, 0x0010|0x0040)
	user32.NewProc("UpdateWindow").Call(owner)
	if result, _, _ := syscall.NewLazyDLL("dwmapi.dll").NewProc("DwmFlush").Call(); result != 0 {
		t.Fatalf("Fixture owner compositor flush failed: %#x", result)
	}
	origin := point{}
	pClientToScreen.Call(owner, uintptr(unsafe.Pointer(&origin)))
	bounds := rect{Left: origin.X, Top: origin.Y, Right: origin.X + width, Bottom: origin.Y + height}
	firstPixel, _, _ := gdi32.NewProc("GetPixel").Call(desktop, negative(origin.X+150), negative(origin.Y+110))
	if firstPixel != 0xae6858 {
		t.Fatalf("Fixture must show the uncovered marker before capture: pixel=%#x", firstPixel)
	}
	goal, reason := captureAnchor(bounds, colour, 1, true)
	if reason != "" {
		t.Fatal("Uncovered fixture missing", reason)
	}
	if math.Abs(goal.X-90) > 1 || math.Abs(goal.Y-110) > 1 {
		t.Fatal("Wrong fixture position", goal)
	}
	r, err := newRenderer(192)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	if err = gdip(gClear, r.graphics, 0xffeeeeee); err != nil {
		t.Fatal(err)
	}
	if err = gdip(gFlush, r.graphics, 1); err != nil {
		t.Fatal(err)
	}
	overlay, _, err := pCreateWindow.Call(overlayExStyle, uintptrPointer(utf16("STATIC")), uintptrPointer(utf16("NAVI layered capture fixture")), 0x80000000, 0, 0, 192, 192, 0, 0, 0, 0)
	if overlay == 0 {
		t.Fatal(err)
	}
	defer pDestroyWindow.Call(overlay)
	if err = r.Present(overlay, origin.X+150-96, origin.Y+110-96); err != nil {
		t.Fatal(err)
	}
	pSetWindowPos.Call(overlay, ^uintptr(0), 0, 0, 0, 0, 0x0010|0x0001|0x0002|0x0040)
	// Wait until the deliberately opaque layered cover really is on screen.
	if result, _, _ := syscall.NewLazyDLL("dwmapi.dll").NewProc("DwmFlush").Call(); result != 0 {
		t.Fatalf("Fixture compositor flush failed: %#x", result)
	}
	visible, _, _ := pIsVisible.Call(overlay)
	cover, _, _ := gdi32.NewProc("GetPixel").Call(desktop, negative(origin.X+150), negative(origin.Y+110))
	if visible == 0 || cover != 0xeeeeee {
		t.Fatalf("Fixture must visibly cover the marker before capture: visible=%d pixel=%#x", visible, cover)
	}
	if _, reason := captureAnchor(bounds, colour, 1, false); reason != "marker-not-found" {
		t.Fatal("Regression fixture must reproduce self-occlusion before exclusion", reason)
	}
	bubble, err := newSpeechBubble(overlay)
	if err != nil {
		t.Fatal(err)
	}
	defer bubble.Close()
	a := application{hwnd: overlay, bubble: bubble, anchor: editorAnchor{id: 1}}
	if !a.excludeAnchorOverlay() {
		t.Fatal("Could not exclude the fixture overlay from capture")
	}
	defer a.cancelAnchor()
	syscall.NewLazyDLL("dwmapi.dll").NewProc("DwmFlush").Call()
	for i := 0; i < 3; i++ {
		got, reason := captureAnchor(bounds, colour, 1, true)
		if reason != "" || got != goal {
			t.Fatal("Layered overlay hid the owner beacon", got, goal, reason)
		}
	}
	a.cancelAnchor()
	for _, window := range []uintptr{overlay, bubble.hwnd} {
		var affinity uint32
		ok, _, _ := user32.NewProc("GetWindowDisplayAffinity").Call(window, uintptr(unsafe.Pointer(&affinity)))
		if ok == 0 || affinity != 0 {
			t.Fatal("Capture exclusion was not restored on stop", affinity)
		}
	}
}
