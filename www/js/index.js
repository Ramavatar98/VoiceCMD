// --- Global State Variables ---
let isListening = false;
let hasPermission = false;
const NOTIFICATION_ID = 1; // A unique ID for our app's notification

// --- App Initialization ---
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    // --- Permission Handling Sequence ---
    // First, ask for notifications, then microphone, then guide for overlay.
    requestNotificationPermission(() => {
        checkAndRequestMicrophonePermission();
        requestOverlayPermission();
    });

    // --- Background Mode Configuration ---
    cordova.plugins.backgroundMode.setDefaults({
        title: 'Voice CMD is Active',
        text: 'Listening for your commands.',
        silent: true // Set to true because we will show our own custom notification
    });
    cordova.plugins.backgroundMode.enable();
    
    // This is crucial to keep listening when app goes to background
    cordova.plugins.backgroundMode.on('activate', function() {
        if(isListening) {
           // Ensure the listening loop continues
           setTimeout(listenLoop, 500);
        }
    });

    // --- UI Button Logic ---
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) {
            stopListening();
        } else {
            if (hasPermission) {
                startContinuousListening();
            } else {
                alert('Please grant Microphone permission first.');
                checkAndRequestMicrophonePermission(); // Ask again if not granted
            }
        }
    });
}

// --- Permission Functions ---

function requestNotificationPermission(callback) {
    cordova.plugins.notification.local.hasPermission(function (granted) {
        if (granted) {
            console.log('Notification permission already granted.');
            callback();
        } else {
            cordova.plugins.notification.local.requestPermission(function (granted) {
                if (granted) {
                    console.log('Notification permission granted.');
                } else {
                    console.warn('Notification permission denied.');
                }
                callback(); // Continue initialization regardless
            });
        }
    });
}

function checkAndRequestMicrophonePermission() {
    window.plugins.speechRecognition.hasPermission(
        (granted) => {
            if (granted) {
                hasPermission = true;
                console.log('Microphone permission is granted.');
            } else {
                console.log('Requesting microphone permission...');
                window.plugins.speechRecognition.requestPermission(
                    () => { 
                        hasPermission = true; 
                        console.log('Microphone permission granted successfully.');
                    },
                    () => { 
                        hasPermission = false; 
                        alert('Microphone permission is required for the app to work.'); 
                    }
                );
            }
        },
        (err) => { console.error('Error checking mic permission: ' + err); }
    );
}

function requestOverlayPermission() {
    // This plugin can only open settings, it cannot check the permission status.
    // So, we will guide the user once.
    alert('For full functionality (like showing alerts from the background), please enable "Display over other apps" for VoiceCMD in the upcoming settings screen.');
    // Open the specific settings page for the app
    window.cordova.plugins.settings.open("application_details", 
        () => console.log('Opened app details settings'),
        () => console.error('Failed to open app details settings')
    );
}


// --- Listening Logic Functions ---

function startContinuousListening() {
    if (isListening || !hasPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Listening...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('सुन रहा हूँ...'); // Show persistent notification
    listenLoop(); // Start the loop
}

function listenLoop() {
    if (!isListening) {
        console.log("Listen loop stopped.");
        return;
    }
    let options = { language: 'hi-IN', matches: 1, showPartial: false };
    window.plugins.speechRecognition.startListening(onResult, onError, options);
}

function onResult(matches) {
    const command = matches[0].toLowerCase().trim();
    document.getElementById('result').innerHTML = "<strong>आपने कहा:</strong> " + command;
    parseAndExecuteCommand(command);
    // Restart the loop for the next command
    if (isListening) {
        setTimeout(listenLoop, 500);
    }
}

function onError(error) {
    // Error code 7 on Android is "No Match". We handle it silently.
    if (error === 7) {
        console.log("No match, listening again...");
        if (isListening) {
           setTimeout(listenLoop, 100);
        }
    } else {
        // For other more serious errors, log them.
        console.error("Speech recognition error code: ", error);
        updateNotification('Error! Restarting listener...');
        // Attempt to restart the loop after a short delay to recover.
        if (isListening) {
            setTimeout(listenLoop, 1000);
        }
    }
}

function stopListening() {
    if (!isListening) return; // Already stopped
    isListening = false;
    window.plugins.speechRecognition.stopListening();
    document.getElementById('status').textContent = "Status: Idle";
    document.getElementById('startBtn').textContent = "Start Listening";
    clearNotification(); // Remove the persistent notification
    console.log("Stopped listening by user or command.");
}


// --- Command and Notification Management ---

function parseAndExecuteCommand(command) {
    console.log("Parsing command: " + command);
    // The wake-word "शक्ति" must be present
    if (!command.includes('शक्ति')) {
        console.log("Wake word 'शक्ति' not found.");
        return;
    }
    
    updateNotification(`Last command: ${command}`); // Update notification with the command

    if (command.includes('कैमरा खोलो')) {
        navigator.camera.getPicture(() => {}, () => {}, { sourceType: Camera.PictureSourceType.CAMERA });
    } else if (command.includes('नमस्ते बोलो')) {
        // Using local notification for alert so it works from background
        cordova.plugins.notification.local.schedule({
            title: 'Voice CMD',
            text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।'
        });
    } else if (command.includes('सो जाओ') || command.includes('बंद हो जाओ')) {
        stopListening();
    }
}

function showRunningNotification(text) {
    cordova.plugins.notification.local.schedule({
        id: NOTIFICATION_ID,
        title: 'Voice CMD is running',
        text: text,
        foreground: true,
        ongoing: true, // Makes it persistent (user cannot swipe it away)
        icon: 'res://icon' // A generic way to reference the app icon
    });
}

function updateNotification(text) {
    cordova.plugins.notification.local.update({
        id: NOTIFICATION_ID,
        text: text
    });
}

function clearNotification() {
    cordova.plugins.notification.local.clear(NOTIFICATION_ID);
}
