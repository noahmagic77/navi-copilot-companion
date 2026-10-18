//go:build windows && amd64

package main

import (
	"fmt"
	"math"
	"navi/overlay/internal/motion"
	"navi/overlay/internal/speech"
	"os"
	"syscall"
	"time"
	"unicode/utf8"
	"unsafe"
)

var pSendMessage = user32.NewProc("SendMessageW")
var pSetWindowLong = user32.NewProc("SetWindowLongPtrW")
var pCallWindowProc = user32.NewProc("CallWindowProcW")
var pGetWindowRect = user32.NewProc("GetWindowRect")
var bubbleCallback uintptr
var bubbleProcedures = map[uintptr]uintptr{}
var gFontFamily = gdiplus.NewProc("GdipCreateFontFamilyFromName")
var gDeleteFontFamily = gdiplus.NewProc("GdipDeleteFontFamily")
var gFont = gdiplus.NewProc("GdipCreateFont")
var gDeleteFont = gdiplus.NewProc("GdipDeleteFont")
var gDrawString = gdiplus.NewProc("GdipDrawString")

const bubbleFill = 0xb8eef7ff // Translucent body; text keeps its own opaque alpha.
const bubbleInk = 0xff20364e

type speechBubble struct {
	hwnd            uintptr
	canvas          *renderer
	active          bool
	message         string
	scale           float64
	captureExcluded bool
}

