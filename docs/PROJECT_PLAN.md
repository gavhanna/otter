# Otter - Project Plan

## 1. Project Overview

*   **Project Name:** Otter
*   **Goal:** A self-hostable web application that allows users to record audio, store it, transcribe it (asynchronously), and manage their recordings. Key focuses are data ownership, open-source principles, and a modern, type-safe technology stack.
*   **Platform Strategy:** Web-first MVP using TanStack Start, with PWA enhancements as a strong follow-up. Native mobile apps are a longer-term consideration.

## 2. Core Features (MVP)

1.  **Multi-User Authentication:**
    *   Username/password registration and login.
    *   Admin user identified via an environment variable (e.g., `ADMIN_USERNAME`). The first user matching this username upon registration, or a pre-seeded account, will gain admin privileges.
    *   JWT-based session management (stored in HTTP-only cookies).
2.  **Audio Recording (Web):**
    *   In-browser audio recording using the Web Audio API.
    *   Controls: Start, pause, resume, stop.
    *   Visual feedback during recording.
3.  **Audio Storage:**
    *   Upload of recorded audio (e.g., WebM/Opus format) to the server.
    *   Files stored on the server's local filesystem, organized by user ID in a configurable data directory.
4.  **Transcription (Asynchronous):**
    *   Server-side transcription of uploaded audio files using a local OpenAI Whisper model (e.g., via `whisper.cpp` or a Node.js wrapper).
    *   **Initial MVP:** Transcription process will be stubbed (e.g., returns "Transcription pending..." or similar immediately, then updates status after a simulated delay). The main focus for initial development is on recording, saving, replaying, and the overall app structure.
    *   The UI will show a "transcribing..." status and update when the transcript is ready (initially via polling, potentially WebSockets later).
5.  **Recording Management:**
    *   A list view displaying a user's own recordings (e.g., title, date, transcription status).
    *   Ability to play back recordings.
    *   Ability to view (stubbed or completed) transcripts.
    *   Ability to download the original audio file.
    *   Ability to download the transcript (e.g., as a `.txt` file).
    *   Ability to delete recordings (soft delete or hard delete TBD, default to hard delete for MVP).
6.  **Basic Admin Functionality (MVP):**
    *   An admin user can view a list of all registered users.
    *   (Future admin features: manage users, view system stats, etc.)

## 3. Technology Stack

*   **Frontend:**
    *   **Meta-Framework:** TanStack Start (Vite, React, TanStack Router, TanStack Query).
    *   **UI Components:** Shadcn UI (built on Tailwind CSS and Radix UI).
    *   **State Management:** TanStack Query for server state; Zustand or React Context for minimal global UI state if needed.
*   **Backend:**
    *   **Language/Framework:** Node.js with Express.js.
    *   **API Layer:** tRPC for full-stack type-safe APIs.
*   **Database:**
    *   **Type:** SQLite.
    *   **ORM:** Prisma.
*   **Transcription Engine:**
    *   Local OpenAI Whisper model (e.g., integrated via `whisper.cpp` called as a child process, or a suitable Node.js library wrapping it).
*   **Deployment:**
    *   Docker & Docker Compose for packaging and easy self-hosting.

## 4. Key Design Considerations

*   **Full-Stack Type Safety:** Leverage tRPC to ensure type consistency between frontend and backend.
*   **Authentication & Authorization:**
    *   Use tRPC middleware for authentication (verifying JWTs).
    *   Password hashing using bcrypt.
    *   Strict data segregation by `user_id` at the API and database level.
    *   Admin roles checked via tRPC middleware for protected admin procedures.
*   **Audio File Handling:**
    *   Frontend records in WebM/Opus.
    *   Backend API receives the audio blob, saves it to a user-specific directory.
    *   Filenames could be UUIDs to prevent collisions, with metadata stored in the database.
*   **Asynchronous Operations:**
    *   Transcription will be handled asynchronously.
    *   A simple background job queue (e.g., an in-memory queue for MVP, or a more robust solution like BullMQ with Redis later) will manage transcription tasks.
