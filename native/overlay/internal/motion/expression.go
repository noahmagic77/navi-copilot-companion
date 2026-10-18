package motion

import "math"

type expressionProfile struct {
	Motion                                                     string
	Duration, X, Y, Roll, Shake, Bob, Glow, Pulse, Wing, Orbit float64
}

func ExpressionMotion(state string) (string, bool) {
	p, ok := expressionProfiles[state]
	return p.Motion, ok
}

// ApplyExpression overlays expression on the body pose, never on flight safety geometry.
func ApplyExpression(state string, age float64, pose *Pose) {
	p, ok := expressionProfiles[state]
	if !ok {
		return
	}
	if math.IsNaN(age) || math.IsInf(age, 0) || age < 0 {
		age = 0
	}
	envelope := 1 - math.Exp(-age*8)
	if p.Duration > 0 {
		envelope = math.Pow(math.Sin(math.Pi*math.Min(1, age/p.Duration)), 2)
	}
	pose[X] += p.X * envelope
	pose[Y] += (p.Y + p.Bob*math.Sin(age*2)) * envelope
	pose[Roll] += (p.Roll + p.Shake*math.Sin(age*10)) * envelope
	pose[Glow] += (p.Glow + p.Pulse*math.Sin(age*3)) * envelope
	pose[WingSpeed] *= 1 + (p.Wing-1)*envelope
	pose[OrbitSpeed] *= 1 + (p.Orbit-1)*envelope
}
