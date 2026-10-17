package motion

import "math"

// Navigation keeps a window-relative target, never a screen pixel or file path.
// Pointer avoidance has priority; a blocked target waits until it is clear.
type Navigation struct {
	Target  Point
	Pending bool
	flight  Flight
}

func (n *Navigation) Request(target Point) bool {
	if math.IsNaN(target.X) || math.IsNaN(target.Y) || target.X < 0 || target.X > 1 || target.Y < 0 || target.Y > 1 {
		return false
	}
	*n = Navigation{Target: target, Pending: true}
	return true
}

func (n *Navigation) Cancel()      { *n = Navigation{} }
func (n *Navigation) Replan()      { n.flight.Active = false }
func (n *Navigation) Flying() bool { return n.Pending && n.flight.Active }

// controlled remains true for the arrival frame to prevent an idle flight
// starting immediately after the requested target is reached.
func (n *Navigation) Step(position Point, e Environment, dt float64, avoiding bool) (next Point, controlled bool) {
	if !n.Pending {
		return position, false
	}
	if avoiding {
		n.Replan()
		return position, true
	}
	dt = Clamp(dt, 0, .1)
	if dt == 0 {
		return position, true
	}
	goal := e.bound(Point{n.Target.X * e.Width, n.Target.Y * e.Height})
	if e.PointerValid && math.Hypot(goal.X-e.Pointer.X, goal.Y-e.Pointer.Y) < 145 {
		n.Replan()
		return position, true
	}
	if !n.flight.Active || n.flight.End != goal {
		n.flight.Plan(position, goal, e.Width, e.Height, e.Margin)
		if !n.flight.Active {
			n.Pending = false
			return position, true
		}
	}
	next = n.flight.Step(dt)
	if !n.flight.Active {
		n.Pending = false
	}
	return next, true
}
