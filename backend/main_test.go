package main

import (
	"testing"
)

func TestCalculatePrice(t *testing.T) {
	tests := []struct {
		supply   float64
		expected float64
	}{
		{0, 0},
		{1000, 1},
		{2000, 4},
	}

	for _, test := range tests {
		price := calculatePrice(test.supply)
		if price != test.expected {
			t.Errorf("calculatePrice(%f) = %f; want %f", test.supply, price, test.expected)
		}
	}
}

func TestCalculateProgress(t *testing.T) {
	tests := []struct {
		marketCap float64
		expected  float64
	}{
		{0, 0},
		{50000, 50},
		{100000, 100},
		{200000, 100}, // Capped at 100
	}

	for _, test := range tests {
		progress := calculateProgress(test.marketCap)
		if progress != test.expected {
			t.Errorf("calculateProgress(%f) = %f; want %f", test.marketCap, progress, test.expected)
		}
	}
}
