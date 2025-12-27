package realtime

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Hub struct {
	clients map[*websocket.Conn]bool
	mu      sync.RWMutex
}

var MainHub = &Hub{
	clients: make(map[*websocket.Conn]bool),
}

func (h *Hub) AddClient(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[conn] = true
}

func (h *Hub) RemoveClient(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[conn]; ok {
		delete(h.clients, conn)
		conn.Close()
	}
}

type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func Broadcast(msgType string, data interface{}) {
	MainHub.mu.RLock()
	defer MainHub.mu.RUnlock()

	msg := WSMessage{
		Type: msgType,
		Data: data,
	}

	for client := range MainHub.clients {
		err := client.WriteJSON(msg)
		if err != nil {
			log.Println("Error broadcasting to client:", err)
			client.Close()
			// We can't delete while iterating with range unless we restart or safe delete.
			// Actually safe to delete in range loop in Go? No, map modification during iteration is weird but valid in Go?
			// In Go, "If a map entry is created during iteration, that entry may be produced during the iteration or may be skipped. The choice may vary for each entry created and from one iteration to the next. If the map is nil, the number of iterations is 0."
			// Deleting is safe in Go map iteration.
			// However, since we are under RLock, we CANNOT modify.
			// So we should just log and remove later or launch a goroutine?
			// PROPER WAY: Collect dead clients and remove them after.
		}
	}
}

// Improved Broadcast helper to handle dead clients safely
func BroadcastSafe(msgType string, data interface{}) {
	MainHub.mu.Lock() // Use Lock to allow removal
	defer MainHub.mu.Unlock()

	msg := WSMessage{
		Type: msgType,
		Data: data,
	}

	for client := range MainHub.clients {
		err := client.WriteJSON(msg)
		if err != nil {
			log.Println("Client disconnected, removing:", err)
			client.Close()
			delete(MainHub.clients, client)
		}
	}
}
