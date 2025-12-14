# Cashly Frontend

The frontend for Cashly is a modern single-page application built with React 19, TypeScript, and Vite. It features a responsive design with Tailwind CSS and manages state using Zustand and React Query.

## Tech Stack

-   **Framework**: React 19
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS, PostCSS
-   **State Management**: Zustand (Client state), React Query (Server state)
-   **Routing**: React Router
-   **UI Components**: Headless UI, Heroicons, Framer Motion

## Prerequisites

-   Node.js 18+
-   npm

## Setup

### 1. Installation

```bash
cd frontend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key_here
```

### 3. Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Building for Production

```bash
npm run build
```

Previews the production build:

```bash
npm run preview
```

## Project Structure

-   `src/components/`: Reusable UI components (Buttons, Inputs, etc.)
-   `src/pages/`: Page-level components corresponding to routes
-   `src/services/`: API client and service functions
-   `src/hooks/`: Custom React hooks
-   `src/store/`: Zustand stores for global state
-   `src/types/`: TypeScript interfaces and types
-   `src/utils/`: Helper functions

## Key Features

-   **Authentication**: Login, Registration, Password Reset
-   **Dashboard**: Real-time spending overview and charts
-   **Transactions**: Filtering, sorting, and categorization
-   **Subscriptions**: Stripe integration for managing plans
-   **Responsive Design**: Mobile-first approach
