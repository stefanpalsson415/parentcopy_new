# Allie Mobile PWA Setup Instructions

This document provides step-by-step instructions for setting up and testing the Allie mobile PWA experience.

## Prerequisites

Before starting, make sure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn
- A modern web browser (Chrome or Safari for mobile testing)

## Initial Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npm start
   ```

   This will start the React development server at http://localhost:3000.

## Testing the Mobile Experience

### Desktop Testing with Mobile Emulation

1. Open Chrome DevTools (F12 or Right-click > Inspect)
2. Click the "Toggle device toolbar" button or press Ctrl+Shift+M (Cmd+Shift+M on Mac)
3. Select a mobile device preset from the dropdown
4. Navigate to http://localhost:3000/chat to view the mobile experience

### Testing on a Real Mobile Device

1. Ensure your development computer and mobile device are on the same network
2. Find your computer's local IP address:
   - On Windows: Run `ipconfig` in Command Prompt
   - On Mac/Linux: Run `ifconfig` in Terminal
3. On your mobile device, open a browser and navigate to `http://YOUR_IP:3000/chat`
4. For best results, test on both iOS and Android devices

### Testing PWA Installation

#### On Android (Chrome)

1. Navigate to http://YOUR_IP:3000/chat on Chrome
2. You should see the install prompt automatically
3. If not, tap the three-dot menu and select "Add to Home screen"

#### On iOS (Safari)

1. Navigate to http://YOUR_IP:3000/chat on Safari
2. Tap the Share button
3. Scroll down and select "Add to Home Screen"
4. Tap "Add" in the confirmation dialog

## Checking PWA Functionality

After installation, verify the following:

1. **Offline support**:
   - Install the PWA to your home screen
   - Open it, then put your device in airplane mode
   - Verify that basic interface and recent chats are still accessible

2. **Full-screen experience**:
   - The PWA should launch without browser UI when opened from home screen
   - Status bar should be properly styled

3. **Responsive layout**:
   - Test on various device sizes
   - Try both portrait and landscape orientations

4. **Voice input**:
   - Test the microphone button for voice commands
   - Verify voice-to-text functionality works

## Deploying to Production

When ready to deploy:

1. **Build the app**

   ```bash
   npm run build
   ```

2. **Test the production build locally**

   ```bash
   npx serve -s build
   ```

3. **Deploy to your hosting provider**
   - Upload the contents of the `build` directory to your server
   - Ensure your server is configured to serve the `index.html` file for all routes

## Troubleshooting

- **Service worker not registering**: Check browser console for errors
- **Install prompt not appearing**: PWA criteria may not be met; verify manifest.json and HTTPS
- **Offline mode not working**: Check service worker registration and cache configuration
- **Voice input issues**: Verify microphone permissions are granted

## Next Steps

After basic deployment, consider these enhancements:

1. **Analytics**: Add tracking for PWA installations and usage
2. **Push Notifications**: Implement for important updates
3. **Background Sync**: For offline message queuing
4. **Improved Caching**: Fine-tune the service worker for better performance