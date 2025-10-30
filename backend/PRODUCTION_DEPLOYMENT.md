# 🚀 Production Deployment Guide

This guide explains how to deploy the HotelRBS backend in production mode using **Gunicorn** instead of Flask's development server.

---

## 📋 Table of Contents
1. [Why Production Server?](#why-production-server)
2. [Quick Start](#quick-start)
3. [Manual Setup](#manual-setup)
4. [Configuration](#configuration)
5. [Deployment Options](#deployment-options)
6. [Monitoring & Logs](#monitoring--logs)
7. [Troubleshooting](#troubleshooting)

---

## ❌ Why Production Server?

### Development Server (`python3 app.py`) - NOT for Production
- ❌ Single-threaded (can't handle concurrent requests)
- ❌ No worker process management
- ❌ Limited performance
- ❌ Auto-reloads on code changes (resource intensive)
- ❌ Not secure for public deployment
- ⚠️ **Warning:** "This is a development server. Do not use it in a production deployment."

### Production Server (Gunicorn) - ✅ Recommended
- ✅ Multi-threaded/multi-process
- ✅ Worker process management & auto-restart
- ✅ Production-grade performance
- ✅ Battle-tested security
- ✅ Graceful restarts & zero-downtime deployment
- ✅ Handles 100s of concurrent requests

---

## 🚀 Quick Start

### Option 1: Using the Startup Script (Easiest)

```bash
cd /Users/utsavgautam/Downloads/MOBILEVIEW-main/MOBILEVIEW-main/backend
chmod +x start-production.sh
./start-production.sh
```

That's it! Your server will be running on `http://0.0.0.0:5001`

---

## 🔧 Manual Setup

### Step 1: Install Gunicorn

```bash
cd /Users/utsavgautam/Downloads/MOBILEVIEW-main/MOBILEVIEW-main/backend
pip3 install gunicorn==21.2.0
```

### Step 2: Verify Installation

```bash
gunicorn --version
```

Should output: `gunicorn (version 21.2.0)`

### Step 3: Run Production Server

```bash
gunicorn -c gunicorn.conf.py app:app
```

---

## ⚙️ Configuration

### Gunicorn Configuration (`gunicorn.conf.py`)

The configuration is already set up with production-ready defaults:

| Setting | Value | Description |
|---------|-------|-------------|
| **Workers** | `CPU cores × 2 + 1` | Auto-scales based on your CPU |
| **Bind Address** | `0.0.0.0:5001` | Accessible from any network interface |
| **Worker Class** | `sync` | Synchronous workers (change to `gevent` for async) |
| **Timeout** | `30 seconds` | Worker timeout |
| **Max Requests** | `1000` | Restart workers after 1000 requests (prevents memory leaks) |
| **Logging** | `stdout/stderr` | Real-time logs |

### Customizing Workers

Edit `gunicorn.conf.py`:

```python
# For a machine with 4 CPU cores:
workers = 4  # Fixed number instead of auto-detect

# For async workloads (requires gevent):
worker_class = "gevent"
worker_connections = 1000
```

---

## 🌐 Deployment Options

### 1. Local Development/Testing

```bash
# Development server (for testing only)
python3 app.py

# Production server (local testing)
gunicorn -c gunicorn.conf.py app:app
```

### 2. Production Server (VPS/EC2)

```bash
# Install dependencies
pip3 install -r requirements.txt

# Run with nohup (keeps running after logout)
nohup gunicorn -c gunicorn.conf.py app:app > gunicorn.log 2>&1 &

# Or use systemd (recommended)
sudo systemctl start hotelrbs-backend
```

### 3. Using Systemd (Linux - Recommended)

Create `/etc/systemd/system/hotelrbs-backend.service`:

```ini
[Unit]
Description=HotelRBS Backend API
After=network.target

[Service]
Type=notify
User=ubuntu
WorkingDirectory=/path/to/backend
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/local/bin/gunicorn -c gunicorn.conf.py app:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hotelrbs-backend
sudo systemctl start hotelrbs-backend
sudo systemctl status hotelrbs-backend
```

### 4. Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
```

Build and run:

```bash
docker build -t hotelrbs-backend .
docker run -d -p 5001:5001 --env-file .env hotelrbs-backend
```

### 5. Behind Nginx (Reverse Proxy)

Nginx configuration:

```nginx
server {
    listen 80;
    server_name api.hotelrbs.com;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 📊 Monitoring & Logs

### View Real-time Logs

```bash
# If using systemd
sudo journalctl -u hotelrbs-backend -f

# If using nohup
tail -f gunicorn.log

# If running in foreground
# Logs will appear in terminal
```

### Log Format

The access log includes:
- Client IP
- Request method and path
- Response status code
- Response time
- User agent

### Health Check

Test if server is running:

```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Hotel Booking Backend is running"
}
```

---

## 🔍 Troubleshooting

### Issue: "Address already in use"

```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or use the helper command
pkill -f "gunicorn"
```

### Issue: "Operation not permitted" on macOS

This happens when trying to bind to `0.0.0.0` in the Downloads folder.

**Solution 1:** Move project out of Downloads
```bash
mv ~/Downloads/MOBILEVIEW-main ~/Projects/hotelrbs
cd ~/Projects/hotelrbs/backend
gunicorn -c gunicorn.conf.py app:app
```

**Solution 2:** Use `127.0.0.1` instead
Edit `gunicorn.conf.py`:
```python
bind = "127.0.0.1:5001"  # Instead of 0.0.0.0:5001
```

### Issue: SSL Certificate Errors (pip install)

```bash
# Option 1: Use --trusted-host
pip3 install --trusted-host pypi.org --trusted-host files.pythonhosted.org gunicorn

# Option 2: Update certificates (macOS)
pip3 install --upgrade certifi
/Applications/Python\ 3.11/Install\ Certificates.command
```

### Issue: Workers timing out

Increase timeout in `gunicorn.conf.py`:
```python
timeout = 60  # Increase from 30 to 60 seconds
```

### Issue: High memory usage

Reduce workers or enable max_requests:
```python
workers = 2  # Reduce number of workers
max_requests = 500  # Restart workers more frequently
```

---

## 🎯 Best Practices

1. **Environment Variables**: Always use `.env` file for sensitive data
2. **Workers**: Start with `(CPU cores × 2) + 1`, adjust based on load
3. **Logging**: Enable access logs for monitoring traffic
4. **Health Checks**: Set up automated health checks
5. **Graceful Shutdown**: Use `SIGTERM` for graceful worker shutdown
6. **Zero Downtime**: Use `--reload` flag for code updates without downtime
7. **SSL/TLS**: Use Nginx with Let's Encrypt for HTTPS
8. **Firewall**: Only expose port 80/443, keep 5001 internal

---

## 📈 Performance Comparison

| Metric | Development Server | Gunicorn (4 workers) |
|--------|-------------------|----------------------|
| Concurrent Requests | 1 | 100+ |
| Requests/sec | ~10 | ~500+ |
| Memory Usage | ~50MB | ~200MB |
| CPU Usage | Low | Efficient |
| Auto-restart on crash | ❌ | ✅ |
| Production-ready | ❌ | ✅ |

---

## 🚦 Quick Commands Reference

```bash
# Development mode (testing only)
python3 app.py

# Production mode (manual)
gunicorn -c gunicorn.conf.py app:app

# Production mode (script)
./start-production.sh

# Run in background (nohup)
nohup gunicorn -c gunicorn.conf.py app:app > gunicorn.log 2>&1 &

# Graceful reload (zero downtime)
kill -HUP <master_pid>

# Stop all Gunicorn processes
pkill -f "gunicorn"

# View logs
tail -f gunicorn.log

# Check health
curl http://localhost:5001/health
```

---

## ✅ Deployment Checklist

- [ ] `.env` file created with Telr credentials
- [ ] Dependencies installed (`pip3 install -r requirements.txt`)
- [ ] Gunicorn installed (`pip3 install gunicorn`)
- [ ] Configuration reviewed (`gunicorn.conf.py`)
- [ ] Server started successfully
- [ ] Health check passes (`curl http://localhost:5001/health`)
- [ ] Frontend can connect to backend
- [ ] Logs are being generated
- [ ] SSL/TLS configured (if public-facing)
- [ ] Firewall rules configured
- [ ] Monitoring/alerts set up

---

## 🆘 Support

If you encounter issues:

1. Check logs: `tail -f gunicorn.log`
2. Verify health: `curl http://localhost:5001/health`
3. Check processes: `ps aux | grep gunicorn`
4. Review configuration: `cat gunicorn.conf.py`
5. Test with development server first: `python3 app.py`

---

**For development:** Use `python3 app.py`  
**For production:** Use `gunicorn -c gunicorn.conf.py app:app`

