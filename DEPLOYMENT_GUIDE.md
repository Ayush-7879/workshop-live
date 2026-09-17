# Deployment Guide (Making It Live on the Internet)

This guide uses 3 free services:
1. **MongoDB Atlas** — Database
2. **Render** — Backend (Node.js + Socket.io)
3. **Vercel** — Frontend (React)

Total time: 20-30 minutes.

---

## Step 0: Push to GitHub

Your GitHub repo: **https://github.com/Ayush-7879/workshop-live**

Run these commands in your terminal, inside `D:\worshop`:

```bash
cd D:\worshop
git init
git add .
git commit -m "Initial commit: Workshop Live app"
git branch -M main
git remote add origin https://github.com/Ayush-7879/workshop-live.git
git push -u origin main
```

The first push may open a browser window asking you to log into GitHub —
sign in there and it will continue automatically. A root `.gitignore` is
already in place so `node_modules`, `.env` and `dist` never get pushed —
your secret keys stay off GitHub.

---

## Step 1: MongoDB Atlas (Database)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account
2. "Build a Database" → select the **Free (M0)** tier → choose any region → Create
3. In the left menu, go to "Database Access" → "Add New Database User" → create a username/password (remember it)
4. In the left menu, go to "Network Access" → "Add IP Address" → select **"Allow Access from Anywhere" (0.0.0.0/0)** (needed so Render can connect)
5. Go to "Database" → click "Connect" on your cluster → "Drivers" → copy the connection string. It will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with your actual credentials, and add a database name at the end:
   ```
   mongodb+srv://myuser:mypass123@cluster0.xxxxx.mongodb.net/workshop-app?retryWrites=true&w=majority
   ```
   Save this full string somewhere safe — you'll need it in Step 2.

---

## Step 2: Deploy the Backend (Render)

1. Create an account at https://render.com (you can sign in with GitHub)
2. From the dashboard, click "New +" → "Web Service"
3. Connect and select your `Ayush-7879/workshop-live` GitHub repo
4. Fill in the settings:
   - **Name**: `workshop-backend` (or whatever you like)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Under "Environment Variables", add:
   - `MONGO_URI` = the connection string from Step 1
   - `JWT_SECRET` = any long random string (e.g. `abc123xyz789supersecretkey`)
   - `CLIENT_URL` = set it to `*` for now (we'll update this to your Vercel URL after Step 3)
   - `PORT` = `5000` (Render also sets its own PORT, so this is optional)
   - `RAZORPAY_KEY_ID` = your Razorpay test (or live) Key ID, e.g. `rzp_test_TdGRGpEqIYpcBe`
   - `RAZORPAY_KEY_SECRET` = your Razorpay Key Secret
6. Click "Create Web Service". It will deploy in 2-3 minutes.
7. Once deployed, you'll get a URL at the top like: `https://workshop-backend.onrender.com` — copy it.

> Note: Render's free tier "sleeps" after 15 minutes of inactivity — the first request after that may be slow (20-30 sec), then it runs at normal speed.

> Note: file uploads (materials/recordings/avatars) are saved to the backend's local disk (`backend/uploads/`). Render's free tier does **not** persist local disk across restarts/redeploys — uploaded files can disappear when the service restarts. For production use, consider Render's paid persistent disk add-on, or swapping the upload storage for a service like Cloudinary/S3 later.

---

## Step 3: Deploy the Frontend (Vercel)

1. Create an account at https://vercel.com (sign in with GitHub)
2. "Add New" → "Project" → select your `Ayush-7879/workshop-live` GitHub repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. Under "Environment Variables", add:
   - `VITE_API_URL` = the Render backend URL from Step 2 (e.g. `https://workshop-backend.onrender.com`)
5. Click "Deploy". It'll go live in 1-2 minutes with a URL like:
   `https://workshop-app.vercel.app`

---

## Step 4: Tell the Backend Your Frontend URL (CORS fix)

1. Copy your Vercel URL (e.g. `https://workshop-app.vercel.app`)
2. Go to your Render dashboard → your backend service → "Environment"
3. Change the `CLIENT_URL` variable from `*` to your actual Vercel URL:
   `https://workshop-app.vercel.app`
4. Save — Render will automatically restart/redeploy (30-60 sec)

Your app is now live! You can share the Vercel URL with anyone.

---

## Testing Checklist (after deployment)

1. Open your Vercel URL → register an admin account
2. In a new incognito tab, register a student account
3. Create a workshop as admin and add a meet/zoom link
4. Join that workshop as the student
5. Click "Go Live" / "Delay" / "Cancel" from the admin dashboard — the student
   tab should **instantly** (no refresh) show the red "LIVE" badge, a toast
   notification, and the "Join Live" button
6. Test "Delay" and "Cancel" the same way
7. Create a paid course from the admin's "💰 Paid Courses" tab and try buying
   it as a student with a Razorpay test card (see below)

If the student side doesn't update, check:
- Whether Render's `CLIENT_URL` matches your actual Vercel URL
- Whether Vercel's `VITE_API_URL` matches your actual Render URL
- Whether the Render service is "sleeping" (the first request can be slow)

### Razorpay test card (test mode only)

- Card number: `4111 1111 1111 1111`
- Any future expiry date, any CVV, any name
- OTP (if asked): `1234` or auto-approved in test mode

---

## Future Improvements (optional)

- Email/SMS notifications (SendGrid, Twilio) when a workshop goes live/is cancelled
- Custom in-app video calling (WebRTC/Agora/LiveKit) instead of a Zoom/Meet link
- Move uploaded files (materials, recordings, avatars) to Cloudinary/S3 so they survive Render restarts
- Switch Razorpay from test mode to live mode keys once you're ready to accept real payments
