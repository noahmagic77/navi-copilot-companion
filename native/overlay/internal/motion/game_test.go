package motion

import (
	"math"
	"testing"
)

func TestGameModesAndClickWins(t *testing.T) {
	e := Environment{Width: 800, Height: 600, Margin: 96}
	for _, mode := range []GameMode{GameCatch, GameHide} {
		g := Game{}
		if !g.Start(mode, Point{400, 300}, Point{700, 500}, e, 30) || !g.Click() || g.Active || g.Result != GamePlayerWon {
			t.Fatal("player click did not win", mode, g)
		}
	}
	g := Game{}
	if !g.Start(GameChase, Point{400, 300}, Point{}, e, 30) || g.Click() || !g.Active {
		t.Fatal("click must not win the cursor-chase mode", g)
	}
}

func TestGameChaseReachesPointerWithinBounds(t *testing.T) {
	e := Environment{Width: 800, Height: 600, Margin: 96, Pointer: Point{704, 504}, PointerValid: true}
	g := Game{}
	if !g.Start(GameChase, Point{200, 200}, Point{}, e, 30) {
		t.Fatal("game did not start")
	}
	p := Point{200, 200}
	for i := 0; i < 1000 && g.Active; i++ {
		previous := p
		p = g.Step(p, e, 1.0/60)
		if p != e.bound(p) || math.Hypot(p.X-previous.X, p.Y-previous.Y) > 190.0/60+1e-6 {
			t.Fatal("invalid chase movement", p)
		}
	}
	if g.Active || g.Result != GameFairyWon || math.Hypot(p.X-e.Pointer.X, p.Y-e.Pointer.Y) > 48 {
		t.Fatal("NAVI did not catch the pointer", p, g)
	}
}

func TestGameHideMovesToBoundedSpot(t *testing.T) {
	e := Environment{Width: 800, Height: 600, Margin: 96}
	target := HideSpot(e, .9, .8)
	if math.Hypot(target.X-643.2, target.Y-422.4) > 1e-9 {
		t.Fatal("unexpected hide spot", target)
	}
	g := Game{}
	if !g.Start(GameHide, Point{200, 200}, target, e, 30) {
		t.Fatal("game did not start")
	}
	p := Point{200, 200}
	for i := 0; i < 1000 && g.flight.Active; i++ {
		p = g.Step(p, e, 1.0/60)
	}
	if !g.Active || math.Hypot(p.X-target.X, p.Y-target.Y) > 1 {
		t.Fatal("NAVI did not reach hide spot", p, target, g)
	}
	if !g.Click() || g.Result != GamePlayerWon {
		t.Fatal("finding NAVI did not win", g)
	}
}

func TestGameTimeoutCancelAndInvalidStart(t *testing.T) {
	e := Environment{Width: 800, Height: 600, Margin: 96}
	g := Game{}
	if g.Start("unknown", Point{}, Point{}, e, 30) || g.Start(GameCatch, Point{}, Point{}, e, 0) {
		t.Fatal("invalid game started")
	}
	if !g.Start(GameCatch, Point{400, 300}, Point{}, e, .05) {
		t.Fatal("game did not start")
	}
	g.Step(Point{400, 300}, e, .05)
	if g.Active || g.Result != GameTimedOut {
		t.Fatal("game did not time out", g)
	}
	g.Start(GameChase, Point{200, 200}, Point{}, e, 30)
	g.Cancel()
	if g.Active || g.Result != GameCancelled {
		t.Fatal("game did not cancel", g)
	}
}

func TestHideSpotClampsFractionsToWindow(t *testing.T) {
	e := Environment{Width: 800, Height: 600, Margin: 96}
	for _, input := range []Point{{-1, 0}, {1, 1}, {2, 2}, {.5, .5}} {
		spot := HideSpot(e, input.X, input.Y)
		if spot != e.bound(spot) || math.IsNaN(spot.X) || math.IsNaN(spot.Y) {
			t.Fatal("hide spot outside window", input, spot)
		}
	}
}

func TestGameHitRegion(t *testing.T) {
	center := Point{400, 300}
	if !HitTest(center, Point{450, 300}, 52) || HitTest(center, Point{453, 300}, 52) || HitTest(center, center, 0) {
		t.Fatal("incorrect NAVI hit region")
	}
}
