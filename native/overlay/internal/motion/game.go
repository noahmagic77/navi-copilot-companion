package motion

import "math"

type GameMode string

const (
	GameCatch GameMode = "catch"
	GameChase GameMode = "chase"
	GameHide  GameMode = "hide"
)

type GameResult string

const (
	GamePlayerWon GameResult = "player"
	GameFairyWon  GameResult = "navi"
	GameTimedOut  GameResult = "timeout"
	GameCancelled GameResult = "cancelled"
)

type Game struct {
	Mode      GameMode
	Result    GameResult
	Active    bool
	Elapsed   float64
	Duration  float64
	Target    Point
	Velocity  Point
	avoidance Avoidance
	flight    Flight
}

func (g *Game) Start(mode GameMode, position, target Point, e Environment, duration float64) bool {
	if (mode != GameCatch && mode != GameChase && mode != GameHide) || duration <= 0 || math.IsNaN(duration) || math.IsInf(duration, 0) {
		return false
	}
	*g = Game{Mode: mode, Active: true, Duration: duration}
	if mode == GameHide {
		g.Target = e.bound(target)
		g.flight.Plan(position, g.Target, e.Width, e.Height, e.Margin)
	}
	return true
}

func (g *Game) Cancel() {
	if g.Active {
		g.Active = false
		g.Result = GameCancelled
	}
}

func (g *Game) Click() bool {
	if !g.Active || g.Mode == GameChase {
		return false
	}
	g.Active = false
	g.Result = GamePlayerWon
	return true
}

func (g *Game) Step(position Point, e Environment, dt float64) Point {
	if !g.Active {
		return position
	}
	dt = Clamp(dt, 0, .1)
	if dt == 0 {
		return position
	}
	g.Elapsed += dt
	if g.Elapsed >= g.Duration {
		g.Active = false
		g.Result = GameTimedOut
		return position
	}
	switch g.Mode {
	case GameCatch:
		return g.avoidance.Step(position, e, dt)
	case GameChase:
		return g.chase(position, e, dt)
	case GameHide:
		if g.flight.Active {
			return e.bound(g.flight.Step(dt))
		}
		return e.bound(g.Target)
	default:
		g.Cancel()
		return position
	}
}

func (g *Game) chase(position Point, e Environment, dt float64) Point {
	if !e.PointerValid {
		g.Velocity = Point{}
		return position
	}
	dx, dy := e.Pointer.X-position.X, e.Pointer.Y-position.Y
	distance := math.Hypot(dx, dy)
	if distance <= 48 {
		g.Active = false
		g.Result = GameFairyWon
		g.Velocity = Point{}
		return position
	}
	speed := math.Min(190, distance*3)
	desired := Point{X: dx / distance * speed, Y: dy / distance * speed}
	dvx, dvy := desired.X-g.Velocity.X, desired.Y-g.Velocity.Y
	change := math.Hypot(dvx, dvy)
	if change > 480*dt {
		scale := 480 * dt / change
		dvx *= scale
		dvy *= scale
	}
	g.Velocity.X += dvx
	g.Velocity.Y += dvy
	next := e.bound(Point{X: position.X + g.Velocity.X*dt, Y: position.Y + g.Velocity.Y*dt})
	if next.X == position.X {
		g.Velocity.X = 0
	}
	if next.Y == position.Y {
		g.Velocity.Y = 0
	}
	if math.Hypot(next.X-e.Pointer.X, next.Y-e.Pointer.Y) <= 48 {
		g.Active = false
		g.Result = GameFairyWon
		g.Velocity = Point{}
	}
	return next
}

func HideSpot(e Environment, x, y float64) Point {
	return e.bound(Point{X: e.Margin + Clamp(x, 0, 1)*(e.Width-2*e.Margin), Y: e.Margin + Clamp(y, 0, 1)*(e.Height-2*e.Margin)})
}

func HitTest(center, point Point, radius float64) bool {
	return radius > 0 && math.Hypot(center.X-point.X, center.Y-point.Y) <= radius
}
