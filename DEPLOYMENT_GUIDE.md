# Deployment Guide

This guide deploys the app on three free services:

1. MongoDB Atlas for the database
2. Render for the backend (Node.js, Express, Socket.io)
3. Vercel for the frontend (React, Vite)

Requirements: the code in a GitHub repository, and Node.js 18 or newer if you want to build locally first.

## Step 1: MongoDB Atlas

1. Create a free account at https://www.mongodb.com/cloud/atlas/register and build a free (M0) cluster.
2. Database Access: add a database user with a username and password.
3. Network Access: add `0.0.0.0/0` so Render can connect. Render's free plan has no fixed IP, so access is protected by the database user and password.
4. Database, Connect, Drivers: copy the connection string and add a database name before the `?`:
   ```
   mongodb+srv://<username>:<password>@<cluster-host>/workshop-app?retryWrites=true&w=majority
   ```

The database needs no manual setup. Collections are created on first use.

## Step 2: Backend on Render

1. In Render choose New, Web Service, and connect the GitHub repository.
2. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free
3. Environment variables:

   | Name | Value |
   |---|---|
   | `MONGO_URI` | Connection string from Step 1 |
   | `JWT_SECRET` | A long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `CLIENT_URL` | The Vercel URL from Step 3. Use the exact origin, for example `https://your-app.vercel.app`, with no trailing slash |
   | `NODE_ENV` | `production` |
   | `ADMIN_INVITE_CODE` | Only if you already have data from before institutes existed. It becomes the admin code of the default institute |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay keys. Use test keys unless you accept real payments |

4. Deploy. The service URL looks like `https://<name>.onrender.com`.

Render's free plan sleeps after about 15 minutes of inactivity, so the first request afterwards can take 20 to 30 seconds. Uploaded files are stored on local disk and are lost on restart on the free plan.

## Step 3: Frontend on Vercel

1. In Vercel choose Add New, Project, and import the repository.
2. Settings:
   - Root Directory: `frontend`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Environment variable: `VITE_API_URL` set to the Render URL from Step 2.
4. Deploy. `frontend/vercel.json` rewrites all paths to `index.html` so React Router routes work on refresh.

`VITE_API_URL` is read at build time. After changing it, redeploy the frontend.

## Step 4: Connect the two

Set `CLIENT_URL` on Render to the final Vercel URL and let Render redeploy. This is what allows the browser and Socket.io connection to reach the backend.

## First use

1. Open the frontend and go to `/register-institute` (link "For institutes" in the menu).
2. Create the institute and admin account.
3. In the admin dashboard open the tab "Institute codes" and copy the student code.
4. Students register with that code and the role Student.

If you deployed an earlier version that already had users and workshops, the first start moves them into a default institute. Log in with an existing admin account and read the codes in the same tab.

## Local production build check

```bash
cd frontend
npm install
npm run build        # output in frontend/dist
npm run preview

cd ../backend
npm install
npm test             # needs MongoDB on localhost:27017
```

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Live updates and notifications do not appear | `CLIENT_URL` on Render does not match the Vercel URL, or `VITE_API_URL` on Vercel does not match the Render URL. Fix and redeploy |
| Requests fail with a CORS error | `CLIENT_URL` has a trailing slash or the wrong origin |
| First page load is very slow | The Render free service was asleep. Wait about 20 seconds |
| Everyone is logged out after an update | Expected once after the institutes release. Tokens without an institute are rejected, so log in again |
| Registration says "Invalid institute code" | Use the student code with role Student, or the admin code with role Admin. A regenerated code replaces the old one |
| Backend exits on start | `MONGO_URI` is wrong or the IP is not allowed in Atlas Network Access. Check the Render logs |
| Uploaded files disappear | Render free plan disk is not persistent. Use object storage for production |
| Razorpay order fails | The Razorpay keys are missing or wrong on Render |

## Razorpay test mode

With test keys, use card number `4111 1111 1111 1111`, any future expiry date, any CVV and any name. See the Razorpay documentation for current test details.
