package anchor

import "testing"

func TestLocateReportsWhyThereIsNoUniqueTarget(t *testing.T) {
	p := make([]byte, 200*120*4)
	if _, reason := Locate(p[:20], 200, 120, 0x5868ae); reason != "invalid-buffer" {
		t.Fatal(reason)
	}
	if _, reason := Locate(p, 200, 120, 0x5868ae); reason != "marker-not-found" {
		t.Fatal(reason)
	}
	beacon(p, 200, 30, 20, 10, 0x5868ae)
	if _, reason := Locate(p, 200, 120, 0x5868ae); reason != "" {
		t.Fatal(reason)
	}
	beacon(p, 200, 90, 20, 10, 0x5868ae)
	if _, reason := Locate(p, 200, 120, 0x5868ae); reason != "marker-ambiguous" {
		t.Fatal(reason)
	}
}

func beacon(p []byte, w, x, y, size int, c uint32) {
	for row := y - 2; row < y+size+2; row++ {
		for col := x - 2; col < x+size+2; col++ {
			colour := Border
			if row >= y && row < y+size && col >= x && col < x+size {
				colour = c
			}
			i := (row*w + col) * 4
			p[i], p[i+1], p[i+2] = byte(colour), byte(colour>>8), byte(colour>>16)
		}
	}
}
func TestFindActualBeaconAtDifferentPixelScales(t *testing.T) {
	for _, size := range []int{3, 8, 10, 15, 24, 48} {
		p := make([]byte, 200*120*4)
		beacon(p, 200, 37, 42, size, 0x5868ae)
		r, ok := Find(p, 200, 120, 0x5868ae)
		if !ok || r != (Rect{37, 42, 37 + size, 42 + size}) {
			t.Fatal(size, r, ok)
		}
		if _, ok := Find(p, 200, 120, 0x5868af); ok {
			t.Fatal("accepted an old token")
		}
	}
}
func TestRejectMissingAmbiguousClippedAndUnframedMarkers(t *testing.T) {
	p := make([]byte, 200*120*4)
	if _, ok := Find(p, 200, 120, 0x5868ae); ok {
		t.Fatal("empty image")
	}
	beacon(p, 200, 30, 20, 10, 0x5868ae)
	beacon(p, 200, 90, 20, 10, 0x5868ae)
	if _, ok := Find(p, 200, 120, 0x5868ae); ok {
		t.Fatal("ambiguous image")
	}
	clear(p)
	beacon(p, 200, 30, 20, 10, 0x5868ae)
	for row := 17; row < 20; row++ {
		p[(row*200+35)*4] = 0
	}
	if _, ok := Find(p, 200, 120, 0x5868ae); ok {
		t.Fatal("broken border")
	}
	if _, ok := Find(p[:20], 200, 120, 0x5868ae); ok {
		t.Fatal("invalid pixel buffer")
	}
	for _, token := range []string{"", "nope00", "1234567", "b3eaff"} {
		if _, ok := Colour(token); ok {
			t.Fatal(token)
		}
	}
}
func TestFractionalScaleEdgePixelsDoNotShiftTheCentre(t *testing.T) {
	p := make([]byte, 200*120*4)
	beacon(p, 200, 30, 20, 10, 0x5868ae)
	for y := 20; y < 30; y++ {
		for x := 30; x < 40; x++ {
			if x == 30 || x == 39 || y == 20 || y == 29 {
				p[(y*200+x)*4] = 0
			}
		}
	}
	r, ok := Find(p, 200, 120, 0x5868ae)
	if !ok || r.Left+r.Right != 70 || r.Top+r.Bottom != 50 {
		t.Fatal(r, ok)
	}
}
