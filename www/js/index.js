let isListening = false;
let hasPermission = false;
const NOTIFICATION_ID = 1;

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    requestNotificationPermission(() => {
        checkAndRequestMicrophonePermission();
        requestOverlayPermission();
    });

    cordova.plugins.backgroundMode.setDefaults({
        title:  'Voice CMD is Active',
        text:   'Listening for your commands.',
        silent: true
    });
    cordova.plugins.backgroundMode.enable();
    
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) {
            stopListening();
        } else {
            if (hasPermission) {
                startContinuousListening();
            } else {
                alert('Please grant Microphone permission first.');
                checkAndRequestMicrophonePermission();
            }
        }
    });
}

function requestNotificationPermission(callback) {
    cordova.plugins.notification.local.hasPermission(function (granted) {
        if (granted) {
            callback();
        } else {
            cordova.plugins.notification.local.requestPermission(function (granted) {
                callback();
            });
        }
    });
}

function checkAndRequestMicrophonePermission() {
    window.plugins.speechRecognition.hasPermission(
        (granted) => {
            if (granted) {
                hasPermission = true;
            } else {
                window.plugins.speechRecognition.requestPermission(
                    () => { hasPermission = true; },
                    () => { hasPermission = false; alert('Microphone permission is required.'); }
                );
            }
        },
        (err) => { console.error('Error checking mic permission: ' + err); }
    );
}

function requestOverlayPermission() {
    alert('For full functionality, please enable "Display over other apps" for VoiceCMD in the upcoming settings screen.');
    window.cordova.plugins.settings.open("application_details", 
        () => console.log('Opened app details settings'),
        () => console.error('Failed to open app details settings')
    );
}

function startContinuousListening() {
    if (isListening || !hasPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Listening...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('सुन रहा हूँ...');
    listenLoop();
}

function listenLoop() {
    if (!isListening) return;
    let options = { language: 'hi-IN', matches: 1 };
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
        console.error("Speech recognition error: ", error);
        updateNotification('Error! Restarting listener...');
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
    console.log("Stopped listening.");
}

function parseAndExecuteCommand(command) {
    console.log("Parsing command: " + command);
    if (!command.includes('शक्ति')) {
        return;
    }
    updateNotification(`Last command: ${command}`);

    if (command.includes('कैमरा खोलो')) {
        navigator.camera.getPicture(() => {}, () => {}, { sourceType: Camera.PictureSourceType.CAMERA });
    } else if (command.includes('नमस्ते बोलो')) {
        alert('नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।');
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
        icon: 'res://icon' // Use a proper resource path for the icon
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
