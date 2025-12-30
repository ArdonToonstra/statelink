# STATELINK – Design Guidelines

## 1. Visual Identity: "Neutral Canvas, Colorful Data"
The app's core UI acts as a neutral stage to let the user's personal data and theme colors shine.

- **Color Palette:**
  - **Light Mode Background:** "Off-White" (`#F5F5F7`) – Soft and paper-like.
  - **Dark Mode Background:** "Deep Charcoal" (`#121212`) – Reduces eye strain, avoids harsh pure black.
  - **Surface Colors:** Slightly lighter/darker shades for cards and modals to create depth.
- **User Themes:**
  - Users select a **Personal Theme Color** during onboarding.
  - This color is applied to their **Avatar Ring**, **Sparkline Graph**, **Active UI Elements**, and **Name** in the group feed.
  - *Result:* The group feed becomes a vibrant, personalized data dashboard.

## 2. Typography: "System & Mono"
A blend of native familiarity and technical precision.

- **Primary Font (UI & Text):** Native System Stack (*San Francisco* on iOS, *Roboto* on Android, *Inter* on Web).
  - *Why:* Makes the PWA feel like a native OS extension.
- **Data Font (Scores & Time):** Monospaced (*JetBrains Mono*, *SF Mono*, or *Roboto Mono*).
  - *Why:* Used for the **Vibe Score (1-10)**, **Timestamps**, and **Stats**. Reinforces the "status/telemetry" aesthetic.

## 3. Core Interaction: The "Vibe Slider"
The 1–10 slider is the heartbeat of the app. It must feel tactile and responsive.

- **Visual Feedback:**
  - The slider track uses a gradient (e.g., Cool Blue at 1 → Energetic Orange at 10).
  - The handle glows or changes color to match the current value.
- **Haptic Feedback:**
  - Use the Web Vibration API to trigger light haptic ticks as the user slides past each integer.
- **Dynamic Labels:**
  - Display a changing descriptor alongside the number (e.g., 1="Drained", 5="Neutral", 10="Electric").

## 4. The "Pulse" Dashboard
The main view is a vertical feed of live status cards.

- **Card Layout:**
  - **Left:** User Avatar with a colored ring (indicating data freshness).
  - **Center:** User Name + Context Tags (displayed as small, pill-shaped badges).
  - **Right:** The Vibe Score (Large, Monospace font).
- **Stale Data Handling:**
  - If a user hasn't posted in >24h, their card visually "decays" (desaturates or lowers opacity) to indicate offline status.

## 5. Context Tags UI
- **Selection:** Large, tappable "Pills" or "Chips" during the check-in flow.
- **Active State:** Selected tags fill with the user's **Personal Theme Color**.
- **Iconography:** Simple, stroke-based icons (e.g., *Lucide* or *Heroicons*) inside tags for instant visual recognition.

## 6. Motion & Micro-interactions
- **Transitions:** Slide-over page transitions (iOS style) to enhance the native app feel.
- **Success State:** A subtle "ripple" effect using the user's theme color upon submitting a vibe check.
