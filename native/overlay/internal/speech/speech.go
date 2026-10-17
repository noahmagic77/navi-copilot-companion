// Package speech models bounded transient messages and window-local placement.
package speech

import (
	"math"
	"strings"
	"unicode"
	"unicode/utf8"
)

func Text(value string) string {
	value = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return ' '
		}
		return r
	}, value)
	value = strings.Join(strings.Fields(value), " ")
	runes := []rune(value)
	if len(runes) > 160 {
		return string(runes[:159]) + "…"
	}
	return value
}

type State struct {
	Message  string
	Priority int
	Until    float64
}

func (s *State) Show(text string, priority int, now float64) bool {
	text = Text(text)
	if text == "" {
		s.Clear()
		return true
	}
	if now < s.Until && (s.Priority > priority || s.Message == text) {
		return false
	}
	s.Message = text
	s.Priority = priority
	s.Until = now + math.Min(10, 4+float64(utf8.RuneCountInString(text))/30)
	return true
}
func (s *State) Clear()                 { *s = State{} }
func (s State) Active(now float64) bool { return s.Message != "" && now < s.Until }

type Placement struct{ X, Y, Width, Height float64 }

func Place(x, y, windowWidth, windowHeight, width, height, scale float64) Placement {
	width = math.Min(width, windowWidth)
	height = math.Min(height, windowHeight)
	gap := 52 * scale
	px, py := x+gap, y-height*.5
	if px+width > windowWidth {
		px = x - gap - width
	}
	if px < 0 {
		px = x - width*.5
		py = y - gap - height
		if py < 0 {
			py = y + gap
		}
	}
	return Placement{math.Max(0, math.Min(px, windowWidth-width)), math.Max(0, math.Min(py, windowHeight-height)), width, height}
}
