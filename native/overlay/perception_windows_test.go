//go:build windows && amd64

package main

import (
	"math"
	"navi/overlay/internal/motion"
	"navi/overlay/internal/protocol"
	"testing"
)

func TestGreetingsDoNotInterruptContext(t *testing.T) {
	for _, state := range []string{"listen", "think"} {
		for _, id := range motion.GreetingMotions {
			a := application{id: state, context: true, age: 2, elapsed: 3, lastInteraction: 1}
			a.apply(protocol.Command{Type: "motion", Motion: id})
			if a.id != state || !a.context || a.age != 2 || a.lastInteraction != 1 {
				t.Fatal("greeting interrupted context", state, id)
			}
		}
	}
}

func TestPerceptionDuringEveryAnimation(t *testing.T) {
	for _, definition := range motion.Definitions {
		t.Run(definition.ID, func(t *testing.T) {
			start := motion.Point{X: 400, Y: 300}
			a := application{position: start, id: definition.ID, context: definition.ID == "listen" || definition.ID == "think", age: 1, elapsed: 10, rig: motion.NewRig()}
			a.flight.Plan(start, motion.Point{X: 600, Y: 400}, 800, 600, 96)
			env := motion.Environment{Width: 800, Height: 600, Margin: 96, Pointer: start, PointerValid: true}
			originalContext := a.context
			a.advancePerception(env, 1.0/30)
			if !a.avoidance.Active || a.flight.Active || a.nextFlight != 25 {
				t.Fatal("avoidance must interrupt autonomous flight and delay its restart")
			}
			for i := 0; i < 240; i++ {
				a.advancePerception(env, 1.0/30)
				pose := motion.Sample(a.id, a.age+float64(i)/30, a.elapsed+float64(i)/30)
				a.rig.Step(pose, 1.0/30)
				for _, v := range a.rig.Value {
					if math.IsNaN(v) || math.IsInf(v, 0) {
						t.Fatal("invalid animated pose")
					}
				}
			}
			if a.id != definition.ID || a.context != originalContext || a.age != 1 || a.elapsed != 10 {
				t.Fatal("perception changed interaction state")
			}
			if a.avoidance.Active || math.Hypot(a.position.X-start.X, a.position.Y-start.Y) < 145 {
				t.Fatal("did not settle at safe distance")
			}
		})
	}
}

func TestPerceptionStopsWhenHiddenOrPaused(t *testing.T) {
	for _, state := range []struct {
		name                           string
		visible, enabled, systemMotion bool
	}{
		{"hidden", false, true, true}, {"animation-disabled", true, false, true}, {"reduced-motion", true, true, false},
	} {
		t.Run(state.name, func(t *testing.T) {
			a := application{visible: state.visible, enabled: state.enabled, systemMotion: state.systemMotion, position: motion.Point{X: 400, Y: 300}, id: "listen", age: 2, elapsed: 3, rig: motion.NewRig()}
			a.avoidance = motion.Avoidance{Active: true, Velocity: motion.Point{X: 80}, Target: motion.Point{X: 600, Y: 300}}
			a.navigation.Request(motion.Point{X: 1, Y: 1})
			before, rig := a.position, a.rig
			// No target window: refresh remains hidden and creates no window/timer.
			a.tick()
			if a.position != before || a.rig != rig || a.age != 2 || a.elapsed != 3 || a.frameCount != 0 {
				t.Fatal("paused frame advanced")
			}
			if a.avoidance != (motion.Avoidance{}) || a.timerFPS != 0 {
				t.Fatal("paused avoidance not reset")
			}
			if a.navigation.Pending {
				t.Fatal("paused target was not cancelled")
			}
		})
	}
}

func TestTargetFlightYieldsAndResumesForEveryAnimation(t *testing.T) {
	for _, definition := range motion.Definitions {
		t.Run(definition.ID, func(t *testing.T) {
			start := motion.Point{X: 400, Y: 300}
			a := application{position: start, id: definition.ID, elapsed: 10}
			a.navigation.Request(motion.Point{X: 1, Y: 1})
			e := motion.Environment{Width: 800, Height: 600, Margin: 96, Pointer: start, PointerValid: true}
			a.advancePerception(e, .1)
			if !a.avoidance.Active || a.navigation.Flying() || !a.navigation.Pending {
				t.Fatal("target overrode avoidance")
			}
			e.PointerValid = false
			for i := 0; i < 600 && (a.navigation.Pending || a.avoidance.Active); i++ {
				a.advancePerception(e, 1.0/30)
			}
			if a.navigation.Pending || a.flight.Active || math.Hypot(a.position.X-704, a.position.Y-504) > 1 || a.id != definition.ID {
				t.Fatal("target did not resume or changed expression", a.position)
			}
		})
	}
}

func TestAnimationChangesPreserveEscapeMomentum(t *testing.T) {
	a := application{position: motion.Point{X: 400, Y: 300}, id: "hover", rig: motion.NewRig()}
	env := motion.Environment{Width: 800, Height: 600, Margin: 96, Pointer: a.position, PointerValid: true}
	a.advancePerception(env, .1)
	for _, definition := range motion.Definitions {
		before, avoidance, rig := a.position, a.avoidance, a.rig
		a.enter(definition.ID, definition.ID == "listen" || definition.ID == "think")
		if a.position != before || a.avoidance != avoidance || a.rig != rig {
			t.Fatal("animation change reset movement", definition.ID)
		}
		a.advancePerception(env, 1.0/30)
		if math.Hypot(a.position.X-before.X, a.position.Y-before.Y) > 160.0/30+1e-6 {
			t.Fatal("animation change caused jump")
		}
	}
}

func TestDistantPointerDoesNotInterruptFlight(t *testing.T) {
	start := motion.Point{X: 400, Y: 300}
	a := application{position: start, nextFlight: 20}
	a.flight.Plan(start, motion.Point{X: 600, Y: 400}, 800, 600, 96)
	before := a.flight
	a.advancePerception(motion.Environment{Width: 800, Height: 600, Margin: 96, Pointer: motion.Point{X: 100, Y: 100}, PointerValid: true}, .1)
	if a.position != start || a.flight != before || a.nextFlight != 20 || a.avoidance.Active {
		t.Fatal("distant pointer interrupted normal flight")
	}
}
