//go:build windows && amd64

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"math/rand/v2"
	"navi/overlay/internal/motion"
	"navi/overlay/internal/protocol"
	"os"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

type application struct {
	transitionPending                                      bool
	hwnd, target                                           uintptr
	allowed                                                map[uint32]bool
	foregroundHook, geometryHook                           uintptr
	renderer                                               *renderer
	focused, enabled, systemMotion, eco, visible           bool
	timerFPS                                               int
	lastFrame                                              time.Time
	bounds                                                 rect
	dpi                                                    float64
	rig                                                    motion.Rig
	elapsed, age, wing, orbit, lastInteraction, nextFlight float64
	id                                                     string
	context                                                bool
	flight                                                 motion.Flight
	position                                               motion.Point
	commands                                               chan protocol.Command
	pendingGeometry                                        bool
}

var app *application
var windowCallback uintptr
var eventCallback uintptr

func emit(kind string) { fmt.Fprintf(os.Stdout, "{\"type\":%q}\n", kind) }
func windowProcedure(hwnd uintptr, msg uint32, wparam, lparam uintptr) uintptr {
	if app != nil {
		switch msg {
		case wmCommandLocal:
			for {
				select {
				case c := <-app.commands:
					app.apply(c)
				default:
					return 0
				}
			}
		case wmGeometry:
			app.pendingGeometry = false
			app.updateGeometry()
			app.refresh()
			if app.visible {
				app.paint()
			}
			return 0
		case wmTimer:
			if wparam == 1 {
				app.tick()
			}
			return 0
		case wmSettingChange:
			app.systemMotion = animationsAllowed()
			app.refresh()
			return 0
		case wmNCHitTest:
			return negative(-1)
		case wmMouseActivate:
			return 3 // MA_NOACTIVATE
		case wmClose:
			pDestroyWindow.Call(hwnd)
			return 0
		case wmDestroy:
			pPostQuit.Call(0)
			return 0
		}
	}
	result, _, _ := pDefWindowProc.Call(hwnd, uintptr(msg), wparam, lparam)
	return result
}
func windowEvent(hook uintptr, event uint32, hwnd uintptr, object, child int32, thread, timestamp uint32) uintptr {
	if app == nil {
		return 0
	}
	if event == 3 {
		app.refresh()
		return 0
	}
	if hwnd == app.target && object == 0 && !app.pendingGeometry {
		app.pendingGeometry = true
		pPostMessage.Call(app.hwnd, wmGeometry, 0, 0)
	}
	return 0
}
func createOverlayWindow() (uintptr, error) {
	if windowCallback == 0 {
		windowCallback = syscall.NewCallback(windowProcedure)
		eventCallback = syscall.NewCallback(windowEvent)
	}
	instance, _, _ := pGetModule.Call(0)
	name := utf16("NAVI.NativeOverlay.v1")
	class := windowClass{WndProc: windowCallback, Instance: instance, ClassName: name}
	class.Size = uint32Size(class)
	result, _, err := pRegisterClass.Call(uintptr(unsafe.Pointer(&class)))
	if result == 0 {
		return 0, fmt.Errorf("RegisterClassExW: %v", err)
	}
	hwnd, _, err := pCreateWindow.Call(overlayExStyle, uintptrPointer(name), uintptrPointer(utf16("NAVI Fairy")), 0x80000000, 0, 0, 192, 192, 0, 0, instance, 0)
	if hwnd == 0 {
		return 0, fmt.Errorf("CreateWindowExW: %v", err)
	}
	return hwnd, nil
}
func (a *application) bindTarget() {
	if a.target != 0 || !a.focused {
		return
	}
	hwnd, _, _ := pGetForeground.Call()
	hwnd = rootWindow(hwnd)
	var pid uint32
	pGetWindowPID.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
	if !a.allowed[pid] {
		return
	}
	a.target = hwnd
	a.geometryHook, _, _ = pSetHook.Call(0x800b, 0x800b, 0, eventCallback, uintptr(pid), 0, 2)
	a.updateGeometry()
	a.enter("greet", false)
	emit("attached")
}
func (a *application) updateGeometry() {
	if a.target == 0 {
		return
	}
	var bounds rect
	ok, _, _ := pGetClientRect.Call(a.target, uintptr(unsafe.Pointer(&bounds)))
	if ok == 0 {
		return
	}
	origin := point{}
	pClientToScreen.Call(a.target, uintptr(unsafe.Pointer(&origin)))
	bounds.Right += origin.X
	bounds.Bottom += origin.Y
	bounds.Left = origin.X
	bounds.Top = origin.Y
	dpi, _, _ := pGetDPI.Call(a.target)
	if dpi < 96 {
		dpi = 96
	}
	scale := float64(dpi) / 96
	changed := a.bounds != bounds || a.dpi != scale
	a.bounds = bounds
	if changed {
		a.dpi = scale
		pixels := int(math.Ceil(192 * scale))
		pixels = int(motion.Clamp(float64(pixels), 96, 512))
		if a.renderer == nil || a.renderer.pixels != pixels {
			r, err := newRenderer(pixels)
			if err != nil {
				fmt.Fprintln(os.Stderr, err)
				pPostMessage.Call(a.hwnd, wmClose, 0, 0)
				return
			}
			if a.renderer != nil {
				a.renderer.Close()
			}
			a.renderer = r
		}
		width, height := float64(bounds.Right-bounds.Left)/scale, float64(bounds.Bottom-bounds.Top)/scale
		margin := float64(pixels) / (2 * scale)
		if a.position.X == 0 && a.position.Y == 0 {
			a.position = motion.Point{width - margin - 12, height - margin - 12}
		}
		a.position.X = motion.Clamp(a.position.X, margin, math.Max(margin, width-margin))
		a.position.Y = motion.Clamp(a.position.Y, margin, math.Max(margin, height-margin))
		a.flight.Active = false
	}
}
func (a *application) enter(id string, context bool) {
	a.transitionPending = true
	a.id = id
	a.age = 0
	a.context = context
}
func (a *application) apply(c protocol.Command) {
	switch c.Type {
	case "stop":
		pPostMessage.Call(a.hwnd, wmClose, 0, 0)
		return
	case "configure":
		a.enabled = c.Enabled
		a.eco = c.Eco
	case "focus":
		a.focused = c.Focused
	case "motion":
		a.lastInteraction = a.elapsed
		a.enter(c.Motion, c.Motion == "listen" || c.Motion == "think")
	}
	a.refresh()
}
func (a *application) stopTimer() {
	if a.timerFPS != 0 {
		pKillTimer.Call(a.hwnd, 1)
		a.timerFPS = 0
	}
	a.lastFrame = time.Time{}
}
func (a *application) refresh() {
	a.bindTarget()
	foreground, _, _ := pGetForeground.Call()
	exists, _, _ := pIsWindow.Call(a.target)
	visible, _, _ := pIsVisible.Call(a.target)
	minimized, _, _ := pIsIconic.Call(a.target)
	show := a.focused && a.target != 0 && exists != 0 && visible != 0 && minimized == 0 && rootWindow(foreground) == a.target && a.renderer != nil
	if show && (a.bounds.Right-a.bounds.Left < int32(a.renderer.pixels) || a.bounds.Bottom-a.bounds.Top < int32(a.renderer.pixels)) {
		show = false
	}
	if !show {
		a.stopTimer()
		if a.visible {
			pShowWindow.Call(a.hwnd, 0)
			a.visible = false
		}
		return
	}
	if !a.visible {
		a.updateGeometry()
		pShowWindow.Call(a.hwnd, 4)
		pSetWindowPos.Call(a.hwnd, ^uintptr(0), 0, 0, 0, 0, 0x0001|0x0002|0x0010)
		a.visible = true
		a.lastFrame = time.Time{}
		a.paint()
	}
	if !a.enabled || !a.systemMotion {
		a.stopTimer()
		return
	}
	a.syncBudget()
}
func (a *application) syncBudget() {
	if !a.visible || !a.enabled || !a.systemMotion {
		a.stopTimer()
		return
	}
	fps := motion.FPS(a.id, a.flight.Active, a.eco)
	if a.age < .7 {
		fps = 30
		if a.eco {
			fps = 24
		}
	}
	if fps != a.timerFPS {
		pSetTimer.Call(a.hwnd, 1, uintptr(math.Ceil(1000/float64(fps))), 0)
		a.timerFPS = fps
	}
}
func (a *application) planFlight() {
	width, height := float64(a.bounds.Right-a.bounds.Left)/a.dpi, float64(a.bounds.Bottom-a.bounds.Top)/a.dpi
	margin := float64(a.renderer.pixels) / (2 * a.dpi)
	// Keep all control points within the window; favour edges to leave code readable.
	x := margin + rand.Float64()*math.Max(0, width-2*margin)
	y := margin + rand.Float64()*math.Max(0, height-2*margin)
	switch rand.IntN(4) {
	case 0:
		x = margin
	case 1:
		x = math.Max(margin, width-margin)
	case 2:
		y = margin
	case 3:
		y = math.Max(margin, height-margin)
	}
	a.flight.Plan(a.position, motion.Point{x, y}, width, height, margin)
	a.nextFlight = a.elapsed + 15 + rand.Float64()*15
}
func (a *application) tick() {
	if !a.visible || !a.enabled || !a.systemMotion {
		a.refresh()
		return
	}
	now := time.Now()
	if a.lastFrame.IsZero() {
		a.lastFrame = now
		return
	}
	dt := motion.Clamp(now.Sub(a.lastFrame).Seconds(), 0, .1)
	a.lastFrame = now
	a.elapsed += dt
	a.age += dt
	if a.elapsed-a.lastInteraction > 90 && !a.context && a.id != "rest" {
		a.enter("rest", false)
		a.flight.Active = false
	}
	if a.age >= motion.Duration(a.id) {
		if a.context || a.id == "rest" {
			a.age = motion.Duration(a.id)
		} else {
			choices := [...]string{"hover", "hover", "drift", "curious", "stretch", "figure8", "twirl"}
			if a.id == "hover" {
				a.enter(choices[rand.IntN(len(choices))], false)
			} else {
				a.enter("hover", false)
			}
		}
	}
	if a.id != "rest" && !a.context && !a.flight.Active && a.elapsed >= a.nextFlight {
		a.planFlight()
	}
	if a.flight.Active {
		a.position = a.flight.Step(dt)
	}
	targetPose := motion.Sample(a.id, a.age, a.elapsed)
	if a.id == "hover" || a.id == "listen" {
		targetPose[motion.WingSpeed] *= .65
	}
	rigDelta := dt
	if a.transitionPending {
		rigDelta = 0
		a.transitionPending = false
	}
	a.rig.Step(targetPose, rigDelta)
	p := a.rig.Value
	a.wing = math.Mod(a.wing+dt*motion.Tau*2.05*p[motion.WingSpeed], motion.Tau)
	a.orbit += dt * p[motion.OrbitSpeed]
	a.paint()
	a.syncBudget()
}
func (a *application) paint() {
	if a.renderer == nil || !a.visible {
		return
	}
	if err := a.renderer.Draw(a.rig.Value, a.wing, a.orbit, a.elapsed, a.eco); err != nil {
		fmt.Fprintln(os.Stderr, err)
		pPostMessage.Call(a.hwnd, wmClose, 0, 0)
		return
	}
	x := a.bounds.Left + int32(math.Round(a.position.X*a.dpi)) - int32(a.renderer.pixels/2)
	y := a.bounds.Top + int32(math.Round(a.position.Y*a.dpi)) - int32(a.renderer.pixels/2)
	if err := a.renderer.Present(a.hwnd, x, y); err != nil {
		fmt.Fprintln(os.Stderr, err)
		pPostMessage.Call(a.hwnd, wmClose, 0, 0)
		return
	}

}
func run(hostPID uint32) error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	pDPIAware.Call(negative(-4))
	app = &application{allowed: ancestors(hostPID), commands: make(chan protocol.Command, 16), enabled: true, systemMotion: animationsAllowed(), rig: motion.NewRig(), id: "greet", dpi: 1, nextFlight: 6}
	if len(app.allowed) == 0 {
		return fmt.Errorf("VS Code parent process is unavailable")
	}
	hwnd, err := createOverlayWindow()
	if err != nil {
		return err
	}
	app.hwnd = hwnd
	defer func() {
		app.stopTimer()
		if app.foregroundHook != 0 {
			pUnhook.Call(app.foregroundHook)
		}
		if app.geometryHook != 0 {
			pUnhook.Call(app.geometryHook)
		}
		if app.renderer != nil {
			app.renderer.Close()
		}
	}()
	app.foregroundHook, _, _ = pSetHook.Call(3, 3, 0, eventCallback, 0, 0, 2)
	if app.foregroundHook == 0 {
		return fmt.Errorf("SetWinEventHook failed")
	}
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		scanner.Buffer(make([]byte, 4096), 4096)
		for scanner.Scan() {
			command, err := protocol.Parse(scanner.Bytes())
			if err != nil {
				continue
			}
			app.commands <- command
			pPostMessage.Call(hwnd, wmCommandLocal, 0, 0)
		}
		pPostMessage.Call(hwnd, wmClose, 0, 0)
	}()
	emit("ready")
	var msg message
	for {
		result, _, err := pGetMessage.Call(uintptr(unsafe.Pointer(&msg)), 0, 0, 0)
		if int32(result) == -1 {
			return fmt.Errorf("GetMessage: %v", err)
		}
		if result == 0 {
			break
		}
		pTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		pDispatchMessage.Call(uintptr(unsafe.Pointer(&msg)))
	}
	return nil
}
func main() {
	hostPID := flag.Uint("host-pid", 0, "VS Code extension host PID")
	selfTest := flag.Bool("self-test", false, "exercise native rendering without a visible overlay")
	output := flag.String("output", "", "self-test output directory")
	flag.Parse()
	var err error
	if *selfTest {
		err = runSelfTest(*output)
	} else {
		if *hostPID == 0 {
			err = fmt.Errorf("--host-pid is required")
		} else {
			err = run(uint32(*hostPID))
		}
	}
	if err != nil {
		json.NewEncoder(os.Stderr).Encode(map[string]string{"error": err.Error()})
		os.Exit(1)
	}
}
