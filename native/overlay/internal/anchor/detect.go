// Package anchor locates only NAVI's explicit two-colour editor beacon.
package anchor

import "strconv"

const Border uint32 = 0xb3eaff

type Rect struct{ Left, Top, Right, Bottom int }

func Colour(token string) (uint32, bool) {
	if len(token) != 6 {
		return 0, false
	}
	n, err := strconv.ParseUint(token, 16, 24)
	return uint32(n), err == nil && uint32(n) != Border
}

// Find accepts one unambiguous, solid rectangle enclosed by the known border.
// No text, OCR or approximate line-height calculation participates in the lookup.
func Find(pixels []byte, width, height int, colour uint32) (Rect, bool) {
	r, reason := Locate(pixels, width, height, colour)
	return r, reason == ""
}

// Locate distinguishes an absent beacon from an ambiguous or invalid capture.
func Locate(pixels []byte, width, height int, colour uint32) (Rect, string) {
	if width < 8 || height < 8 || width > 16384 || height > 16384 || len(pixels) != width*height*4 {
		return Rect{}, "invalid-buffer"
	}
	match := func(x, y int, c uint32) bool {
		if x < 0 || y < 0 || x >= width || y >= height {
			return false
		}
		i := (y*width + x) * 4
		return pixels[i] == byte(c) && pixels[i+1] == byte(c>>8) && pixels[i+2] == byte(c>>16)
	}
	var result Rect
	found := false
	for y := 1; y < height-1; y++ {
		for x := 1; x < width-1; x++ {
			if !match(x, y, colour) || match(x-1, y, colour) || match(x, y-1, colour) {
				continue
			}
			r, b := x, y
			for r < width && match(r, y, colour) {
				r++
			}
			for b < height && match(x, b, colour) {
				b++
			}
			if r-x < 3 || b-y < 3 || r-x > 80 || b-y > 80 {
				continue
			}
			valid := true
			borderNear := func(col, row, dx, dy int) bool {
				for gap := 1; gap <= 3; gap++ {
					if match(col+dx*gap, row+dy*gap, Border) {
						return true
					}
				}
				return false
			}
			for row := y; row < b && valid; row++ {
				if !borderNear(x, row, -1, 0) || !borderNear(r-1, row, 1, 0) {
					valid = false
					break
				}
				for col := x; col < r; col++ {
					if !match(col, row, colour) {
						valid = false
						break
					}
				}
			}
			for col := x; col < r && valid; col++ {
				valid = borderNear(col, y, 0, -1) && borderNear(col, b-1, 0, 1)
			}
			if !valid {
				continue
			}
			if found {
				return Rect{}, "marker-ambiguous"
			}
			result, found = Rect{x, y, r, b}, true
		}
	}
	if !found {
		return Rect{}, "marker-not-found"
	}
	return result, ""
}
