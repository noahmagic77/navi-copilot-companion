// Package motion is a platform-independent, allocation-free fairy and flight rig.
package motion

import "math"

const (
	X = iota
	Y
	Roll
	Yaw
	Scale
	Glow
	WingSpeed
	WingAmplitude
	WingFold
	WingSpread
	OrbitRadius
	OrbitSpeed
	Scatter
	GazeX
	GazeY
	Channels
)
const Tau = math.Pi * 2

type Pose [Channels]float64
type Definition struct {
	ID       string
	Duration float64
}

var Definitions = [...]Definition{{"greet", 3.8}, {"hover", 10}, {"drift", 8}, {"curious", 5.4}, {"figure8", 9}, {"stretch", 5.2}, {"twirl", 5.6}, {"listen", 6}, {"think", 6}, {"hint", 4.8}, {"celebrate", 4.2}, {"rest", 9}}

func Valid(id string) bool {
	for _, d := range Definitions {
		if d.ID == id {
			return true
		}
	}
	return false
}
func Duration(id string) float64 {
	for _, d := range Definitions {
		if d.ID == id {
			return d.Duration
		}
	}
	return 10
}
func Clamp(v, low, high float64) float64 { return math.Max(low, math.Min(high, v)) }
func Sample(id string, age, elapsed float64) Pose {
	t := Clamp(age/Duration(id), 0, 1)
	envelope := math.Pow(math.Sin(math.Pi*t), 2)
	angle := t * Tau
	p := Pose{X: math.Sin(elapsed*.63) * 1.8, Y: math.Sin(elapsed*1.25) * 3, Roll: math.Sin(elapsed*.72) * 1.5, Yaw: math.Sin(elapsed*.48) * 2, Scale: 1, Glow: 1 + math.Sin(elapsed*1.4)*.06, WingSpeed: 1, WingAmplitude: 1, OrbitRadius: 1, OrbitSpeed: 1}
	switch id {
	case "greet":
		wave := math.Sin(age*5) * math.Exp(-age*.7)
		p[Y] += 13*math.Pow(1-t, 3) - wave*8
		p[Roll] += wave * 7
		p[WingSpeed] = 1.15
		p[Glow] += envelope * .16
		p[Scatter] = envelope * .25
	case "drift":
		p[X] += math.Sin(angle) * 17
		p[Y] -= envelope * 4
		p[Roll] -= math.Sin(angle) * 6
		p[Yaw] += math.Cos(angle) * envelope * 9
	case "curious":
		direction := math.Sin(angle) * 9
		p[Yaw] += direction
		p[Roll] += direction * .35
		p[X] += direction * .22
		p[GazeX] = direction * .18
		p[WingSpeed] = .88
	case "figure8":
		p[X] += math.Sin(angle) * 21
		p[Y] += math.Sin(angle*2) * 8
		p[Roll] -= math.Sin(angle*2) * 8
		p[WingSpeed] = 1.12
		p[OrbitRadius] = .88
	case "stretch":
		p[WingSpread] = envelope
		p[WingAmplitude] = 1 - envelope*.8
		p[WingSpeed] = 1 - envelope*.55
		p[Y] -= envelope * 4
		p[Glow] += envelope * .08
	case "twirl":
		p[Roll] += 360 * t * t * (3 - 2*t)
		p[Y] -= envelope * 9
		p[WingAmplitude] = .75
		p[WingSpeed] = 1.2
		p[OrbitSpeed] = 1.35
	case "listen":
		p[X] += 5
		p[Y] += 6
		p[Roll] += 7
		p[GazeY] = 3
		p[WingSpeed] = .8
		p[OrbitSpeed] = .7
		p[OrbitRadius] = .9
	case "think":
		p[Y] -= 5
		p[Roll] += math.Sin(elapsed*1.9) * 4
		p[Yaw] += math.Sin(elapsed*1.4) * 7
		p[WingSpeed] = 1.08
		p[OrbitRadius] = .72
		p[OrbitSpeed] = 1.8
		p[Glow] += math.Sin(elapsed*3.1) * .08
	case "hint":
		p[Y] -= envelope * 11
		p[Scale] += envelope * .05
		p[Glow] += envelope * .25
		p[OrbitRadius] = 1 + envelope*.15
		p[WingSpeed] = 1.12
		p[GazeY] = 2
	case "celebrate":
		p[Y] -= envelope*14 + math.Sin(angle*2)*envelope*3
		p[Roll] += math.Sin(angle) * 11
		p[WingSpeed] = 1.35
		p[Scatter] = envelope * .85
		p[Glow] += envelope * .22
	case "rest":
		p[Y] += 12
		p[Scale] = .94
		p[Glow] = .76 + math.Sin(elapsed*.8)*.05
		p[WingSpeed] = .38
		p[WingAmplitude] = .22
		p[WingFold] = .72
		p[OrbitSpeed] = .35
		p[OrbitRadius] = .82
	}
	return p
}

