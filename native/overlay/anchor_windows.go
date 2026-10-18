//go:build windows && amd64

package main

import (
	"fmt"
	"math"
	"navi/overlay/internal/anchor"
	"navi/overlay/internal/motion"
	"os"
	"time"
	"unsafe"
)

var (
	pBitBlt          = gdi32.NewProc("BitBlt")
	pGdiFlush        = gdi32.NewProc("GdiFlush")
	pCaptureAffinity = user32.NewProc("SetWindowDisplayAffinity")
)

type editorAnchor struct {
	id               int
	colour           uint32
	until            time.Time
	nextScan         time.Time
	status           string
	reason           string
	goal, core       motion.Point // window-local physical pixels
	found, rendering bool
	flight           motion.Flight
	captureExcluded  bool
}

func setCaptureExcluded(hwnd uintptr, excluded bool) bool {
	affinity := uintptr(0)
	if excluded {
		affinity = 0x11
	} // WDA_EXCLUDEFROMCAPTURE (Windows 10 2004+).
	ok, _, _ := pCaptureAffinity.Call(hwnd, affinity)
	return ok != 0
}

func (a *application) excludeAnchorOverlay() bool {
	if !setCaptureExcluded(a.hwnd, true) {
		return false
	}
	a.anchor.captureExcluded = true
	if !a.bubble.excludeFromCapture(true) {
		a.cancelAnchor("capture-self-exclusion-unavailable")
		return false
	}
	return true
}

func (a *application) anchorStatus(status string) {
	if a.anchor.id == 0 || a.anchor.status == status {
		return
	}
	a.anchor.status = status
	fmt.Fprintf(os.Stdout, "{\"type\":\"editorAnchor\",\"id\":%d,\"status\":%q,\"reason\":%q,\"x\":%.2f,\"y\":%.2f,\"coreX\":%.2f,\"coreY\":%.2f}\n", a.anchor.id, status, a.anchor.reason, a.anchor.goal.X, a.anchor.goal.Y, a.anchor.core.X, a.anchor.core.Y)
}

func (a *application) cancelAnchor(reason ...string) {
	if a.anchor.captureExcluded {
		setCaptureExcluded(a.hwnd, false)
		a.bubble.excludeFromCapture(false)
	}
	if len(reason) > 0 {
		a.anchor.reason = reason[0]
	}
	if a.anchor.id != 0 {
		a.anchorStatus("stopped")
	}
	a.anchor = editorAnchor{}
	if a.renderer != nil && a.dpi > 0 {
		e := a.environment()
		a.position.X = motion.Clamp(a.position.X, e.Margin, math.Max(e.Margin, e.Width-e.Margin))
		a.position.Y = motion.Clamp(a.position.Y, e.Margin, math.Max(e.Margin, e.Height-e.Margin))
	}
}

// Capture only the attached, foreground owner's client rectangle. Pixels are
// discarded immediately after matching; no image leaves this function or is saved.
func captureAnchor(bounds rect, colour uint32, dpi float64, diagnostics bool) (motion.Point, string) {
	w, h := int(bounds.Right-bounds.Left), int(bounds.Bottom-bounds.Top)
	if w < 8 || h < 8 || w > 16384 || h > 16384 || w*h > 16*1024*1024 {
		return motion.Point{}, "capture-invalid-bounds"
	}
	desktop, _, _ := pGetDC.Call(0)
	if desktop == 0 {
		return motion.Point{}, "capture-desktop-unavailable"
	}
	defer pReleaseDC.Call(0, desktop)
	dc, _, _ := pCreateDC.Call(desktop)
	if dc == 0 {
		return motion.Point{}, "capture-dc-unavailable"
	}
	defer pDeleteDC.Call(dc)
	var bits uintptr
	info := bitmapInfo{Header: bitmapInfoHeader{Size: 40, Width: int32(w), Height: -int32(h), Planes: 1, BitCount: 32}}
	dib, _, _ := pCreateDIB.Call(desktop, uintptr(unsafe.Pointer(&info)), 0, uintptr(unsafe.Pointer(&bits)), 0, 0)
	if dib == 0 {
		return motion.Point{}, "capture-bitmap-unavailable"
	}
	defer pDeleteObject.Call(dib)
	if bits == 0 {
		return motion.Point{}, "capture-bits-unavailable"
	}
	previous, _, _ := pSelectObject.Call(dc, dib)
	if previous == 0 || previous == ^uintptr(0) {
		return motion.Point{}, "capture-select-failed"
	}
	defer pSelectObject.Call(dc, previous)
	pixels := unsafe.Slice((*byte)(unsafe.Pointer(bits)), w*h*4)
	defer clear(pixels)
	// Desktop composition includes Chromium's GPU surface; only NAVI's own HWNDs
	// are excluded for the lifetime of this bounded navigation request.
	ok, _, callErr := pBitBlt.Call(dc, 0, 0, uintptr(w), uintptr(h), desktop, negative(bounds.Left), negative(bounds.Top), 0x00cc0020|0x40000000)
	if ok == 0 {
		return motion.Point{}, fmt.Sprintf("capture-copy-failed: %v", callErr)
	}
	// CreateDIBSection requires GDI completion before the CPU reads or clears bits.
	if flushed, _, _ := pGdiFlush.Call(); flushed == 0 {
		return motion.Point{}, "capture-flush-failed"
	}
	r, reason := anchor.Locate(pixels, w, h, colour)
	if reason != "" {
		if diagnostics {
			fill, border := 0, 0
			for i := 0; i < len(pixels); i += 4 {
				c := uint32(pixels[i]) | uint32(pixels[i+1])<<8 | uint32(pixels[i+2])<<16
				if c == colour {
					fill++
				}
				if c == anchor.Border {
					border++
				}
			}
			reason = fmt.Sprintf("%s; fill=%d border=%d client=%dx%d dpi=%.2f", reason, fill, border, w, h, dpi)
		}
		return motion.Point{}, reason
	}
	// Land beside the beacon; leave the marker uncovered for subsequent scans.
	return motion.Point{X: float64(r.Left+r.Right)/2 - 60*dpi, Y: float64(r.Top+r.Bottom) / 2}, ""
}

