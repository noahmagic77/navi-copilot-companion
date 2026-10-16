package protocol

import (
	"bytes"
	"testing"
)

func TestProtocol(t *testing.T) {
	for _, s := range []string{`{"type":"configure","enabled":true,"eco":true}`, `{"type":"focus","focused":true}`, `{"type":"motion","motion":"greet"}`, `{"type":"stop"}`} {
		if _, err := Parse([]byte(s)); err != nil {
			t.Fatal(err)
		}
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
