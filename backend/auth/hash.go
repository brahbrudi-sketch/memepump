package auth

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPin hashes a PIN using bcrypt
func HashPin(pin string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}

// VerifyPin compares a hashed PIN with a plain text PIN
func VerifyPin(hashedPin, pin string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPin), []byte(pin))
	return err == nil
}