func (a *application) scanAnchor() {
	if a.anchor.id == 0 {
		return
	}
	now := time.Now()
	if !now.Before(a.anchor.until) {
		a.cancelAnchor("target-expired")
		return
	}
	foreground, _, _ := pGetForeground.Call()
	if !a.visible || !a.focused || a.target == 0 || rootWindow(foreground) != a.target {
		a.cancelAnchor("owner hidden or unfocused")
		return
	}
	if now.Before(a.anchor.nextScan) {
		return
	}
	a.anchor.nextScan = now.Add(250 * time.Millisecond)
	goal, reason := captureAnchor(a.bounds, a.anchor.colour, a.dpi, a.diagnostics)
	a.anchor.reason = reason
	if reason != "" {
		a.anchor.found = false
		a.anchor.rendering = false
		a.anchor.flight.Active = false
		a.anchorStatus("unavailable")
		return
	}
	if goal.X < 8 || goal.Y < 8 || int(a.bounds.Right-a.bounds.Left) < a.renderer.pixels || int(a.bounds.Bottom-a.bounds.Top) < a.renderer.pixels {
		a.anchor.found = false
		a.anchor.rendering = false
		a.anchor.reason = "target-outside-window"
		a.anchorStatus("unavailable")
		return
	}
	if !a.anchor.found || math.Hypot(goal.X-a.anchor.goal.X, goal.Y-a.anchor.goal.Y) > .5 {
		a.anchor.goal = goal
		a.anchor.flight.Active = false
		a.anchor.found = true
		a.anchorStatus("found")
	}
}

func (a *application) advanceAnchor(e motion.Environment, dt float64) {
	if a.anchor.id == 0 || !a.anchor.found {
		a.anchor.rendering = false
		return
	}
	current := a.speechAnchor()
	a.anchor.rendering = false
	goal := motion.Point{X: a.anchor.goal.X / a.dpi, Y: a.anchor.goal.Y / a.dpi}
	if a.avoidance.Active || (e.PointerValid && math.Hypot(goal.X-e.Pointer.X, goal.Y-e.Pointer.Y) < 145) {
		a.anchor.flight.Active = false
		a.anchor.reason = "pointer-has-priority"
		a.anchorStatus("blocked")
		return
	}
	a.anchor.reason = ""
	if !a.anchor.flight.Active && a.anchor.status != "arrived" {
		a.anchor.core = motion.Point{X: float64(current.X - a.bounds.Left), Y: float64(current.Y - a.bounds.Top)}
		a.anchor.flight.Plan(motion.Point{X: a.anchor.core.X / a.dpi, Y: a.anchor.core.Y / a.dpi}, goal, e.Width, e.Height, 0)
		a.anchor.flight.Duration = math.Min(a.anchor.flight.Duration, 2.5)
	}
	if a.anchor.flight.Active {
		p := a.anchor.flight.Step(dt)
		a.anchor.core = motion.Point{X: p.X * a.dpi, Y: p.Y * a.dpi}
	} else {
		a.anchor.core = a.anchor.goal
	}
	a.anchor.rendering = true
	a.position = motion.Point{X: a.anchor.core.X / a.dpi, Y: a.anchor.core.Y / a.dpi}
	a.flight.Active = false
	if !a.anchor.flight.Active {
		a.anchor.core = a.anchor.goal
	}
}

// Keep the layered window inside its owner, even when the core visits a gutter.
// Cancel the pose's ordinary body translation at the destination; wings and light
// keep animating without moving the core away from the measured line height.
func (a *application) anchorPose(pose motion.Pose) (motion.Pose, int32, int32) {
	pixels := a.renderer.pixels
	x := int32(math.Round(motion.Clamp(a.anchor.core.X-float64(pixels)/2, 0, float64(a.bounds.Right-a.bounds.Left)-float64(pixels))))
	y := int32(math.Round(motion.Clamp(a.anchor.core.Y-float64(pixels)/2, 0, float64(a.bounds.Bottom-a.bounds.Top)-float64(pixels))))
	scale := float64(pixels) / 192 * (80.0 / 220) * pose[motion.Scale]
	pose[motion.X] = (a.anchor.core.X - float64(x) - float64(pixels)/2) / scale
	pose[motion.Y] = (a.anchor.core.Y - float64(y) - float64(pixels)/2) / scale
	return pose, a.bounds.Left + x, a.bounds.Top + y
}
