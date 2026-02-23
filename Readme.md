# Purchase Order Management System

## Purpose
This project implements a full-stack Purchase Order Management System with CRUD capabilities. It features role-based access control (Admin/User), JWT-secured routes, and a modern frontend.

## Tech Stack
- **Frontend**: Vite + React
- **Backend**: Node.js + Express
- **Database**: MongoDB

## Setup Instructions

### 1. Prerequisites
- Node.js installed
- MongoDB (Atlas or Local)

### 2. Environment Variables
Sensitive information is kept in `.env` files which are excluded from version control. 

- **Backend**: Copy `backend/.env.example` to `backend/.env` and fill in your credentials.
- **Frontend**: Copy `frontend/.env.example` to `frontend/.env` and fill in your credentials.

### 3. Installation
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Running the Project
```bash
# Start Backend (from backend directory)
npm start

# Start Frontend (from frontend directory)
npm run dev
```

## Important Note
Environment files are protected via `.gitignore`. Never commit `.env` files to version control.