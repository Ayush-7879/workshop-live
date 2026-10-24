# Workshop Live

A full stack MERN application for running workshops. Admins create workshops and control their status, students join and learn, and every status change reaches enrolled students in real time. Each institute works in its own isolated space.

Live demo: https://workshop-live-eight.vercel.app
The backend runs on a free Render plan, so the first request after a period of inactivity can take about 20 seconds.

## Problem statement

When a session is delayed or cancelled, learners are often the last to know. Workshop Live sends an instant notification to every enrolled student when an admin marks a workshop Live, Delayed or Cancelled, and keeps attendance, learning material, quizzes and certificates in one place.

## Features

- Roles: admin (organizer) and student, enforced on the server for every protected route.
- Institutes: an institute registers itself and receives a student code and an admin code. Users join an institute by entering its code.
- Workshops: create, edit and delete; online, offline or hybrid; join requests that an admin accepts or rejects.
- Status control: Go Live (with meeting link), Delay (new time and reason), Cancel (with reason) and Complete.
- Real-time notifications over Socket.io, plus a reminder about 30 minutes before a workshop starts.
- Attendance marked by the student while the workshop is live.
- Certificates issued automatically on completion when overall attendance is at least 80 percent. Each has a unique verification code.
- Quizzes with automatic scoring and answer review (one attempt per student).
- Materials and file uploads, session recordings with chapters, and feedback with an admin results view.
- Points, badges and a leaderboard.
- Paid courses with Razorpay checkout (test mode keys recommended).
- Responsive layout and dark mode.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, socket.io-client |
| Backend | Node.js, Express, Socket.io, JWT, bcryptjs, Multer |
| Database | MongoDB with Mongoose |
| Security | Helmet, express-rate-limit |
| Payments | Razorpay REST API |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

## Repository structure

```
backend/
  server.js            Express app, Socket.io server, reminder job
  config/db.js         MongoDB connection
  middleware/          auth (JWT, role check), upload (Multer)
  models/              Mongoose schemas
  routes/              One file per API area
  utils/               scope (institute isolation), validate, errors, badges, razorpay, migration
  scripts/institutes.js  CLI to list or create institutes
  tests/api.test.js    Integration tests (node:test)
frontend/
  src/pages/           Route-level pages
  src/components/      Dashboard widgets and shared UI
  src/context/         Auth and theme providers
  src/api/axios.js     API client
DEPLOYMENT_GUIDE.md    Step-by-step hosting guide
```

## Architecture

- The React app calls the REST API under `/api` with an `Authorization: Bearer <token>` header. The base URL comes from `VITE_API_URL`.
- After login the browser opens a Socket.io connection with the same token. The server joins each socket to a personal room, to an institute room and, on request, to a workshop room, and emits notifications to those rooms.
- MongoDB stores users, institutes, workshops, quizzes, attempts, certificates, recordings, resources, feedback, notifications, courses and payments.
- Uploaded files are stored on the backend disk under `backend/uploads` and served from `/uploads`.

## Authentication and authorization

- Passwords are hashed with bcrypt. Login returns a signed JWT (7 days) containing the user id, role and institute id.
- `auth` middleware verifies the token. `adminOnly` checks the role claim. Tokens without an institute claim are rejected, which forces re-login.
- Login and register are rate limited per IP, and institute creation is limited further. Request bodies are type-checked to reject operator objects such as `{"$gt": ""}`.
- The institute code decides both the institute and the role: the student code creates a student and the admin code creates an admin. The client cannot choose a role without a valid admin code.

## Institutes and data isolation

- `User`, `Workshop` and `Course` store an `institute` reference. Quizzes, resources, recordings and feedback are reached through their workshop.
- Routes that take a workshop id use `scopedWorkshop` (`backend/utils/scope.js`), which only returns a workshop that belongs to the caller's institute. Lists, student directories, leaderboards and courses are filtered by the same field.
- Socket.io list updates are sent to an institute room, and a socket can only watch workshops of its own institute.
- A new institute registers at `/register-institute`. Its admin finds the student and admin codes in the dashboard tab "Institute codes" and can regenerate either code.
- On startup, any users, workshops or courses created before institutes existed are moved into a default institute (`DEFAULT_INSTITUTE_NAME`, admin code `ADMIN_INVITE_CODE`).
- Platform tool: `npm run institutes` lists institutes and codes, and `npm run institutes -- create "Name"` creates one.

