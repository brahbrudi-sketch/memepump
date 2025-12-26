package main

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Models
type Coin struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Symbol      string    `json:"symbol"`
	Description string    `json:"description"`
	Image       string    `json:"image"`
	Creator     string    `json:"creator"`
	MarketCap   float64   `json:"marketCap"`
	Progress    float64   `json:"progress"`
	TotalSupply float64   `json:"totalSupply"`
	Price       float64   `json:"price"`
	CreatedAt   time.Time `json:"createdAt"`
	Holders     int       `json:"holders"`
}

type Trade struct {
	ID        string    `json:"id"`
	CoinID    string    `json:"coinId"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	Price     float64   `json:"price"`
	Wallet    string    `json:"wallet"`
	Username  string    `json:"username"`
	Timestamp time.Time `json:"timestamp"`
}

type Comment struct {
	ID        string    `json:"id"`
	CoinID    string    `json:"coinId"`
	UserID    string    `json:"userId"`
	Username  string    `json:"username"`
	Avatar    string    `json:"avatar"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Avatar    string    `json:"avatar"`
	Bio       string    `json:"bio"`
	CreatedAt time.Time `json:"createdAt"`
}

type CreateCoinRequest struct {
	Name        string `json:"name" binding:"required"`
	Symbol      string `json:"symbol" binding:"required"`
	Description string `json:"description" binding:"required"`
	Image       string `json:"image" binding:"required"`
	Creator     string `json:"creator" binding:"required"`
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
}

// WebSocket
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Storage
type Storage struct {
	mu       sync.RWMutex
	coins    map[string]*Coin
	trades   []Trade
	comments map[string][]Comment
	users    map[string]*User
	clients  map[*websocket.Conn]bool
}

var storage = &Storage{
	coins:    make(map[string]*Coin),
	trades:   []Trade{},
	comments: make(map[string][]Comment),
	users:    make(map[string]*User),
	clients:  make(map[*websocket.Conn]bool),
}

func broadcast(msgType string, data interface{}) {
	storage.mu.RLock()
	defer storage.mu.RUnlock()

	msg := WSMessage{
		Type: msgType,
		Data: data,
	}

	for client := range storage.clients {
		err := client.WriteJSON(msg)
		if err != nil {
			client.Close()
			delete(storage.clients, client)
		}
	}
}

// Bonding Curve
func calculatePrice(supply float64) float64 {
	return math.Pow(supply, 2) / 1000000
}

func calculateMarketCap(coin *Coin) float64 {
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

// Handlers
func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	storage.mu.Lock()
	storage.clients[conn] = true
	storage.mu.Unlock()

	// Send initial data
	coins := make([]*Coin, 0, len(storage.coins))
	for _, coin := range storage.coins {
		coins = append(coins, coin)
	}
	conn.WriteJSON(WSMessage{Type: "coins", Data: coins})

	defer func() {
		storage.mu.Lock()
		delete(storage.clients, conn)
		storage.mu.Unlock()
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func createCoin(c *gin.Context) {
	var req CreateCoinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	coin := &Coin{
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

	coin.MarketCap = calculateMarketCap(coin)
	coin.Progress = calculateProgress(coin.MarketCap)

	storage.mu.Lock()
	storage.coins[coin.ID] = coin
	storage.mu.Unlock()

	broadcast("coinCreated", coin)
	c.JSON(http.StatusCreated, coin)
}

func getCoins(c *gin.Context) {
	storage.mu.RLock()
	defer storage.mu.RUnlock()

	coins := make([]*Coin, 0, len(storage.coins))
	for _, coin := range storage.coins {
		coins = append(coins, coin)
	}

	c.JSON(http.StatusOK, coins)
}

func getCoin(c *gin.Context) {
	id := c.Param("id")

	storage.mu.RLock()
	coin, exists := storage.coins[id]
	storage.mu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}

	c.JSON(http.StatusOK, coin)
}

func executeTrade(c *gin.Context) {
	var req TradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Type != "buy" && req.Type != "sell" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trade type"})
		return
	}

	storage.mu.Lock()
	defer storage.mu.Unlock()

	coin, exists := storage.coins[req.CoinID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}

	var newSupply float64
	if req.Type == "buy" {
		newSupply = coin.TotalSupply + (req.Amount * 1000000)
	} else {
		newSupply = coin.TotalSupply - (req.Amount * 1000000)
		if newSupply < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient supply"})
			return
		}
	}

	coin.TotalSupply = newSupply
	coin.Price = calculatePrice(coin.TotalSupply)
	coin.MarketCap = calculateMarketCap(coin)
	coin.Progress = calculateProgress(coin.MarketCap)

	trade := Trade{
		ID:        uuid.New().String(),
		CoinID:    req.CoinID,
		Type:      req.Type,
		Amount:    req.Amount,
		Price:     coin.Price,
		Wallet:    req.Wallet,
		Username:  req.Username,
		Timestamp: time.Now(),
	}

	storage.trades = append(storage.trades, trade)

	go broadcast("trade", map[string]interface{}{
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

	storage.mu.RLock()
	defer storage.mu.RUnlock()

	var filteredTrades []Trade
	for _, trade := range storage.trades {
		if coinID == "" || trade.CoinID == coinID {
			filteredTrades = append(filteredTrades, trade)
		}
	}

	c.JSON(http.StatusOK, filteredTrades)
}

func createComment(c *gin.Context) {
	var req CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment := Comment{
		ID:        uuid.New().String(),
		CoinID:    req.CoinID,
		UserID:    req.UserID,
		Username:  req.Username,
		Avatar:    req.Avatar,
		Content:   req.Content,
		Timestamp: time.Now(),
	}

	storage.mu.Lock()
	storage.comments[req.CoinID] = append(storage.comments[req.CoinID], comment)
	storage.mu.Unlock()

	broadcast("comment", comment)
	c.JSON(http.StatusCreated, comment)
}

func getComments(c *gin.Context) {
	coinID := c.Query("coinId")

	storage.mu.RLock()
	defer storage.mu.RUnlock()

	comments := storage.comments[coinID]
	if comments == nil {
		comments = []Comment{}
	}

	c.JSON(http.StatusOK, comments)
}

func createUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := &User{
		ID:        uuid.New().String(),
		Username:  req.Username,
		Avatar:    req.Avatar,
		Bio:       req.Bio,
		CreatedAt: time.Now(),
	}

	storage.mu.Lock()
	storage.users[user.ID] = user
	storage.mu.Unlock()

	c.JSON(http.StatusCreated, user)
}

func getUser(c *gin.Context) {
	id := c.Param("id")

	storage.mu.RLock()
	user, exists := storage.users[id]
	storage.mu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"time":   time.Now(),
	})
}

