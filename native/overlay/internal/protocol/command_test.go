package protocol

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestSpeechProtocol(t *testing.T) {
	for _, message := range []string{"", "Hallo", strings.Repeat("🧚", 160)} {
		data, _ := json.Marshal(Command{Type: "speech", Message: message})
		if _, err := Parse(data); err != nil {
			t.Fatal(err)
		}
	}
	data, _ := json.Marshal(Command{Type: "speech", Message: strings.Repeat("x", 161)})
	if _, err := Parse(data); err == nil {
		t.Fatal("overlong bubble accepted")
	}
	if _, err := Parse([]byte(`{"type":"speech","message":123}`)); err == nil {
		t.Fatal("non-text bubble accepted")
	}
}

func TestProtocol(t *testing.T) {
	for _, s := range []string{`{"type":"configure","enabled":true,"eco":true,"respectReducedMotion":true}`, `{"type":"focus","focused":true}`, `{"type":"motion","motion":"greet"}`, `{"type":"stop"}`} {
		if _, err := Parse([]byte(s)); err != nil {
			t.Fatal(err)
		}
	}
	configured, err := Parse([]byte(`{"type":"configure","enabled":true,"respectReducedMotion":true}`))
	if err != nil || !configured.RespectReducedMotion {
		t.Fatal("reduced-motion preference was not preserved", err)
	}
	for _, s := range []string{`{"type":"exec","command":"anything"}`, `{"type":"motion","motion":"unknown"}`, `broken`} {
		if _, err := Parse([]byte(s)); err == nil {
			t.Fatal("accepted", s)
		}
	}
	if _, err := Parse(bytes.Repeat([]byte("x"), 5000)); err == nil {
		t.Fatal("oversized accepted")
	}
}

func TestTargetProtocol(t *testing.T) {
	for _, s := range []string{`{"type":"target","x":0,"y":1}`, `{"type":"target","x":0.5,"y":0.5}`, `{"type":"cancelTarget"}`} {
		if _, err := Parse([]byte(s)); err != nil {
			t.Fatal("valid target rejected", s, err)
		}
	}
	for _, s := range []string{`{"type":"target"}`, `{"type":"target","x":0}`, `{"type":"target","x":null,"y":1}`, `{"type":"target","x":-0.1,"y":0}`, `{"type":"target","x":0,"y":1.1}`, `{"type":"target","x":"0","y":0}`, `{"type":"target","x":1e999,"y":0}`} {
		if _, err := Parse([]byte(s)); err == nil {
			t.Fatal("invalid target accepted", s)
		}
	}
}

func TestSoundProtocol(t *testing.T) {
	for _, cue := range []string{"greeting", "discover", "hint", "celebrate"} {
		if _, err := Parse([]byte(`{"type":"sound","cue":"` + cue + `"}`)); err != nil {
			t.Fatal(err)
		}
	}
	for _, s := range []string{`{"type":"sound"}`, `{"type":"sound","cue":"../file.wav"}`, `{"type":"sound","cue":15}`} {
		if _, err := Parse([]byte(s)); err == nil {
			t.Fatal("invalid sound accepted", s)
		}
	}
	c, err := Parse([]byte(`{"type":"configure","soundEnabled":true,"soundVolume":30}`))
	if err != nil || !c.SoundEnabled || c.SoundVolume != 30 {
		t.Fatal("audio settings lost", err)
	}
}

func TestPreviewProtocol(t *testing.T) {
	c, err := Parse([]byte(`{"type":"motion","motion":"orbit-clock","preview":true}`))
	if err != nil || !c.Preview {
		t.Fatal("preview flag lost", err)
	}
	if _, err := Parse([]byte(`{"type":"motion","motion":"orbit-clock","preview":"true"}`)); err == nil {
		t.Fatal("invalid preview flag accepted")
	}
}
