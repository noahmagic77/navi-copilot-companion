//go:build windows && amd64

package main

import (
	"math"
	"navi/overlay/internal/motion"
	"testing"
)

func TestEveryPreviewLoopsWithoutAnotherCommand(t *testing.T) {
	for _, definition := range motion.Definitions {
		t.Run(definition.ID, func(t *testing.T) {
			a := application{}
			if !a.selectMotion(definition.ID, true) {
				t.Fatal("Explicit selection rejected")
			}
			a.age = definition.Duration*3 + .25
			a.advanceClip()
			if a.id != definition.ID || !a.preview || math.Abs(a.age-.25) > 1e-9 {
				t.Fatal("Preview froze or changed after several cycles", a.id, a.age, a.preview)
			}
		})
	}
}

func TestPreviewGreetingsCanFollowListeningAndThinking(t *testing.T) {
	for _, previous := range []string{"listen", "think"} {
		for _, greeting := range motion.GreetingMotions {
			a := application{}
			a.selectMotion(previous, false)
			if a.selectMotion(greeting, false) || a.id != previous {
				t.Fatal("Automatic greeting interrupted listening", previous, greeting)
			}
			if !a.selectMotion(greeting, true) || a.id != greeting || !a.preview || a.context {
				t.Fatal("Explicit greeting preview was blocked", previous, greeting)
			}
			if a.selectMotion(greeting, false) || !a.preview {
				t.Fatal("Automatic greeting interrupted an explicit preview", previous, greeting)
			}
		}
	}
}

func TestEndingPreviewReleasesAutomaticScheduling(t *testing.T) {
	a := application{}
	a.selectMotion("think", true)
	a.selectMotion("hover", false)
	a.age = motion.Duration("hover")
	a.advanceClip()
	if a.preview || a.context || a.id == "think" || a.age != 0 {
		t.Fatal("Preview retained ownership", a.id, a.age)
	}
}
