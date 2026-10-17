//go:build windows && amd64

package main

import (
	"fmt"
	"math"
	"navi/overlay/internal/motion"
	"navi/overlay/internal/speech"
	"os"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

var bubbleComctl = syscall.NewLazyDLL("comctl32.dll")
var pInitControls = bubbleComctl.NewProc("InitCommonControlsEx")
var pSendMessage = user32.NewProc("SendMessageW")
var pSetWindowLong = user32.NewProc("SetWindowLongPtrW")
var pCallWindowProc = user32.NewProc("CallWindowProcW")
var pGetWindowRect = user32.NewProc("GetWindowRect")
var pCreateBubbleFont = gdi32.NewProc("CreateFontW")
var pBubbleTheme = syscall.NewLazyDLL("uxtheme.dll").NewProc("SetWindowTheme")
var bubbleCallback uintptr
var bubbleProcedures = map[uintptr]uintptr{}

type tooltipInfo struct {
	Size, Flags     uint32
	Window, ID      uintptr
	Bounds          rect
	Instance        uintptr
	Text            *uint16
	Param, Reserved uintptr
}
type speechBubble struct {
	hwnd    uintptr
	font    uintptr
	tool    tooltipInfo
	text    []uint16
	pin     runtime.Pinner
	active  bool
	message string
	scale   float64
}

func bubbleProcedure(hwnd uintptr, msg uint32, wparam, lparam uintptr) uintptr {
	if msg == wmNCHitTest {
		return negative(-1)
	}
	if msg == wmMouseActivate {
		return 3
	}
	previous := bubbleProcedures[hwnd]
	if previous != 0 {
		result, _, _ := pCallWindowProc.Call(previous, hwnd, uintptr(msg), wparam, lparam)
		if msg == 0x82 {
			delete(bubbleProcedures, hwnd)
		}
		return result
	}
	result, _, _ := pDefWindowProc.Call(hwnd, uintptr(msg), wparam, lparam)
	return result
}
func newSpeechBubble(owner uintptr) (b *speechBubble, err error) {
	init := struct{ Size, Classes uint32 }{8, 0xff}
	ok, _, callErr := pInitControls.Call(uintptr(unsafe.Pointer(&init)))
	if ok == 0 {
		return nil, fmt.Errorf("InitCommonControlsEx: %v", callErr)
	}
	hwnd, _, callErr := pCreateWindow.Call(0x08000000|0x80|0x20|0x8, uintptrPointer(utf16("tooltips_class32")), 0, 0x80000000|0x40|0x2|0x1, 0, 0, 0, 0, owner, 0, 0, 0)
	if hwnd == 0 {
		return nil, fmt.Errorf("Create speech bubble: %v", callErr)
	}
	b = &speechBubble{hwnd: hwnd}
	defer func() {
		if err != nil {
			b.Close()
		}
	}()
	if bubbleCallback == 0 {
		bubbleCallback = syscall.NewCallback(bubbleProcedure)
	}
	previous, _, callErr := pSetWindowLong.Call(hwnd, negative(-4), bubbleCallback)
	if previous == 0 {
		return b, fmt.Errorf("Subclass speech bubble: %v", callErr)
	}
	bubbleProcedures[hwnd] = previous
	b.tool = tooltipInfo{Flags: 0x20 | 0x80 | 0x100, Window: owner, ID: 1}
	b.tool.Size = uint32(unsafe.Sizeof(b.tool))
	b.setText("Ich bin da.")
	added, _, _ := pSendMessage.Call(hwnd, 0x400+50, 0, uintptr(unsafe.Pointer(&b.tool)))
	// Unmanifested common-controls v5 rejects the v6-only reserved member.
	if added == 0 {
		b.tool.Size = uint32(unsafe.Offsetof(b.tool.Reserved))
		added, _, _ = pSendMessage.Call(hwnd, 0x400+50, 0, uintptr(unsafe.Pointer(&b.tool)))
	}
	if added == 0 {
		return b, fmt.Errorf("Could not register speech bubble")
	}
	// Match the fairy's pale light rather than the system's yellow/dark tooltip.
	if pBubbleTheme.Find() == nil {
		pBubbleTheme.Call(hwnd, uintptrPointer(utf16("")), uintptrPointer(utf16("")))
	}
	pSendMessage.Call(hwnd, 0x400+19, 0x00fff7ef, 0)
	pSendMessage.Call(hwnd, 0x400+20, 0x00463024, 0)
	pSendMessage.Call(hwnd, 0x400+33, 0, uintptrPointer(utf16("✦ NAVI")))
	return b, nil
}
func (b *speechBubble) setText(text string) {
	b.pin.Unpin()
	b.text, _ = syscall.UTF16FromString(text)
	b.pin.Pin(&b.text[0])
	b.tool.Text = &b.text[0]
}
func (b *speechBubble) Hide() {
	if b == nil {
		return
	}
	if b.active {
		pSendMessage.Call(b.hwnd, 0x400+17, 0, uintptr(unsafe.Pointer(&b.tool)))
		b.active = false
	}
}
func (b *speechBubble) Close() {
	if b == nil {
		return
	}
	if b.hwnd != 0 {
		pDestroyWindow.Call(b.hwnd)
		b.hwnd = 0
	}
	b.pin.Unpin()
	if b.font != 0 {
		pDeleteObject.Call(b.font)
		b.font = 0
	}
}
func (b *speechBubble) Show(text string, center point, bounds rect, scale float64) {
	if text != b.message {
		b.setText(text)
		pSendMessage.Call(b.hwnd, 0x400+57, 0, uintptr(unsafe.Pointer(&b.tool)))
		b.message = text
	}
	if scale != b.scale {
		font, _, _ := pCreateBubbleFont.Call(negative(-int32(math.Round(14*scale))), 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 5, 0, uintptrPointer(utf16("Segoe UI")))
		if font != 0 {
			pSendMessage.Call(b.hwnd, 0x30, font, 1)
			if b.font != 0 {
				pDeleteObject.Call(b.font)
			}
			b.font = font
		}
		pSendMessage.Call(b.hwnd, 0x400+24, 0, uintptr(math.Min(280*scale, float64(bounds.Right-bounds.Left)-24)))
		b.scale = scale
	}
	if !b.active {
		pSendMessage.Call(b.hwnd, 0x400+17, 1, uintptr(unsafe.Pointer(&b.tool)))
		b.active = true
	}
	var area rect
	pGetWindowRect.Call(b.hwnd, uintptr(unsafe.Pointer(&area)))
	layout := speech.Place(float64(center.X-bounds.Left), float64(center.Y-bounds.Top), float64(bounds.Right-bounds.Left), float64(bounds.Bottom-bounds.Top), float64(area.Right-area.Left), float64(area.Bottom-area.Top), scale)
	// SetWindowPos avoids the signed 16-bit coordinate limit of TTM_TRACKPOSITION.
	pSetWindowPos.Call(b.hwnd, ^uintptr(0), negative(bounds.Left+int32(layout.X)), negative(bounds.Top+int32(layout.Y)), uintptr(layout.Width), uintptr(layout.Height), 0x10)
}
func wallSeconds() float64 { return float64(time.Now().UnixMilli()) / 1000 }
func (a *application) hideSpeech() {
	a.speech.Clear()
	a.bubble.Hide()
	if a.hwnd != 0 {
		pKillTimer.Call(a.hwnd, 2)
	}
}
func (a *application) say(text string, priority int) {
	if !a.bubbleEnabled || !a.visible || !a.focused {
		return
	}
	if !a.speech.Show(text, priority, wallSeconds()) {
		return
	}
	a.paintSpeech()
	if a.speech.Active(wallSeconds()) {
		if ok, _, _ := pSetTimer.Call(a.hwnd, 2, uintptr(math.Max(1, (a.speech.Until-wallSeconds())*1000)), 0); ok == 0 {
			a.hideSpeech()
		}
	}
}
func (a *application) paintSpeech() {
	if !a.bubbleEnabled || !a.visible || !a.speech.Active(wallSeconds()) {
		a.hideSpeech()
		return
	}
	if a.bubble == nil {
		var err error
		a.bubble, err = newSpeechBubble(a.hwnd)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			a.bubble = nil
			a.speech.Clear()
			return
		}
	}
	poseScale := (80.0 / 220) * a.rig.Value[motion.Scale] * a.dpi
	center := point{a.bounds.Left + int32(math.Round(a.position.X*a.dpi+a.rig.Value[motion.X]*poseScale)), a.bounds.Top + int32(math.Round(a.position.Y*a.dpi+a.rig.Value[motion.Y]*poseScale))}
	a.bubble.Show(a.speech.Message, center, a.bounds, a.dpi)
}
func speechForMotion(id string) string {
	switch soundForMotion(id) {
	case "greeting":
		return "Hallo! Ich bin da. Schreib mir mit @navi."
	case "discover":
		return "Was möchtest du als Nächstes ausprobieren?"
	case "hint":
		return "Ich habe einen Tipp für deinen Prompt."
	case "celebrate":
		return "Dein Prompt sieht nach den lokalen Regeln gut aus."
	}
	return ""
}
