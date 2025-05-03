# Allie Mobile

A streamlined mobile experience focused on Allie Chat and calendar functionality.

## Overview

This mobile app provides a simplified interface to the Parentload experience, focusing on:

1. **Allie Chat** - The primary interface to all app functionality
2. **Calendar Widget** - Floating, collapsible calendar for quick access
3. **Authentication** - Firebase auth integration with the main app

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase project (same as main app)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd mobile
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```

## Architecture

The mobile app uses a simplified version of the main app's architecture:

- **Firebase Authentication** - Shared with main app
- **Claude-First Understanding** - Uses the same NLU approach as the web app
- **Shared Services** - Core services like ClaudeDirectService are reused
- **React Native UI** - Tailored for mobile experience

## Deployment

For iOS and Android app store deployment, follow these steps:

1. Update app.json with proper app details
2. Build the app:
   ```
   expo build:ios
   expo build:android
   ```
3. Submit to respective app stores

## Development Notes

- Claude handles all NLU via ClaudeDirectService
- Allie chat is the primary interface - voice inputs encouraged
- Calendar widget is collapsible but always accessible
- All main app features are available through chat interface