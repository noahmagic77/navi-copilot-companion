//go:build windows && amd64

package main

import (
	"encoding/json"
	"fmt"
	"math"
	"navi/overlay/internal/motion"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"time"
	"unsafe"
)

type memoryCounters struct {
	Size, PageFaults                                                                                           uint32
	PeakWorkingSet, WorkingSet, PeakPaged, Paged, PeakNonPaged, NonPaged, Pagefile, PeakPagefile, PrivateUsage uintptr
}

func runSelfTest(output string) error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	pDPIAware.Call(negative(-4))
	app = nil
	hwnd, err := createOverlayWindow()
	if err != nil {
		return err
	}
	defer pDestroyWindow.Call(hwnd)
	style, _, _ := pGetWindowLong.Call(hwnd, negative(-20))
	if style&overlayExStyle != overlayExStyle {
		return fmt.Errorf("overlay input/focus styles missing")
	}
	visible, _, _ := pIsVisible.Call(hwnd)
	if visible != 0 {
		return fmt.Errorf("self-test window must stay hidden")
	}
	r, err := newRenderer(192)
	if err != nil {
		return err
	}
	defer r.Close()
	if output != "" {
		if err = os.MkdirAll(output, 0755); err != nil {
			return err
		}
	}
	for _, definition := range motion.Definitions {
		pose := motion.Sample(definition.ID, definition.Duration*.45, 2)
		if err = r.Draw(pose, 2, 2, 2, false); err != nil {
			return err
		}
		pixels := unsafe.Slice((*byte)(unsafe.Pointer(r.bits)), 192*192*4)
		nonzero := 0
		for i := 0; i < len(pixels); i += 4 {
			a := pixels[i+3]
			if a > 0 {
				nonzero++
			}
			if pixels[i] > a || pixels[i+1] > a || pixels[i+2] > a {
				return fmt.Errorf("non-premultiplied pixels")
			}
		}
		if nonzero < 300 {
			return fmt.Errorf("empty rendering for %s", definition.ID)
		}
		if output != "" {
			if err = r.PNG(filepath.Join(output, definition.ID+".png")); err != nil {
				return err
			}
		}
	}
	// Exercise the actual layered-window upload, without showing the test window.
	if err = r.Present(hwnd, 0, 0); err != nil {
		return err
	}
	process, _, _ := pCurrentProcess.Call()
	before, _, _ := pGetGUIResources.Call(process, 0)
	samples := make([]float64, 360)
	for i := range samples {
		start := time.Now()
		if err = r.Draw(motion.Sample("hover", 1, float64(i)/30), float64(i)*.4, float64(i)/30, float64(i)/30, false); err != nil {
			return err
		}
		samples[i] = time.Since(start).Seconds() * 1000
	}
	after, _, _ := pGetGUIResources.Call(process, 0)
	if after > before {
		return fmt.Errorf("GDI handles increased: %d -> %d", before, after)
	}
	sort.Float64s(samples)
	memory := memoryCounters{}
	memory.Size = uint32Size(memory)
	pProcessMemory.Call(process, uintptr(unsafe.Pointer(&memory)), uintptr(memory.Size))
	report := map[string]any{"nativeSelfTest": "passed", "motions": len(motion.Definitions), "frames": len(samples), "canvasPixels": 192, "renderP50Ms": math.Round(samples[180]*1000) / 1000, "renderP95Ms": math.Round(samples[342]*1000) / 1000, "workingSetBytes": memory.WorkingSet, "privateBytes": memory.PrivateUsage, "gdiHandlesBefore": before, "gdiHandlesAfter": after, "clickThroughAndNoActivate": true, "scope": "hidden renderer microbenchmark; not a live VS Code or end-user CPU benchmark"}
	data, _ := json.MarshalIndent(report, "", "  ")
	fmt.Println(string(data))
	if output != "" {
		return os.WriteFile(filepath.Join(output, "native-benchmark.json"), append(data, '\n'), 0644)
	}
	return nil
}
