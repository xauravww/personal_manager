# Instagram Webhook Setup Guide

This guide walks you through setting up Instagram webhook integration to automatically save Instagram reels/posts to your resources when you share them to a designated account.

## Prerequisites

- Instagram Business or Creator account
- Facebook Page linked to your Instagram account
- Meta Developer account (free)
- Backend deployed with public HTTPS URL

## Step 1: Create Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Choose **Business** as the app type
4. Fill in:
   - **App Name**: Your app name (e.g., "Personal Manager Instagram")
   - **App Contact Email**: Your email
   - **Business Account**: Optional
5. Click **Create App**

## Step 2: Add Instagram Product

1. In your app dashboard, find **Add Products**
2. Click **Set Up** on the **Instagram** product
3. Navigate to **Instagram** → **Basic Display** in the left sidebar

## Step 3: Configure Webhook

1. In the Meta App dashboard, go to **Instagram** → **Configuration**
2. Under **Webhooks**, click **Edit**
3. Enter your webhook details:
   - **Callback URL**: `https://yourdomain.com/api/webhooks/instagram/webhook`
   - **Verify Token**: Create a secure random string and save it (this goes in your `.env`)
4. Subscribe to these webhook fields:
   - ✅ `mentions` - Triggered when someone mentions your account
   - ✅ `messages` - Triggered when someone DMs your account
5. Click **Verify and Save**

## Step 4: Configure Environment Variables

Add these to your `backend/.env` file:

```bash
# Generate a secure random token
INSTAGRAM_VERIFY_TOKEN=your_secure_random_token_123456

# Get this from Meta App Dashboard → Settings → Basic → App Secret
INSTAGRAM_APP_SECRET=abc123def456ghi789

# Your database user ID (run: SELECT id FROM users WHERE email='your@email.com')
INSTAGRAM_WEBHOOK_USER_ID=clxxxxxxxxxxxxxx
```

### Finding Your User ID

Run this query in your database:
```sql
SELECT id FROM users WHERE email = 'your@email.com';
```

## Step 5: Link Instagram Account

1. In Meta App dashboard, go to **Instagram** → **Test Users**
2. Add your Instagram Business account
3. Accept the connection on Instagram

## Step 6: Deploy Backend

Your backend must be accessible via HTTPS for Meta to send webhooks.

**Local Development**: Use ngrok or similar:
```bash
ngrok http 3001
# Use the HTTPS URL as your webhook callback URL
```

**Production**: Deploy to Render, Railway, Heroku, etc. with HTTPS enabled.

## Step 7: Test the Webhook

### Method 1: Share via DM
1. On Instagram, find any reel or post you want to save
2. Click **Share** → **Send in Direct**
3. Send it to your designated Instagram account
4. Check your backend logs - you should see webhook notifications
5. Check Resources page - the post should be saved!

### Method 2: Mention in Story
1. Share an Instagram reel/post to your story
2. Tag/mention your designated account
3. Webhook will be triggered
4. Content automatically saved to resources

## Verification

Check if webhook is working:

1. **Backend Logs**: Should show `📱 Received Instagram webhook:`
2. **Resources Page**: New resource should appear
3. **Meta Dashboard**: **Instagram** → **Webhooks** → Shows recent deliveries

## Troubleshooting

### Webhook not verifying
- Ensure `INSTAGRAM_VERIFY_TOKEN` matches what you entered in Meta dashboard
- Check that backend is reachable via public HTTPS URL
- Verify the callback URL is correct: `https://yourdomain.com/api/webhooks/instagram/webhook`

### Not receiving webhook events
- Confirm you've subscribed to `mentions` and `messages` fields
- Check Instagram account is properly linked in Meta dashboard
- Verify webhook is active (green status in dashboard)

### Content not saving
- Check `INSTAGRAM_WEBHOOK_USER_ID` is correct
- Verify `INSTAGRAM_APP_SECRET` is correct (used for signature verification)
- Check backend logs for errors

### Signature verification failing
- Ensure `INSTAGRAM_APP_SECRET` matches the one in Meta App → Settings → Basic
- Verify webhook payload is not modified by any middleware

## Usage

Once set up:
1. **Share to Save**: Send any Instagram content to your designated account
2. **Automatic Processing**: Backend scrapes metadata, categorizes with AI
3. **Instant Search**: Find your saved content immediately in search

## Security Notes

- ✅ Webhook uses signature verification (HMAC-SHA256)
- ✅ All webhook requests are validated
- ✅ Only content you explicitly share is saved
- ✅ No automatic scraping or API polling

## Rate Limits

Instagram webhooks have generous limits:
- No strict limit for personal use
- Meta may throttle if abuse detected
- Recommended: Less than 100 shares per day

## Support

If you encounter issues:
1. Check Meta Developer [documentation](https://developers.facebook.com/docs/instagram/webhooks)
2. Review backend error logs
3. Test with Meta's webhook testing tool in developer dashboard
