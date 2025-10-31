# ⚠️ REQUIRED: Backend Environment Configuration

## 🔴 Current Error

You're seeing: **"Cannot read properties of undefined (reading 'ref')"**

**Cause:** Missing `backend/.env` file with Telr credentials.

---

## ✅ How to Fix (2 minutes)

### Step 1: Create `.env` File

In the `backend/` folder, create a file named `.env`:

```bash
cd /Users/utsavgautam/Downloads/MOBILEVIEW-main/MOBILEVIEW-main/backend

# Create .env file
cat > .env << 'EOF'
TELR_TEST_STORE_ID=your_test_store_id_here
TELR_TEST_AUTH_KEY=your_test_auth_key_here
TELR_LIVE_STORE_ID=
TELR_LIVE_AUTH_KEY=
TELR_USE_TEST_MODE=true
EOF
```

### Step 2: Edit with Your Credentials

```bash
nano .env
```

**Replace:**
- `your_test_store_id_here` → Your actual Telr Test Store ID
- `your_test_auth_key_here` → Your actual Telr Test Auth Key

**Example (with dummy values for reference):**
```env
TELR_TEST_STORE_ID=12345
TELR_TEST_AUTH_KEY=abc123def456
TELR_LIVE_STORE_ID=
TELR_LIVE_AUTH_KEY=
TELR_USE_TEST_MODE=true
```

**Save:** Press `Ctrl+O`, `Enter`, then `Ctrl+X`

### Step 3: Restart Backend

Go to the terminal running the backend and:
1. Press `Ctrl+C` to stop
2. Run: `python3 app.py`

---

## 🔑 Where to Get Telr Credentials

1. **Login** to Telr Merchant Dashboard: https://secure.telr.com/
2. **Navigate** to: Settings → API Configuration
3. **Copy:**
   - Test Store ID
   - Test Authentication Key
4. **Paste** into `backend/.env`

---

## 🧪 How to Verify It Works

After creating `.env` and restarting backend:

1. **Go to browser** (localhost:8084)
2. **Click "Proceed to Payment"**
3. **You should see:** "Redirecting to Telr..." ✅
4. **NOT:** "Cannot read properties..." ❌

---

## 📝 Quick Test

Create `.env` with these test values (won't actually work, but will test the flow):

```env
TELR_TEST_STORE_ID=test123
TELR_TEST_AUTH_KEY=testkey456
TELR_USE_TEST_MODE=true
```

Then restart backend and try payment. You'll get a different error (Telr will reject fake credentials), but it proves the `.env` file is being read.

---

## 🐛 Still Not Working?

### Check 1: File Location
```bash
ls -la /Users/utsavgautam/Downloads/MOBILEVIEW-main/MOBILEVIEW-main/backend/.env
```
Should show the file. If "No such file", create it.

### Check 2: File Contents
```bash
cat /Users/utsavgautam/Downloads/MOBILEVIEW-main/MOBILEVIEW-main/backend/.env
```
Should show your credentials.

### Check 3: Backend Logs
After restarting backend, you should see in terminal:
- ✅ If credentials loaded: No error
- ❌ If missing: "❌ Telr credentials not configured"

---

## ✅ Summary

**Problem:** Missing `.env` file  
**Solution:** Create `backend/.env` with Telr credentials  
**Result:** Payment will work! 🚀

---

*This is the ONLY remaining step to fix the payment flow!*

