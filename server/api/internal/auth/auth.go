package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Plan  string `json:"plan"` // free | pro | team
}

func Sign(secret, userID, email, plan string, ttl time.Duration) (string, error) {
	payload := map[string]any{
		"sub": userID, "email": email, "plan": plan,
		"exp": time.Now().Add(ttl).Unix(),
	}
	body, _ := json.Marshal(payload)
	enc := base64.RawURLEncoding.EncodeToString(body)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(enc))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return enc + "." + sig, nil
}

func Parse(secret, token string) (*User, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return nil, fmt.Errorf("bad token")
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0]))
	want := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(want), []byte(parts[1])) {
		return nil, fmt.Errorf("bad signature")
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, err
	}
	var p struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
		Plan  string `json:"plan"`
		Exp   int64  `json:"exp"`
	}
	if err := json.Unmarshal(raw, &p); err != nil {
		return nil, err
	}
	if time.Now().Unix() > p.Exp {
		return nil, fmt.Errorf("expired")
	}
	return &User{ID: p.Sub, Email: p.Email, Plan: p.Plan}, nil
}
