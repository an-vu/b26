# Bento '26

A bento-style personal portfolio web app built to showcase Angular and Java using Spring Boot.

## Tech Stack

### Frontend
- Angular
- TypeScript
- CSS Grid (bento-style layout)

### Backend
- Java
- Spring Boot
- REST API
- H2 in-memory database

### Tooling
- GitHub
- Docker (optional)

## Architecture Overview

```
Angular (Frontend)
|
| HTTP (JSON)
v
Spring Boot API (Backend)
|
v
Database (H2)
```

- Angular handles UI, routing, and rendering
- Spring Boot exposes REST endpoints and models data
- Clear separation between frontend and backend responsibilities

## Features

- Public bento-style profile page
- Reusable card-based layout
- Profile data fetched from REST API
- Basic analytics endpoints (click tracking)
- Optional admin/editor view (demo-only, no auth)

## Project Structure

```
bento26/
├─ frontend/        # Angular app
├─ backend/         # Spring Boot API
├─ docker/          # Docker configs (optional)
├─ docs/            # Screenshots, diagrams
└─ README.md
````

## Why This Stack

This project intentionally uses Angular and Spring Boot to demonstrate:
- Component-based frontend architecture
- REST API design
- Java backend fundamentals
- Patterns commonly used in enterprise applications

For a static portfolio, a simpler stack would be sufficient.  
This implementation exists to show **applied engineering judgment**, not necessity.

## Getting Started (Local)

### Frontend

```bash
cd frontend
npm install
npm start
````

Runs at: `http://localhost:4200`

### Backend

```bash
cd backend
mvn spring-boot:run
```

Runs at: `http://localhost:8080`

## API Endpoints (Planned)

* `GET /api/profile/{handle}`
* `PUT /api/profile/{handle}`
* `POST /api/click/{cardId}`
* `GET /api/analytics/{handle}`
