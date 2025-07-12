// --- Global State Variables ---
let isListening = false;
let hasMicPermission = false;
const NOTIFICATION_ID = 1; // हमारी सूचना के लिए एक यूनिक ID

// --- App Initialization ---
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    // --- अनुमतियों का सही क्रम ---
    // 1. सूचनाएं -> 2. माइक्रोफ़ोन -> 3. बैटरी ऑप्टिमाइज़ेशन
    requestNotificationPermission(() => {
        checkAndRequestMicrophonePermission(() => {
            // माइक्रोफ़ोन की अनुमति मिलने के बाद ही बैटरी ऑप्टिमाइज़ेशन के लिए पूछें
            if (hasMicPermission) {
                requestBatteryOptimizationPermission();
            }
        });
    });

    // --- बैकग्राउंड मोड कॉन्फ़िगरेशन ---
    cordova.plugins.backgroundMode.setDefaults({
        title: 'Voice CMD is Active',
        text: 'Listening for your "शक्ति" commands.',
        // 'type' को config.xml में सेट किया गया है, जो अधिक विश्वसनीय है
        silent: true // हम अपनी कस्टम सूचना दिखाएंगे
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
            console.log('Notification permission already granted.');
            callback();
        } else {
            cordova.plugins.notification.local.requestPermission(granted => {
                console.log(`Notification permission granted: ${granted}`);
                callback();
            });
        }
    });
}

function checkAndRequestMicrophonePermission(callback) {
    window.plugins.speechRecognition.hasPermission(
        granted => {
            if (granted) {
                hasMicPermission = true;
                console.log('Microphone permission is granted.');
            } else {
                window.plugins.speechRecognition.requestPermission(
                    () => { hasMicPermission = true; console.log('Microphone permission granted successfully.'); },
                    () => { hasMicPermission = false; alert('Microphone permission is required for the app to work.'); }
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
            } else {
                console.log('App is already ignoring battery optimizations.');
            }
        },
        (error) => {
            console.error('Failed to check battery optimization status: ' + error);
        }
    );
}


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
