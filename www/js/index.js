// --- Global State Variables ---
let isListening = false;
let hasMicPermission = false;
const NOTIFICATION_ID = 1;

// --- Advanced Listening Variables ---
let finalTranscript = '';
let recognitionTimeout;

// --- App Initialization ---
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    requestNotificationPermission(() => {
        checkAndRequestMicrophonePermission(() => {
            if (hasMicPermission) requestBatteryOptimizationPermission();
        });
    });

    cordova.plugins.backgroundMode.setDefaults({
        title: 'Voice CMD is Active',
        text: 'Listening for "शक्ति" commands.',
        silent: true
    });
    cordova.plugins.backgroundMode.on('activate', () => {
        cordova.plugins.backgroundMode.disableWebViewOptimizations();
        if (isListening) {
            window.plugins.speechRecognition.stopListening();
            setTimeout(listenLoop, 1000);
        }
    });
    cordova.plugins.backgroundMode.enable();

    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        else if (hasMicPermission) startContinuousListening();
        else alert('Please grant Microphone permission first.');
    });

    configureBackgroundFetch();
}

// --- Background Fetch Configuration ---
function configureBackgroundFetch() {
    const fetchCallback = async (taskId) => {
        console.log('[BackgroundFetch] event received!', taskId);
        if (isListening) {
            console.log('[BackgroundFetch] Waking up the listener...');
            window.plugins.speechRecognition.stopListening();
            setTimeout(listenLoop, 500);
        }
        BackgroundFetch.finish(taskId);
    };

    const fetchTimeoutCallback = async (taskId) => {
        console.warn('[BackgroundFetch] TIMEOUT:', taskId);
        BackgroundFetch.finish(taskId);
    };

    BackgroundFetch.configure(fetchCallback, fetchTimeoutCallback, {
        minimumFetchInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true
    });
}

// --- Listening Logic ---
function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Robust listening...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('मजबूत लिसनिंग सक्रिय है...');
    listenLoop();
}

function listenLoop() {
    if (!isListening) return;
    let options = { language: 'hi-IN', showPartial: true, showPopup: false };
    window.plugins.speechRecognition.startListening(onResult, onError, options);
}

function onResult(matches) {
    if (!matches || matches.length === 0) return;
    clearTimeout(recognitionTimeout);
    finalTranscript = matches[0];
    document.getElementById('result').innerHTML = `<strong>सुन रहा हूँ...</strong> ${finalTranscript}`;
    recognitionTimeout = setTimeout(() => {
        parseAndExecuteCommand(finalTranscript.toLowerCase().trim());
        finalTranscript = '';
    }, 1500);
}

function onError(error) {
    clearTimeout(recognitionTimeout);
    if (isListening) {
        finalTranscript = '';
        setTimeout(listenLoop, 1000);
    }
}

function stopListening() {
    if (!isListening) return;
    isListening = false;
    clearTimeout(recognitionTimeout);
    window.plugins.speechRecognition.stopListening();
    BackgroundFetch.stop();
    document.getElementById('status').textContent = "Status: Idle";
    document.getElementById('startBtn').textContent = "Start Listening";
    clearNotification();
}

// --- Command Execution Logic ---
function parseAndExecuteCommand(command) {
    if (!command.includes('शक्ति')) return;
    updateNotification(`Executing: ${command}`);
    if (command.includes('नमस्ते बोलो')) {
        cordova.plugins.notification.local.schedule({
            id: new Date().getTime(),
            title: 'Voice CMD',
            text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।'
        });
    } else if (command.includes('कैमरा खोलो')) {
        cordova.plugins.backgroundMode.moveToForeground();
        setTimeout(() => {
            navigator.camera.getPicture(() => {}, (err) => {}, { sourceType: Camera.PictureSourceType.CAMERA });
        }, 500);
    } else if (command.includes('सो जाओ') || command.includes('बंद हो जाओ')) {
        stopListening();
    }
}

// --- Permissions and Notifications ---
function requestNotificationPermission(callback) {
    cordova.plugins.notification.local.hasPermission(granted => {
        if (granted) { callback(); } else { cordova.plugins.notification.local.requestPermission(() => callback()); }
    });
}

function checkAndRequestMicrophonePermission(callback) {
    window.plugins.speechRecognition.hasPermission(granted => {
        hasMicPermission = granted;
        if (!granted) {
            window.plugins.speechRecognition.requestPermission(() => { hasMicPermission = true; }, () => { hasMicPermission = false; alert('Microphone permission is required.'); });
        }
        if (callback) callback();
    }, err => console.error('Error checking mic permission: ' + err));
}

function requestBatteryOptimizationPermission() {
    cordova.plugins.PowerOptimization.isIgnoringBatteryOptimizations((isIgnoring) => {
        if (!isIgnoring) {
            alert('For the app to run reliably in the background, please allow it to ignore battery optimizations.');
            cordova.plugins.PowerOptimization.requestOptimizations();
        }
    });
}

function showRunningNotification(text) {
    cordova.plugins.notification.local.schedule({ id: NOTIFICATION_ID, title: 'Voice CMD is running', text: text, foreground: true, ongoing: true, icon: 'res://icon' });
}

function updateNotification(text) {
    cordova.plugins.notification.local.update({ id: NOTIFICATION_ID, text: text });
}

function clearNotification() {
    cordova.plugins.notification.local.clear(NOTIFICATION_ID);
}
