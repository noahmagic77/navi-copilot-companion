package motion

import (
	"encoding/json"
	"math"
	"os"
	"testing"
)

func TestPresenceBrowserNativeParity(t *testing.T) {
	data, err := os.ReadFile("testdata/presence.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Values  Presence
		Age     float64
		Pointer Point
		Pose    Pose
	}
	if err = json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	if len(cases) != 45 {
		t.Fatal("Incomplete presence contract", len(cases))
	}
	for _, c := range cases {
		pose := Sample("hover", c.Age, c.Age)
		ApplyPresence(c.Values, c.Age, c.Pointer, &pose)
		for i, value := range pose {
			if math.IsNaN(value) || math.IsInf(value, 0) || math.Abs(value-c.Pose[i]) > 1e-9 {
				t.Fatal(c.Age, i, value, c.Pose[i])
			}
		}
	}
}
func TestPresenceDrawingHasNoFrameAllocations(t *testing.T) {
	pose := Sample("hover", 1, 1)
	if allocations := testing.AllocsPerRun(1000, func() { copy := pose; ApplyPresence(Presence{.7, .5, .4}, 1, Point{2, -2}, &copy) }); allocations != 0 {
		t.Fatal(allocations)
	}
}
