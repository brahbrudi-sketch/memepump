package blockchain

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// SolanaClient handles Solana RPC interactions
type SolanaClient struct {
	rpcURL     string
	wsURL      string
	httpClient *http.Client
}

// TokenInfo represents on-chain token information
type TokenInfo struct {
	MintAddress     string `json:"mintAddress"`
	Name            string `json:"name"`
	Symbol          string `json:"symbol"`
	Supply          uint64 `json:"supply"`
	Decimals        uint8  `json:"decimals"`
	MetadataURI     string `json:"metadataUri"`
	UpdateAuthority string `json:"updateAuthority"`
	FreezeAuthority string `json:"freezeAuthority"`
}

// Transaction represents a parsed Solana transaction
type Transaction struct {
	Signature   string `json:"signature"`
	BlockTime   int64  `json:"blockTime"`
	Slot        uint64 `json:"slot"`
	Type        string `json:"type"`
	FromAddress string `json:"fromAddress"`
	ToAddress   string `json:"toAddress"`
	Amount      uint64 `json:"amount"`
	Fee         uint64 `json:"fee"`
	Status      string `json:"status"`
}

// Holder represents a token holder
type Holder struct {
	Address string  `json:"address"`
	Amount  uint64  `json:"amount"`
	Percent float64 `json:"percent"`
}

