package handlers

import (
	"encoding/base64"
	"io"
	"net/http"

	"memepump/blockchain"
	"memepump/database"
	"memepump/ipfs"
	"memepump/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// IPFS and Blockchain clients
var (
	ipfsClient   *ipfs.Client
	solanaClient *blockchain.SolanaClient
)

// InitClients initializes IPFS and blockchain clients
func InitClients() {
	ipfsClient = ipfs.NewClient()
	solanaClient = blockchain.NewSolanaClient()
}

// ========================================
// IPFS Upload Handlers
// ========================================

// UploadImageRequest represents an image upload request
type UploadImageRequest struct {
	ImageData string `json:"imageData" binding:"required"` // Base64 encoded
	Filename  string `json:"filename"`
}

// UploadImage handles image upload to IPFS
func UploadImage(c *gin.Context) {
	if ipfsClient == nil || !ipfsClient.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "IPFS not configured"})
		return
	}

	var req UploadImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Decode base64 image
	imageData, err := base64.StdEncoding.DecodeString(req.ImageData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid base64 image data"})
		return
	}

	// Set default filename
	filename := req.Filename
	if filename == "" {
		filename = "token-image.png"
	}

	// Upload to IPFS
	cid, err := ipfsClient.UploadImage(imageData, filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to IPFS: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"cid":        cid,
		"gatewayUrl": ipfsClient.GetGatewayURL(cid),
	})
}

// UploadImageMultipart handles multipart form image upload
func UploadImageMultipart(c *gin.Context) {
	if ipfsClient == nil || !ipfsClient.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "IPFS not configured"})
		return
	}

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}
	defer file.Close()

	// Read file data
	imageData, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read image"})
		return
	}

	// Upload to IPFS
	cid, err := ipfsClient.UploadImage(imageData, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to IPFS"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"cid":        cid,
		"gatewayUrl": ipfsClient.GetGatewayURL(cid),
	})
}

// UploadMetadata handles token metadata upload to IPFS
func UploadMetadata(c *gin.Context) {
	if ipfsClient == nil || !ipfsClient.IsConfigured() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "IPFS not configured"})
		return
	}

	var metadata ipfs.TokenMetadata
	if err := c.ShouldBindJSON(&metadata); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cid, err := ipfsClient.UploadJSON(metadata)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload metadata"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"cid":        cid,
		"gatewayUrl": ipfsClient.GetGatewayURL(cid),
	})
}

// ========================================
// Wallet Linking Handlers
// ========================================

// LinkWalletRequest represents a wallet linking request
type LinkWalletRequest struct {
	Address   string `json:"address" binding:"required"`
	Chain     string `json:"chain" binding:"required"` // "solana" or "evm"
	Signature string `json:"signature"`                // Signed message for verification
	Message   string `json:"message"`                  // Original message that was signed
}

// LinkWallet links a wallet address to a user account
func LinkWallet(c *gin.Context) {
	userID := c.GetString("userID") // From auth middleware

	var req LinkWalletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Verify signature matches user's wallet
	// For Solana: ed25519 signature verification
	// For EVM: ecrecover to verify address

	// Check if wallet already linked
	var existing models.WalletLink
	if err := database.DB.Where("address = ?", req.Address).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Wallet already linked to another account"})
		return
	}

	// Check if user already has a wallet for this chain
	var userWallet models.WalletLink
	isPrimary := true
	if err := database.DB.Where("user_id = ? AND chain = ?", userID, req.Chain).First(&userWallet).Error; err == nil {
		isPrimary = false // User already has a wallet for this chain
	}

	link := models.WalletLink{
		ID:        uuid.New().String(),
		UserID:    userID,
		Address:   req.Address,
		Chain:     req.Chain,
		IsPrimary: isPrimary,
	}

	if err := database.DB.Create(&link).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link wallet"})
		return
	}

	c.JSON(http.StatusCreated, link)
}

// GetUserWallets returns all wallets linked to a user
func GetUserWallets(c *gin.Context) {
	userID := c.Param("id")

	var wallets []models.WalletLink
	database.DB.Where("user_id = ?", userID).Find(&wallets)

	c.JSON(http.StatusOK, wallets)
}

