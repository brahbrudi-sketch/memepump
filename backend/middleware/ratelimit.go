package middleware

import (
	"memepump/database"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		key := "ratelimit:" + ip

		// Simple fixed window counter
		count, err := database.RDB.Incr(database.Ctx, key).Result()
		if err != nil {
			// Fail open on Redis error usually, or close? Open for now to avoid blocking users if Redis is flaky
			c.Next()
			return
		}

		if count == 1 {
			database.RDB.Expire(database.Ctx, key, time.Minute)
		}

		if count > 60 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			c.Abort()
			return
		}

		c.Next()
	}
}
