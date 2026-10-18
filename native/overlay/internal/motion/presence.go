package motion

import "math"

type Presence struct{ Energy, Attention, Curiosity float64 }

// ApplyPresence modifies drawing only. Flight, mouse safety and hit regions stay independent.
func ApplyPresence(values Presence, age float64, pointer Point, pose *Pose) {
	bounded := func(value, low, high float64) float64 {
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return 0
		}
		return math.Max(low, math.Min(high, value))
	}
	energy, attention, curiosity := bounded(values.Energy, 0, 1), bounded(values.Attention, 0, 1), bounded(values.Curiosity, 0, 1)
	x, y := bounded(pointer.X, -1, 1), bounded(pointer.Y, -1, 1)
	if math.IsNaN(age) || math.IsInf(age, 0) || age < 0 {
		age = 0
	}
	breath := math.Sin(age*1.7) + .3*math.Sin(age*.61)
	pose[Y] += breath * (1.3 - .4*attention)
	pose[Roll] += x * (1 + attention*2)
	pose[Glow] += .025*breath + .035*attention
	pose[Scale] *= 1 + .004*breath
	pose[WingSpeed] *= .82 + energy*.3
	pose[OrbitSpeed] *= .85 + curiosity*.3
	pose[GazeX] += x * (1 + attention*2)
	pose[GazeY] += y * (.8 + attention)
}