## Local setup

Requirements: Node.js 18 or newer and a MongoDB instance (local or Atlas).

```bash
# backend
cd backend
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm install
npm run dev               # http://localhost:5000

# frontend (second terminal)
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm install
npm run dev               # http://localhost:5173
```

The database needs no manual setup. Mongoose creates collections on first use.

To try it: open `/register-institute`, create an institute, copy the student code from the dashboard, then register a student in a private window with that code.

## Environment variables

Backend (`backend/.env`):

| Name | Purpose |
|---|---|
| `PORT` | Server port, default 5000 |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret used to sign tokens |
| `CLIENT_URL` | Frontend origin allowed by CORS and Socket.io. Set it to the exact frontend URL in production |
| `ADMIN_INVITE_CODE` | Admin code of the default institute, used once when existing data is migrated |
| `DEFAULT_INSTITUTE_NAME` | Optional. Name of the default institute, default `INTechGenius` |
| `DEFAULT_STUDENT_CODE` | Optional. Student code of the default institute, random if empty |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay keys, test keys for development |
| `NODE_ENV` | Set to `production` to hide internal error details from API responses |
| `AUTH_RATE_LIMIT_MAX` | Optional. Login and register attempts per IP per 15 minutes, default 20 |

Frontend (`frontend/.env`): `VITE_API_URL` is the backend base URL. Never commit `.env` files.

## API overview

All routes are under `/api` and need a bearer token unless marked public.

| Area | Endpoints |
|---|---|
| Auth (public) | `POST /auth/register`, `POST /auth/register-institute`, `POST /auth/login` |
| Institute (admin) | `GET /institute/me`, `POST /institute/regenerate` |
| Workshops | `GET /workshops`, `GET /workshops/:id`, `POST /workshops` (admin), `PUT /workshops/:id` (admin), `DELETE /workshops/:id` (admin), `PATCH /workshops/:id/status` (admin), `PATCH /workshops/:id/requests/:studentId` (admin), `POST /workshops/:id/join`, `POST /workshops/:id/attend` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Resources | `POST /resources` (admin), `GET /resources/workshop/:workshopId`, `DELETE /resources/:id` (admin) |
| Quizzes | `POST /quizzes` (admin), `GET /quizzes/workshop/:workshopId`, `POST /quizzes/:id/submit`, `GET /quizzes/:id/results` (admin), `DELETE /quizzes/:id` (admin) |
| Attendance | `GET /attendance/me` |
| Gamification | `GET /gamification/me`, `GET /gamification/leaderboard` |
| Certificates | `GET /certificates/me`, `GET /certificates/verify/:code` (public) |
| Profile | `GET /profile/me`, `PUT /profile/me`, `GET /profile/students` (admin), `GET /profile/students/:id` (admin) |
| Courses | `GET /courses`, `POST /courses` (admin), `DELETE /courses/:id` (admin), `GET /courses/me/purchased`, `POST /courses/:id/create-order`, `POST /courses/:id/verify` |
| Feedback | `POST /feedback`, `GET /feedback/me/:workshopId`, `GET /feedback/workshop/:workshopId` (admin) |
| Recordings | `POST /recordings` (admin), `GET /recordings`, `GET /recordings/workshop/:workshopId`, `DELETE /recordings/:id` (admin) |
| Upload | `POST /upload` (multipart field `file`) |

## Testing

The backend has integration tests that start the real server against a temporary database and cover registration rules, injection rejection, institute isolation, code regeneration, malformed ids, unsafe links and security headers.

```bash
cd backend
npm test                                   # needs MongoDB on localhost:27017
TEST_MONGO_URI=mongodb://host:27017 npm test   # use another MongoDB
```

The frontend has no automated tests. `npm run build` in `frontend` checks that it compiles.

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for MongoDB Atlas, Render and Vercel.

## Known limitations and future work

- Uploaded files live on the backend disk, which the Render free plan does not persist. Move them to object storage such as S3 or Cloudinary.
- The JWT is kept in `localStorage`, which is simple but exposed to XSS. An httpOnly cookie would be safer.
- An email address belongs to one institute only.
- Any admin of an institute can manage all workshops of that institute.
- No password reset and no email notifications.
- No automated frontend tests or lint configuration.
- The free hosting plan sleeps when idle, so the first request is slow.
