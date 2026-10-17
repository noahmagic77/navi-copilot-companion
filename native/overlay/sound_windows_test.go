//go:build windows && amd64

package main

import (
	"encoding/binary"
	"testing"
	"time"
)

func TestNativeSoundOptInVolumeCooldownAndStop(t *testing.T) {
	plays, stops := 0, 0
	s := &nativeSound{previous: map[string]int{}, play: func(data []byte) bool {
		plays++
		if string(data[:4]) != "RIFF" {
			t.Fatal("not a WAV")
		}
		return true
	}, stop: func() { stops++ }}
	s.Cue("greeting", true)
	if plays != 0 {
		t.Fatal("sound enabled by default")
	}
	s.Configure(true, 30)
	s.Cue("greeting", false)
	if plays != 0 {
		t.Fatal("background sound")
	}
	s.Cue("greeting", true)
	if plays != 1 {
		t.Fatal("sound did not play")
	}
	for i := 44; i < len(s.buffer); i += 2 {
		if value := int16(binary.LittleEndian.Uint16(s.buffer[i:])); value > 7500 || value < -7500 {
			t.Fatal("volume not applied")
		}
	}
	s.Cue("hint", true)
	if plays != 1 {
		t.Fatal("cooldown ignored")
	}
	s.Configure(false, 30)
	if len(s.buffer) != 0 || stops != 1 {
		t.Fatal("mute did not stop sound")
	}
	s.Configure(true, 0)
	s.last = time.Time{}
	s.Cue("hint", true)
	if plays != 1 {
		t.Fatal("zero volume played")
	}
	s.Configure(true, 100)
	s.Cue("../bad", true)
	if plays != 1 {
		t.Fatal("invalid sound played")
	}
	s.Cue("hint", true)
	s.Stop()
	if plays != 2 || stops != 2 || s.buffer != nil {
		t.Fatal("stop did not release playback buffer")
	}
}

func TestEmbeddedSoundBank(t *testing.T) {
	files, err := soundAssets.ReadDir("assets/sounds")
	if err != nil || len(files) != 12 {
		t.Fatal("incomplete sound bank", err)
	}
	for _, file := range files {
		data, err := soundAssets.ReadFile("assets/sounds/" + file.Name())
		if err != nil || len(data) < 44 || string(data[:4]) != "RIFF" {
			t.Fatal("invalid embedded sound", file.Name())
		}
	}
}

func TestFailedNativeSoundReportsFallbackAndRemainsRateLimited(t *testing.T) {
	failures := 0
	s := &nativeSound{previous: map[string]int{}, play: func([]byte) bool { return false }, stop: func() {}, onFailure: func(cue string) {
		if cue != "hint" {
			t.Fatal("wrong cue")
		}
		failures++
	}}
	s.Configure(true, 30)
	s.Cue("hint", true)
	if failures != 1 || s.buffer != nil {
		t.Fatal("failure was silent or buffer retained")
	}
	s.Cue("hint", true)
	if failures != 1 {
		t.Fatal("failure bypassed cooldown")
	}
}
