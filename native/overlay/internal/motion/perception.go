package motion

import "math"

// Environment uses window-local DIPs, independently of physical monitor pixels.
type Environment struct {
	Width, Height, Margin float64
	Pointer               Point
	PointerValid          bool
}

func LocalPointer(screen, origin Point, scale, width, height float64) (Point, bool) {
	if scale <= 0 {
		return Point{}, false
	}
	p := Point{(screen.X - origin.X) / scale, (screen.Y - origin.Y) / scale}
	return p, p.X >= 0 && p.Y >= 0 && p.X <= width && p.Y <= height
}

func (e Environment) bound(p Point) Point {
	return Point{Clamp(p.X, e.Margin, math.Max(e.Margin, e.Width-e.Margin)), Clamp(p.Y, e.Margin, math.Max(e.Margin, e.Height-e.Margin))}
}

// Avoidance retains a destination until arrival, avoiding frame-to-frame jitter.
// It reads no screen contents and does not retain a pointer history.
type Avoidance struct {
	Velocity, Target Point
	Active           bool
	SpeedMultiplier  float64
}

func (a *Avoidance) Step(position Point, e Environment, dt float64) Point {
	dt = Clamp(dt, 0, .1)
	if dt == 0 {
		return position
	}
	speedMultiplier := a.SpeedMultiplier
	if math.IsNaN(speedMultiplier) || math.IsInf(speedMultiplier, 0) || speedMultiplier < 1 {
		speedMultiplier = 1
	}
	speedMultiplier = math.Min(speedMultiplier, 3)
	distance := math.Hypot(position.X-e.Pointer.X, position.Y-e.Pointer.Y)
	if e.PointerValid && distance < 120 && (!a.Active || math.Hypot(a.Target.X-e.Pointer.X, a.Target.Y-e.Pointer.Y) < 145) {
		// Sample bounded escape directions. Reward clearance, then shorter travel.
		// This also escapes corners and exact pointer/position overlap.
		bestScore := math.Inf(-1)
		for i := 0; i < 16; i++ {
			angle := float64(i) * Tau / 16
			candidate := e.bound(Point{position.X + 200*math.Cos(angle), position.Y + 200*math.Sin(angle)})
			clearance := math.Hypot(candidate.X-e.Pointer.X, candidate.Y-e.Pointer.Y)
			travel := math.Hypot(candidate.X-position.X, candidate.Y-position.Y)
			score := math.Min(clearance, 190) - .15*travel
			if score > bestScore {
				bestScore = score
				a.Target = candidate
			}
		}
		a.Active = true
	}
	if !a.Active {
		return position
	}
	a.Target = e.bound(a.Target)
	dx, dy := a.Target.X-position.X, a.Target.Y-position.Y
	remaining := math.Hypot(dx, dy)
	desired := Point{}
	if remaining > .5 {
		speed := math.Min(160*speedMultiplier, remaining*3*speedMultiplier)
		desired = Point{dx / remaining * speed, dy / remaining * speed}
	}
	dvx, dvy := desired.X-a.Velocity.X, desired.Y-a.Velocity.Y
	delta := math.Hypot(dvx, dvy)
	acceleration := 480 * speedMultiplier
	if delta > acceleration*dt {
		factor := acceleration * dt / delta
		dvx *= factor
		dvy *= factor
	}
	a.Velocity.X += dvx
	a.Velocity.Y += dvy
	next := e.bound(Point{position.X + a.Velocity.X*dt, position.Y + a.Velocity.Y*dt})
	if next.X == position.X {
		a.Velocity.X = 0
	}
	if next.Y == position.Y {
		a.Velocity.Y = 0
	}
	if remaining < 1 && math.Hypot(a.Velocity.X, a.Velocity.Y) < 3 {
		a.Active = false
		a.Velocity = Point{}
	}
	return next
}
