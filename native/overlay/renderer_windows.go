//go:build windows && amd64

package main

import (
	"fmt"
	"image"
	"image/png"
	"math"
	"navi/overlay/internal/motion"
	"os"
	"runtime"
	"syscall"
	"unsafe"
)

var (
	gStartup        = gdiplus.NewProc("GdiplusStartup")
	gShutdown       = gdiplus.NewProc("GdiplusShutdown")
	gBitmap         = gdiplus.NewProc("GdipCreateBitmapFromScan0")
	gDisposeImage   = gdiplus.NewProc("GdipDisposeImage")
	gGraphics       = gdiplus.NewProc("GdipGetImageGraphicsContext")
	gDeleteGraphics = gdiplus.NewProc("GdipDeleteGraphics")
	gClear          = gdiplus.NewProc("GdipGraphicsClear")
	gSmooth         = gdiplus.NewProc("GdipSetSmoothingMode")
	gFlush          = gdiplus.NewProc("GdipFlush")
	gFillPath       = gdiplus.NewProc("GdipFillPath")
	gDrawPath       = gdiplus.NewProc("GdipDrawPath")
	gEllipse        = gdiplus.NewProc("GdipFillEllipseI")
	gRect           = gdiplus.NewProc("GdipFillRectangleI")
	gDrawImage      = gdiplus.NewProc("GdipDrawImageRectI")
	gCreatePath     = gdiplus.NewProc("GdipCreatePath")
	gBezier         = gdiplus.NewProc("GdipAddPathBezierI")
	gLine           = gdiplus.NewProc("GdipAddPathLineI")
	gClosePath      = gdiplus.NewProc("GdipClosePathFigure")
	gDeletePath     = gdiplus.NewProc("GdipDeletePath")
	gSolid          = gdiplus.NewProc("GdipCreateSolidFill")
	gLineBrush      = gdiplus.NewProc("GdipCreateLineBrushI")
	gDeleteBrush    = gdiplus.NewProc("GdipDeleteBrush")
	gPen            = gdiplus.NewProc("GdipCreatePen1")
	gDeletePen      = gdiplus.NewProc("GdipDeletePen")
	gCreateMatrix   = gdiplus.NewProc("GdipCreateMatrix")
	gSetMatrix      = gdiplus.NewProc("GdipSetMatrixElements")
	gSetWorld       = gdiplus.NewProc("GdipSetWorldTransform")
	gResetWorld     = gdiplus.NewProc("GdipResetWorldTransform")
	gDeleteMatrix   = gdiplus.NewProc("GdipDeleteMatrix")
)

type startupInput struct {
	Version                        uint32
	Debug                          uintptr
	SuppressThread, SuppressCodecs int32
}
type renderer struct {
	pixels                                                              int
	DC, DIB, previous, bits, bitmap, graphics, token, matrix, pen, core uintptr
	paths, veins, brushes                                               [4]uintptr
	particles                                                           [32]uintptr
	coreData                                                            []byte
	pin                                                                 runtime.Pinner
}

func f32(value float64) uintptr { return uintptr(math.Float32bits(float32(value))) }