*   **Configuration:**
    *   Key settings (e.g., data storage path, `ADMIN_USERNAME`, JWT secret) will be configurable via environment variables.
*   **Error Handling:** Consistent error handling and reporting across the tRPC API.

## 5. Project Structure (Conceptual)

```
/Otter
|-- /apps
|   |-- /web          # TanStack Start frontend (React, Vite)
|   |   |-- /src
|   |   |   |-- app/      # TanStack Router routes, root component
|   |   |   |-- components/ # Shadcn UI components, custom components
|   |   |   |-- lib/      # Utilities, tRPC client setup
|   |   |   `-- main.tsx  # Main entry point
|   |   |-- shadcn.config.js
|   |   |-- vite.config.ts
|   |   |-- tsconfig.json
|   |   `-- package.json
|   |-- /server       # Node.js, Express, tRPC backend
|   |   |-- /src
|   |   |   |-- /routers  # tRPC routers (e.g., auth, recording, user, admin)
|   |   |   |   `-- _app.ts # Main tRPC app router merging all sub-routers
|   |   |   |-- /services # Business logic (auth, audio processing, transcription)
|   |   |   |-- /db       # Prisma schema, client, migrations
|   |   |   |-- /lib      # Shared utilities, auth helpers, config loader
|   |   |   |-- /queues   # Background job queue setup (if not in services)
|   |   |   `-- server.ts # Express server setup, tRPC middleware, graceful shutdown
|   |   |-- tsconfig.json
|   |   `-- package.json
|-- /packages         # Optional: For shared code in a monorepo (e.g., if using pnpm workspaces)
|   |-- /eslint-config-custom
|   `-- /tsconfig-custom
|-- /data             # (Mounted Docker volume) For SQLite DB, audio files
|-- docker-compose.yml
|-- .env.example      # Example environment variables
|-- .gitignore
`-- README.md         # General project README
```

## 6. Initial Development Phases (High-Level)

1.  **Phase 0: Setup & Foundation**
    *   Initialize monorepo (e.g., using pnpm workspaces if desired, or just separate `apps/web` and `apps/server` folders).
    *   Set up TanStack Start for the `web` app.
    *   Set up Node.js/Express/tRPC project for the `server` app.
    *   Integrate Prisma with SQLite: define initial schema (User, Recording, Transcript).
    *   Basic Dockerfile for the server and a `docker-compose.yml` for local development.
2.  **Phase 1: Authentication & User Core**
    *   Implement tRPC procedures for user registration and login.
    *   JWT generation and validation.
    *   Frontend login/registration forms and basic auth state management.
    *   Admin user identification.
    *   Basic admin view (list users).
3.  **Phase 2: Recording & Playback (No Transcription Yet)**
    *   Frontend UI for audio recording (Web Audio API).
    *   tRPC procedure to upload and save audio files to the server, associated with the user.
    *   Database entries for recordings.
    *   Frontend UI to list user's recordings and play them back.
    *   Implement deletion of recordings.
4.  **Phase 3: Stubbed Asynchronous Transcription**
    *   Modify upload procedure to trigger a "stubbed" async transcription (e.g., update status in DB after a delay).
    *   UI to reflect "transcribing" status and display placeholder for transcript.
    *   Implement download for audio and (stubbed) transcript.
5.  **Phase 4: Actual Transcription Integration**
    *   Integrate Whisper (e.g., `whisper.cpp`) into the backend.
    *   Replace stubbed transcription with actual async transcription calls to Whisper.
    *   Store and display real transcripts.
6.  **Phase 5: PWA & Refinements**
    *   Enhance the web app to be a Progressive Web App (PWA).
    *   UI/UX improvements based on initial functionality.
    *   Testing and bug fixing.

## 7. Open Questions & Future Considerations

*   Detailed error handling strategy.
*   Specific background job queue implementation (e.g., BullMQ or a simpler alternative).
*   Advanced admin features.
*   Search/filtering of recordings.
*   OAuth integration.
*   Real-time updates for transcription status (WebSockets).
*   Mobile app development (if PWA is insufficient).

This document will be updated as the project progresses. 