package motion

import (
	"math"
	"testing"
	"time"
)

func TestLocalPointer(t *testing.T) {
	// Negative monitor origin and 150% scaling.
	p, valid := LocalPointer(Point{-1500, 450}, Point{-1800, 150}, 1.5, 800, 600)
	if !valid || p != (Point{200, 200}) {
		t.Fatal(p, valid)
	}
	if _, valid = LocalPointer(Point{0, 0}, Point{100, 100}, 1, 800, 600); valid {
		t.Fatal("outside pointer accepted")
	}
	if _, valid = LocalPointer(Point{}, Point{}, 0, 800, 600); valid {
		t.Fatal("invalid scale accepted")
	}
}

func TestAvoidanceEscapesAndSettles(t *testing.T) {
	for _, start := range []Point{{400, 300}, {96, 96}, {704, 504}, {96, 300}} {
		for _, hz := range []float64{10, 24, 30, 60} {
			e := Environment{Width: 800, Height: 600, Margin: 96, Pointer: start, PointerValid: true}
			a := Avoidance{}
			p := start
			for i := 0; i < int(8*hz); i++ {
				previous, velocity := p, a.Velocity
				p = a.Step(p, e, 1/hz)
				if p != e.bound(p) || math.IsNaN(p.X) || math.IsNaN(p.Y) {
					t.Fatal("invalid position", p)
				}
				if math.Hypot(p.X-previous.X, p.Y-previous.Y) > 160/hz+1e-6 {
					t.Fatal("speed exceeded")
				}
				if math.Hypot(a.Velocity.X-velocity.X, a.Velocity.Y-velocity.Y) > 480/hz+1e-6 {
					t.Fatal("acceleration exceeded")
				}
			}
			if math.Hypot(p.X-start.X, p.Y-start.Y) < 145 || a.Active {
				t.Fatal("did not escape and settle", start, hz, p, a)
			}
		}
	}
}

func TestAvoidanceIgnoresDistantOrUnavailablePointer(t *testing.T) {
	for _, e := range []Environment{
		{Width: 800, Height: 600, Margin: 96, Pointer: Point{700, 500}, PointerValid: true},
		{Width: 800, Height: 600, Margin: 96, Pointer: Point{200, 200}},
	} {
		a := Avoidance{}
		start := Point{200, 200}
		if p := a.Step(start, e, .1); p != start || a.Active {
			t.Fatal("unexpected avoidance", p)
		}
	}
}

func TestAvoidanceSpeedMultiplierBoostsFleeAndStaysBounded(t *testing.T) {
	e := Environment{Width: 800, Height: 600, Margin: 96, Pointer: Point{400, 300}, PointerValid: true}
	start := Point{400, 300}
	normal, boosted := Avoidance{}, Avoidance{SpeedMultiplier: 3}
	normalNext := normal.Step(start, e, 1.0/60)
	boostedNext := boosted.Step(start, e, 1.0/60)
	normalDistance := math.Hypot(normalNext.X-start.X, normalNext.Y-start.Y)
	boostedDistance := math.Hypot(boostedNext.X-start.X, boostedNext.Y-start.Y)
	if boostedDistance <= normalDistance*2 {
		t.Fatal("boost did not make escape visibly faster", normalDistance, boostedDistance)
	}
	if boostedNext != e.bound(boostedNext) || boostedDistance > 480.0*3/60+1e-6 {
		t.Fatal("boost escaped movement bounds", boostedNext, boostedDistance)
	}
}

func TestAvoidanceNarrowWindowAndPointerLoss(t *testing.T) {
	e := Environment{Width: 192, Height: 192, Margin: 96, Pointer: Point{96, 96}, PointerValid: true}
	a := Avoidance{}
	p := Point{96, 96}
	for i := 0; i < 100; i++ {
		p = a.Step(p, e, .1)
	}
	if p != (Point{96, 96}) || a.Active {
		t.Fatal("no escape space must settle", p, a)
	}
	e.Width = 800
	e.Height = 600
	p = a.Step(p, e, .1)
	e.PointerValid = false
	for i := 0; i < 100; i++ {
		p = a.Step(p, e, .1)
	}
	if a.Active || p != e.bound(p) {
		t.Fatal("pointer loss did not settle")
	}
}

func TestAvoidanceMovingPointerAndFramePause(t *testing.T) {
	a := Avoidance{}
	p := Point{400, 300}
	e := Environment{Width: 800, Height: 600, Margin: 96, PointerValid: true}
	for i := 0; i < 600; i++ {
		e.Pointer = Point{400 + 180*math.Sin(float64(i)/30), 300 + 150*math.Cos(float64(i)/30)}
		previous := p
		p = a.Step(p, e, 1.0/30)
		if p != e.bound(p) || math.Hypot(p.X-previous.X, p.Y-previous.Y) > 160.0/30+1e-6 {
			t.Fatal("unstable moving-pointer response", p)
		}
	}
	previous := p
	if p = a.Step(p, e, 0); p != previous {
		t.Fatal("paused step moved")
	}
	if p = a.Step(p, e, 10); math.Hypot(p.X-previous.X, p.Y-previous.Y) > 16.000001 {
		t.Fatal("delayed frame jumped")
	}
}

func TestAvoidanceNoFrameAllocations(t *testing.T) {
	a := Avoidance{}
	e := Environment{Width: 800, Height: 600, Margin: 96, PointerValid: true}
	p := Point{400, 300}
	if n := testing.AllocsPerRun(1000, func() { e.Pointer = p; p = a.Step(p, e, 1.0/30) }); n != 0 {
		t.Fatal("allocations per frame", n)
	}
}

func TestTickleBuildsWithQuickClicksAndDecays(t *testing.T) {
	start := time.Unix(100, 0)
	tickle := Tickle{}
	if tickle.Strength(start) != 0 {
		t.Fatal("inactive tickle has strength")
	}
	tickle.Click(start)
	first := tickle.Strength(start)
	tickle.Click(start.Add(400 * time.Millisecond))
	second := tickle.Strength(start.Add(400 * time.Millisecond))
	if second <= first || tickle.SpeedMultiplier(start.Add(400*time.Millisecond)) <= 1+2*first {
		t.Fatal("rapid click did not intensify tickle", first, second)
	}
	tickle.Click(start.Add(700 * time.Millisecond))
	third := tickle.Strength(start.Add(700 * time.Millisecond))
	tickle.Click(start.Add(800 * time.Millisecond))
	fourth := tickle.Strength(start.Add(800 * time.Millisecond))
	if third <= second || fourth <= third || tickle.Level != 1 {
		t.Fatal("repeated clicks did not reach bounded maximum", third, tickle.Level)
	}
	if got := tickle.Strength(start.Add(2050 * time.Millisecond)); got != 0 {
		t.Fatal("tickle pulse did not decay", got)
	}
	tickle.Click(start.Add(3 * time.Second))
	if math.Abs(tickle.Level-.35) > 1e-9 {
		t.Fatal("slow click did not reset the pulse", tickle.Level)
	}
}
