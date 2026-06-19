# DualStream

DualStream is a local web application that allows you to record your laptop screen or webcam while using your Android phone as a high-quality microphone. It uses WebRTC to stream audio from your phone to your computer over a USB connection with zero latency.

## Prerequisites

1. Node.js installed on your computer.
2. An Android phone and a USB cable.
3. ADB (Android Debug Bridge) installed on your computer.
   - On Linux: sudo apt install adb
   - On Mac: brew install android-platform-tools
   - On Windows: Download from the Android Developer website.

## Setup Instructions

### 1. Install Dependencies
Run the following command in the root of the project to install the required Node.js packages:
npm install

### 2. Prepare Your Android Phone
1. Open your phone Settings.
2. Go to "About phone" and tap "Build number" 7 times to enable Developer Options.
3. Go back to Settings, find "Developer options", and turn on "USB debugging".
4. Plug your phone into your computer via USB. Select "Charging only" or "File Transfer".
5. A prompt will appear on your phone asking to "Allow USB debugging". Check "Always allow" and tap OK.

### 3. Forward the Connection
To allow your phone to securely access the local server on your computer, run this command in your terminal:
adb reverse tcp:3000 tcp:3000

### 4. Start the Server
Run the following command to start the application:
node server.js
The server will start running at http://localhost:3000.

### 5. Open the Application
1. On your computer: Open a web browser and go to http://localhost:3000. Select "Record Camera" or "Record Screen". Allow the browser to access your camera/screen.
2. On your phone: Open Google Chrome and go to http://localhost:3000. Select "Phone (High-Q Mic)". Allow the browser to access your microphone.

### 6. Start Recording
Once both devices are connected, the status on your computer will change to "Phone Connected". Click "Start Recording" on your computer. When you are finished, click "Stop Recording" and the synchronized video file will automatically download to your computer.
