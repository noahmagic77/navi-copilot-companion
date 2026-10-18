//go:build windows && amd64

package main

import (
	"image/png"
	"math"
	"navi/overlay/internal/anchor"
	"navi/overlay/internal/motion"
	"os"
	"testing"
	"time"
)

func TestAnchorPosePutsCoreAtMeasuredPixelInsideOwner(t *testing.T) {
	for _, dpi := range []float64{1, 1.25, 1.5, 2, 2.25} {
		for _, goal := range []motion.Point{{20, 90}, {300.5, 400.5}, {970, 680}} {
			a := application{bounds: rect{Left: -1200, Top: 70, Right: -200, Bottom: 770}, dpi: dpi, renderer: &renderer{pixels: int(math.Ceil(192 * dpi))}, rig: motion.NewRig()}
			a.anchor = editorAnchor{core: goal, rendering: true}
			pose := motion.Sample("orbit-clock", 1.7, 3)
			p, x, y := a.anchorPose(pose)
			scale := float64(a.renderer.pixels) / 192 * (80.0 / 220) * p[motion.Scale]
			cx := float64(x-a.bounds.Left) + float64(a.renderer.pixels)/2 + p[motion.X]*scale
			cy := float64(y-a.bounds.Top) + float64(a.renderer.pixels)/2 + p[motion.Y]*scale
			if math.Abs(cx-goal.X) > .001 || math.Abs(cy-goal.Y) > .001 {
				t.Fatal(dpi, goal, cx, cy)
			}
			if x < a.bounds.Left || y < a.bounds.Top || x+int32(a.renderer.pixels) > a.bounds.Right || y+int32(a.renderer.pixels) > a.bounds.Bottom {
				t.Fatal("sprite left owner bounds")
			}
		}
	}
}

func TestBeaconFromActualEditorScreenshot(t *testing.T) {
	file := os.Getenv("NAVI_TEST_EDITOR_SCREENSHOT")
	if file == "" {
		t.Skip("opt-in isolated editor fixture")
	}
	stream, err := os.Open(file)
	if err != nil {
		t.Fatal(err)
	}
	defer stream.Close()
	img, err := png.Decode(stream)
	if err != nil {
		t.Fatal(err)
	}
	colour, ok := anchor.Colour(os.Getenv("NAVI_TEST_EDITOR_COLOUR"))
	if !ok {
		t.Fatal("missing fixture colour")
	}
	w, h := img.Bounds().Dx(), img.Bounds().Dy()
	p := make([]byte, w*h*4)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			i := (y*w + x) * 4
			p[i], p[i+1], p[i+2] = byte(b>>8), byte(g>>8), byte(r>>8)
		}
	}
	r, ok := anchor.Find(p, w, h, colour)
	if !ok {
		t.Fatal("actual rendered editor beacon was not recognized")
	}
	t.Log("actual editor beacon", r)
}

func TestExpiredAndHiddenTargetsStopBeforeReadingPixels(t *testing.T) {
	a := application{anchor: editorAnchor{id: 12, until: time.Now().Add(-time.Second)}}
	a.scanAnchor()
	if a.anchor.id != 0 {
		t.Fatal("expired request retained")
	}
	a.anchor = editorAnchor{id: 13}
	a.refresh()
	if a.anchor.id != 0 {
		t.Fatal("hidden request retained")
	}
}
func TestAnchorFlightArrivesAndYieldsToPointer(t *testing.T) {
	a := application{bounds: rect{Right: 1000, Bottom: 700}, dpi: 1, position: motion.Point{X: 800, Y: 600}, renderer: &renderer{pixels: 192}, rig: motion.NewRig()}
	a.anchor = editorAnchor{id: 1, found: true, goal: motion.Point{X: 150, Y: 260}, status: "found"}
	e := motion.Environment{Width: 1000, Height: 700, Margin: 96}
	for i := 0; i < 150; i++ {
		a.advanceAnchor(e, .05)
	}
	if !a.anchor.rendering || a.anchor.core != a.anchor.goal {
		t.Fatal("did not arrive", a.anchor)
	}
	e.PointerValid = true
	e.Pointer = motion.Point{X: 150, Y: 260}
	a.advanceAnchor(e, .05)
	if a.anchor.rendering || a.anchor.status != "blocked" {
		t.Fatal("did not yield to pointer")
	}
	a.cancelAnchor()
	if a.anchor.id != 0 {
		t.Fatal("target retained")
	}
}
