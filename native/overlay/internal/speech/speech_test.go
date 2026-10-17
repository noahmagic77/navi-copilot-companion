package speech

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestTextAndPriority(t *testing.T) {
	if Text("Hallo\x00\n  Welt") != "Hallo Welt" {
		t.Fatal("controls not removed")
	}
	long := Text(strings.Repeat("🧚", 200))
	if utf8.RuneCountInString(long) != 160 || !strings.HasSuffix(long, "…") {
		t.Fatal("Unicode truncation failed")
	}
	s := State{}
	if !s.Show("Antwort im Chat", 2, 100) || !s.Active(101) {
		t.Fatal("message missing")
	}
	until := s.Until
	if s.Show("Maus", 0, 101) || s.Show("Antwort im Chat", 2, 101) || s.Until != until {
		t.Fatal("low priority or duplicate replaced answer")
	}
	if s.Active(111) {
		t.Fatal("message did not expire")
	}
	if !s.Show("Maus", 0, 111) {
		t.Fatal("new event after expiry rejected")
	}
	s.Show("", 2, 112)
	if s.Message != "" || s.Active(112) {
		t.Fatal("clear failed")
	}
}
func TestBubblePlacementAtEdgesAndScale(t *testing.T) {
	for _, scale := range []float64{1, 1.5, 2, 2.5} {
		for _, window := range [][2]float64{{192, 192}, {500, 300}, {1200, 900}} {
			width, height := window[0]*scale, window[1]*scale
			for _, center := range [][2]float64{{52 * scale, 52 * scale}, {width - 52*scale, height - 52*scale}, {width * .5, height * .5}} {
				p := Place(center[0], center[1], width, height, 280*scale, 100*scale, scale)
				if p.X < 0 || p.Y < 0 || p.X+p.Width > width || p.Y+p.Height > height {
					t.Fatal("bubble outside window", p)
				}
			}
		}
	}
	left := Place(1100, 300, 1200, 800, 280, 100, 1)
	if left.X >= 1100 {
		t.Fatal("right-edge bubble did not flip left")
	}
	right := Place(100, 300, 1200, 800, 280, 100, 1)
	if right.X <= 100 {
		t.Fatal("left-edge bubble did not move right")
	}
}
