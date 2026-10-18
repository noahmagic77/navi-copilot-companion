//go:build windows && amd64

package main

import (
	"crypto/sha256"
	"math"
	"navi/overlay/internal/motion"
	"runtime"
	"testing"
	"unsafe"
)

func TestAll110PreviewAnimationsRenderAcrossTheirWholeCycle(t *testing.T) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	r, err := newRenderer(192)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	for _, definition := range motion.Definitions {
		t.Run(definition.ID, func(t *testing.T) {
			a := application{rig: motion.NewRig()}
			a.selectMotion(definition.ID, true)
			frames := map[[32]byte]bool{}
			wing, orbit := 0.0, 0.0
			// Exercise two complete loops through the actual spring and Windows renderer.
			steps := int(math.Ceil(definition.Duration * 2 * 30))
			for frame := 0; frame <= steps; frame++ {
				a.age += 1.0 / 30
				a.advanceClip()
				elapsed := float64(frame) / 30
				a.rig.Step(motion.SamplePreview(a.id, a.age, elapsed), 1.0/30)
				wing += motion.Tau * 2.05 * a.rig.Value[motion.WingSpeed] / 30
				orbit += a.rig.Value[motion.OrbitSpeed] / 30
				if frame%30 != 15 {
					continue
				}
				if err := r.Draw(a.rig.Value, wing, orbit, elapsed, false); err != nil {
					t.Fatal(err)
				}
				pixels := unsafe.Slice((*byte)(unsafe.Pointer(r.bits)), 192*192*4)
				visible := 0
				for i := 3; i < len(pixels); i += 4 {
					if pixels[i] > 32 {
						visible++
					}
				}
				if visible < 100 {
					t.Fatal("Fairy disappeared from its actual raster", frame, visible)
				}
				frames[sha256.Sum256(pixels)] = true
			}
			if len(frames) < 5 {
				t.Fatal("Preview did not animate in both cycles", len(frames))
			}
		})
	}
}
