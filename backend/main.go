package main

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"time"

	"memepump/auth"
	"memepump/database"
	"memepump/handlers"
	"memepump/middleware"
	"memepump/models"
	"memepump/realtime"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Config
var (
	PORT       = os.Getenv("PORT")
	DB_DSN     string
	REDIS_ADDR = os.Getenv("REDIS_ADDR")
)

func init() {
	if PORT == "" {
		PORT = "8080"
	}

	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	if host != "" {
		DB_DSN = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", host, user, password, dbname, port)
	} else {
		// Fallback for local dev if envs missing (e.g. running go run main.go directly)
		DB_DSN = "host=localhost user=postgres password=postgres dbname=memepump port=5432 sslmode=disable TimeZone=UTC"
	}

	if REDIS_ADDR == "" {
		REDIS_ADDR = "localhost:6379"
	}
}

// WebSocket Upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Bonding Curve Logic
func calculatePrice(supply float64) float64 {
	return math.Pow(supply, 2) / 1000000
}

func calculateMarketCap(coin *models.Coin) float64 {
	return coin.Price * coin.TotalSupply
}

func calculateProgress(marketCap float64) float64 {
	target := 100000.0
	progress := (marketCap / target) * 100
	if progress > 100 {
		progress = 100
	}
	return progress
}

func main() {
	// Connect to Database
	database.Connect(DB_DSN)

	// Connect to Redis
	database.ConnectRedis(REDIS_ADDR, "")

	// Initialize Server
	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check at root level
	r.GET("/health", healthCheck)

	// API v1 routes
	api := r.Group("/api/v1")
	{
		// WebSocket
		api.GET("/ws", handleWebSocket)

		// Public Routes
		api.POST("/users", createUser)
		api.POST("/login", loginUser)
		api.GET("/users/:id", getUser)
		api.GET("/coins", getCoins)
		api.GET("/coins/:id", getCoin)
		api.GET("/trades", getTrades)
		api.GET("/comments", getComments)
		api.GET("/users/:id/portfolio", getPortfolio)

		// Protected Routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.POST("/coins", middleware.RateLimitMiddleware(), createCoin)
			protected.POST("/trade", middleware.RateLimitMiddleware(), executeTrade)
			protected.POST("/comments", middleware.RateLimitMiddleware(), createComment)
			protected.POST("/comments/:coinId/:commentId/like", likeComment)
			protected.PUT("/users/:id", updateUser)
		}

		// Register new professional features (IPFS, Wallet, Analytics)
		handlers.RegisterRoutes(api, middleware.AuthMiddleware(), middleware.RateLimitMiddleware())
	}

	// Initialize Mock Data if needed
	go initMockData()

	log.Printf("Server starting on port %s", PORT)
	r.Run(":" + PORT)
}

// Handlers

func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	realtime.MainHub.AddClient(conn)

	// Send initial data (Coins)
	var coins []models.Coin
	if result := database.DB.Find(&coins); result.Error == nil {
		conn.WriteJSON(realtime.WSMessage{Type: "coins", Data: coins})
	}

	// Keep alive loop
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			realtime.MainHub.RemoveClient(conn)
			break
		}
	}
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now()})
}

// User Handlers

func createUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash the PIN
	hashedPin, err := auth.HashPin(req.Pin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash PIN"})
		return
	}

	user := models.User{
		ID:        uuid.New().String(),
		Username:  req.Username,
		Pin:       hashedPin,
		Avatar:    req.Avatar,
		Bio:       req.Bio,
		Twitter:   req.Twitter,
		Telegram:  req.Telegram,
		Website:   req.Website,
		CreatedAt: time.Now(),
	}

	result := database.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, user)
}

func loginUser(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	result := database.DB.Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Verify PIN using bcrypt
	if !auth.VerifyPin(user.Pin, req.Pin) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid PIN"})
		return
	}

	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

func getUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func updateUser(c *gin.Context) {
	id := c.Param("id")
	authUserID := c.GetString("userID")
	if id != authUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot update other user"})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Verify current PIN using bcrypt
	if !auth.VerifyPin(user.Pin, req.Pin) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid PIN"})
		return
	}

	// Update fields
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	if req.Bio != "" {
		user.Bio = req.Bio
	}
	if req.Twitter != "" {
		user.Twitter = req.Twitter
	}
	if req.Telegram != "" {
		user.Telegram = req.Telegram
	}
	if req.Website != "" {
		user.Website = req.Website
	}

	database.DB.Save(&user)
	c.JSON(http.StatusOK, user)
}

// Coin Handlers