//go:uintptrescapes
func gdip(p *syscall.LazyProc, args ...uintptr) error {
	status, _, _ := p.Call(args...)
	if status != 0 {
		return fmt.Errorf("%s: GDI+ status %d", p.Name, status)
	}
	return nil
}
func newRenderer(pixels int) (r *renderer, err error) {
	r = &renderer{pixels: pixels}
	defer func() {
		if err != nil {
			r.Close()
		}
	}()
	input := startupInput{Version: 1}
	if err = gdip(gStartup, uintptr(unsafe.Pointer(&r.token)), uintptr(unsafe.Pointer(&input)), 0); err != nil {
		return
	}
	desktop, _, _ := pGetDC.Call(0)
	defer pReleaseDC.Call(0, desktop)
	r.DC, _, err = pCreateDC.Call(desktop)
	if err = requireHandle("CreateCompatibleDC", r.DC, err); err != nil {
		return
	}
	info := bitmapInfo{Header: bitmapInfoHeader{Size: 40, Width: int32(pixels), Height: -int32(pixels), Planes: 1, BitCount: 32}}
	r.DIB, _, err = pCreateDIB.Call(desktop, uintptr(unsafe.Pointer(&info)), 0, uintptr(unsafe.Pointer(&r.bits)), 0, 0)
	if err = requireHandle("CreateDIBSection", r.DIB, err); err != nil {
		return
	}
	r.previous, _, _ = pSelectObject.Call(r.DC, r.DIB)
	if err = gdip(gBitmap, uintptr(pixels), uintptr(pixels), uintptr(pixels*4), 0xE200B, r.bits, uintptr(unsafe.Pointer(&r.bitmap))); err != nil {
		return
	}
	if err = gdip(gGraphics, r.bitmap, uintptr(unsafe.Pointer(&r.graphics))); err != nil {
		return
	}
	if err = gdip(gSmooth, r.graphics, 4); err != nil {
		return
	}
	if err = gdip(gCreateMatrix, uintptr(unsafe.Pointer(&r.matrix))); err != nil {
		return
	}
	if err = gdip(gPen, 0x78ffffff, f32(.8), 0, uintptr(unsafe.Pointer(&r.pen))); err != nil {
		return
	}
	curves := [4][][8]int32{
		{{154, 155, 130, 160, 94, 181, 92, 218}, {92, 218, 91, 231, 101, 239, 112, 229}, {112, 229, 135, 208, 150, 183, 154, 155}},
		{{166, 155, 190, 160, 226, 181, 228, 218}, {228, 218, 229, 231, 219, 239, 208, 229}, {208, 229, 185, 208, 170, 183, 166, 155}},
		{{155, 155, 125, 150, 81, 124, 61, 81}, {61, 81, 52, 60, 59, 48, 75, 53}, {75, 53, 119, 66, 148, 110, 155, 155}},
		{{165, 155, 195, 150, 239, 124, 259, 81}, {259, 81, 268, 60, 261, 48, 245, 53}, {245, 53, 201, 66, 172, 110, 165, 155}},
	}
	for i, segments := range curves {
		if err = gdip(gCreatePath, 0, ptr(&r.paths[i])); err != nil {
			return
		}
		for _, v := range segments {
			args := []uintptr{r.paths[i]}
			for _, n := range v {
				args = append(args, negative(n))
			}
			if err = gdip(gBezier, args...); err != nil {
				return
			}
		}
		if err = gdip(gClosePath, r.paths[i]); err != nil {
			return
		}
		if err = gdip(gCreatePath, 0, ptr(&r.veins[i])); err != nil {
			return
		}
		tip := point{100, 223}
		if i == 1 {
			tip = point{220, 223}
		}
		if i == 2 {
			tip = point{66, 61}
		}
		if i == 3 {
			tip = point{254, 61}
		}
		if err = gdip(gLine, r.veins[i], 160, 155, negative(tip.X), negative(tip.Y)); err != nil {
			return
		}
		joint := point{160, 155}
		if err = gdip(gLineBrush, uintptr(unsafe.Pointer(&tip)), uintptr(unsafe.Pointer(&joint)), 0xefffffff, 0x55ffffff, 3, ptr(&r.brushes[i])); err != nil {
			return
		}
	}
	for i := range r.particles {
		if err = gdip(gSolid, uintptr(uint32(32+i*7)<<24|0xffffff), ptr(&r.particles[i])); err != nil {
			return
		}
	}
	// Cache the soft white core once; all channels are premultiplied BGRA.
	const texture = 256
	r.coreData = make([]byte, texture*texture*4)
	for y := 0; y < texture; y++ {
		for x := 0; x < texture; x++ {
			distance := math.Hypot(float64(x)-127.5, float64(y)-127.5) / 1.5
			halo := .18 * math.Exp(-distance*distance/(2*35*35))
			body := 1.0
			if distance > 26 {
				body = math.Exp(-math.Pow((distance-26)/5, 2))
			}
			a := byte(math.Round((body + halo*(1-body)) * 255))
			offset := (y*texture + x) * 4
			r.coreData[offset] = a
			r.coreData[offset+1] = a
			r.coreData[offset+2] = a
			r.coreData[offset+3] = a
		}
	}
	r.pin.Pin(&r.coreData[0])
	if err = gdip(gBitmap, texture, texture, texture*4, 0xE200B, uintptr(unsafe.Pointer(&r.coreData[0])), uintptr(unsafe.Pointer(&r.core))); err != nil {
		return
	}
	return
}
func (r *renderer) transform(a, b, c, d, dx, dy float64) error {
	if err := gdip(gSetMatrix, r.matrix, f32(a), f32(b), f32(c), f32(d), f32(dx), f32(dy)); err != nil {
		return err
	}
	return gdip(gSetWorld, r.graphics, r.matrix)
}
func (r *renderer) modelTransform(p motion.Pose, yaw, roll float64) error {
	scale := float64(r.pixels) / 192 * (80.0 / 220) * p[motion.Scale]
	rb := p[motion.Roll] * math.Pi / 180
	rw := roll * math.Pi / 180
	s1, c1 := math.Sincos(rb)
	s2, c2 := math.Sincos(rw)
	flat := math.Cos(yaw * math.Pi / 180)
	bodyFlat := math.Cos(p[motion.Yaw] * math.Pi / 180)
	a := (c1*bodyFlat*c2 - s1*s2) * flat * scale
	b := (s1*bodyFlat*c2 + c1*s2) * flat * scale
	c := (-c1*bodyFlat*s2 - s1*c2) * scale
	d := (-s1*bodyFlat*s2 + c1*c2) * scale
	center := float64(r.pixels) / 2
	dx := center + p[motion.X]*scale - a*160 - c*155
	dy := center + p[motion.Y]*scale - b*160 - d*155
	return r.transform(a, b, c, d, dx, dy)
}
func (r *renderer) Draw(p motion.Pose, wing, orbit, elapsed float64, eco bool) error {
	if err := gdip(gClear, r.graphics, 0); err != nil {
		return err
	}
	stroke := func(t float64) float64 { return .5 + (math.Sin(t)+.14*math.Sin(t*2))/2.15 }
	left, right, lower := stroke(wing), stroke(wing+math.Sin(elapsed*.7)*.065), stroke(wing-.55)
	amplitude, fold, spread := p[motion.WingAmplitude], p[motion.WingFold]*40, p[motion.WingSpread]
	yaws := [4]float64{7 + lower*40*amplitude + fold, -7 - lower*40*amplitude - fold, 12 + left*50*amplitude + fold - spread*8, -12 - right*50*amplitude - fold + spread*8}
	rolls := [4]float64{-lower*10 + spread*18, lower*10 - spread*18, -3 + left*9 - spread*15, 3 - right*9 + spread*15}
	for i := range r.paths {
		if err := r.modelTransform(p, yaws[i], rolls[i]); err != nil {
			return err
		}
		if err := gdip(gFillPath, r.graphics, r.brushes[i], r.paths[i]); err != nil {
			return err
		}
		if err := gdip(gDrawPath, r.graphics, r.pen, r.veins[i]); err != nil {
			return err
		}
	}
	if err := r.modelTransform(p, 0, 0); err != nil {
		return err
	}
	if err := gdip(gDrawImage, r.graphics, r.core, 75, 70, 170, 170); err != nil {
		return err
	}
	if err := gdip(gResetWorld, r.graphics); err != nil {
		return err
	}
	n := 12
	if eco {
		n = 6
	}
	s := float64(r.pixels) / 192
	center := float64(r.pixels) / 2
	for i := 0; i < n; i++ {
		phase := float64(i) * 2.399963
		angle := phase + orbit*(.44+float64(i%4)*.045)
		depth := math.Cos(angle)
		radius := (26+float64(i%5)*3.5)*p[motion.OrbitRadius] + p[motion.Scatter]*8
		x := center + (math.Sin(angle)*radius+p[motion.X]*.36)*s
		y := center + (depth*radius*.36-math.Sin(angle)*radius*.25+p[motion.Y]*.36)*s
		alpha := motion.Clamp((.56+math.Sin(elapsed*1.5+phase)*.24)*(.58+(depth+1)*.21)*p[motion.Glow], 0, 1)
		index := int(alpha * 31)
		brush := r.particles[index]
		dot := int32(math.Max(1, 1.5*s))
		if err := gdip(gEllipse, r.graphics, brush, negative(int32(x)), negative(int32(y)), negative(dot), negative(dot)); err != nil {
			return err
		}
		if i%6 == 0 {
			length := int32(math.Max(3, 5*s))
			gdip(gRect, r.graphics, brush, negative(int32(x)-length/2), negative(int32(y)), negative(length), 1)
			gdip(gRect, r.graphics, brush, negative(int32(x)), negative(int32(y)-length/2), 1, negative(length))
		}
	}
	return gdip(gFlush, r.graphics, 1)
}
func (r *renderer) Present(hwnd uintptr, x, y int32) error {
	destination := point{x, y}
	source := point{}
	dimensions := size{int32(r.pixels), int32(r.pixels)}
	blendFunction := blend{Alpha: 255, Format: 1}
	ok, _, err := pUpdateLayered.Call(hwnd, 0, uintptr(unsafe.Pointer(&destination)), uintptr(unsafe.Pointer(&dimensions)), r.DC, uintptr(unsafe.Pointer(&source)), 0, uintptr(unsafe.Pointer(&blendFunction)), 2)
	if ok == 0 {
		return fmt.Errorf("UpdateLayeredWindow: %v", err)
	}
	return nil
}
func (r *renderer) PNG(path string) error {
	pixels := unsafe.Slice((*byte)(unsafe.Pointer(r.bits)), r.pixels*r.pixels*4)
	out := image.NewRGBA(image.Rect(0, 0, r.pixels, r.pixels))
	for i := 0; i < len(pixels); i += 4 {
		out.Pix[i], out.Pix[i+1], out.Pix[i+2], out.Pix[i+3] = pixels[i+2], pixels[i+1], pixels[i], pixels[i+3]
	}
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()
	return png.Encode(file, out)
}
func (r *renderer) Close() {
	if r == nil {
		return
	}
	if r.graphics != 0 {
		gDeleteGraphics.Call(r.graphics)
	}
	if r.bitmap != 0 {
		gDisposeImage.Call(r.bitmap)
	}
	if r.core != 0 {
		gDisposeImage.Call(r.core)
	}
	r.pin.Unpin()
	for _, v := range r.paths {
		if v != 0 {
			gDeletePath.Call(v)
		}
	}
	for _, v := range r.veins {
		if v != 0 {
			gDeletePath.Call(v)
		}
	}
	for _, v := range r.brushes {
		if v != 0 {
			gDeleteBrush.Call(v)
		}
	}
	for _, v := range r.particles {
		if v != 0 {
			gDeleteBrush.Call(v)
		}
	}
	if r.pen != 0 {
		gDeletePen.Call(r.pen)
	}
	if r.matrix != 0 {
		gDeleteMatrix.Call(r.matrix)
	}
	if r.DC != 0 {
		if r.previous != 0 {
			pSelectObject.Call(r.DC, r.previous)
		}
		pDeleteDC.Call(r.DC)
	}
	if r.DIB != 0 {
		pDeleteObject.Call(r.DIB)
	}
	if r.token != 0 {
		gShutdown.Call(r.token)
	}
}
