package motion

import "time"

type Tickle struct {
	Level float64
	Last  time.Time
}

func (t *Tickle) Click(now time.Time) {
	if !t.Last.IsZero() && now.Sub(t.Last) >= 0 && now.Sub(t.Last) <= 900*time.Millisecond {
		t.Level = Clamp(t.Level+.22, .35, 1)
	} else {
		t.Level = .35
	}
	t.Last = now
}

func (t Tickle) Strength(now time.Time) float64 {
	if t.Last.IsZero() {
		return 0
	}
	elapsed := now.Sub(t.Last).Seconds()
	if elapsed < 0 || elapsed >= 1.25 {
		return 0
	}
	return t.Level * (1 - elapsed/1.25)
}

func (t Tickle) SpeedMultiplier(now time.Time) float64 {
	return 1 + 2*t.Strength(now)
}
