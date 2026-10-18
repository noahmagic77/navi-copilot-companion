//go:build windows && amd64

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"math/rand/v2"
	"navi/overlay/internal/anchor"
	"navi/overlay/internal/motion"
	"navi/overlay/internal/protocol"
	"navi/overlay/internal/speech"
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
	focused, enabled, eco, visible                         bool
	respectReducedMotion, systemMotion                     bool
	diagnostics, timerFailureReported                      bool
	timerFPS                                               int
	timerRetry                                             *time.Timer
	lastFrame                                              time.Time
	bounds                                                 rect
	dpi                                                    float64
	rig                                                    motion.Rig
	elapsed, age, wing, orbit, lastInteraction, nextFlight float64
	id                                                     string
	preview                                                bool
	context                                                bool
	expression                                             string
	expressionAge                                          float64
	presenceEnabled                                        bool
	presence                                               motion.Presence
	flight                                                 motion.Flight
	avoidance                                              motion.Avoidance
	navigation                                             motion.Navigation
	sound                                                  *nativeSound
	bubble                                                 *speechBubble
	speech                                                 speech.State
	bubbleEnabled                                          bool
	position                                               motion.Point
	game                                                   motion.Game
	inputEnabled                                           bool
	tickle                                                 motion.Tickle
	nextGameInvite                                         float64
	lastPointerReport                                      float64
	pointerKnown                                           bool
	frameCount                                             uint64
	commands                                               chan protocol.Command
	pendingGeometry                                        bool
	anchor                                                 editorAnchor
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
			if wparam == 2 {
				app.hideSpeech()
				return 0
			}
			if wparam == 1 {
				app.tick()
			}
			return 0
		case wmSettingChange:
			app.systemMotion = !app.respectReducedMotion || animationsAllowed()
			app.refresh()
			return 0
		case wmRetryBudget:
			app.timerRetry = nil
			app.refresh()
			return 0
		case wmNCHitTest:
			if app.inputEnabled && app.hitTest(lparam) {
				return 1
			}
			return negative(-1)
		case wmLButtonDown:
			if app.game.Active {
				if app.game.Click() {
					app.finishGame()
					app.refresh()
				}
			} else {
				app.tickleClick()
			}
			return 0
		case wmMouseActivate:
			return 3 // MA_NOACTIVATE
		case wmRButtonDown:
			if app.inputEnabled && app.focused && app.visible {
				emit("actions")
			}
			return 0
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
	a.enter(motion.GreetingMotions[rand.IntN(len(motion.GreetingMotions))], false)
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
		a.avoidance = motion.Avoidance{}
		a.navigation.Replan()
	}
}
func (a *application) enter(id string, context bool) {
	a.preview = false
	a.transitionPending = true
	a.id = id
	a.age = 0
	a.context = context
}
func (a *application) apply(c protocol.Command) {
	switch c.Type {
	case "editorAnchor":
		a.refresh()
		a.hideSpeech() // The old bubble must not obscure the beacon during capture.
		a.cancelAnchor()
		a.navigation.Cancel()
		a.flight.Active = false
		a.cancelGame()
		colour, _ := anchor.Colour(c.Token)
		a.anchor = editorAnchor{id: c.ID, colour: colour, until: time.Now().Add(20 * time.Second)}
		if !a.enabled || !a.systemMotion || !a.focused || !a.visible {
			a.cancelAnchor(fmt.Sprintf("request unavailable: enabled=%t motion=%t focused=%t visible=%t owner=%t", a.enabled, a.systemMotion, a.focused, a.visible, a.target != 0))
			return
		}
		a.lastInteraction = a.elapsed
		a.nextFlight = a.elapsed + 25
		a.anchorStatus("searching")
	case "presence":
		a.presenceEnabled = c.Enabled
		if c.Energy != nil && c.Attention != nil && c.Curiosity != nil {
			a.presence = motion.Presence{Energy: *c.Energy, Attention: *c.Attention, Curiosity: *c.Curiosity}
		}
	case "stop":
		pPostMessage.Call(a.hwnd, wmClose, 0, 0)
		return
	case "configure":
		if c.BubbleEnabled != nil {
			a.bubbleEnabled = *c.BubbleEnabled
			if !a.bubbleEnabled {
				a.hideSpeech()
			}
		}
		a.sound.Configure(c.SoundEnabled, c.SoundVolume)
		a.enabled = c.Enabled
		a.eco = c.Eco
		a.respectReducedMotion = c.RespectReducedMotion
		a.systemMotion = !a.respectReducedMotion || animationsAllowed()
	case "startGame":
		a.cancelAnchor()
		if !a.enabled || !a.systemMotion || !a.focused || !a.visible || a.renderer == nil || a.game.Active {
			return
		}
		e := a.environment()
		target := motion.Point{}
		if c.Mode == string(motion.GameHide) {
			bestDistance := -1.0
			for i := 0; i < 8; i++ {
				candidate := motion.HideSpot(e, rand.Float64(), rand.Float64())
				distance := math.Hypot(candidate.X-a.position.X, candidate.Y-a.position.Y)
				if distance > bestDistance {
					target, bestDistance = candidate, distance
				}
				if distance >= 220 {
					break
				}
			}
		}
		if a.game.Start(motion.GameMode(c.Mode), a.position, target, e, 45) {
			emit("gameStarted")
			a.flight.Active = false
			a.avoidance = motion.Avoidance{}
			a.navigation.Cancel()
			a.lastInteraction = a.elapsed
			a.nextFlight = a.elapsed + 15
			a.enter("curious", true)
			a.syncGameInput()
		}
	case "stopGame":
		a.cancelGame()
	case "focus":
		a.focused = c.Focused
		if !c.Focused {
			a.navigation.Cancel()
			a.cancelGame()
		}
	case "target":
		a.cancelAnchor()
		if c.X != nil && c.Y != nil && a.enabled && a.systemMotion && a.focused {
			if a.navigation.Request(motion.Point{X: *c.X, Y: *c.Y}) {
				a.flight.Active = false
				a.lastInteraction = a.elapsed
				if a.id == "rest" {
					a.enter("hover", false)
				}
			}
		}
	case "cancelTarget":
		a.cancelAnchor("target cancelled")
		a.navigation.Cancel()
		a.flight.Active = false
		a.nextFlight = a.elapsed + 15
	case "speech":
		a.refresh()
		if c.Message == "" {
			a.hideSpeech()
		} else {
			a.say(c.Message, 2)
		}
	case "expression":
		if id, ok := motion.ExpressionMotion(c.State); ok {
			if c.State == "acknowledge" {
				a.cancelAnchor("chat request")
				a.cancelGame()
			}
			a.expression = c.State
			a.expressionAge = c.Age
			a.lastInteraction = a.elapsed
			a.enter(id, c.State != "idle")
			a.preview = false
		}
	case "motion":
		// A welcome must not replace an explicit listening/thinking interaction.
		if a.context {
			for _, id := range motion.GreetingMotions {
				if c.Motion == id {
					return
				}
			}
		}
		a.lastInteraction = a.elapsed
		a.expression = ""
		a.enter(c.Motion, c.Motion == "listen" || c.Motion == "think")
		a.preview = c.Preview
		if a.preview {
			a.cancelAnchor("preview")
			a.flight.Active = false
			a.navigation.Cancel()
		}
	}
	a.refresh()
	if c.Type == "motion" && !c.Preview {
		if text := speechForMotion(c.Motion); text != "" {
			a.say(text, 1)
		}
	}
	if c.Type == "motion" {
		a.sound.Cue(soundForMotion(c.Motion), a.visible && a.focused)
	}
	if c.Type == "sound" {
		a.sound.Cue(c.Cue, a.visible && a.focused)
	}
}
func (a *application) stopTimer() {
	if a.timerFPS != 0 {
		pKillTimer.Call(a.hwnd, 1)
		a.timerFPS = 0
	}
	if a.timerRetry != nil {
		a.timerRetry.Stop()
		a.timerRetry = nil
	}
	a.lastFrame = time.Time{}
}
func (a *application) refresh() {
	a.bindTarget()
	a.syncGameInput()
	foreground, _, _ := pGetForeground.Call()
	exists, _, _ := pIsWindow.Call(a.target)
	visible, _, _ := pIsVisible.Call(a.target)
	minimized, _, _ := pIsIconic.Call(a.target)
	show := a.focused && a.target != 0 && exists != 0 && visible != 0 && minimized == 0 && rootWindow(foreground) == a.target && a.renderer != nil
	if show && (a.bounds.Right-a.bounds.Left < int32(a.renderer.pixels) || a.bounds.Bottom-a.bounds.Top < int32(a.renderer.pixels)) {
		show = false
	}
	if !show {
		a.cancelGame()
		if a.pointerKnown {
			emit("pointerLost")
			a.pointerKnown = false
		}
		a.hideSpeech()
		a.sound.Stop()
		a.avoidance = motion.Avoidance{}
		a.navigation.Cancel()
		a.stopTimer()
		a.cancelAnchor("owner hidden or unfocused")
		if a.visible {
			pShowWindow.Call(a.hwnd, 0)
			a.visible = false
			a.syncGameInput()
		}
		return
	}
	if !a.visible {
		a.updateGeometry()
		pShowWindow.Call(a.hwnd, 4)
		pSetWindowPos.Call(a.hwnd, ^uintptr(0), 0, 0, 0, 0, 0x0001|0x0002|0x0010)
		a.visible = true
		a.syncGameInput()
		a.lastFrame = time.Time{}
		a.paint()
	}
	if !a.enabled || !a.systemMotion {
		a.cancelGame()
		if a.pointerKnown {
			emit("pointerLost")
			a.pointerKnown = false
		}
		a.avoidance = motion.Avoidance{}
		a.navigation.Cancel()
		a.stopTimer()
		a.cancelAnchor("animation paused")
		return
	}
	a.syncBudget()
}
func (a *application) syncBudget() {
	if !a.visible || !a.enabled || !a.systemMotion {
		a.stopTimer()
		return
	}
	fps := motion.FPS(a.id, a.flight.Active || a.avoidance.Active || a.navigation.Flying() || a.anchor.flight.Active, a.eco)
	if a.age < .7 {
		fps = 30
		if a.eco {
			fps = 24
		}
	}
	if fps != a.timerFPS {
		result, _, callErr := pSetTimer.Call(a.hwnd, 1, uintptr(math.Ceil(1000/float64(fps))), 0)
		if result == 0 {
			pKillTimer.Call(a.hwnd, 1)
			a.timerFPS = 0
			if !a.timerFailureReported {
				fmt.Fprintf(os.Stderr, "SetTimer failed; retrying: %v\n", callErr)
				a.timerFailureReported = true
			}
			if a.timerRetry == nil {
				hwnd := a.hwnd
				a.timerRetry = time.AfterFunc(time.Second, func() {
					pPostMessage.Call(hwnd, wmRetryBudget, 0, 0)
				})
			}
			return
		}
		a.timerFPS = fps
		a.timerFailureReported = false
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

func (a *application) environment() motion.Environment {
	width := float64(a.bounds.Right-a.bounds.Left) / a.dpi
	height := float64(a.bounds.Bottom-a.bounds.Top) / a.dpi
	margin := float64(a.renderer.pixels) / (2 * a.dpi)
	return motion.Environment{Width: width, Height: height, Margin: margin}
}

func (a *application) hitTest(lparam uintptr) bool {
	point := motion.Point{X: float64(int16(uint16(lparam))), Y: float64(int16(uint16(lparam >> 16)))}
	center := motion.Point{X: float64(a.bounds.Left) + a.position.X*a.dpi, Y: float64(a.bounds.Top) + a.position.Y*a.dpi}
	return motion.HitTest(center, point, 72*a.dpi)
}

func (a *application) syncGameInput() {
	inputEnabled := a.visible && a.enabled && a.systemMotion
	if a.hwnd == 0 || a.inputEnabled == inputEnabled {
		return
	}
	style, _, _ := pGetWindowLong.Call(a.hwnd, negative(-20))
	if inputEnabled {
		style &^= 0x20
	} else {
		style |= 0x20
	}
	pSetWindowLong.Call(a.hwnd, negative(-20), style)
	pSetWindowPos.Call(a.hwnd, 0, 0, 0, 0, 0, 0x0001|0x0002|0x0004|0x0010|0x0020)
	a.inputEnabled = inputEnabled
}

func (a *application) tickleClick() {
	emit("interaction")
	now := time.Now()
	a.tickle.Click(now)
	a.avoidance.Active = false
	a.avoidance.Velocity = motion.Point{}
	a.avoidance.SpeedMultiplier = a.tickle.SpeedMultiplier(now)
	a.flight.Active = false
	a.navigation.Cancel()
	a.lastInteraction = a.elapsed
	a.nextFlight = a.elapsed + 15
	if a.id == "rest" && !a.context && !a.preview {
		a.enter("curious", false)
	}
}

func (a *application) finishGame() {
	emit("gameStopped")
	result, mode := a.game.Result, a.game.Mode
	a.syncGameInput()
	a.nextFlight = a.elapsed + 15
	if result == motion.GameCancelled {
		return
	}
	switch result {
	case motion.GamePlayerWon:
		a.enter("celebrate", false)
		if mode == motion.GameHide {
			a.say("Du hast mich gefunden!", 1)
		} else {
			a.say("Du hast mich erwischt!", 1)
		}
		a.sound.Cue("celebrate", a.visible && a.focused)
	case motion.GameFairyWon:
		a.enter("celebrate", false)
		a.say("Ich hab dich!", 1)
		a.sound.Cue("celebrate", a.visible && a.focused)
	case motion.GameTimedOut:
		a.enter("curious", false)
		a.say("Die Runde ist vorbei.", 1)
	}
}

func (a *application) cancelGame() {
	if !a.game.Active {
		return
	}
	a.game.Cancel()
	emit("gameStopped")
	a.context = false
	a.enter("hover", false)
	a.nextFlight = a.elapsed + 15
	a.syncGameInput()
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
	a.expressionAge += dt
	a.avoidance.SpeedMultiplier = a.tickle.SpeedMultiplier(now)
	if a.focused && !a.game.Active && a.elapsed >= a.nextGameInvite {
		a.nextGameInvite = a.elapsed + 3600
		emit("gameInvite")
	}
	if a.elapsed-a.lastInteraction > 90 && !a.context && !a.preview && a.id != "rest" {
		a.enter("rest", false)
		a.flight.Active = false
	}
	if a.age >= motion.Duration(a.id) {
		if a.context || a.preview || a.id == "rest" {
			a.age = motion.Duration(a.id)
		} else {
			if a.id == "hover" {
				a.enter(motion.IdleMotions[rand.IntN(len(motion.IdleMotions))], false)
			} else {
				a.enter("hover", false)
			}
		}
	}
	environment := a.environment()
	var cursor point
	if ok, _, _ := pGetCursorPos.Call(uintptr(unsafe.Pointer(&cursor))); ok != 0 {
		environment.Pointer, environment.PointerValid = motion.LocalPointer(
			motion.Point{X: float64(cursor.X), Y: float64(cursor.Y)},
			motion.Point{X: float64(a.bounds.Left), Y: float64(a.bounds.Top)}, a.dpi, environment.Width, environment.Height)
	}
	if a.elapsed-a.lastPointerReport >= .25 {
		a.lastPointerReport = a.elapsed
		if environment.PointerValid {
			fmt.Fprintf(os.Stdout, "{\"type\":\"pointer\",\"x\":%.2f,\"y\":%.2f}\n", environment.Pointer.X, environment.Pointer.Y)
			a.pointerKnown = true
		} else if a.pointerKnown {
			emit("pointerLost")
			a.pointerKnown = false
		}
	}
	if a.game.Active {
		a.flight.Active = false
		a.avoidance = motion.Avoidance{}
		a.navigation.Cancel()
		a.position = a.game.Step(a.position, environment, dt)
		if !a.game.Active {
			a.finishGame()
		}
	} else {
		a.advancePerception(environment, dt)
		a.scanAnchor()
		a.advanceAnchor(environment, dt)
	}
	if a.anchor.id == 0 && !a.game.Active && a.id != "rest" && !a.context && !a.preview && !a.flight.Active && !a.avoidance.Active && a.elapsed >= a.nextFlight {
		a.planFlight()
	}
	if a.flight.Active {
		a.position = a.flight.Step(dt)
	}
	targetPose := motion.Sample(a.id, a.age, a.elapsed)
	if a.preview {
		targetPose = motion.SamplePreview(a.id, a.age, a.elapsed)
	}
	motion.ApplyExpression(a.expression, a.expressionAge, &targetPose)
	if a.presenceEnabled && !a.preview {
		look := motion.Point{}
		if environment.PointerValid {
			look = motion.Point{X: (environment.Pointer.X - a.position.X) / 220, Y: (environment.Pointer.Y - a.position.Y) / 220}
		}
		motion.ApplyPresence(a.presence, a.elapsed, look, &targetPose)
	}
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
	a.frameCount++
	if a.diagnostics && a.frameCount%10 == 0 {
		fmt.Fprintf(os.Stdout, "{\"type\":\"frame\",\"count\":%d}\n", a.frameCount)
	}
	a.syncBudget()
}

// advancePerception arbitrates avoidance against autonomous flight without
// changing the fairy's expression or interaction state.
func (a *application) advancePerception(environment motion.Environment, dt float64) {
	wasAvoiding := a.avoidance.Active
	a.position = a.avoidance.Step(a.position, environment, dt)
	if wasAvoiding || a.avoidance.Active {
		if !wasAvoiding && a.avoidance.Active && a.tickle.Strength(time.Now()) < .01 {
			a.say("Ich mache deiner Maus Platz.", 0)
		}
		a.flight.Active = false
		a.nextFlight = a.elapsed + 15
	}
	var controlled bool
	a.position, controlled = a.navigation.Step(a.position, environment, dt, wasAvoiding || a.avoidance.Active)
	if controlled {
		a.flight.Active = false
		a.nextFlight = a.elapsed + 15
	}
}

func (a *application) paint() {
	if a.renderer == nil || !a.visible {
		return
	}
	pose := a.rig.Value
	tickle := a.tickle.Strength(time.Now())
	pose[motion.Scatter] = math.Max(pose[motion.Scatter], tickle)
	pose[motion.Glow] += tickle * .25
	x := a.bounds.Left + int32(math.Round(a.position.X*a.dpi)) - int32(a.renderer.pixels/2)
	y := a.bounds.Top + int32(math.Round(a.position.Y*a.dpi)) - int32(a.renderer.pixels/2)
	if a.anchor.rendering {
		pose, x, y = a.anchorPose(pose)
	}
	if err := a.renderer.Draw(pose, a.wing, a.orbit, a.elapsed, a.eco); err != nil {
		fmt.Fprintln(os.Stderr, err)
		pPostMessage.Call(a.hwnd, wmClose, 0, 0)
		return
	}
	if err := a.renderer.Present(a.hwnd, x, y); err != nil {
		fmt.Fprintln(os.Stderr, err)
		pPostMessage.Call(a.hwnd, wmClose, 0, 0)
		return
	}
	a.paintSpeech()
	if a.anchor.rendering && !a.anchor.flight.Active {
		a.anchorStatus("arrived")
	}

}
func run(hostPID uint32, diagnostics bool) error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	pDPIAware.Call(negative(-4))
	app = &application{allowed: ancestors(hostPID), commands: make(chan protocol.Command, 16), enabled: true, systemMotion: true, diagnostics: diagnostics, rig: motion.NewRig(), id: "greet", dpi: 1, nextFlight: 6, nextGameInvite: 3600}
	if len(app.allowed) == 0 {
		return fmt.Errorf("VS Code parent process is unavailable")
	}
	hwnd, err := createOverlayWindow()
	if err != nil {
		return err
	}
	app.hwnd = hwnd
	app.bubbleEnabled = true
	app.sound = newNativeSound()
	defer func() {
		app.hideSpeech()
		app.bubble.Close()
		app.sound.Stop()
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
	diagnostics := flag.Bool("diagnostics", false, "emit periodic animation frame counters")
	output := flag.String("output", "", "self-test output directory")
	flag.Parse()
	var err error
	if *selfTest {
		err = runSelfTest(*output)
	} else {
		if *hostPID == 0 {
			err = fmt.Errorf("--host-pid is required")
		} else {
			err = run(uint32(*hostPID), *diagnostics)
		}
	}
	if err != nil {
		json.NewEncoder(os.Stderr).Encode(map[string]string{"error": err.Error()})
		os.Exit(1)
	}
}