func createCoin(c *gin.Context) {
	var req models.CreateCoinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	coin := models.Coin{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Symbol:      req.Symbol,
		Description: req.Description,
		Image:       req.Image,
		Creator:     req.Creator,
		Twitter:     req.Twitter,
		Telegram:    req.Telegram,
		Website:     req.Website,
		TotalSupply: 1000000000,
		Price:       0.0001,
		CreatedAt:   time.Now(),
		Holders:     1,
	}

	coin.MarketCap = calculateMarketCap(&coin)
	coin.Progress = calculateProgress(coin.MarketCap)

	tx := database.DB.Begin()

	if err := tx.Create(&coin).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create coin"})
		return
	}

	// Handle Initial Buy
	if req.InitialBuyAmount > 0 {
		var trade models.Trade // Fix: declare type explicitly
		trade = models.Trade{
			ID:        uuid.New().String(),
			CoinID:    coin.ID,
			Type:      "buy",
			Amount:    req.InitialBuyAmount,
			Price:     coin.Price,
			Wallet:    "CREATOR_WALLET",
			Username:  req.Creator,
			Timestamp: time.Now(),
		}

		// Update Coin Supply
		coin.TotalSupply += (req.InitialBuyAmount * 1000000)
		coin.Price = calculatePrice(coin.TotalSupply)
		coin.MarketCap = calculateMarketCap(&coin)
		coin.Progress = calculateProgress(coin.MarketCap)

		if err := tx.Save(&coin).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update coin"})
			return
		}

		if err := tx.Create(&trade).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trade"})
			return
		}

		// Broadcast trade
		go realtime.BroadcastSafe("trade", map[string]interface{}{
			"trade": trade,
			"coin":  coin,
		})
	}

	tx.Commit()

	realtime.BroadcastSafe("coinCreated", coin)
	c.JSON(http.StatusCreated, coin)
}

func getCoins(c *gin.Context) {
	var coins []models.Coin
	database.DB.Find(&coins)
	c.JSON(http.StatusOK, coins)
}

func getCoin(c *gin.Context) {
	id := c.Param("id")
	var coin models.Coin
	if err := database.DB.First(&coin, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}
	c.JSON(http.StatusOK, coin)
}

// Trade Handlers

func executeTrade(c *gin.Context) {
	var req models.TradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be positive"})
		return
	}

	tx := database.DB.Begin()

	var coin models.Coin
	// Lock row for update
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&coin, "id = ?", req.CoinID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}

	var newSupply float64
	if req.Type == "buy" {
		newSupply = coin.TotalSupply + (req.Amount * 1000000)
	} else {
		newSupply = coin.TotalSupply - (req.Amount * 1000000)
		if newSupply < 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient supply"})
			return
		}

		// Optional: Check user balance here if we were enforcing it strictly
	}

	coin.TotalSupply = newSupply
	coin.Price = calculatePrice(coin.TotalSupply)
	coin.MarketCap = calculateMarketCap(&coin)
	coin.Progress = calculateProgress(coin.MarketCap)

	trade := models.Trade{
		ID:        uuid.New().String(),
		CoinID:    req.CoinID,
		Type:      req.Type,
		Amount:    req.Amount,
		Price:     coin.Price,
		Wallet:    req.Wallet,
		Username:  req.Username,
		Timestamp: time.Now(),
	}

	if err := tx.Save(&coin).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update coin"})
		return
	}

	if err := tx.Create(&trade).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trade"})
		return
	}

	tx.Commit()

	go realtime.BroadcastSafe("trade", map[string]interface{}{
		"trade": trade,
		"coin":  coin,
	})

	c.JSON(http.StatusOK, gin.H{
		"trade": trade,
		"coin":  coin,
	})
}

func getTrades(c *gin.Context) {
	coinID := c.Query("coinId")
	var trades []models.Trade

	query := database.DB.Order("timestamp desc")
	if coinID != "" {
		query = query.Where("coin_id = ?", coinID)
	}

	query.Find(&trades)
	c.JSON(http.StatusOK, trades)
}

// Comment Handlers

