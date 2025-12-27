package ipfs

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"time"
)

// Client handles IPFS/Pinata interactions
type Client struct {
	pinataAPIKey    string
	pinataSecretKey string
	httpClient      *http.Client
	gatewayURL      string
}

// TokenMetadata represents the JSON metadata for a token
type TokenMetadata struct {
	Name        string            `json:"name"`
	Symbol      string            `json:"symbol"`
	Description string            `json:"description"`
	Image       string            `json:"image"`
	ExternalURL string            `json:"external_url,omitempty"`
	Attributes  []MetadataAttr    `json:"attributes,omitempty"`
	Properties  map[string]string `json:"properties,omitempty"`
}

// MetadataAttr represents a single attribute in metadata
type MetadataAttr struct {
	TraitType string      `json:"trait_type"`
	Value     interface{} `json:"value"`
}

// PinataResponse represents the response from Pinata API
type PinataResponse struct {
	IpfsHash    string `json:"IpfsHash"`
	PinSize     int    `json:"PinSize"`
	Timestamp   string `json:"Timestamp"`
	IsDuplicate bool   `json:"isDuplicate,omitempty"`
}

// NewClient creates a new IPFS client
func NewClient() *Client {
	apiKey := os.Getenv("PINATA_API_KEY")
	secretKey := os.Getenv("PINATA_SECRET_KEY")
	gateway := os.Getenv("IPFS_GATEWAY")

	if gateway == "" {
		gateway = "https://gateway.pinata.cloud/ipfs"
	}

	return &Client{
		pinataAPIKey:    apiKey,
		pinataSecretKey: secretKey,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		gatewayURL: gateway,
	}
}

// IsConfigured returns true if IPFS client has valid credentials
func (c *Client) IsConfigured() bool {
	return c.pinataAPIKey != "" && c.pinataSecretKey != ""
}

// UploadImage uploads an image to IPFS via Pinata
func (c *Client) UploadImage(data []byte, filename string) (string, error) {
	if !c.IsConfigured() {
		return "", fmt.Errorf("IPFS client not configured - set PINATA_API_KEY and PINATA_SECRET_KEY")
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err := part.Write(data); err != nil {
		return "", fmt.Errorf("failed to write file data: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS", body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("pinata_api_key", c.pinataAPIKey)
	req.Header.Set("pinata_secret_api_key", c.pinataSecretKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to upload to Pinata: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Pinata API error: %s - %s", resp.Status, string(bodyBytes))
	}

	var pinataResp PinataResponse
	if err := json.NewDecoder(resp.Body).Decode(&pinataResp); err != nil {
		return "", fmt.Errorf("failed to decode Pinata response: %w", err)
	}

	return pinataResp.IpfsHash, nil
}

// UploadJSON uploads JSON metadata to IPFS
func (c *Client) UploadJSON(metadata TokenMetadata) (string, error) {
	if !c.IsConfigured() {
		return "", fmt.Errorf("IPFS client not configured - set PINATA_API_KEY and PINATA_SECRET_KEY")
	}

	jsonData, err := json.Marshal(metadata)
	if err != nil {
		return "", fmt.Errorf("failed to marshal metadata: %w", err)
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", "metadata.json")
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err := part.Write(jsonData); err != nil {
		return "", fmt.Errorf("failed to write JSON data: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close writer: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.pinata.cloud/pinning/pinFileToIPFS", body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("pinata_api_key", c.pinataAPIKey)
	req.Header.Set("pinata_secret_api_key", c.pinataSecretKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to upload to Pinata: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Pinata API error: %s - %s", resp.Status, string(bodyBytes))
	}

	var pinataResp PinataResponse
	if err := json.NewDecoder(resp.Body).Decode(&pinataResp); err != nil {
		return "", fmt.Errorf("failed to decode Pinata response: %w", err)
	}

	return pinataResp.IpfsHash, nil
}

// GetGatewayURL returns the public gateway URL for an IPFS hash
func (c *Client) GetGatewayURL(cid string) string {
	return fmt.Sprintf("%s/%s", c.gatewayURL, cid)
}

// PinByCID pins an existing CID to Pinata (useful for migration)
func (c *Client) PinByCID(cid string, name string) error {
	if !c.IsConfigured() {
		return fmt.Errorf("IPFS client not configured")
	}

	payload := map[string]interface{}{
		"hashToPin": cid,
		"pinataMetadata": map[string]string{
			"name": name,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.pinata.cloud/pinning/pinByHash", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("pinata_api_key", c.pinataAPIKey)
	req.Header.Set("pinata_secret_api_key", c.pinataSecretKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to pin CID: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Pinata API error: %s - %s", resp.Status, string(bodyBytes))
	}

	return nil
}
