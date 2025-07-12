// --- Global State Variables ---
let isListening = false;
let hasMicPermission = false;
const NOTIFICATION_ID = 1;

// --- App Initialization ---
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    // --- अनुमतियों का सरल क्रम ---
    requestNotificationPermission(() => {
        checkAndRequestMicrophonePermission();
    });

    // --- बैकग्राउंड मोड कॉन्फ़िगरेशन ---
    cordova.plugins.backgroundMode.setDefaults({
        title: 'Voice CMD is Active',
        text: 'Listening for your "शक्ति" commands.',
        silent: true
    });
    cordova.plugins.backgroundMode.enable();
    
    cordova.plugins.backgroundMode.on('activate', function() {
        if(isListening) { setTimeout(listenLoop, 500); }
    });

    // --- UI बटन का लॉजिक ---
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) {
            stopListening();
        } else {
            if (hasMicPermission) {
                startContinuousListening();
            } else {
                alert('Please grant Microphone permission first.');
                checkAndRequestMicrophonePermission();
            }
        }
    });
}

// --- Permission Functions ---

function requestNotificationPermission(callback) {
    cordova.plugins.notification.local.hasPermission(granted => {
        if (granted) {
            callback();
        } else {
            cordova.plugins.notification.local.requestPermission(() => callback());
        }
    });
}

function checkAndRequestMicrophonePermission() {
    window.plugins.speechRecognition.hasPermission(
        granted => {
            if (granted) {
                hasMicPermission = true;
            } else {
                window.plugins.speechRecognition.requestPermission(
                    () => { hasMicPermission = true; },
                    () => { hasMicPermission = false; alert('Microphone permission is required.'); }
                );
            }
        },
        err => console.error('Error checking mic permission: ' + err)
    );
}

// **** बैटरी ऑप्टिमाइज़ेशन से संबंधित फंक्शन हटा दिया गया है ****


// --- बाकी का लॉजिक पहले जैसा ही है ---

function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Listening...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('सुन रहा हूँ...');
    listenLoop();
}

function listenLoop() {
    if (!isListening) return;
    let options = { language: 'hi-IN', matches: 1, showPartial: false };
    window.plugins.speechRecognition.startListening(onResult, onError, options);
}

function onResult(matches) {
    const command = matches[0].toLowerCase().trim();
    document.getElementById('result').innerHTML = "<strong>आपने कहा:</strong> " + command;
    parseAndExecuteCommand(command);
    if (isListening) setTimeout(listenLoop, 500);
}

function onError(error) {
    if (error === 7) { // No Match Error
        if (isListening) setTimeout(listenLoop, 100);
    } else {
        console.error("Speech recognition error code: ", error);
        if (isListening) setTimeout(listenLoop, 1000);
    }
}

function stopListening() {
    if (!isListening) return;
    isListening = false;
    window.plugins.speechRecognition.stopListening();
    document.getElementById('status').textContent = "Status: Idle";
    document.getElementById('startBtn').textContent = "Start Listening";
    clearNotification();
}

function parseAndExecuteCommand(command) {
    if (!command.includes('शक्ति')) return;
    updateNotification(`Last command: ${command}`);
    if (command.includes('कैमरा खोलो')) {
        navigator.camera.getPicture(() => {}, () => {}, { sourceType: Camera.PictureSourceType.CAMERA });
    } else if (command.includes('नमस्ते बोलो')) {
        cordova.plugins.notification.local.schedule({ title: 'Voice CMD', text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।' });
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
        ongoing: true,
        icon: 'res://icon'
    });
}

function updateNotification(text) {
    cordova.plugins.notification.local.update({ id: NOTIFICATION_ID, text: text });
}

function clearNotification() {
    cordova.plugins.notification.local.clear(NOTIFICATION_ID);
}
