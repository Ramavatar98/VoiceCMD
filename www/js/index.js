// ... (सभी ग्लोबल वेरिएबल्स वही रहेंगे) ...

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // ... (पिछला onDeviceReady कोड वही रहेगा) ...
    // ... (backgroundMode सेटिंग्स भी वही रहेंगी) ...

    // **** बैकग्राउंड फ़ेच का कॉन्फ़िगरेशन ****
    configureBackgroundFetch();
}

// **** नया फंक्शन: बैकग्राउंड फ़ेच को कॉन्फ़िगर करें ****
function configureBackgroundFetch() {
    const fetchCallback = async (taskId) => {
        console.log('[BackgroundFetch] event received!', taskId);
        // यह तब चलेगा जब एंड्रॉइड आपके ऐप को बैकग्राउंड में चलाएगा
        // हम इसका उपयोग अपने लिसनर को जबरदस्ती जगाने के लिए करेंगे
        if (isListening) {
            console.log('[BackgroundFetch] Waking up the listener...');
            window.plugins.speechRecognition.stopListening();
            setTimeout(listenLoop, 500);
        }
        // आपको यह बताना होगा कि टास्क पूरा हो गया है
        BackgroundFetch.finish(taskId);
    };

    const fetchTimeoutCallback = async (taskId) => {
        console.warn('[BackgroundFetch] TIMEOUT:', taskId);
        BackgroundFetch.finish(taskId);
    };

    BackgroundFetch.configure(fetchCallback, fetchTimeoutCallback, {
        minimumFetchInterval: 15, // मिनटों में (एंड्रॉइड के लिए न्यूनतम 15 है)
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true
    });
}


// --- Listening Logic ---
function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    // ... (बाकी का फंक्शन वही रहेगा) ...
    listenLoop();
}

// ... (बाकी सभी फंक्शन पहले जैसे ही रहेंगे) ...
// onResult, onError, stopListening, parseAndExecuteCommand, आदि।
// उनमें कोई बदलाव करने की आवश्यकता नहीं है।

// --- नीचे पूरा कोड है ---
// --- Global State Variables ---
let isListening = false, hasMicPermission = false, NOTIFICATION_ID = 1;
let finalTranscript = '', recognitionTimeout;

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

    cordova.plugins.backgroundMode.setDefaults({ title: 'Voice CMD is Active', text: 'Listening for "शक्ति" commands.', silent: true });
    cordova.plugins.backgroundMode.on('activate', () => {
        cordova.plugins.backgroundMode.disableWebViewOptimizations();
        if (isListening) { window.plugins.speechRecognition.stopListening(); setTimeout(listenLoop, 1000); }
    });
    cordova.plugins.backgroundMode.enable();
    
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        else if (hasMicPermission) startContinuousListening();
        else alert('Please grant Microphone permission first.');
    });

    // बैकग्राउंड फ़ेच को कॉन्फ़िगर करें
    configureBackgroundFetch();
}

// --- Listening Logic ---
function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Robust listening...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('मजबूत लिसनिंग सक्रिय है...');
    listenLoop();
    // यहाँ से प्रोएक्टिव रीस्टार्ट को हटा दें, क्योंकि बैकग्राउंड फ़ेच इसे संभालेगा
}

function listenLoop() { if (!isListening) return; let options = { language: 'hi-IN', showPartial: true, showPopup: false }; window.plugins.speechRecognition.startListening(onResult, onError, options); }
function onResult(matches) { if (!matches || matches.length === 0) return; clearTimeout(recognitionTimeout); finalTranscript = matches[0]; document.getElementById('result').innerHTML = `<strong>सुन रहा हूँ...</strong> ${finalTranscript}`; recognitionTimeout = setTimeout(() => { parseAndExecuteCommand(finalTranscript.toLowerCase().trim()); finalTranscript = ''; }, 1500); }
function onError(error) { clearTimeout(recognitionTimeout); if (isListening) { finalTranscript = ''; setTimeout(listenLoop, 1000); } }
function stopListening() { if (!isListening) return; isListening = false; clearTimeout(recognitionTimeout); window.plugins.speechRecognition.stopListening(); document.getElementById('status').textContent = "Status: Idle"; document.getElementById('startBtn').textContent = "Start Listening"; clearNotification(); }

// --- Command Execution Logic ---
function parseAndExecuteCommand(command) { if (!command.includes('शक्ति')) return; updateNotification(`Executing: ${command}`); if (command.includes('नमस्ते बोलो')) { cordova.plugins.notification.local.schedule({ id: new Date().getTime(), title: 'Voice CMD', text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।' }); } else if (command.includes('कैमरा खोलो')) { cordova.plugins.backgroundMode.moveToForeground(); setTimeout(() => { navigator.camera.getPicture(() => {}, (err) => {}, { sourceType: Camera.PictureSourceType.CAMERA }); }, 500); } else if (command.includes('सो जाओ') || command.includes('बंद हो जाओ')) { stopListening(); } }

// --- Permissions and Notifications ---
function requestNotificationPermission(callback) { cordova.plugins.notification.local.hasPermission(granted => { if (granted) { callback(); } else { cordova.plugins.notification.local.requestPermission(() => callback()); } }); }
function checkAndRequestMicrophonePermission(callback) { window.plugins.speechRecognition.hasPermission(granted => { hasMicPermission = granted; if (!granted) { window.plugins.speechRecognition.requestPermission(() => { hasMicPermission = true; }, () => { hasMicPermission = false; alert('Microphone permission is required.'); }); } if (callback) callback(); }, err => console.error('Error checking mic permission: ' + err)); }
function requestBatteryOptimizationPermission() { cordova.plugins.PowerOptimization.isIgnoringBatteryOptimizations((isIgnoring) => { if (!isIgnoring) { alert('For the app to run reliably in the background, please allow it to ignore battery optimizations.'); cordova.plugins.PowerOptimization.requestOptimizations(); } }); }
function showRunningNotification(text) { cordova.plugins.notification.local.schedule({ id: NOTIFICATION_ID, title: 'Voice CMD is running', text: text, foreground: true, ongoing: true, icon: 'res://icon' }); }
function updateNotification(text) { cordova.plugins.notification.local.update({ id: NOTIFICATION_ID, text: text }); }
function clearNotification() { cordova.plugins.notification.local.clear(NOTIFICATION_ID); }
