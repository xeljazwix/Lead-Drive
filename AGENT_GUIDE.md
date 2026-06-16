# Lead Drive Project Architecture & Deployment Guide

## 1. Project Overview
Lead Drive is a secure, private cloud file storage application with real-time antivirus protection, trash management, bulk operations, and neumorphic UI aesthetics. The application allows users to upload, manage, share, compress, and download files and folders.

## 2. Project Structure
The repository is structured as a monolithic repository (monorepo) splitting the frontend and backend.

- `client/`: Contains the React (Vite) frontend.
  - `src/components/`: Reusable React components (UI elements, Drive Grid, modals).
  - `src/pages/`: Main page views (DrivePage, ChatPage, AdminPage).
  - `src/api/`: Frontend API service wrappers to interact with the backend.
  - `src/store/`: Zustand global state management (auth, chat, theme).
  - `src/styles/`: Global CSS and theme definitions (neumorphic variables in `index.css`).
  - `scripts/`: Deployment scripts for the frontend (`deploy.js`).

- `src/`: Contains the Express.js Backend (Node.js).
  - `controllers/`: Request handling logic (file, folder, auth, admin).
  - `routes/`: Express route definitions.
  - `services/`: Business logic layer (archive, trash, WORM).
  - `middlewares/`: Security, authentication, and rate-limiting handlers.

- `prisma/`: Contains the Prisma ORM schema (`schema.prisma`) mapping to PostgreSQL.
- `scripts/`: Deployment scripts for the backend (`deploy-backend.js`).

## 3. Deployment Guide (SFTP/FTP)

Deployment is completely automated using `basic-ftp` inside custom Node.js scripts.

### Deploying the Frontend (React / Vite)
The frontend builds a static HTML/JS/CSS bundle into the `client/dist` directory and pushes it to the root of the frontend domain (`drive.leadagency.ly`).

1. **Navigate to the client directory:**
   ```powershell
   cd client
   ```
2. **Set the FTP password and run the deployment:**
   ```powershell
   $env:FTP_PASSWORD="[INSERT_PASSWORD_HERE]"; npm run deploy
   ```
3. **What happens under the hood:**
   - Runs `npm run build` using Vite.
   - Connects to `ftp.leadagency.ly` using the user `lead@leadagency.ly`.
   - Clears the remote `/assets` directory.
   - Uploads the contents of the `client/dist/` directory to `/`.

### Deploying the Backend (Express / Node.js)
The backend source code is deployed to a subfolder (`/api`) on the remote server which is managed by CloudLinux Passenger.

1. **Navigate to the root directory of the project:**
   ```powershell
   cd "a:\Lead Manager"
   ```
2. **Set the CPANEL FTP password and run the deployment:**
   ```powershell
   $env:CPANEL_FTP_PASSWORD="[INSERT_PASSWORD_HERE]"; npm run deploy-backend
   ```
3. **What happens under the hood:**
   - Connects to `ftp.leadagency.ly` using the user `api@api.leadagency.ly`.
   - Uploads the `src/`, `prisma/`, and `scripts/` directories, alongside `package.json` and `package-lock.json`.
4. **Post-Deployment Steps (If adding new dependencies or Prisma schemas):**
   - In cPanel, navigate to the **Node.js App** section.
   - Run `NPM Install` to grab any new dependencies.
   - Open cPanel Terminal: `cd ~/api && npx prisma migrate deploy` to push DB changes.
   - Click **Restart** in the Node.js App panel to restart Passenger.

## 4. Agent Operational Rules
- Never use direct FTP clients or manual file copying. Use the provided NPM scripts (`deploy` and `deploy-backend`) for consistency.
- Ensure the password is passed via environment variables during execution.
- After frontend updates, instruct the user to Hard Refresh (`Ctrl + F5`) or use an Incognito window due to aggressive caching.
