package main

import (
	"fmt"
	"log"
	"math"
	"net/http"
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

var storage = NewStorage("data.json")

func broadcast(msgType string, data interface{}) {
	clients := storage.GetClients()

	msg := WSMessage{
		Type: msgType,
		Data: data,
	}

	for _, client := range clients {
		err := client.WriteJSON(msg)
		if err != nil {
			client.Close()
			storage.RemoveClient(client)
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

	storage.AddClient(conn)

	// Send initial data
	storage.mu.RLock()
	coins := make([]*Coin, 0, len(storage.Coins))
	for _, coin := range storage.Coins {
		coins = append(coins, coin)
	}
	storage.mu.RUnlock()
	conn.WriteJSON(WSMessage{Type: "coins", Data: coins})

	defer func() {
		storage.RemoveClient(conn)
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

	if len(req.Name) > 32 || len(req.Symbol) > 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name or Symbol too long"})
		return
	}
	if len(req.Description) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Description too long"})
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
	storage.Coins[coin.ID] = coin
	storage.mu.Unlock()

	storage.Save()
	broadcast("coinCreated", coin)
	c.JSON(http.StatusCreated, coin)
}

func getCoins(c *gin.Context) {
	storage.mu.RLock()
	defer storage.mu.RUnlock()

	coins := make([]*Coin, 0, len(storage.Coins))
	for _, coin := range storage.Coins {
		coins = append(coins, coin)
	}

	c.JSON(http.StatusOK, coins)
}

func getCoin(c *gin.Context) {
	id := c.Param("id")

	storage.mu.RLock()
	coin, exists := storage.Coins[id]
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
	// Lock is held for the entire operation to ensure consistency
	// Defer unlock is risky if we have multiple return points, but safe here if we unlock before return or defer.
	// Since we are doing logic inside, let's defer unlock.
	defer storage.mu.Unlock()

	coin, exists := storage.Coins[req.CoinID]
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

	storage.Trades = append(storage.Trades, trade)

	// We are under lock, so we can't call broadcast immediately IF broadcast sends messages that might take time?
	// No, broadcast iterates clients. It should be fine.
	// But wait, I need to Save() too.
	// Save() acquires RLock on storage.
	// We hold Lock on storage. RLock will block!
	// DEADLOCK!

	// I must NOT call Save() while holding Lock.
	// I need to release Lock before calling Save().
}

// REWRITING executeTrade to be safe
func executeTradeSafe(c *gin.Context) {
	var req TradeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Type != "buy" && req.Type != "sell" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid trade type"})
		return
	}
	if req.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be positive"})
		return
	}

	storage.mu.Lock()
	coin, exists := storage.Coins[req.CoinID]
	if !exists {
		storage.mu.Unlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "Coin not found"})
		return
	}

	var newSupply float64
	if req.Type == "buy" {
		newSupply = coin.TotalSupply + (req.Amount * 1000000)
	} else {
		newSupply = coin.TotalSupply - (req.Amount * 1000000)
		if newSupply < 0 {
			storage.mu.Unlock()
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

	storage.Trades = append(storage.Trades, trade)
	storage.mu.Unlock()

	storage.Save()

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
	for _, trade := range storage.Trades {
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
	storage.Comments[req.CoinID] = append(storage.Comments[req.CoinID], comment)
	storage.mu.Unlock()

	storage.Save()
	broadcast("comment", comment)
	c.JSON(http.StatusCreated, comment)
}

func getComments(c *gin.Context) {
	coinID := c.Query("coinId")

	storage.mu.RLock()
	defer storage.mu.RUnlock()

	comments := storage.Comments[coinID]
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
	if len(req.Username) > 32 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username too long"})
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
	storage.Users[user.ID] = user
	storage.mu.Unlock()

	storage.Save()
	c.JSON(http.StatusCreated, user)
}

func getUser(c *gin.Context) {
	id := c.Param("id")

	storage.mu.RLock()
	user, exists := storage.Users[id]
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

type PortfolioItem struct {
	Coin     *Coin   `json:"coin"`
	Amount   float64 `json:"amount"`
	Value    float64 `json:"value"`
	AvgPrice float64 `json:"avgPrice"`
}

func getPortfolio(c *gin.Context) {
	userID := c.Param("id")

	storage.mu.RLock()
	user, exists := storage.Users[userID]
	if !exists {
		storage.mu.RUnlock()
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	username := user.Username
	trades := make([]Trade, len(storage.Trades))
	copy(trades, storage.Trades)

	// Create a map to hold coin data to avoid holding the lock too long or resolving continuously
	coinMap := make(map[string]*Coin)
	for id, coin := range storage.Coins {
		coinMap[id] = coin
	}
	storage.mu.RUnlock()

	portfolio := make(map[string]*PortfolioItem)

	for _, trade := range trades {
		if trade.Username != username {
			continue
		}

		if _, exists := portfolio[trade.CoinID]; !exists {
			if coin, ok := coinMap[trade.CoinID]; ok {
				portfolio[trade.CoinID] = &PortfolioItem{
					Coin:     coin,
					Amount:   0,
					Value:    0,
					AvgPrice: 0,
				}
			} else {
				continue // Skip if coin doesn't exist anymore?
			}
		}

		item := portfolio[trade.CoinID]

		if trade.Type == "buy" {
			// Weighted average price
			totalCost := (item.Amount * item.AvgPrice) + (trade.Amount * trade.Price)
			item.Amount += trade.Amount
			if item.Amount > 0 {
				item.AvgPrice = totalCost / item.Amount
			}
		} else {
			item.Amount -= trade.Amount
			// AvgPrice doesn't change on sell
		}
	}

	// Convert map to slice and calculate current values
	var result []PortfolioItem
	for _, item := range portfolio {
		if item.Amount > 0.000001 { // Filter out negligible amounts
			item.Value = item.Amount * item.Coin.Price
			result = append(result, *item)
		}
	}

	c.JSON(http.StatusOK, result)
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
	storage.Users[user1.ID] = user1
	storage.Users[user2.ID] = user2

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
			Price:       0.0001 + float64(len(storage.Coins))*0.0001,
			CreatedAt:   time.Now(),
			Holders:     100 + len(storage.Coins)*50,
		}
		coin.MarketCap = calculateMarketCap(coin)
		coin.Progress = calculateProgress(coin.MarketCap)
		storage.Coins[coin.ID] = coin
	}
	storage.Save()
}

func main() {
	storage.Load()
	if len(storage.Coins) == 0 {
		initMockData()
	}

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
		api.POST("/trades", executeTradeSafe)
		api.GET("/trades", getTrades)
		api.POST("/comments", createComment)
		api.GET("/comments", getComments)
		api.POST("/users", createUser)
		api.GET("/users/:id", getUser)
		api.GET("/users/:id/portfolio", getPortfolio)
	}

	port := "8080"
	fmt.Printf("🚀 MemePump Backend running on http://localhost:%s\n", port)
	// ...
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