type Rig struct{ Value, Velocity Pose }

func NewRig() Rig { return Rig{Value: Sample("hover", 0, 0)} }
func (r *Rig) Step(target Pose, dt float64) {
	dt = Clamp(dt, 0, .1)
	// Only two exponentials per frame, shared by all fifteen channels.
	positionDecay, otherDecay := math.Exp(-11*dt), math.Exp(-13*dt)
	for i := range r.Value {
		goal := target[i]
		if i == Roll || i == Yaw {
			goal = r.Value[i] + math.Mod(math.Mod(goal-r.Value[i]+180, 360)+360, 360) - 180
		}
		omega, decay := 13.0, otherDecay
		if i == X || i == Y {
			omega, decay = 11, positionDecay
		}
		offset := r.Value[i] - goal
		temp := (r.Velocity[i] + omega*offset) * dt
		r.Value[i] = goal + (offset+temp)*decay
		r.Velocity[i] = (r.Velocity[i] - omega*temp) * decay
	}
}

type Point struct{ X, Y float64 }
type Flight struct {
	Start, C1, C2, End Point
	Age, Duration      float64
	Active             bool
}

func mix(a, b Point, t float64) Point { return Point{a.X + (b.X-a.X)*t, a.Y + (b.Y-a.Y)*t} }
func (f *Flight) at(t float64) Point {
	a, b, c := mix(f.Start, f.C1, t), mix(f.C1, f.C2, t), mix(f.C2, f.End, t)
	return mix(mix(a, b, t), mix(b, c, t), t)
}
func (f *Flight) Plan(start, end Point, width, height, margin float64) {
	bound := func(p Point) Point {
		return Point{Clamp(p.X, margin, math.Max(margin, width-margin)), Clamp(p.Y, margin, math.Max(margin, height-margin))}
	}
	f.Start, f.End = bound(start), bound(end)
	dx, dy := f.End.X-f.Start.X, f.End.Y-f.Start.Y
	length := math.Hypot(dx, dy)
	bend := math.Min(45, length*.12)
	nx, ny := 0.0, 0.0
	if length > 0 {
		nx, ny = -dy/length, dx/length
	}
	a, b := mix(f.Start, f.End, .33), mix(f.Start, f.End, .67)
	f.C1 = bound(Point{a.X + nx*bend, a.Y + ny*bend})
	f.C2 = bound(Point{b.X + nx*bend, b.Y + ny*bend})
	total := 0.0
	previous := f.Start
	for i := 1; i <= 16; i++ {
		next := f.at(float64(i) / 16)
		total += math.Hypot(next.X-previous.X, next.Y-previous.Y)
		previous = next
	}
	f.Duration = math.Max(2, total/80)
	f.Age = 0
	f.Active = length > 1
}
func (f *Flight) Step(dt float64) Point {
	f.Age += dt
	t := Clamp(f.Age/f.Duration, 0, 1)
	if t >= 1 {
		f.Active = false
	}
	u := t * t * t * (10 + t*(-15+6*t))
	return f.at(u)
}

// FPS caps are explicit and independent of monitor refresh rate.
func FPS(id string, flying, eco bool) int {
	if flying {
		if eco {
			return 24
		}
		return 30
	}
	if id == "rest" {
		return 10
	}
	if id == "hover" || id == "listen" {
		if eco {
			return 12
		}
		return 15
	}
	if eco {
		return 20
	}
	return 30
}
