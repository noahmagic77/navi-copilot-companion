//go:build windows && amd64

package main

import (
	"navi/overlay/internal/protocol"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"unsafe"
)

func TestBubbleRasterHasTransparentBodyReadableTextAndTrackingTip(t *testing.T) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	b, err := newSpeechBubble(0)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	for _, center := range []point{{200, 300}, {900, 300}, {600, 140}, {600, 650}} {
		if err := b.draw("Hallo! Ich fliege mit dir. Schreib mir mit @navi.", center, rect{100, 100, 1100, 700}, 1); err != nil {
			t.Fatal(err)
		}
		pixels := unsafe.Slice((*byte)(unsafe.Pointer(b.canvas.bits)), b.canvas.pixels*b.canvas.pixels*4)
		var clear, translucent, ink int
		for i := 0; i < len(pixels); i += 4 {
			a := pixels[i+3]
			if a == 0 {
				clear++
			}
			if a > 100 && a < 210 {
				translucent++
			}
			if a > 230 && pixels[i] < 120 && pixels[i+1] < 100 && pixels[i+2] < 90 {
				ink++
			}
		}
		if clear == 0 || translucent < 500 || ink < 30 {
			t.Fatalf("invalid bubble raster: clear=%d translucent=%d text=%d", clear, translucent, ink)
		}
		var area rect
		pGetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&area)))
		tx, ty := int(center.X-area.Left), int(center.Y+3-area.Top)
		nearTip := false
		for y := ty - 3; y <= ty+3; y++ {
			for x := tx - 3; x <= tx+3; x++ {
				if x >= 0 && y >= 0 && x < b.canvas.pixels && y < b.canvas.pixels && pixels[(y*b.canvas.pixels+x)*4+3] > 0 {
					nearTip = true
				}
			}
		}
		if !nearTip {
			t.Fatal("tail does not reach the fairy core", center, area)
		}
	}
	if output := os.Getenv("NAVI_TEST_BUBBLE_IMAGE"); output != "" {
		if err := b.canvas.PNG(filepath.Clean(output)); err != nil {
			t.Fatal(err)
		}
	}
}

func TestNativeBubbleVisiblePlacementAndHide(t *testing.T) {
	if os.Getenv("NAVI_TEST_VISIBLE_BUBBLE") != "1" {
		t.Skip("opt-in visible native UI test")
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	before, _, _ := pGetForeground.Call()
	owner, _, _ := pCreateWindow.Call(0, uintptrPointer(utf16("STATIC")), 0, 0, 0, 0, 100, 100, 0, 0, 0, 0)
	if owner == 0 {
		t.Fatal("owner could not be created")
	}
	defer pDestroyWindow.Call(owner)
	b, err := newSpeechBubble(owner)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	if bubbleFill>>24 >= 255 || bubbleInk>>24 != 255 {
		t.Fatal("bubble body must be translucent with opaque text")
	}
	bounds := rect{Left: 100, Top: 100, Right: 1200, Bottom: 800}
	b.Show("Hallo! Ich mache deiner Maus Platz.", point{600, 400}, bounds, 1)
	visible, _, _ := pIsVisible.Call(b.hwnd)
	if visible == 0 {
		t.Fatal("tracking bubble did not show")
	}
	var area rect
	pGetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&area)))
	if area.Right <= area.Left || area.Bottom <= area.Top || area.Left < bounds.Left || area.Right > bounds.Right || area.Top < bounds.Top || area.Bottom > bounds.Bottom {
		t.Fatal("invalid bubble bounds", area)
	}
	first := area
	b.Show("Hallo! Ich mache deiner Maus Platz.", point{900, 600}, bounds, 1.5)
	pGetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&area)))
	if area == first {
		t.Fatal("bubble did not move")
	}
	after, _, _ := pGetForeground.Call()
	if after != before {
		t.Fatal("visible bubble stole focus")
	}
	b.Hide()
	visible, _, _ = pIsVisible.Call(b.hwnd)
	if visible != 0 {
		t.Fatal("bubble did not hide")
	}
}

func TestNativeBubbleCreatesHiddenClickThroughWithoutFocus(t *testing.T) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	before, _, _ := pGetForeground.Call()
	// Use an existing system class so this test does not register the app's class.
	owner, _, _ := pCreateWindow.Call(0, uintptrPointer(utf16("STATIC")), 0, 0, 0, 0, 100, 100, 0, 0, 0, 0)
	if owner == 0 {
		t.Fatal("test owner could not be created")
	}
	defer pDestroyWindow.Call(owner)
	b, err := newSpeechBubble(owner)
	if err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	visible, _, _ := pIsVisible.Call(b.hwnd)
	if visible != 0 {
		t.Fatal("new bubble became visible")
	}
	style, _, _ := pGetWindowLong.Call(b.hwnd, negative(-20))
	if style&0x08000020 != 0x08000020 {
		t.Fatal("missing click-through/no-activate styles")
	}
	hit, _, _ := pSendMessage.Call(b.hwnd, uintptr(wmNCHitTest), 0, 0)
	if int32(hit) != -1 {
		t.Fatal("bubble catches clicks")
	}
	after, _, _ := pGetForeground.Call()
	if before != after {
		t.Fatal("bubble stole focus")
	}
}

func TestHiddenAndDisabledSpeechIsDiscarded(t *testing.T) {
	for _, a := range []application{{bubbleEnabled: false, visible: true, focused: true}, {bubbleEnabled: true, visible: false, focused: true}, {bubbleEnabled: true, visible: true, focused: false}} {
		a.say("Hallo", 2)
		if a.speech.Message != "" || a.bubble != nil {
			t.Fatal("inactive speech created a window")
		}
	}
	a := application{bubbleEnabled: true}
	a.speech.Show("Hallo", 2, wallSeconds())
	a.apply(protocol.Command{Type: "focus", Focused: false})
	if a.speech.Message != "" {
		t.Fatal("focus loss retained speech")
	}
}
