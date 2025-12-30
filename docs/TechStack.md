# STATELINK – Technical Stack & Architecture

## Core Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15+** | App Router, Server Components, React 19 features. |
| **CMS / Backend** | **Payload CMS 3.0** | Headless CMS, native Next.js integration, handles API & Admin UI. |
| **Database** | **Postgres** | Hosted via **Supabase**. Relational data integrity. |
| **Styling** | **Tailwind CSS** | Utility-first, mobile-first, dark mode support via `class` strategy. |
| **Auth** | **Payload Native Auth** | Secure, session-based (HTTP-only cookies) authentication. |
| **Notifications** | **Web-Push** | Standard VAPID protocol via Service Workers. |

---

## Deep Dive: Architecture & Security

### 1. Authentication & Authorization
*   **Payload Native Auth:** Utilizing Payload's built-in authentication for the `users` collection.
    *   **Session Management:** Secure, HTTP-only cookies to prevent XSS attacks.
    *   **Magic Links:** Custom implementation using Payload's auth flow or a custom endpoint to generate signed, time-limited login tokens sent via email.
*   **Access Control (RBAC):**
    *   **Collection-Level Logic:** Payload Access Control functions (`access: { read: ... }`) to enforce strict data scoping.
    *   **Rule:** Users can only read/update their own `User` record.
    *   **Rule:** Users can only read `CheckIns` that belong to their `groupID`.
    *   **Rule:** Users can only read `Group` details if their `user.groupID` matches.

### 2. Security & Data Privacy
*   **Database Isolation:**
    *   While all data lives in one Postgres database, the application layer (Payload) enforces strict tenancy based on `groupID`.
    *   **Row-Level Security (RLS):** Optional but recommended layer in Supabase to mirror Payload's access control for an extra safety net.
*   **API Security:**
    *   CSRF protection via Next.js/Payload defaults.
    *   Rate limiting on API routes (especially the "Magic Link" generation endpoint) to prevent abuse.
*   **Content Security Policy (CSP):** Strict headers to prevent unauthorized script execution, crucial for PWA security.

### 3. Cron Jobs & Automation
*   **Infrastructure:** **Vercel Cron**.
*   **Implementation:**
    *   Expose a secure API route (e.g., `/api/cron/trigger-pings`) protected by a `CRON_SECRET` header.
    *   **Logic:**
        1.  Query all active `Groups`.
        2.  Check their `frequency` and `quietHours` settings.
        3.  Determine if a ping should be sent (Random vs. Fixed logic).
        4.  If yes, trigger the Web-Push dispatch function.
*   **Randomness:** For "Random" mode, the cron runs every minute (or 10 mins) and checks against a probability curve or a pre-calculated "next ping time" stored in the Group document.

### 4. Web-Push Notification Engine
*   **Storage:**
    *   New Collection: `PushSubscriptions`.
    *   Fields: `endpoint`, `keys` (p256dh, auth), `user` (relationship).
    *   One user can have multiple subscriptions (Phone, Laptop, Tablet).
*   **Sending (Server-Side):**
    *   Library: `web-push` (Node.js).
    *   VAPID Keys: Generated once, stored in environment variables (`NEXT_PUBLIC_VAPID_PUBLIC`, `VAPID_PRIVATE`).
    *   Payload: Encrypted JSON containing `{ title, body, url, timestamp }`.
*   **Receiving (Client-Side):**
    *   **Service Worker (`sw.js`):** Listens for `push` event.
    *   **Background Handling:** Renders the system notification even if the tab is closed.
    *   **Interaction:** Clicking the notification opens the PWA to the specific `/check-in` route.