func (b *speechBubble) excludeFromCapture(excluded bool) bool {
	if b == nil || b.captureExcluded == excluded {
		return true
	}
	if !setCaptureExcluded(b.hwnd, excluded) {
		return false
	}
	b.captureExcluded = excluded
	return true
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
func newSpeechBubble(owner uintptr) (*speechBubble, error) {
	hwnd, _, callErr := pCreateWindow.Call(0x08000000|0x80000|0x80|0x20|0x8, uintptrPointer(utf16("STATIC")), 0, 0x80000000, 0, 0, 0, 0, owner, 0, 0, 0)
	if hwnd == 0 {
		return nil, fmt.Errorf("Create speech bubble: %v", callErr)
	}
	b := &speechBubble{hwnd: hwnd}
	if bubbleCallback == 0 {
		bubbleCallback = syscall.NewCallback(bubbleProcedure)
	}
	previous, _, callErr := pSetWindowLong.Call(hwnd, negative(-4), bubbleCallback)
	if previous == 0 {
		b.Close()
		return nil, fmt.Errorf("Subclass speech bubble: %v", callErr)
	}
	bubbleProcedures[hwnd] = previous
	return b, nil
}
func (b *speechBubble) Hide() {
	if b != nil && b.active {
		pShowWindow.Call(b.hwnd, 0)
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
	b.canvas.Close()
	b.canvas = nil
}
func (b *speechBubble) Show(text string, center point, bounds rect, scale float64) {
	if err := b.draw(text, center, bounds, scale); err != nil {
		fmt.Fprintln(os.Stderr, "Speech bubble:", err)
		b.Hide()
		return
	}
	pShowWindow.Call(b.hwnd, 4)
	b.active = true
}
func (b *speechBubble) draw(text string, center point, bounds rect, scale float64) error {
	pixels := int(math.Ceil(400 * scale))
	if b.canvas == nil || b.canvas.pixels != pixels {
		b.canvas.Close()
		var err error
		b.canvas, err = newRenderer(pixels)
		if err != nil {
			return err
		}
	}
	r := b.canvas
	width := math.Min(280*scale, float64(bounds.Right-bounds.Left)-16*scale)
	lines := math.Ceil(float64(utf8.RuneCountInString(text)) / math.Max(8, (width/scale-32)/8))
	height := math.Min((28+lines*20)*scale, float64(bounds.Bottom-bounds.Top)-16*scale)
	layout := speech.Place(float64(center.X-bounds.Left), float64(center.Y-bounds.Top), float64(bounds.Right-bounds.Left), float64(bounds.Bottom-bounds.Top), width, height, scale)
	// Include the tip in the layered surface. Its endpoint follows the luminous core.
	tipX, tipY := float64(center.X), float64(center.Y)
	bodyX, bodyY := float64(bounds.Left)+layout.X, float64(bounds.Top)+layout.Y
	originX, originY := math.Min(bodyX, tipX)-2*scale, math.Min(bodyY, tipY)-2*scale
	x, y := int32(math.Round(bodyX-originX)), int32(math.Round(bodyY-originY))
	w, h := int32(math.Round(layout.Width)), int32(math.Round(layout.Height))
	tx, ty := int32(math.Round(tipX-originX)), int32(math.Round(tipY-originY))
	radius := int32(math.Round(18 * scale))
	if err := gdip(gClear, r.graphics, 0); err != nil {
		return err
	}
	var path, fill, ink, family, font uintptr
	if err := gdip(gCreatePath, 0, ptr(&path)); err != nil {
		return err
	}
	defer gDeletePath.Call(path)
	if err := gdip(gSolid, bubbleFill, ptr(&fill)); err != nil {
		return err
	}
	defer gDeleteBrush.Call(fill)
	if err := gdip(gSolid, bubbleInk, ptr(&ink)); err != nil {
		return err
	}
	defer gDeleteBrush.Call(ink)
	// Four rounded corners and a tail attached to the edge nearest the fairy.
	line := func(a, b, c, d int32) { gLine.Call(path, negative(a), negative(b), negative(c), negative(d)) }
	curve := func(a, b, c, d, e, f, g, h int32) {
		gBezier.Call(path, negative(a), negative(b), negative(c), negative(d), negative(e), negative(f), negative(g), negative(h))
	}
	midX := int32(math.Max(float64(x+radius+10), math.Min(float64(tx), float64(x+w-radius-10))))
	if ty < y && tx >= x && tx <= x+w {
		line(x+radius, y, midX-8, y)
		line(midX-8, y, tx, ty)
		line(tx, ty, midX+8, y)
		line(midX+8, y, x+w-radius, y)
	} else {
		line(x+radius, y, x+w-radius, y)
	}
	curve(x+w-radius, y, x+w, y, x+w, y, x+w, y+radius)
	mid := int32(math.Max(float64(y+radius+10), math.Min(float64(ty), float64(y+h-radius-10))))
	if tx > x+w {
		line(x+w, y+radius, x+w, mid-8)
		line(x+w, mid-8, tx, ty)
		line(tx, ty, x+w, mid+8)
		line(x+w, mid+8, x+w, y+h-radius)
	} else {
		line(x+w, y+radius, x+w, y+h-radius)
	}
	curve(x+w, y+h-radius, x+w, y+h, x+w, y+h, x+w-radius, y+h)
	if ty > y+h && tx >= x && tx <= x+w {
		line(x+w-radius, y+h, midX+8, y+h)
		line(midX+8, y+h, tx, ty)
		line(tx, ty, midX-8, y+h)
		line(midX-8, y+h, x+radius, y+h)
	} else {
		line(x+w-radius, y+h, x+radius, y+h)
	}
	curve(x+radius, y+h, x, y+h, x, y+h, x, y+h-radius)
	if tx < x {
		line(x, y+h-radius, x, mid+8)
		line(x, mid+8, tx, ty)
		line(tx, ty, x, mid-8)
		line(x, mid-8, x, y+radius)
	} else {
		line(x, y+h-radius, x, y+radius)
	}
	curve(x, y+radius, x, y, x, y, x+radius, y)
	gClosePath.Call(path)
	if err := gdip(gFillPath, r.graphics, fill, path); err != nil {
		return err
	}
	if err := gdip(gDrawPath, r.graphics, r.pen, path); err != nil {
		return err
	}
	if err := gdip(gFontFamily, uintptrPointer(utf16("Segoe UI")), 0, ptr(&family)); err != nil {
		return err
	}
	defer gDeleteFontFamily.Call(family)
	if err := gdip(gFont, family, f32(14*scale), 0, 2, ptr(&font)); err != nil {
		return err
	}
	defer gDeleteFont.Call(font)
	textArea := [4]float32{float32(x) + float32(16*scale), float32(y) + float32(12*scale), float32(w) - float32(32*scale), float32(h) - float32(20*scale)}
	content := utf16(text)
	if err := gdip(gDrawString, r.graphics, uintptrPointer(content), negative(-1), font, uintptr(unsafe.Pointer(&textArea)), 0, ink); err != nil {
		return err
	}
	if err := gdip(gFlush, r.graphics, 1); err != nil {
		return err
	}
	destination, source := point{int32(math.Floor(originX)), int32(math.Floor(originY))}, point{}
	dimensions := size{int32(math.Ceil(math.Max(bodyX+layout.Width, tipX) - originX + 2*scale)), int32(math.Ceil(math.Max(bodyY+layout.Height, tipY) - originY + 2*scale))}
	alpha := blend{Alpha: 255, Format: 1}
	ok, _, err := pUpdateLayered.Call(b.hwnd, 0, uintptr(unsafe.Pointer(&destination)), uintptr(unsafe.Pointer(&dimensions)), r.DC, uintptr(unsafe.Pointer(&source)), 0, uintptr(unsafe.Pointer(&alpha)), 2)
	if ok == 0 {
		return fmt.Errorf("UpdateLayeredWindow: %v", err)
	}
	b.message, b.scale = text, scale
	return nil
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
	if a.renderer == nil {
		return
	}
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
	if !a.bubble.excludeFromCapture(a.anchor.captureExcluded) {
		a.hideSpeech()
		return
	}
	center := a.speechAnchor()
	a.bubble.Show(a.speech.Message, center, a.bounds, a.dpi)
}

// Match the renderer's pixel scale and the separately rounded window position.
func (a *application) speechAnchor() point {
	if a.anchor.rendering {
		return point{a.bounds.Left + int32(math.Round(a.anchor.core.X)), a.bounds.Top + int32(math.Round(a.anchor.core.Y))}
	}
	poseScale := (80.0 / 220) * a.rig.Value[motion.Scale] * float64(a.renderer.pixels) / 192
	center := float64(a.renderer.pixels) / 2
	return point{a.bounds.Left + int32(math.Round(a.position.X*a.dpi)) - int32(a.renderer.pixels/2) + int32(math.Round(center+a.rig.Value[motion.X]*poseScale)), a.bounds.Top + int32(math.Round(a.position.Y*a.dpi)) - int32(a.renderer.pixels/2) + int32(math.Round(center+a.rig.Value[motion.Y]*poseScale))}
}
func speechForMotion(id string) string {
	switch soundForMotion(id) {
	case "greeting":
		return "Hallo! Ich bin da. Schreib mir mit @navi."
	case "discover":
		return "Was möchtest du als Nächstes ausprobieren?"
	case "hint":
		return "Ich habe einen Hinweis für dich."
	case "celebrate":
		return "Ein kleiner Freudenfunke!"
	}
	return ""
}
