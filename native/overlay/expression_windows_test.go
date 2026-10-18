//go:build windows && amd64

package main

import (
	"crypto/sha256"
	"navi/overlay/internal/motion"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"unsafe"
)

func TestNativeLivingGazeRendering(t *testing.T) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	r, err := newRenderer(192)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	distinct := map[[32]byte]bool{}
	for _, look := range []motion.Point{{X: -1, Y: -1}, {X: 0, Y: 0}, {X: 1, Y: 1}} {
		pose := motion.Sample("hover", 1, 1)
		motion.ApplyPresence(motion.Presence{Energy: .8, Attention: 1, Curiosity: .7}, 1, look, &pose)
		if err := r.Draw(pose, 12, 1, 1, false); err != nil {
			t.Fatal(err)
		}
		pixels := unsafe.Slice((*byte)(unsafe.Pointer(r.bits)), 192*192*4)
		distinct[sha256.Sum256(pixels)] = true
	}
	if len(distinct) != 3 {
		t.Fatal("Living gaze did not change native pixels", len(distinct))
	}
}

func TestNativeBrainExpressionRendering(t *testing.T) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	r, err := newRenderer(192)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	report := os.Getenv("NAVI_EXPRESSION_REPORT")
	if report != "" {
		if err := os.MkdirAll(report, 0755); err != nil {
			t.Fatal(err)
		}
	}
	for _, state := range []string{"idle", "acknowledge", "working", "waiting", "offer", "uncertain", "completed", "cancelled", "error", "curious", "pleased", "startled", "sleepy", "welcoming", "attentive"} {
		id, ok := motion.ExpressionMotion(state)
		if !ok {
			t.Fatal(state)
		}
		distinct := map[[32]byte]bool{}
		for _, age := range []float64{.1, .25, .4, .6} {
			pose := motion.Sample(id, age, age)
			if err := r.Draw(pose, age*12, age, age, false); err != nil {
				t.Fatal(err)
			}
			base := sha256.Sum256(unsafe.Slice((*byte)(unsafe.Pointer(r.bits)), 192*192*4))
			motion.ApplyExpression(state, age, &pose)
			if err := r.Draw(pose, age*12, age, age, false); err != nil {
				t.Fatal(err)
			}
			pixels := unsafe.Slice((*byte)(unsafe.Pointer(r.bits)), 192*192*4)
			changed := sha256.Sum256(pixels)
			if state != "idle" && changed == base {
				t.Fatal("expression invisible in native raster", state, age)
			}
			distinct[changed] = true
		}
		if len(distinct) < 3 {
			t.Fatal("native expression did not animate", state)
		}
		if report != "" {
			if err := r.PNG(filepath.Join(report, state+".png")); err != nil {
				t.Fatal(err)
			}
		}
	}
}
