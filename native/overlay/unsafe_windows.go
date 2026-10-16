//go:build windows && amd64

package main

import "unsafe"

func uint32Size[T any](value T) uint32       { return uint32(unsafe.Sizeof(value)) }
func uintptrPointer[T any](value *T) uintptr { return uintptr(unsafe.Pointer(value)) }
