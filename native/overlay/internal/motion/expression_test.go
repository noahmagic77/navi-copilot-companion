package motion

import (
	"encoding/json"
	"math"
	"os"
	"testing"
)

func TestExpressionBrowserNativeParity(t *testing.T) {
	data, err := os.ReadFile("testdata/expressions.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		State string
		Age   float64
		Pose  Pose
	}
	if err := json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	for _, c := range cases {
		id, ok := ExpressionMotion(c.State)
		if !ok {
			t.Fatal(c.State)
		}
		p := Sample(id, c.Age, c.Age)
		ApplyExpression(c.State, c.Age, &p)
		for i, value := range p {
			if math.IsNaN(value) || math.IsInf(value, 0) || math.Abs(value-c.Pose[i]) > 1e-9 {
				t.Fatal(c.State, c.Age, i, value, c.Pose[i])
			}
		}
	}
	if len(cases) != len(expressionProfiles)*8 {
		t.Fatal("incomplete expression parity", len(cases))
	}
}

func TestExpressionDoesNotAllocateAndKeepsBodyBounded(t *testing.T) {
	p := Sample("think", 1, 1)
	if allocations := testing.AllocsPerRun(1000, func() { copy := p; ApplyExpression("working", 1, &copy) }); allocations != 0 {
		t.Fatal(allocations)
	}
	ApplyExpression("working", 1, &p)
	if math.Abs(p[X]) > 75 || math.Abs(p[Y]) > 75 {
		t.Fatal("expression outside body budget")
	}
}

func TestExpressionsComposeWithPointerAvoidance(t *testing.T) {
	for state := range expressionProfiles {
		id, _ := ExpressionMotion(state)
		start := Point{400, 300}
		position := start
		environment := Environment{Width: 800, Height: 600, Margin: 96, Pointer: start, PointerValid: true}
		avoidance := Avoidance{}
		for frame := 0; frame < 240; frame++ {
			position = avoidance.Step(position, environment, 1.0/30)
			pose := Sample(id, float64(frame)/30, float64(frame)/30)
			ApplyExpression(state, float64(frame)/30, &pose)
			// Body offsets are rendered at 80/220 scale; the 96-DIP safety margin contains them.
			visual := Point{position.X + pose[X]*80/220, position.Y + pose[Y]*80/220}
			if visual.X < 0 || visual.X > environment.Width || visual.Y < 0 || visual.Y > environment.Height {
				t.Fatal("expressive body left window during avoidance", state, visual)
			}
		}
		if math.Hypot(position.X-start.X, position.Y-start.Y) < 145 || avoidance.Active {
			t.Fatal("did not avoid and settle during expression", state)
		}
	}
}
