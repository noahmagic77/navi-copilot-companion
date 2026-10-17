package motion

import (
	"math"
	"testing"
)

func TestNavigationArrivesWithinWindow(t *testing.T) {
	for _, goal := range []Point{{0, 0}, {1, 0}, {.5, .5}, {0, 1}, {1, 1}} {
		for _, hz := range []float64{10, 24, 30, 60} {
			n := Navigation{}
			if !n.Request(goal) {
				t.Fatal("valid target rejected")
			}
			e := Environment{Width: 800, Height: 600, Margin: 96}
			p := Point{400, 300}
			for i := 0; i < int(30*hz) && n.Pending; i++ {
				before := p
				var controlled bool
				p, controlled = n.Step(p, e, 1/hz, false)
				if !controlled || p != e.bound(p) || math.IsNaN(p.X) || math.IsNaN(p.Y) {
					t.Fatal("invalid navigation", goal, p)
				}
				if math.Hypot(p.X-before.X, p.Y-before.Y) > 160/hz+1e-6 {
					t.Fatal("flight jumped", hz)
				}
			}
			want := e.bound(Point{goal.X * e.Width, goal.Y * e.Height})
			if n.Pending || math.Hypot(p.X-want.X, p.Y-want.Y) > 1 {
				t.Fatal("target not reached", goal, p, want)
			}
			if next, controlled := n.Step(p, e, .1, false); next != p || controlled {
				t.Fatal("completed target still controls flight")
			}
		}
	}
}

func TestNavigationWaitsForPointerAndResumes(t *testing.T) {
	n := Navigation{}
	n.Request(Point{1, 1})
	e := Environment{Width: 800, Height: 600, Margin: 96, Pointer: Point{704, 504}, PointerValid: true}
	p := Point{300, 300}
	for i := 0; i < 30; i++ {
		if next, controlled := n.Step(p, e, .1, false); next != p || !controlled || n.Flying() {
			t.Fatal("flew toward blocked target")
		}
	}
	e.PointerValid = false
	p, _ = n.Step(p, e, .1, false)
	if !n.Flying() {
		t.Fatal("did not resume")
	}
	before := p
	if next, controlled := n.Step(p, e, .1, true); next != p || !controlled || n.Flying() || !n.Pending {
		t.Fatal("did not yield to avoidance")
	}
	p = Point{200, 200} // avoidance moves the fairy elsewhere
	for i := 0; i < 300 && n.Pending; i++ {
		p, _ = n.Step(p, e, .1, false)
	}
	if p == before || n.Pending || math.Hypot(p.X-704, p.Y-504) > 1 {
		t.Fatal("did not replan after avoidance", p)
	}
}

func TestNavigationResizeRetargetAndCancel(t *testing.T) {
	n := Navigation{}
	n.Request(Point{1, 1})
	e := Environment{Width: 1200, Height: 900, Margin: 96}
	p := Point{400, 300}
	p, _ = n.Step(p, e, .1, false)
	e.Width = 600
	e.Height = 400
	n.Replan()
	for i := 0; i < 300 && n.Pending; i++ {
		p, _ = n.Step(p, e, .1, false)
	}
	if math.Hypot(p.X-504, p.Y-304) > 1 {
		t.Fatal("resize target incorrect", p)
	}
	n.Request(Point{0, 0})
	p, _ = n.Step(p, e, .1, false)
	n.Request(Point{.5, .5})
	for i := 0; i < 300 && n.Pending; i++ {
		p, _ = n.Step(p, e, .1, false)
	}
	if math.Hypot(p.X-300, p.Y-200) > 1 {
		t.Fatal("replacement target not reached", p)
	}
	n.Request(Point{0, 0})
	n.Cancel()
	if next, controlled := n.Step(p, e, .1, false); next != p || controlled || n.Pending || n.Flying() {
		t.Fatal("cancelled flight continued")
	}
}

func TestNavigationInvalidTargetAndPausedFrame(t *testing.T) {
	n := Navigation{}
	n.Request(Point{.5, .5})
	original := n
	for _, target := range []Point{{-1, 0}, {0, 2}, {math.NaN(), 0}, {0, math.Inf(1)}} {
		if n.Request(target) || n != original {
			t.Fatal("invalid target changed navigation")
		}
	}
	p := Point{200, 200}
	e := Environment{Width: 800, Height: 600, Margin: 96}
	if next, _ := n.Step(p, e, 0, false); next != p || n != original {
		t.Fatal("pause moved flight")
	}
	if next, _ := n.Step(p, e, 10, false); math.Hypot(next.X-p.X, next.Y-p.Y) > 16 {
		t.Fatal("delayed frame jumped")
	}
}
