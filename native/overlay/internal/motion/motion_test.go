package motion

import (
	"encoding/json"
	"math"
	"os"
	"testing"
)

func TestAllMotionsFinite(t *testing.T) {
	for _, d := range Definitions {
		for i := 0; i <= 100; i++ {
			p := Sample(d.ID, float64(i)*d.Duration/100, float64(i)/10)
			for _, v := range p {
				if math.IsNaN(v) || math.IsInf(v, 0) {
					t.Fatal(d.ID)
				}
			}
			if math.Abs(p[X]) > 30 || math.Abs(p[Y]) > 35 {
				t.Fatal("unbounded", d.ID)
			}
		}
	}
}

func TestFullMotionCatalogue(t *testing.T) {
	if len(Definitions) != 110 {
		t.Fatal("expected 110 motions", len(Definitions))
	}
	seen := map[string]bool{}
	poses := map[Pose]bool{}
	for _, d := range Definitions {
		if seen[d.ID] || d.Duration <= 0 || !Valid(d.ID) {
			t.Fatal("invalid catalogue", d)
		}
		seen[d.ID] = true
		p := Sample(d.ID, d.Duration*.37, 2)
		if poses[p] {
			t.Fatal("duplicate pose", d.ID)
		}
		poses[p] = true
		if allocations := testing.AllocsPerRun(100, func() { Sample(d.ID, d.Duration*.37, 2) }); allocations != 0 {
			t.Fatal("motion allocates", d.ID, allocations)
		}
	}
	for _, id := range IdleMotions {
		if !seen[id] {
			t.Fatal("unknown idle motion", id)
		}
	}
}
func TestSpringRefreshRate(t *testing.T) {
	target := Sample("listen", 1, 1)
	var poses []Pose
	for _, hz := range []int{30, 60, 120} {
		r := NewRig()
		for i := 0; i < hz; i++ {
			r.Step(target, 1/float64(hz))
		}
		poses = append(poses, r.Value)
	}
	for i := range poses[0] {
		if math.Abs(poses[0][i]-poses[2][i]) > 1e-9 {
			t.Fatal("frame dependent", i)
		}
	}
}
func TestFlightBoundsAndCompletion(t *testing.T) {
	var f Flight
	f.Plan(Point{-100, 1000}, Point{2000, -50}, 1000, 700, 100)
	for i := 0; i < 10000 && f.Active; i++ {
		p := f.Step(1.0 / 30)
		if p.X < 100 || p.X > 900 || p.Y < 100 || p.Y > 600 {
			t.Fatal(p)
		}
	}
	if f.Active || f.at(1) != f.End {
		t.Fatal("flight does not finish")
	}
}
func TestFullTurn(t *testing.T) {
	r := NewRig()
	r.Value[Roll] = 359
	target := r.Value
	target[Roll] = 1
	r.Step(target, 1.0/60)
	if r.Value[Roll] <= 359 || r.Value[Roll] > 361 {
		t.Fatal(r.Value[Roll])
	}
}
func TestNoFrameAllocations(t *testing.T) {
	r := NewRig()
	var f Flight
	f.Plan(Point{100, 100}, Point{400, 300}, 900, 700, 100)
	n := testing.AllocsPerRun(1000, func() { r.Step(Sample("hover", 1, 1), 1.0/30); f.Step(1.0 / 30) })
	if n != 0 {
		t.Fatal("allocations per frame", n)
	}
}
func TestFrameBudgets(t *testing.T) {
	if FPS("hover", false, false) != 15 || FPS("rest", false, false) != 10 || FPS("hover", true, false) != 30 || FPS("hover", true, true) != 24 {
		t.Fatal("frame policy")
	}
}

func TestWebviewParity(t *testing.T) {
	data, err := os.ReadFile("testdata/poses.json")
	if err != nil {
		t.Fatal(err)
	}
	var samples []struct {
		ID           string `json:"id"`
		Age, Elapsed float64
		Preview      bool
		Pose         Pose
	}
	if err = json.Unmarshal(data, &samples); err != nil {
		t.Fatal(err)
	}
	for _, sample := range samples {
		got := Sample(sample.ID, sample.Age, sample.Elapsed)
		if sample.Preview {
			got = SamplePreview(sample.ID, sample.Age, sample.Elapsed)
		}
		for i := range got {
			if math.Abs(got[i]-sample.Pose[i]) > 1e-9 {
				t.Fatalf("%s channel %d: %.12f != %.12f", sample.ID, i, got[i], sample.Pose[i])
			}
		}
	}
}
