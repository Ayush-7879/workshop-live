# Workshop Live

A full stack MERN app where admins run workshops and students join, learn and earn certificates.
When an admin marks a workshop **Live**, **Delayed** or **Cancelled**, every enrolled student gets an
instant real-time notification, with no page refresh.

Live: https://workshop-live-eight.vercel.app
(The backend runs on a free Render plan, so the first load can take about 20 seconds while it wakes up.)

## Features

**Two roles, one app**
- Admin and student sign-up and login (JWT). Role is checked on the server for every admin action.

**Workshops**
- Admin creates, edits and deletes workshops (online, offline or hybrid, with meeting link or location).
- Students request to join, and the admin accepts or rejects each request.
- **Go Live** (with a Zoom / Meet link), **Delay** (new time and reason), **Cancel** (with reason), **Complete**.
- A reminder goes to enrolled students about 30 minutes before a workshop starts.

**Real-time notifications (Socket.io)**
- Toast, bell icon and notification history for live, delayed, cancelled, accepted and reminder events.
- Students see a one-click "Join Live" button when a workshop goes live.

**Learning**
- Attendance is marked by the student while the workshop is live.
- Certificates are issued automatically when a workshop is completed and the student's overall attendance is at least 80%. Each certificate has a unique code that anyone can verify.
- Quizzes per workshop with automatic scoring and answer review (one attempt per student).
- Materials and file uploads, session recordings, and feedback with an admin results view.

**Engagement**
- Points for joining, attending and completing, badges (for example First Workshop, Quiz Master, Certified) and a leaderboard.

**Paid courses**
- Razorpay checkout (orders and signature verification) to unlock paid courses. Use Razorpay test keys while developing.

**Interface**
- Mobile-first responsive layout, dark mode, student directory and profile for admins.

## Tech stack
- Backend: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, bcryptjs, Multer
- Frontend: React (Vite), React Router, Axios, Socket.io-client
- Payments: Razorpay (REST, test mode)
- Hosting: Vercel (frontend), Render (backend), MongoDB Atlas (database)

## Project structure
```
workshop-app/
  backend/     Express API + Socket.io server (routes, models, middleware, utils)
  frontend/    React app (pages, components, context, api)
```

## Run it locally

### 1. MongoDB
Use a local MongoDB or a free MongoDB Atlas cluster and copy its connection string.

### 2. Backend
```bash
cd backend
cp .env.example .env
# fill in MONGO_URI and JWT_SECRET (and the Razorpay keys if you want to test payments)
npm install
npm run dev
```
Runs on `http://localhost:5000`.

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:5000
npm install
npm run dev
```
Opens on `http://localhost:5173`.

### 4. Try it
1. Register an admin (enter your `ADMIN_INVITE_CODE`), and a student in a private window.
2. Admin creates a workshop. Student asks to join. Admin accepts.
3. Admin clicks **Go Live**, **Delay** or **Cancel**. The student sees the update instantly.
4. Student marks attendance while live. Admin marks the workshop completed. The certificate appears.

## Environment variables (backend)
| Name | Purpose |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret for signing tokens |
| `CLIENT_URL` | Frontend URL allowed by CORS and Socket.io |
| `ADMIN_INVITE_CODE` | Private code required to register an admin (set it on Render too) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay keys (test keys for development) |

Never commit your `.env` file.

## Deployment
See `DEPLOYMENT_GUIDE.md` for the step-by-step guide (MongoDB Atlas, Render, Vercel; all free tier).