func createComment(c *gin.Context) {
	var req models.CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify User (optional, depends if we trust payload or Context using auth middleware)
	// We can set req.UserID from context if we want to be strict, but let's trust payload + Auth check for now.

	comment := models.Comment{
		ID:        uuid.New().String(),
		CoinID:    req.CoinID,
		UserID:    req.UserID,
		Username:  req.Username,
		Avatar:    req.Avatar,
		Content:   req.Content,
		Likes:     0,
		Timestamp: time.Now(),
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	realtime.BroadcastSafe("comment", comment)
	c.JSON(http.StatusCreated, comment)
}

func getComments(c *gin.Context) {
	coinID := c.Query("coinId")
	var comments []models.Comment

	database.DB.Where("coin_id = ?", coinID).Order("timestamp asc").Find(&comments)
	c.JSON(http.StatusOK, comments)
}

func likeComment(c *gin.Context) {
	coinID := c.Param("coinId") // unused in query but good for URL structure
	_ = coinID
	commentID := c.Param("commentId")

	// Use SQL for atomic update
	result := database.DB.Model(&models.Comment{}).
		Where("id = ?", commentID).
		UpdateColumn("likes", gorm.Expr("likes + ?", 1))

	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
		return
	}

	var updatedComment models.Comment
	database.DB.First(&updatedComment, "id = ?", commentID)

	realtime.BroadcastSafe("commentUpdate", updatedComment)
	c.JSON(http.StatusOK, updatedComment)
}

// Portfolio

func getPortfolio(c *gin.Context) {
	userID := c.Param("id")

	// Get user to verify existence (and username)
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get all trades for user
	var trades []models.Trade
	database.DB.Where("username = ?", user.Username).Order("timestamp asc").Find(&trades)
	// Note: Schema has UserID? models.Trade had `Username` string. Model def said: Username string.
	// If we updated Trade model to have UserID, we should use that. model.go shows "Username string".
	// Sticking to Username as per original design for now.

	portfolio := make(map[string]*models.PortfolioItem)

	// Get all coins involved to minimize N+1
	// Actually let's just fetch them as needed or prefetch.
	// Optimize: Collect Coin IDs first.
	coinIDs := make([]string, 0)
	for _, t := range trades {
		coinIDs = append(coinIDs, t.CoinID)
	}

	var coins []models.Coin
	database.DB.Where("id IN ?", coinIDs).Find(&coins)
	coinMap := make(map[string]*models.Coin)
	for i := range coins {
		coinMap[coins[i].ID] = &coins[i]
	}

	for _, trade := range trades {
		if _, exists := portfolio[trade.CoinID]; !exists {
			if coin, ok := coinMap[trade.CoinID]; ok {
				portfolio[trade.CoinID] = &models.PortfolioItem{
					Coin:     coin,
					Amount:   0,
					Value:    0,
					AvgPrice: 0,
				}
			} else {
				continue
			}
		}

		item := portfolio[trade.CoinID]

		if trade.Type == "buy" {
			totalCost := (item.Amount * item.AvgPrice) + (trade.Amount * trade.Price)
			item.Amount += trade.Amount
			if item.Amount > 0 {
				item.AvgPrice = totalCost / item.Amount
			}
		} else {
			item.Amount -= trade.Amount
		}
	}

	var result []models.PortfolioItem
	for _, item := range portfolio {
		if item.Amount > 0.000001 {
			item.Value = item.Amount * item.Coin.Price
			result = append(result, *item)
		}
	}

	c.JSON(http.StatusOK, result)
}

func initMockData() {
	// Simple check if data exists
	var count int64
	database.DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("Seeding mock data...")

	// Mock users
	hashedPin, _ := auth.HashPin("1234")
	user1 := models.User{
		ID:        uuid.New().String(),
		Username:  "CryptoKing",
		Avatar:    "👑",
		Bio:       "Diamond hands only",
		Pin:       hashedPin,
		CreatedAt: time.Now(),
	}
	database.DB.Create(&user1)

	// Mock coins
	mockCoins := []models.CreateCoinRequest{
		{
			Name:        "Pepe Rocket",
			Symbol:      "PEPERK",
			Description: "To the moon! 🚀",
			Image:       "🐸",
			Creator:     "CryptoKing",
		},
		{
			Name:        "Doge Galaxy",
			Symbol:      "DOGEGX",
			Description: "Much wow, very moon",
			Image:       "🐕",
			Creator:     "MoonBoy",
		},
	}

	for _, req := range mockCoins {
		coin := models.Coin{
			ID:          uuid.New().String(),
			Name:        req.Name,
			Symbol:      req.Symbol,
			Description: req.Description,
			Image:       req.Image,
			Creator:     req.Creator,
			TotalSupply: 1000000000,
			Price:       0.0001,
			CreatedAt:   time.Now(),
			Holders:     1,
		}
		coin.MarketCap = calculateMarketCap(&coin)
		coin.Progress = calculateProgress(coin.MarketCap)
		database.DB.Create(&coin)
	}
}
