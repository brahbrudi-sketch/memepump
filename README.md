# Memepump 🚀

Dockerisiertes Fullstack-Projekt mit:
- **Backend:** Go
- **Frontend:** React (Vite) + Tailwind
- **Container:** Docker & Docker Compose

---

## 📦 Voraussetzungen

Auf dem Rechner müssen installiert sein:

- Docker  
- Docker Compose  
- Git  

(Getestet unter macOS & Linux, Windows mit WSL2 funktioniert ebenfalls)

---

## ▶️ Projekt starten

```bash
git clone https://github.com/DEINNAME/memepump.git
cd memepump
docker compose up --build
⏳ Beim ersten Start dauert es etwas, da alle Docker Images gebaut werden.
🌐 Erreichbare Services
Service	URL
Frontend	http://localhost:5173
Backend	http://localhost:8080
⚠️ Hinweis:
Port 3000 wird nicht verwendet (z.B. wegen Grafana).
🛑 Projekt stoppen
Im Terminal:
CTRL + C
Oder Container sauber stoppen:
docker compose down
🧠 Wichtige Hinweise
Das Frontend erreicht das Backend über den Docker-Servicenamen:
http://backend:8080
localhost wird nicht innerhalb von Containern verwendet
Alle Abhängigkeiten laufen isoliert in Docker
🧪 Entwicklung
Code-Änderungen erfordern aktuell einen Rebuild:
docker compose up --build
(Hot Reload kann später ergänzt werden)
🧼 Cleanup (optional)
Alle Container und Images entfernen:
docker compose down --rmi all
📁 Projektstruktur
memepump
├── backend
├── frontend
├── docker-compose.yml
└── README.md
👤 Kontakt
Bei Fragen einfach melden 🙂