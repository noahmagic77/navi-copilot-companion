//go:build windows && amd64

package main

import (
	"math"
	"math/rand/v2"
	"navi/overlay/internal/motion"
)

func (a *application) selectMotion(id string, preview bool) bool {
	// Automatic greetings yield to listening; an explicit catalogue selection does not.
	if (a.context || a.preview) && !preview {
		for _, greeting := range motion.GreetingMotions {
			if id == greeting {
				return false
			}
		}
	}
	a.lastInteraction = a.elapsed
	a.expression = ""
	a.enter(id, !preview && (id == "listen" || id == "think"))
	a.preview = preview
	return true
}

func (a *application) advanceClip() {
	duration := motion.Duration(a.id)
	if a.age < duration {
		return
	}
	if a.preview {
		// Keep looping even when the Webview is throttled or no repeat packet arrives.
		a.age = math.Mod(a.age, duration)
	} else if a.context || a.id == "rest" {
		a.age = duration
	} else if a.id == "hover" {
		a.enter(motion.IdleMotions[rand.IntN(len(motion.IdleMotions))], false)
	} else {
		a.enter("hover", false)
	}
}
