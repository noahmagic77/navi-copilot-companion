// Package protocol accepts only small, typed local stdin messages, never prompts.
package protocol

import (
	"encoding/json"
	"errors"
	"navi/overlay/internal/motion"
	"unicode/utf8"
)

type Command struct {
	Type                 string   `json:"type"`
	Enabled              bool     `json:"enabled"`
	Focused              bool     `json:"focused"`
	Eco                  bool     `json:"eco"`
	RespectReducedMotion bool     `json:"respectReducedMotion"`
	Motion               string   `json:"motion"`
	SoundEnabled         bool     `json:"soundEnabled"`
	SoundVolume          float64  `json:"soundVolume"`
	Cue                  string   `json:"cue"`
	Preview              bool     `json:"preview"`
	BubbleEnabled        *bool    `json:"bubbleEnabled"`
	Message              string   `json:"message"`
	X                    *float64 `json:"x"`
	Y                    *float64 `json:"y"`
}

func Parse(data []byte) (Command, error) {
	var c Command
	if len(data) > 4096 {
		return c, errors.New("message too large")
	}
	if err := json.Unmarshal(data, &c); err != nil {
		return c, err
	}
	switch c.Type {
	case "speech":
		if utf8.RuneCountInString(c.Message) <= 160 {
			return c, nil
		}
	case "sound":
		switch c.Cue {
		case "greeting", "discover", "hint", "celebrate":
			return c, nil
		}
	case "configure", "focus", "stop", "cancelTarget":
		return c, nil
	case "target":
		if c.X != nil && c.Y != nil && *c.X >= 0 && *c.X <= 1 && *c.Y >= 0 && *c.Y <= 1 {
			return c, nil
		}
	case "motion":
		if motion.Valid(c.Motion) {
			return c, nil
		}
	}
	return c, errors.New("unsupported message")
}
