// Package protocol accepts only small, typed local stdin messages, never prompts.
package protocol

import (
	"encoding/json"
	"errors"
	"navi/overlay/internal/anchor"
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
	Mode                 string   `json:"mode"`
	State                string   `json:"state"`
	Age                  float64  `json:"age"`
	Energy               *float64 `json:"energy"`
	Attention            *float64 `json:"attention"`
	Curiosity            *float64 `json:"curiosity"`
	X                    *float64 `json:"x"`
	Y                    *float64 `json:"y"`
	ID                   int      `json:"id"`
	Token                string   `json:"token"`
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
	case "editorAnchor":
		if _, ok := anchor.Colour(c.Token); ok && c.ID > 0 && c.ID <= 2147483647 {
			return c, nil
		}
	case "presence":
		if c.Energy != nil && c.Attention != nil && c.Curiosity != nil && *c.Energy >= 0 && *c.Energy <= 1 && *c.Attention >= 0 && *c.Attention <= 1 && *c.Curiosity >= 0 && *c.Curiosity <= 1 {
			return c, nil
		}
	case "expression":
		if _, ok := motion.ExpressionMotion(c.State); ok && c.Age >= 0 && c.Age <= 86400 {
			return c, nil
		}
	case "speech":
		if utf8.RuneCountInString(c.Message) <= 160 {
			return c, nil
		}
	case "sound":
		switch c.Cue {
		case "greeting", "discover", "hint", "celebrate":
			return c, nil
		}
	case "configure", "focus", "stop", "cancelTarget", "stopGame":
		return c, nil
	case "startGame":
		switch c.Mode {
		case string(motion.GameCatch), string(motion.GameChase), string(motion.GameHide):
			return c, nil
		}
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
