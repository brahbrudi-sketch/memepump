package models

import (
	"time"
)

type Coin struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name"`
	Symbol      string    `json:"symbol"`
	Description string    `json:"description"`
	Image       string    `json:"image"`
	Creator     string    `json:"creator"`
	Twitter     string    `json:"twitter"`
	Telegram    string    `json:"telegram"`
	Website     string    `json:"website"`
	MarketCap   float64   `json:"marketCap"`
	Progress    float64   `json:"progress"`
	TotalSupply float64   `json:"totalSupply"`
	Price       float64   `json:"price"`
	CreatedAt   time.Time `json:"createdAt"`
	Holders     int       `json:"holders"`

	// Blockchain Integration
	MintAddress   string `json:"mintAddress"`   // SPL Token or ERC20 address
	CreatorWallet string `json:"creatorWallet"` // Wallet that created the token
	ChainID       string `json:"chainId"`       // "solana-mainnet", "solana-devnet", "base", "ethereum"
	TxHash        string `json:"txHash"`        // Creation transaction hash

	// Bonding Curve Configuration
	CurveType  string  `json:"curveType"`  // "exponential", "linear", "constant_product"
	CurveK     float64 `json:"curveK"`     // Curve steepness parameter
	CurveSlope float64 `json:"curveSlope"` // Linear slope (for linear curves)
	BasePrice  float64 `json:"basePrice"`  // Starting price

	// IPFS / Decentralized Storage
	IPFSHash     string `json:"ipfsHash"`     // Token metadata IPFS CID
	IPFSImageCID string `json:"ipfsImageCid"` // Image IPFS CID

	// Liquidity Lock (Rug-Pull Protection)
	LiquidityLocked bool      `json:"liquidityLocked"`
	LockUntil       time.Time `json:"lockUntil"`
	LockedAmount    float64   `json:"lockedAmount"`

	// Graduation (when hitting bonding curve target)
	Graduated   bool      `json:"graduated"` // Listed on DEX
	GraduatedAt time.Time `json:"graduatedAt"`
	PoolAddress string    `json:"poolAddress"` // Raydium/Uniswap pool
}

// WalletLink connects a user account to blockchain wallets
type WalletLink struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    string    `json:"userId" gorm:"index"`
	Address   string    `json:"address" gorm:"uniqueIndex"`
	Chain     string    `json:"chain"` // "solana", "evm"
	IsPrimary bool      `json:"isPrimary"`
	CreatedAt time.Time `json:"createdAt"`
}

// CurveParams defines bonding curve configuration
type CurveParams struct {
	Type       string  `json:"type"`       // "exponential", "linear", "constant_product"
	K          float64 `json:"k"`          // Steepness for exponential
	Slope      float64 `json:"slope"`      // Slope for linear
	BasePrice  float64 `json:"basePrice"`  // Starting price
	MaxSupply  float64 `json:"maxSupply"`  // Target supply for graduation
	TargetMcap float64 `json:"targetMcap"` // Target market cap for graduation
}

type Trade struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	CoinID    string    `json:"coinId" gorm:"index"`
	Type      string    `json:"type"` // "buy" or "sell"
	Amount    float64   `json:"amount"`
	Price     float64   `json:"price"`
	Wallet    string    `json:"wallet"`
	Username  string    `json:"username"`
	Timestamp time.Time `json:"timestamp"`

	// Blockchain Transaction Details
	TxHash      string  `json:"txHash"`      // On-chain transaction hash
	Signature   string  `json:"signature"`   // Transaction signature
	BlockNumber uint64  `json:"blockNumber"` // Block number
	GasFee      float64 `json:"gasFee"`      // Transaction fee paid
	ChainID     string  `json:"chainId"`     // Which chain this trade occurred on
	Status      string  `json:"status"`      // "pending", "confirmed", "failed"
}

type Comment struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	CoinID    string    `json:"coinId" gorm:"index"`
	UserID    string    `json:"userId" gorm:"index"`
	Username  string    `json:"username"`
	Avatar    string    `json:"avatar"`
	Content   string    `json:"content"`
	Likes     int       `json:"likes"`
	Timestamp time.Time `json:"timestamp"`
}

type User struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"unique"`
	Avatar    string    `json:"avatar"`
	Bio       string    `json:"bio"`
	Pin       string    `json:"pin"` // TODO: Hash this in real prod
	Twitter   string    `json:"twitter"`
	Telegram  string    `json:"telegram"`
	Website   string    `json:"website"`
	CreatedAt time.Time `json:"createdAt"`
}

// Responses/Requests can stay here or in main, but better here for cleaner imports
type CreateCoinRequest struct {
	Name             string  `json:"name" binding:"required"`
	Symbol           string  `json:"symbol" binding:"required"`
	Description      string  `json:"description" binding:"required"`
	Image            string  `json:"image" binding:"required"`
	Creator          string  `json:"creator" binding:"required"`
	Twitter          string  `json:"twitter"`
	Telegram         string  `json:"telegram"`
	Website          string  `json:"website"`
	InitialBuyAmount float64 `json:"initialBuyAmount"`
}

type TradeRequest struct {
	CoinID   string  `json:"coinId" binding:"required"`
	Type     string  `json:"type" binding:"required"`
	Amount   float64 `json:"amount" binding:"required"`
	Wallet   string  `json:"wallet" binding:"required"`
	Username string  `json:"username"`
}

type CommentRequest struct {
	CoinID   string `json:"coinId" binding:"required"`
	UserID   string `json:"userId" binding:"required"`
	Username string `json:"username" binding:"required"`
	Avatar   string `json:"avatar"`
	Content  string `json:"content" binding:"required"`
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Avatar   string `json:"avatar"`
	Bio      string `json:"bio"`
	Pin      string `json:"pin" binding:"required"`
	Twitter  string `json:"twitter"`
	Telegram string `json:"telegram"`
	Website  string `json:"website"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Pin      string `json:"pin" binding:"required"`
}

type UpdateUserRequest struct {
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
	Bio      string `json:"bio"`
	Pin      string `json:"pin" binding:"required"`
	Twitter  string `json:"twitter"`
	Telegram string `json:"telegram"`
	Website  string `json:"website"`
}

type PortfolioItem struct {
	Coin     *Coin   `json:"coin"`
	Amount   float64 `json:"amount"`
	Value    float64 `json:"value"`
	AvgPrice float64 `json:"avgPrice"`
}
