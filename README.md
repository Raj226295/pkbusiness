# CA Portal

Full-stack Chartered Accountant website built with React + Vite on the frontend and Node.js + Express + MongoDB on the backend.

## Features

- Public website with Home, About, Services, Blog, Contact, Login, and Register pages
- JWT authentication with bcrypt password hashing
- Client dashboard for documents, appointments, services, payments, notifications, and profile updates
- Admin panel for users, document review, services, appointments, and transactions
- MongoDB models for users, documents, services, appointments, payments, notifications, and blogs
- Razorpay-ready payment flow with graceful fallback when keys are not configured
- Email notification hooks using Nodemailer

## Project Structure

```text
src/
  components/
    common/
    dashboard/
  context/
  data/
  lib/
  pages/
    public/
    dashboard/
    admin/

server/
  config/
  constants/
  controllers/
  middleware/
  models/
  routes/
  uploads/
  utils/
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Update the MongoDB connection string and JWT secret
3. Add SMTP settings if you want real email delivery
4. Add Razorpay keys if you want live online checkout
5. Add admin seed credentials if you want an admin account created automatically on startup

## Scripts

- `npm run dev` starts the Express API and Vite client together
- `npm run client` starts the Vite frontend
- `npm run server` starts the Express backend with watch mode
- `npm run build` creates the production frontend build
- `npm run lint` runs ESLint
- `npm start` starts the backend without watch mode

## Notes

- Uploaded files are stored in `server/uploads`
- Default blog posts are seeded automatically on first run
- An admin user is seeded automatically only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are present in `.env`
