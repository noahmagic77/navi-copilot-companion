//go:build windows && amd64

package main

import (
	"embed"
	"encoding/binary"
	"fmt"
	"math/rand/v2"
	"navi/overlay/internal/motion"
	"os"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

//go:embed assets/sounds/*.wav
var soundAssets embed.FS
var pPlaySound = syscall.NewLazyDLL("winmm.dll").NewProc("PlaySoundW")

type nativeSound struct {
	enabled   bool
	volume    float64
	buffer    []byte // Windows retains this buffer until Stop or the next playback.
	last      time.Time
	previous  map[string]int
	play      func([]byte) bool
	stop      func()
	onFailure func(string)
}

func newNativeSound() *nativeSound {
	return &nativeSound{previous: map[string]int{}, play: func(data []byte) bool {
		ok, _, _ := pPlaySound.Call(uintptr(unsafe.Pointer(&data[0])), 0, 0x1|0x2|0x4)
		return ok != 0
	}, stop: func() { pPlaySound.Call(0, 0, 0) }, onFailure: func(cue string) { fmt.Fprintf(os.Stdout, "{\"type\":\"soundFailed\",\"cue\":%q}\n", cue) }}
}
func (s *nativeSound) Stop() {
	if s == nil {
		return
	}
	if len(s.buffer) > 0 {
		s.stop()
		s.buffer = nil
	}
}
func (s *nativeSound) Configure(enabled bool, volume float64) {
	if s == nil {
		return
	}
	s.Stop()
	s.enabled = enabled
	s.volume = motion.Clamp(volume, 0, 100) / 100
}
func soundForMotion(id string) string {
	if id == "greet" || strings.HasPrefix(id, "greet-") {
		return "greeting"
	}
	switch id {
	case "curious":
		return "discover"
	case "hint", "celebrate":
		return id
	}
	return ""
}
func (s *nativeSound) Cue(cue string, allowed bool) {
	if s == nil || !s.enabled || s.volume <= 0 || !allowed || time.Since(s.last) < 1500*time.Millisecond {
		return
	}
	switch cue {
	case "greeting", "discover", "hint", "celebrate":
	default:
		return
	}
	index := rand.IntN(3)
	if previous, ok := s.previous[cue]; ok && index == previous {
		index = (index + 1 + rand.IntN(2)) % 3
	}
	data, err := soundAssets.ReadFile(fmt.Sprintf("assets/sounds/%s-%d.wav", cue, index))
	if err != nil {
		return
	}
	s.Stop()
	s.buffer = append([]byte(nil), data...)
	for i := 44; i+1 < len(s.buffer); i += 2 {
		sample := int16(binary.LittleEndian.Uint16(s.buffer[i:]))
		binary.LittleEndian.PutUint16(s.buffer[i:], uint16(int16(float64(sample)*s.volume)))
	}
	s.last = time.Now()
	if s.play(s.buffer) {
		s.previous[cue] = index
	} else {
		s.buffer = nil
		if s.onFailure != nil {
			s.onFailure(cue)
		}
	}
}
