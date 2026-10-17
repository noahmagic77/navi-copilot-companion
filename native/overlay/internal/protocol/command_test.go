package protocol

import (
	"bytes"
	"testing"
)

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