func initMockData() {
	// Mock users
	user1 := &User{
		ID:        uuid.New().String(),
		Username:  "CryptoKing",
		Avatar:    "👑",
		Bio:       "Diamond hands only",
		CreatedAt: time.Now(),
	}
	user2 := &User{
		ID:        uuid.New().String(),
		Username:  "MoonBoy",
		Avatar:    "🌙",
		Bio:       "To the moon!",
		CreatedAt: time.Now(),
	}
	storage.users[user1.ID] = user1
	storage.users[user2.ID] = user2

	// Mock coins
	mockCoins := []CreateCoinRequest{
		{
			Name:        "Pepe Rocket",
			Symbol:      "PEPERK",
			Description: "To the moon! 🚀",
			Image:       "🐸",
			Creator:     "0x742d...89Ab",
		},
		{
			Name:        "Doge Galaxy",
			Symbol:      "DOGEGX",
			Description: "Much wow, very moon",
			Image:       "🐕",
			Creator:     "0x123a...45Cd",
		},
		{
			Name:        "Chad Coin",
			Symbol:      "CHAD",
			Description: "Only chads allowed",
			Image:       "💪",
			Creator:     "0x987f...12Ef",
		},
	}

	for _, req := range mockCoins {
		coin := &Coin{
			ID:          uuid.New().String(),
			Name:        req.Name,
			Symbol:      req.Symbol,
			Description: req.Description,
			Image:       req.Image,
			Creator:     req.Creator,
			TotalSupply: 1000000000,
			Price:       0.0001 + float64(len(storage.coins))*0.0001,
			CreatedAt:   time.Now(),
			Holders:     100 + len(storage.coins)*50,
		}
		coin.MarketCap = calculateMarketCap(coin)
		coin.Progress = calculateProgress(coin.MarketCap)
		storage.coins[coin.ID] = coin
	}
}

func main() {
	initMockData()

	router := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	router.Use(cors.New(config))

	router.GET("/ws", handleWebSocket)
	router.GET("/health", healthCheck)

	api := router.Group("/api/v1")
	{
		api.POST("/coins", createCoin)
		api.GET("/coins", getCoins)
		api.GET("/coins/:id", getCoin)
		api.POST("/trades", executeTrade)
		api.GET("/trades", getTrades)
		api.POST("/comments", createComment)
		api.GET("/comments", getComments)
		api.POST("/users", createUser)
		api.GET("/users/:id", getUser)
	}

	port := "8080"
	fmt.Printf("🚀 MemePump Backend running on http://localhost:%s\n", port)
	fmt.Println("📊 API Endpoints:")
	fmt.Println("   WS   /ws")
	fmt.Println("   GET  /health")
	fmt.Println("   GET  /api/v1/coins")
	fmt.Println("   POST /api/v1/coins")
	fmt.Println("   GET  /api/v1/coins/:id")
	fmt.Println("   POST /api/v1/trades")
	fmt.Println("   GET  /api/v1/trades")
	fmt.Println("   POST /api/v1/comments")
	fmt.Println("   GET  /api/v1/comments")
	fmt.Println("   POST /api/v1/users")
	fmt.Println("   GET  /api/v1/users/:id")

	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
