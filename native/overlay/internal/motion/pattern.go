package motion

import "math"

// Parameterized choreographies mirror sampleMotion in media/fairy-motion.js.
type pattern struct {
	Kind                        int
	AX, AY, Cycles, Phase, Tilt float64
}

func (q pattern) apply(p *Pose, t, envelope, angle float64) {
	a := angle * q.Cycles
	wave, cross := math.Sin(a+q.Phase), math.Cos(a+q.Phase)
	breathe := (1 - math.Cos(a)) * .5
	switch q.Kind {
	case 0:
		p[X] += q.AX * wave * envelope
		p[Y] += q.AY * math.Sin(a*2) * envelope * .4
	case 1:
		p[X] += q.AX * (2*t - 1) * envelope
		p[Y] -= q.AY * envelope
	case 2:
		p[X] += q.AX * math.Sin(angle) * envelope * .5
		p[Y] -= q.AY * breathe * envelope
	case 3:
		p[X] += q.AX * cross * envelope
		p[Y] += q.AY * wave * envelope
	case 4:
		p[X] += q.AX * math.Sin(a) * envelope
		p[Y] += q.AY * math.Sin(a*2+q.Phase) * envelope
	case 5:
		p[X] += q.AX * cross * envelope * t
		p[Y] += q.AY * wave * envelope * t
	case 6:
		p[X] += q.AX * wave * envelope * .15
		p[Y] -= q.AY * breathe * envelope * .3
		p[Glow] += breathe * envelope * .4
		p[Scatter] = breathe * envelope * .65
	case 7:
		p[X] += q.AX * wave * envelope * .25
		p[Y] += q.AY * cross * envelope * .5
		p[GazeX] = wave * 2
		p[GazeY] = cross * 2
		p[WingSpread] = breathe * envelope * .5
	}
	p[Roll] += q.Tilt * wave * envelope
	p[Yaw] += q.Tilt * cross * envelope * .5
	p[Scale] += .025 * breathe * envelope
	p[WingSpeed] = 1 + .18*wave*envelope
	p[WingAmplitude] = 1 - .25*breathe*envelope
	p[OrbitSpeed] = 1 + .35*breathe*envelope
}