// NewSolanaClient creates a new Solana client
func NewSolanaClient() *SolanaClient {
	rpcURL := os.Getenv("SOLANA_RPC_URL")
	wsURL := os.Getenv("SOLANA_WS_URL")

	if rpcURL == "" {
		rpcURL = "https://api.devnet.solana.com" // Default to devnet
	}
	if wsURL == "" {
		wsURL = "wss://api.devnet.solana.com"
	}

	return &SolanaClient{
		rpcURL: rpcURL,
		wsURL:  wsURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// RPCRequest represents a JSON-RPC request
type RPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

// RPCResponse represents a JSON-RPC response
type RPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Result  json.RawMessage `json:"result"`
	Error   *RPCError       `json:"error,omitempty"`
}

// RPCError represents an RPC error
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// call makes an RPC call to Solana
func (s *SolanaClient) call(ctx context.Context, method string, params []interface{}) (json.RawMessage, error) {
	req := RPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  method,
		Params:  params,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.rpcURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Body = io.NopCloser(io.NopCloser(nil))

	// Recreate with body
	httpReq, _ = http.NewRequestWithContext(ctx, "POST", s.rpcURL,
		io.NopCloser(io.NopCloser(nil)))
	httpReq.Body = io.NopCloser(
		&bodyReader{data: body},
	)
	httpReq.ContentLength = int64(len(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("RPC call failed: %w", err)
	}
	defer resp.Body.Close()

	var rpcResp RPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if rpcResp.Error != nil {
		return nil, fmt.Errorf("RPC error: %s (code: %d)", rpcResp.Error.Message, rpcResp.Error.Code)
	}

	return rpcResp.Result, nil
}

// bodyReader implements io.Reader for RPC body
type bodyReader struct {
	data []byte
	pos  int
}

func (b *bodyReader) Read(p []byte) (n int, err error) {
	if b.pos >= len(b.data) {
		return 0, io.EOF
	}
	n = copy(p, b.data[b.pos:])
	b.pos += n
	return n, nil
}

// GetTokenSupply returns the current supply of a token
func (s *SolanaClient) GetTokenSupply(ctx context.Context, mintAddress string) (uint64, error) {
	result, err := s.call(ctx, "getTokenSupply", []interface{}{mintAddress})
	if err != nil {
		return 0, err
	}

	var supplyResp struct {
		Context struct {
			Slot uint64 `json:"slot"`
		} `json:"context"`
		Value struct {
			Amount   string `json:"amount"`
			Decimals uint8  `json:"decimals"`
		} `json:"value"`
	}

	if err := json.Unmarshal(result, &supplyResp); err != nil {
		return 0, fmt.Errorf("failed to parse supply response: %w", err)
	}

	var supply uint64
	fmt.Sscanf(supplyResp.Value.Amount, "%d", &supply)
	return supply, nil
}

// GetBalance returns the SOL balance of an account
func (s *SolanaClient) GetBalance(ctx context.Context, address string) (uint64, error) {
	result, err := s.call(ctx, "getBalance", []interface{}{address})
	if err != nil {
		return 0, err
	}

	var balanceResp struct {
		Context struct {
			Slot uint64 `json:"slot"`
		} `json:"context"`
		Value uint64 `json:"value"`
	}

	if err := json.Unmarshal(result, &balanceResp); err != nil {
		return 0, fmt.Errorf("failed to parse balance response: %w", err)
	}

	return balanceResp.Value, nil
}

// GetRecentBlockhash returns a recent blockhash for transactions
func (s *SolanaClient) GetRecentBlockhash(ctx context.Context) (string, error) {
	result, err := s.call(ctx, "getLatestBlockhash", []interface{}{})
	if err != nil {
		return "", err
	}

	var blockHashResp struct {
		Context struct {
			Slot uint64 `json:"slot"`
		} `json:"context"`
		Value struct {
			Blockhash            string `json:"blockhash"`
			LastValidBlockHeight uint64 `json:"lastValidBlockHeight"`
		} `json:"value"`
	}

	if err := json.Unmarshal(result, &blockHashResp); err != nil {
		return "", fmt.Errorf("failed to parse blockhash response: %w", err)
	}

	return blockHashResp.Value.Blockhash, nil
}

// ConfirmTransaction waits for transaction confirmation
func (s *SolanaClient) ConfirmTransaction(ctx context.Context, signature string) (bool, error) {
	result, err := s.call(ctx, "getSignatureStatuses", []interface{}{
		[]string{signature},
		map[string]bool{"searchTransactionHistory": true},
	})
	if err != nil {
		return false, err
	}

	var statusResp struct {
		Context struct {
			Slot uint64 `json:"slot"`
		} `json:"context"`
		Value []struct {
			Slot               uint64      `json:"slot"`
			Confirmations      *int        `json:"confirmations"`
			ConfirmationStatus string      `json:"confirmationStatus"`
			Err                interface{} `json:"err"`
		} `json:"value"`
	}

	if err := json.Unmarshal(result, &statusResp); err != nil {
		return false, fmt.Errorf("failed to parse status response: %w", err)
	}

	if len(statusResp.Value) == 0 || statusResp.Value[0].ConfirmationStatus == "" {
		return false, nil // Not found yet
	}

	status := statusResp.Value[0]
	if status.Err != nil {
		return false, fmt.Errorf("transaction failed: %v", status.Err)
	}

	return status.ConfirmationStatus == "finalized" || status.ConfirmationStatus == "confirmed", nil
}

// GetAccountInfo returns account information
func (s *SolanaClient) GetAccountInfo(ctx context.Context, address string) (json.RawMessage, error) {
	return s.call(ctx, "getAccountInfo", []interface{}{
		address,
		map[string]string{"encoding": "jsonParsed"},
	})
}

// IsConfigured returns true if the client has valid RPC URL
func (s *SolanaClient) IsConfigured() bool {
	return s.rpcURL != ""
}

// GetNetwork returns the current network (mainnet/devnet/testnet)
func (s *SolanaClient) GetNetwork() string {
	if s.rpcURL == "" {
		return "unknown"
	}
	if s.rpcURL == "https://api.mainnet-beta.solana.com" ||
		s.rpcURL == "https://solana-mainnet.g.alchemy.com" {
		return "mainnet"
	}
	if s.rpcURL == "https://api.devnet.solana.com" {
		return "devnet"
	}
	if s.rpcURL == "https://api.testnet.solana.com" {
		return "testnet"
	}
	return "custom"
}
