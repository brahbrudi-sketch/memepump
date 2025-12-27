package database

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client
var Ctx = context.Background()

func ConnectRedis(addr string, password string) {
	RDB = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password, // no password set
		DB:       0,        // use default DB
	})

	_, err := RDB.Ping(Ctx).Result()
	if err != nil {
		log.Println("WARNING: Failed to connect to Redis:", err)
		log.Println("Rate limiting will not work properly")
		return
	}

	log.Println("Connected to Redis")
}

// IsConnected checks if Redis is available
func IsConnected() bool {
	if RDB == nil {
		return false
	}
	_, err := RDB.Ping(Ctx).Result()
	return err == nil
}

// ========================================
// Price Caching (Hot Data - 5 second TTL)
// ========================================

// CacheCoinPrice caches the current price for a coin
func CacheCoinPrice(coinID string, price float64) error {
	if RDB == nil {
		return nil
	}
	key := fmt.Sprintf("coin:price:%s", coinID)
	return RDB.Set(Ctx, key, price, 5*time.Second).Err()
}

// GetCachedPrice retrieves cached price, returns ok=false if not cached
func GetCachedPrice(coinID string) (float64, bool) {
	if RDB == nil {
		return 0, false
	}
	key := fmt.Sprintf("coin:price:%s", coinID)
	val, err := RDB.Get(Ctx, key).Float64()
	if err != nil {
		return 0, false
	}
	return val, true
}

// ========================================
// Coin Data Caching (30 second TTL)
// ========================================

// CacheCoin caches full coin data
func CacheCoin(coinID string, data interface{}) error {
	if RDB == nil {
		return nil
	}
	key := fmt.Sprintf("coin:data:%s", coinID)
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return RDB.Set(Ctx, key, jsonData, 30*time.Second).Err()
}

// GetCachedCoin retrieves cached coin data
func GetCachedCoin(coinID string, target interface{}) bool {
	if RDB == nil {
		return false
	}
	key := fmt.Sprintf("coin:data:%s", coinID)
	val, err := RDB.Get(Ctx, key).Bytes()
	if err != nil {
		return false
	}
	if err := json.Unmarshal(val, target); err != nil {
		return false
	}
	return true
}

// ========================================
// Trending Coins (1 minute TTL)
// ========================================

// IncrementCoinViews increments view count for trending calculation
func IncrementCoinViews(coinID string) error {
	if RDB == nil {
		return nil
	}
	key := "trending:views"
	return RDB.ZIncrBy(Ctx, key, 1, coinID).Err()
}

// GetTrendingCoins returns top N coins by views
func GetTrendingCoins(limit int) ([]string, error) {
	if RDB == nil {
		return nil, nil
	}
	key := "trending:views"
	return RDB.ZRevRange(Ctx, key, 0, int64(limit-1)).Result()
}

// ========================================
// Holders Caching (60 second TTL)
// ========================================

type CachedHolder struct {
	Address string  `json:"address"`
	Amount  float64 `json:"amount"`
	Percent float64 `json:"percent"`
}

// CacheHolders caches holder list for a coin
func CacheHolders(coinID string, holders []CachedHolder) error {
	if RDB == nil {
		return nil
	}
	key := fmt.Sprintf("coin:holders:%s", coinID)
	jsonData, err := json.Marshal(holders)
	if err != nil {
		return err
	}
	return RDB.Set(Ctx, key, jsonData, 60*time.Second).Err()
}

// GetCachedHolders retrieves cached holders
func GetCachedHolders(coinID string) ([]CachedHolder, bool) {
	if RDB == nil {
		return nil, false
	}
	key := fmt.Sprintf("coin:holders:%s", coinID)
	val, err := RDB.Get(Ctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	var holders []CachedHolder
	if err := json.Unmarshal(val, &holders); err != nil {
		return nil, false
	}
	return holders, true
}

// ========================================
// Pub/Sub for Realtime Updates
// ========================================

// PublishPriceUpdate broadcasts a price update to all subscribers
func PublishPriceUpdate(coinID string, price float64) error {
	if RDB == nil {
		return nil
	}
	channel := fmt.Sprintf("price:%s", coinID)
	return RDB.Publish(Ctx, channel, price).Err()
}

// PublishTradeEvent broadcasts a trade event
func PublishTradeEvent(coinID string, tradeData interface{}) error {
	if RDB == nil {
		return nil
	}
	channel := fmt.Sprintf("trade:%s", coinID)
	jsonData, err := json.Marshal(tradeData)
	if err != nil {
		return err
	}
	return RDB.Publish(Ctx, channel, jsonData).Err()
}

// SubscribeToPriceUpdates returns a channel with price updates for a coin
func SubscribeToPriceUpdates(ctx context.Context, coinID string) <-chan float64 {
	out := make(chan float64)
	if RDB == nil {
		close(out)
		return out
	}

	channel := fmt.Sprintf("price:%s", coinID)
	sub := RDB.Subscribe(ctx, channel)

	go func() {
		defer close(out)
		defer sub.Close()

		ch := sub.Channel()
		for {
			select {
			case msg, ok := <-ch:
				if !ok {
					return
				}
				var price float64
				if _, err := fmt.Sscanf(msg.Payload, "%f", &price); err == nil {
					out <- price
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	return out
}

// ========================================
// Session / User Caching
// ========================================

// CacheUserSession stores user session data
func CacheUserSession(userID string, data interface{}, ttl time.Duration) error {
	if RDB == nil {
		return nil
	}
	key := fmt.Sprintf("session:%s", userID)
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return RDB.Set(Ctx, key, jsonData, ttl).Err()
}

// GetUserSession retrieves cached user session
func GetUserSession(userID string, target interface{}) bool {
	if RDB == nil {
		return false
	}
	key := fmt.Sprintf("session:%s", userID)
	val, err := RDB.Get(Ctx, key).Bytes()
	if err != nil {
		return false
	}
	return json.Unmarshal(val, target) == nil
}

// InvalidateUserSession removes user session from cache
func InvalidateUserSession(userID string) error {
	if RDB == nil {
		return nil
	}
	key := fmt.Sprintf("session:%s", userID)
	return RDB.Del(Ctx, key).Err()
}
