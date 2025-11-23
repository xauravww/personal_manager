# Instagram Webhook Configuration - Ready to Enter

## 📋 Copy These Exact Values into Meta Developer Portal

### **Callback URL** (paste in first field):
```
https://7f656cf0dc49.ngrok-free.app/api/webhooks/instagram/webhook
```

### **Verify token** (paste in second field):
```
InstagramWebhook2024_Secure!
```

---

## ⚙️ Add to Your backend/.env File

Add these 3 lines to `/media/saurav/PROJECTS1/personal_manager/backend/.env`:

```bash
INSTAGRAM_VERIFY_TOKEN=InstagramWebhook2024_Secure!
INSTAGRAM_APP_SECRET=CLICK_SHOW_BUTTON_IN_SCREENSHOT
INSTAGRAM_WEBHOOK_USER_ID=YOUR_USER_ID_HERE
```

### How to get each value:

**INSTAGRAM_APP_SECRET**: 
- In your screenshot, click the "Show" button next to the dots (••••••••)
- Copy that value and paste it in .env

**INSTAGRAM_WEBHOOK_USER_ID**:
- Run this in your database:
```sql
SELECT id FROM users LIMIT 1;
```
- Or if you know your email:
```sql
SELECT id FROM users WHERE email = 'your@email.com';
```

---

## ✅ Steps to Complete Setup

1. **In Meta Portal** (your screenshot):
   - Paste the Callback URL
   - Paste the Verify token
   - Click "Verify and Save"
   - Subscribe to **messages** and **mentions** fields

2. **In your .env file**:
   - Add the 3 environment variables above
   - Get App Secret from screenshot by clicking "Show"
   - Get User ID from database query

3. **Restart your backend**:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   npm run dev
   ```

4. **Test**:
   - Share an Instagram reel to your account (noobtbhacker)
   - Check backend logs
   - Verify resource appears in your app

---

## 🎯 What Will Happen

1. You click "Verify and Save" → Meta sends GET request
2. Your backend responds with challenge → ✅ Verified
3. You share Instagram content → Meta sends POST request
4. Backend scrapes, categorizes, saves → 🎉 Done!
