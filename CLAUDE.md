# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- `npm start` - Run development server
- `npm run build` - Create production build
- `npm test` - Run tests in watch mode
- `npm test -- --testPathPattern=ComponentName` - Run single test
- `npm run eject` - Eject from Create React App

## Firebase Functions
- `npm run serve` - Run Firebase emulators
- `npm run deploy` - Deploy functions to Firebase

## Code Style Guidelines
- React functional components with JSX
- Use descriptive variable/function names (camelCase for variables, PascalCase for components)
- Import order: React, third-party libs, local components, styles
- Tailwind CSS for styling
- Context API for state management
- Async/await for asynchronous operations
- Error handling with try/catch blocks
- PropTypes or JSDoc for component documentation