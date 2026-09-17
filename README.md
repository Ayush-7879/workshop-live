# Workshop Live App

A full app: admins create workshops, students join them. Whenever an admin
marks a workshop as **Live**, **Cancelled**, or **Delayed**, every enrolled
student gets an instant real-time notification — no refresh needed.

## Features
- Admin login/register and Student login/register (one app, role selected at signup)
- Admin: create/edit workshops, **Go Live** (with Zoom/Meet link), **Delay**
  (new time + reason), **Cancel** (with reason), delete
- Student: browse workshops, join them, view their joined workshops
- Real-time updates: instant push notifications via Socket.io (toast + bell
  icon + history) whenever a workshop goes live/cancelled/delayed
- When a workshop goes live, students get a "Join Live" button that opens
  the Zoom/Google Meet link directly

## Tech Stack
- Backend: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT auth
- Frontend: React (Vite), React Router, Axios, Socket.io-client

## Folder Structure
```
workshop-app/
  backend/     -> Express API + Socket.io server
  frontend/    -> React app
```

## Local Setup (to run on your own computer)

### 1. MongoDB
Create a free MongoDB Atlas account: https://www.mongodb.com/cloud/atlas/register
Create a cluster and copy the connection string (as shown in `.env.example`).

### 2. Backend
```bash
cd backend
cp .env.example .env
# fill in MONGO_URI and JWT_SECRET in .env
npm install
npm run dev
```
The backend will run on `http://localhost:5000`.

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# keep VITE_API_URL=http://localhost:5000 (change it if the backend runs on a different URL)
npm install
npm run dev
```
The frontend will open on `http://localhost:5173`.

### 4. Testing it
1. Register an admin account (role = Admin)
2. In a new browser tab / incognito window, register a student account
3. Create a workshop from the admin dashboard
4. "Join" that workshop from the student dashboard
5. Click "Go Live" / "Delay" / "Cancel" as admin — the student side will
   instantly show the notification and status update, without a page refresh

## Deployment (to make it live on the internet)
See the `DEPLOYMENT_GUIDE.md` file — a step-by-step guide (MongoDB Atlas +
Render + Vercel, all free tier).
