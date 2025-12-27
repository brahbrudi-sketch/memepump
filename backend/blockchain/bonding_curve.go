package blockchain

import (
	"math"
)

// CurveType defines the type of bonding curve
type CurveType string

const (
	CurveTypeExponential     CurveType = "exponential"
	CurveTypeLinear          CurveType = "linear"
	CurveTypeConstantProduct CurveType = "constant_product"
)

// BondingCurve calculates prices based on supply
type BondingCurve struct {
	CurveType  CurveType
	BasePrice  float64 // Starting price
	K          float64 // Steepness for exponential, reserve ratio for constant product
	Slope      float64 // Slope for linear curves
	MaxSupply  float64 // Maximum supply (for graduation)
	TargetMcap float64 // Target market cap for graduation
}

// DefaultCurve returns the pump.fun style default curve
func DefaultCurve() *BondingCurve {
	return &BondingCurve{
		CurveType:  CurveTypeExponential,
		BasePrice:  0.00001,    // Starting at 0.00001 SOL
		K:          0.000001,   // Steepness factor
		MaxSupply:  1000000000, // 1 billion tokens
		TargetMcap: 100000,     // Graduate at $100k market cap
	}
}

// CalculatePrice returns the current price based on supply
func (bc *BondingCurve) CalculatePrice(supply float64) float64 {
	switch bc.CurveType {
	case CurveTypeExponential:
		// Price = basePrice * e^(k * supply)
		// More aggressive growth as supply increases
		return bc.BasePrice * math.Exp(bc.K*supply)

	case CurveTypeLinear:
		// Price = basePrice + (slope * supply)
		// Predictable, steady price increase
		return bc.BasePrice + (bc.Slope * supply)

	case CurveTypeConstantProduct:
		// Uniswap-style: x * y = k
		// Price = k / (maxSupply - supply)
		remaining := bc.MaxSupply - supply
		if remaining <= 0 {
			remaining = 1 // Prevent division by zero
		}
		return bc.K / remaining

	default:
		// Fallback to simple quadratic (original memepump formula)
		return math.Pow(supply, 2) / 1000000
	}
}

// CalculateBuyPrice returns the cost to buy a specific amount
func (bc *BondingCurve) CalculateBuyPrice(currentSupply, buyAmount float64) float64 {
	// For accurate pricing, we integrate the curve
	// Using numerical approximation with small steps
	steps := 100
	stepSize := buyAmount / float64(steps)
	totalCost := 0.0

	for i := 0; i < steps; i++ {
		supplyAtStep := currentSupply + (float64(i) * stepSize)
		priceAtStep := bc.CalculatePrice(supplyAtStep)
		totalCost += priceAtStep * stepSize
	}

	return totalCost
}

// CalculateSellReturn returns the amount received for selling
func (bc *BondingCurve) CalculateSellReturn(currentSupply, sellAmount float64) float64 {
	// Reverse of buy calculation
	steps := 100
	stepSize := sellAmount / float64(steps)
	totalReturn := 0.0

	for i := 0; i < steps; i++ {
		supplyAtStep := currentSupply - (float64(i) * stepSize)
		if supplyAtStep < 0 {
			supplyAtStep = 0
		}
		priceAtStep := bc.CalculatePrice(supplyAtStep)
		totalReturn += priceAtStep * stepSize
	}

	return totalReturn
}

// CalculateMarketCap returns market cap based on supply and price
func (bc *BondingCurve) CalculateMarketCap(supply float64) float64 {
	return supply * bc.CalculatePrice(supply)
}

// CalculateProgress returns progress towards graduation (0-100)
func (bc *BondingCurve) CalculateProgress(marketCap float64) float64 {
	if bc.TargetMcap <= 0 {
		return 0
	}
	progress := (marketCap / bc.TargetMcap) * 100
	if progress > 100 {
		progress = 100
	}
	return progress
}

// ShouldGraduate returns true if the token should graduate to DEX
func (bc *BondingCurve) ShouldGraduate(marketCap float64) bool {
	return marketCap >= bc.TargetMcap
}

// GetCurveDataPoints returns points for visualization (frontend chart)
func (bc *BondingCurve) GetCurveDataPoints(currentSupply float64, numPoints int) []CurvePoint {
	points := make([]CurvePoint, numPoints)
	maxPlotSupply := bc.MaxSupply * 1.2 // Show 20% beyond max

	for i := 0; i < numPoints; i++ {
		supply := (float64(i) / float64(numPoints-1)) * maxPlotSupply
		price := bc.CalculatePrice(supply)
		mcap := supply * price

		points[i] = CurvePoint{
			Supply:    supply,
			Price:     price,
			MarketCap: mcap,
			IsCurrent: supply <= currentSupply && (supply+maxPlotSupply/float64(numPoints)) > currentSupply,
		}
	}

	return points
}

// CurvePoint represents a single point on the curve for visualization
type CurvePoint struct {
	Supply    float64 `json:"supply"`
	Price     float64 `json:"price"`
	MarketCap float64 `json:"marketCap"`
	IsCurrent bool    `json:"isCurrent"`
}

// NewFromParams creates a BondingCurve from stored parameters
func NewFromParams(curveType string, k, slope, basePrice, maxSupply, targetMcap float64) *BondingCurve {
	ct := CurveType(curveType)
	if ct != CurveTypeExponential && ct != CurveTypeLinear && ct != CurveTypeConstantProduct {
		ct = CurveTypeExponential
	}

	if basePrice <= 0 {
		basePrice = 0.00001
	}
	if maxSupply <= 0 {
		maxSupply = 1000000000
	}
	if targetMcap <= 0 {
		targetMcap = 100000
	}

	return &BondingCurve{
		CurveType:  ct,
		BasePrice:  basePrice,
		K:          k,
		Slope:      slope,
		MaxSupply:  maxSupply,
		TargetMcap: targetMcap,
	}
}
