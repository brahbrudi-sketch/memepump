package main

import (
	"encoding/json"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

type Storage struct {
	mu       sync.RWMutex
	Coins    map[string]*Coin         `json:"coins"`
	Trades   []Trade                  `json:"trades"`
	Comments map[string][]Comment     `json:"comments"`
	Users    map[string]*User         `json:"users"`
	clients  map[*websocket.Conn]bool `json:"-"` // Don't persist active connections
	filename string                   `json:"-"`
}

func NewStorage(filename string) *Storage {
	s := &Storage{
		Coins:    make(map[string]*Coin),
		Trades:   []Trade{},
		Comments: make(map[string][]Comment),
		Users:    make(map[string]*User),
		clients:  make(map[*websocket.Conn]bool),
		filename: filename,
	}
	return s
}

func (s *Storage) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.filename)
	if os.IsNotExist(err) {
		return nil // File not found is fine, start empty
	}
	if err != nil {
		return err
	}

	if len(data) == 0 {
		return nil
	}

	return json.Unmarshal(data, s)
}

func (s *Storage) Save() error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filename, data, 0644)
}

// Wrapper to safely add a client
func (s *Storage) AddClient(conn *websocket.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.clients[conn] = true
}

// Wrapper to safely remove a client
func (s *Storage) RemoveClient(conn *websocket.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.clients, conn)
}

// Wrapper to safely get all clients
func (s *Storage) GetClients() []*websocket.Conn {
	s.mu.RLock()
	defer s.mu.RUnlock()
	clients := make([]*websocket.Conn, 0, len(s.clients))
	for client := range s.clients {
		clients = append(clients, client)
	}
	return clients
}
