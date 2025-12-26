# Memepump 🚀

[![CI/CD Pipeline](https://github.com/brahbrudi-sketch/memepump/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/brahbrudi-sketch/memepump/actions)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB?logo=react)
![Go](https://img.shields.io/badge/backend-Go%201.22-00ADD8?logo=go)
![Docker](https://img.shields.io/badge/container-Docker-2496ED?logo=docker)

**Memepump** ist eine moderne Fullstack-Meme-Coin-Plattform. Nutzer können eigene Meme-Coins erstellen, in Echtzeit chatten und den Preisverlauf über interaktive Charts verfolgen. Das Projekt ist vollständig dockerisiert und nutzt eine automatisierte CI/CD-Pipeline via GitHub Actions.

---

## ✨ Features

- 🪙 **Coin Launchpad**: Erstelle eigene Meme-Coins mit Name, Symbol und Emoji.
- 📊 **Real-time Charts**: Verfolge Preisänderungen live über Recharts-Integration.
- 💬 **Live Comments**: Echtzeit-Chat für jeden Coin via WebSockets.
- 📈 **Trading Simulator**: Simuliere Kauf- und Verkauf-Aktionen mit SOL.
- 👤 **Profile Management**: Erstelle Profile mit individuellen Avataren und Bios.
- ⚡ **High Performance**: Schnelles Go-Backend und optimiertes React-Frontend.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP-Client**: Axios

### Backend
- **Sprache**: Go (Golang) 1.22
- **API**: REST & WebSockets
- **Container**: Docker & Docker Compose

---

## 🚀 Schnelleinstieg (Entwicklung)

### Voraussetzungen
Stelle sicher, dass **Docker** und **Docker Compose** auf deinem System installiert sind.

### Starten
1. **Repository klonen**:
   ```bash
   git clone https://github.com/brahbrudi-sketch/memepump.git
   cd memepump
   ```

2. **Container lokal bauen und starten**:
   ```bash
   docker compose up --build
   ```

### URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api/v1

---

## 🏗 CI/CD & Deployment

Dieses Projekt nutzt GitHub Actions für Continuous Integration und Continuous Delivery.

- **Automatisierte Tests**: Bei jedem Push werden Backend (Go) und Frontend (Node/Vite) automatisch auf Build-Fehler geprüft.
- **Container Registry**: Nach einem erfolgreichen Build auf dem `main`-Branch werden die Docker-Images automatisch in die GitHub Container Registry (GHCR) gepusht.

### Produktions-Deployment
Auf dem Server müssen die Images nicht neu gebaut werden. Nutze die optimierte Produktions-Konfiguration, die die fertigen Images direkt von GitHub bezieht:

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 📁 Projektstruktur

```
.
├── .github/workflows   # GitHub Actions CI/CD Pipeline Definition
├── backend/            # Go Backend Quellcode & Dockerfile
├── frontend/           # React Frontend Quellcode, Tailwind & Nginx Config
├── docker-compose.yml  # Lokales Setup für die Entwicklung (Builds lokal)
├── docker-compose.prod.yml # Produktions-Setup (Nutzt GHCR Images)
└── README.md           # Diese Dokumentation
```

---

## 🛑 Stoppen & Cleanup

Um alle laufenden Container zu stoppen:
```bash
docker compose down
```

Um zusätzlich alle lokal gebauten Images zu entfernen:
```bash
docker compose down --rmi all
```

---

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

**Entwickelt von brahbrudi-sketch**