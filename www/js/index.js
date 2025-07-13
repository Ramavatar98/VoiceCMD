// --- Global State Variables ---
let isListening = false;
let hasMicPermission = false;
const NOTIFICATION_ID = 1;

// --- App Initialization ---
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    requestNotificationPermission(() => {
        checkAndRequestMicrophonePermission(() => {
            if (hasMicPermission) {
                requestBatteryOptimizationPermission();
            }
        });
    });

    cordova.plugins.backgroundMode.setDefaults({
        title: 'Voice CMD is Active',
        text: 'Listening for your "शक्ति" commands.',
        silent: true
    });
    cordova.plugins.backgroundMode.enable();
    
    cordova.plugins.backgroundMode.on('activate', function() {
        if(isListening) { setTimeout(listenLoop, 500); }
    });

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

// --- Permission Functions (कोई बदलाव नहीं) ---
// ... (ये सभी फंक्शन पहले जैसे ही रहेंगे) ...

function requestNotificationPermission(callback) {
    cordova.plugins.notification.local.hasPermission(granted => {
        if (granted) { callback(); } 
        else { cordova.plugins.notification.local.requestPermission(() => callback()); }
    });
}

function checkAndRequestMicrophonePermission(callback) {
    window.plugins.speechRecognition.hasPermission(
        granted => {
            hasMicPermission = granted;
            if (!granted) {
                window.plugins.speechRecognition.requestPermission(
                    () => { hasMicPermission = true; },
                    () => { hasMicPermission = false; alert('Microphone permission is required.'); }
                );
            }
            if (callback) callback();
        },
        err => console.error('Error checking mic permission: ' + err)
    );
}

function requestBatteryOptimizationPermission() {
    cordova.plugins.PowerOptimization.isIgnoringBatteryOptimizations(
        (isIgnoring) => {
            if (!isIgnoring) {
                alert('For the app to run reliably in the background, please allow it to ignore battery optimizations.');
                cordova.plugins.PowerOptimization.requestOptimizations();
            }
        }
    );
}


// --- Listening Logic (यहाँ मुख्य बदलाव है) ---

function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Listening silently...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('चुपचाप सुन रहा हूँ...');
    listenLoop();
}

function listenLoop() {
    if (!isListening) return;

    // **** यही मुख्य समाधान है ****
    // पॉपअप को छिपाने के लिए विकल्प जोड़ें
    let options = {
        language: 'hi-IN',
        matches: 1,
        showPopup: false // Google UI पॉपअप को छिपाएं
    };

    window.plugins.speechRecognition.startListening(onResult, onError, options);
}

function onResult(matches) {
    const command = matches[0].toLowerCase().trim();
    document.getElementById('result').innerHTML = "<strong>आपने कहा:</strong> " + command;
    parseAndExecuteCommand(command);

    // अगले कमांड के लिए फिर से सुनने से पहले थोड़ा इंतज़ार करें
    if (isListening) {
        setTimeout(listenLoop, 750); // अंतराल को थोड़ा बढ़ाएं
    }
}

function onError(error) {
    // No Match (7) या No speech (6) एरर के लिए चुपचाप फिर से शुरू करें
    if (error === 7 || error === 6) {
        if (isListening) {
            setTimeout(listenLoop, 250);
        }
    } else {
        console.error("Speech recognition error code: ", error);
        // किसी अन्य गंभीर त्रुटि के लिए, थोड़ा और इंतज़ार करें
        if (isListening) {
            setTimeout(listenLoop, 2000);
        }
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

// --- Command and Notification Logic (कोई बदलाव नहीं) ---
// ... (यह हिस्सा पहले जैसा ही रहेगा) ...

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
        id: NOTIFICATION_ID, title: 'Voice CMD is running', text: text,
        foreground: true, ongoing: true, icon: 'res://icon'
    });
}

function updateNotification(text) {
    cordova.plugins.notification.local.update({ id: NOTIFICATION_ID, text: text });
}

function clearNotification() {
    cordova.plugins.notification.local.clear(NOTIFICATION_ID);
}