// UnlinkWallet removes a wallet link
func UnlinkWallet(c *gin.Context) {
	userID := c.GetString("userID")
	walletID := c.Param("walletId")

	result := database.DB.Where("id = ? AND user_id = ?", walletID, userID).Delete(&models.WalletLink{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Wallet link not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Wallet unlinked"})
}

// ========================================
// Bonding Curve Handlers
// ========================================

// GetCurveData returns bonding curve visualization data
func GetCurveData(c *gin.Context) {
	coinID := c.Param("id")

	var coin models.Coin
	if err := database.DB.First(&coin, "id = ?", coinID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}

	// Create bonding curve from coin parameters
	curve := blockchain.NewFromParams(
		coin.CurveType,
		coin.CurveK,
		coin.CurveSlope,
		coin.BasePrice,
		1000000000, // Max supply
		100000,     // Target market cap
	)

	// Get curve data points for visualization
	points := curve.GetCurveDataPoints(coin.TotalSupply, 100)

	c.JSON(http.StatusOK, gin.H{
		"curveType":     coin.CurveType,
		"currentSupply": coin.TotalSupply,
		"currentPrice":  coin.Price,
		"progress":      coin.Progress,
		"points":        points,
	})
}

// ========================================
// Holders / Analytics Handlers
// ========================================

// GetHolders returns top token holders (from trades)
func GetHolders(c *gin.Context) {
	coinID := c.Param("id")

	// Check cache first
	if cached, ok := database.GetCachedHolders(coinID); ok {
		c.JSON(http.StatusOK, cached)
		return
	}

	// Aggregate holdings from trades
	type HolderResult struct {
		Wallet    string  `json:"wallet"`
		NetAmount float64 `json:"netAmount"`
	}

	var results []HolderResult
	database.DB.Raw(`
		SELECT wallet, 
			SUM(CASE WHEN type = 'buy' THEN amount ELSE -amount END) as net_amount
		FROM trades 
		WHERE coin_id = ?
		GROUP BY wallet
		HAVING SUM(CASE WHEN type = 'buy' THEN amount ELSE -amount END) > 0
		ORDER BY net_amount DESC
		LIMIT 50
	`, coinID).Scan(&results)

	// Calculate percentages
	var totalHeld float64
	for _, r := range results {
		totalHeld += r.NetAmount
	}

	holders := make([]database.CachedHolder, len(results))
	for i, r := range results {
		percent := 0.0
		if totalHeld > 0 {
			percent = (r.NetAmount / totalHeld) * 100
		}
		holders[i] = database.CachedHolder{
			Address: r.Wallet,
			Amount:  r.NetAmount,
			Percent: percent,
		}
	}

	// Cache the result
	database.CacheHolders(coinID, holders)

	c.JSON(http.StatusOK, holders)
}

// GetTrending returns trending coins
func GetTrending(c *gin.Context) {
	// Get trending coin IDs from Redis
	trendingIDs, _ := database.GetTrendingCoins(10)

	if len(trendingIDs) == 0 {
		// Fallback: return coins by recent activity
		var coins []models.Coin
		database.DB.Order("created_at desc").Limit(10).Find(&coins)
		c.JSON(http.StatusOK, coins)
		return
	}

	var coins []models.Coin
	database.DB.Where("id IN ?", trendingIDs).Find(&coins)

	// Sort by trending order
	coinMap := make(map[string]models.Coin)
	for _, coin := range coins {
		coinMap[coin.ID] = coin
	}

	result := make([]models.Coin, 0, len(trendingIDs))
	for _, id := range trendingIDs {
		if coin, ok := coinMap[id]; ok {
			result = append(result, coin)
		}
	}

	c.JSON(http.StatusOK, result)
}

// ========================================
// Blockchain Status Handlers
// ========================================

// GetBlockchainStatus returns blockchain connection status
func GetBlockchainStatus(c *gin.Context) {
	solanaStatus := "disconnected"
	solanaNetwork := ""

	if solanaClient != nil && solanaClient.IsConfigured() {
		solanaStatus = "connected"
		solanaNetwork = solanaClient.GetNetwork()
	}

	ipfsStatus := "disconnected"
	if ipfsClient != nil && ipfsClient.IsConfigured() {
		ipfsStatus = "connected"
	}

	c.JSON(http.StatusOK, gin.H{
		"solana": gin.H{
			"status":  solanaStatus,
			"network": solanaNetwork,
		},
		"ipfs": gin.H{
			"status": ipfsStatus,
		},
		"redis": gin.H{
			"status": func() string {
				if database.IsConnected() {
					return "connected"
				}
				return "disconnected"
			}(),
		},
	})
}

// TrackCoinView increments view count for trending
func TrackCoinView(c *gin.Context) {
	coinID := c.Param("id")

	// Verify coin exists
	var coin models.Coin
	if err := database.DB.First(&coin, "id = ?", coinID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}

	// Increment view count in Redis
	database.IncrementCoinViews(coinID)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetCoinStats returns statistics for a coin
func GetCoinStats(c *gin.Context) {
	coinID := c.Param("id")

	var coin models.Coin
	if err := database.DB.First(&coin, "id = ?", coinID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}

	// Get trade count
	var tradeCount int64
	database.DB.Model(&models.Trade{}).Where("coin_id = ?", coinID).Count(&tradeCount)

	// Get unique holders
	var holderCount int64
	database.DB.Model(&models.Trade{}).Where("coin_id = ?", coinID).
		Distinct("wallet").Count(&holderCount)

	// Get 24h volume
	var volume24h float64
	database.DB.Model(&models.Trade{}).
		Where("coin_id = ? AND timestamp > NOW() - INTERVAL '24 hours'", coinID).
		Select("COALESCE(SUM(amount * price), 0)").Scan(&volume24h)

	// Calculate bonding curve position
	curve := blockchain.DefaultCurve()
	shouldGraduate := curve.ShouldGraduate(coin.MarketCap)

	c.JSON(http.StatusOK, gin.H{
		"coinId":         coinID,
		"tradeCount":     tradeCount,
		"holders":        holderCount,
		"volume24h":      volume24h,
		"marketCap":      coin.MarketCap,
		"progress":       coin.Progress,
		"shouldGraduate": shouldGraduate,
		"graduated":      coin.Graduated,
	})
}

// VerifyWalletOwnership generates a message for wallet verification
func VerifyWalletOwnership(c *gin.Context) {
	address := c.Query("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Address required"})
		return
	}

	// Generate a unique message to sign
	message := "Sign this message to verify ownership of your wallet on Memepump.\n\nAddress: " + address + "\nTimestamp: " + uuid.New().String()[:8]

	c.JSON(http.StatusOK, gin.H{
		"message": message,
		"address": address,
	})
}

// Additional helper for middleware registration
func RegisterRoutes(api *gin.RouterGroup, authMiddleware gin.HandlerFunc, rateLimitMiddleware gin.HandlerFunc) {
	// Initialize clients
	InitClients()

	// Public routes
	api.GET("/status", GetBlockchainStatus)
	api.GET("/trending", GetTrending)
	api.GET("/coins/:id/curve", GetCurveData)
	api.GET("/coins/:id/holders", GetHolders)
	api.GET("/coins/:id/stats", GetCoinStats)
	api.GET("/users/:id/wallets", GetUserWallets)
	api.GET("/wallet/verify", VerifyWalletOwnership)
	api.POST("/coins/:id/view", TrackCoinView) // No auth needed for tracking

	// Protected routes
	protected := api.Group("/")
	protected.Use(authMiddleware)
	{
		// IPFS uploads (rate limited)
		protected.POST("/upload/image", rateLimitMiddleware, UploadImage)
		protected.POST("/upload/image/form", rateLimitMiddleware, UploadImageMultipart)
		protected.POST("/upload/metadata", rateLimitMiddleware, UploadMetadata)

		// Wallet management
		protected.POST("/wallet/link", LinkWallet)
		protected.DELETE("/wallet/:walletId", UnlinkWallet)
	}
}
