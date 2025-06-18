# Aispeak Progress Tracking API

## Features

- Create, update, and retrieve user progress
- Token-based authentication using JWT
- Role-based access control (user or admin)
- Leaderboard for top 10 users by XP
- Vector similarity search for users with similar progress

## Technologies Used

- Node.js with TypeScript
- Express.js
- PostgreSQL (Supabase)
- JWT authentication
- Docker and Docker Compose


## Running the App

```bash
docker compose up --build
```

## Api Endpoints

## Auth Endpoints

### register (POST)

POST `/auth/register` 
Public route to register a new user or admin.

Example Bodies:

{
  "email": "testmailadmin@mail.com",
  "password": "12345678",
  "is_admin": true
}

{
  "email": "testmail@mail.com",
  "password": "12345678",
  "is_admin": false
}

### login (POST)

POST `/auth/login`
Public route for logging in. Returns access, refresh tokens and user data.

Example Bodies:

{
  "email": "testmailadmin@mail.com",
  "password": "12345678",
}

{
  "email": "testmail@mail.com",
  "password": "12345678",
}

### getUser (GET)

GET `/auth/user/:userId`
Accessible by the owner or an admin. Retrieves a select user.

Requires:

Authorization header with `Bearer <access_token>`

### refreshToken (GET)

GET `/auth/refresh-token`
Uses the refresh token to issue a new access token.

Requires:

Authorization header with `Bearer <access_token>`

### getUsers (GET)

GET `/auth/users`
Admin-only endpoint to list all users.

Requires:

Authorization header with `Bearer <access_token>`


### deleteUser (DELETE)

DELETE `/auth/user/:userId`
Admin-only endpoint to delete a select user.

Requires:

Authorization header with `Bearer <access_token>`

### deleteCurrentUser (DELETE)

DELETE `/auth/user`
Deletes the currently authenticated user.

Requires:

Authorization header with `Bearer <access_token>`

### logout (POST)

POST `/auth/logout`
Logs out the currently authenticated user.

Requires:

Authorization header with `Bearer <access_token>`

## Progress Endpoints

### leaderboard (GET)

GET `/progress/leaderboard`
Public route to retrieve the top 10 users by xp.

### getProgress (GET)

GET `/progress/:userId`
Accessible by owner or admin. Retrieves the user progress data.

Requires:

Authorization header with `Bearer <access_token>`

### createProgress (POST)

POST `/progress/:userId`
Accessible by owner or admin. Creates new progress for the select user.

Requires:

Authorization header with `Bearer <access_token>`

Example Body:

{
  "current_level": 1,
  "level_xp": 500,
  "streak": 2,
  "xp": 1000
}

Note: If not provided with body all values will be 0 by default.

### updateProgress (PUT)

PUT `/progress/:userId`
Accessible by admin. Updates the select user progress data.

Requires:

Authorization header with `Bearer <access_token>`

Example Body:

{
  "current_level": 2,
  "level_xp": 700,
  "streak": 5,
  "xp": 1500
}

### deleteProgress (DELETE)

DELETE `/progress/:userId`
Accessible by admin. Deletes the select user progress data.

Requires:

Authorization header with `Bearer <access_token>`

### getSimilarProgress (GET)

GET `/progress/similar/:userId`
Accessible by owner or admin. Uses vector similarity to find users with similar progress levels.

Requires:

Authorization header with `Bearer <access_token>`