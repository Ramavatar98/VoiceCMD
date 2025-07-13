// --- Global State Variables ---
let isListening = false;
let hasMicPermission = false;
const NOTIFICATION_ID = 1;

// --- उन्नत सुनने के लिए वेरिएबल्स ---
let finalTranscript = ''; // अंतिम कमांड को स्टोर करने के लिए
let recognitionTimeout; // कमांड के अंत का पता लगाने के लिए टाइमर

// --- App Initialization ---
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // ... (यह हिस्सा पहले जैसा ही है) ...
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');
    requestNotificationPermission(() => {
        checkAndRequestMicrophonePermission(() => {
            if (hasMicPermission) requestBatteryOptimizationPermission();
        });
    });
    cordova.plugins.backgroundMode.setDefaults({ title: 'Voice CMD is Active', text: 'Listening for commands.', silent: true });
    cordova.plugins.backgroundMode.enable();
    cordova.plugins.backgroundMode.on('activate', () => { if(isListening) { setTimeout(listenLoop, 500); } });
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        else if (hasMicPermission) startContinuousListening();
        else alert('Please grant Microphone permission first.');
    });
}


// --- Listening Logic (यहाँ मुख्य बदलाव हैं) ---

function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Listening intelligently...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('स्मार्ट लिसनिंग सक्रिय है...');
    listenLoop();
}

function listenLoop() {
    if (!isListening) return;

    // **** स्मार्ट लिसनिंग के लिए नए विकल्प ****
    let options = {
        language: 'hi-IN',
        showPartial: true, // आंशिक परिणाम चालू करें
        showPopup: false
    };
    window.plugins.speechRecognition.startListening(onResult, onError, options);
}

// परिणाम मिलने पर यह नया फंक्शन चलेगा
function onResult(matches) {
    if (!matches || matches.length === 0) return;

    // टाइमर को रीसेट करें क्योंकि उपयोगकर्ता अभी भी बोल रहा है
    clearTimeout(recognitionTimeout);

    // आंशिक परिणामों को इकट्ठा करें
    finalTranscript = matches[0];
    document.getElementById('result').innerHTML = `<strong>सुन रहा हूँ...</strong> ${finalTranscript}`;

    // एक डीबाउंस टाइमर सेट करें। अगर उपयोगकर्ता 1.5 सेकंड के लिए चुप रहता है,
    // तो हम मान लेंगे कि कमांड पूरा हो गया है।
    recognitionTimeout = setTimeout(() => {
        console.log(`Final command received: ${finalTranscript}`);
        document.getElementById('result').innerHTML = `<strong>आपने कहा:</strong> ${finalTranscript}`;
        parseAndExecuteCommand(finalTranscript.toLowerCase().trim());
        
        // कमांड प्रोसेस करने के बाद, लिसनर को रीसेट करें
        finalTranscript = '';
        if (isListening) {
            // तुरंत फिर से सुनने के बजाय, थोड़ा रुकें
            setTimeout(listenLoop, 500);
        }
    }, 1500); // 1.5 सेकंड का ठहराव
}

function onError(error) {
    // एरर आने पर टाइमर साफ़ करें
    clearTimeout(recognitionTimeout);

    // No Match (7) या No speech (6) एरर पर, चुपचाप फिर से शुरू करें
    if (error === 7 || error === 6) {
        if (isListening) {
            // सुनिश्चित करें कि हम अगले कमांड के लिए तैयार हैं
            finalTranscript = '';
            setTimeout(listenLoop, 250);
        }
    } else {
        console.error("Speech recognition error code: ", error);
        if (isListening) {
            setTimeout(listenLoop, 1500);
        }
    }
}

function stopListening() {
    if (!isListening) return;
    isListening = false;
    clearTimeout(recognitionTimeout); // टाइमर बंद करें
    window.plugins.speechRecognition.stopListening();
    document.getElementById('status').textContent = "Status: Idle";
    document.getElementById('startBtn').textContent = "Start Listening";
    clearNotification();
}


// --- बाकी सभी फंक्शन पहले जैसे ही रहेंगे ---

function requestNotificationPermission(callback) { /* ... पहले जैसा कोड ... */ }
function checkAndRequestMicrophonePermission(callback) { /* ... पहले जैसा कोड ... */ }
function requestBatteryOptimizationPermission() { /* ... पहले जैसा कोड ... */ }
function parseAndExecuteCommand(command) { /* ... पहले जैसा कोड ... */ }
function showRunningNotification(text) { /* ... पहले जैसा कोड ... */ }
function updateNotification(text) { /* ... पहले जैसा कोड ... */ }
function clearNotification() { /* ... पहले जैसा कोड ... */ }

// --- Placeholders for unchanged functions ---
function requestNotificationPermission(callback) { cordova.plugins.notification.local.hasPermission(granted => { if (granted) { callback(); } else { cordova.plugins.notification.local.requestPermission(() => callback()); } }); }
function checkAndRequestMicrophonePermission(callback) { window.plugins.speechRecognition.hasPermission(granted => { hasMicPermission = granted; if (!granted) { window.plugins.speechRecognition.requestPermission(() => { hasMicPermission = true; }, () => { hasMicPermission = false; alert('Microphone permission is required.'); }); } if (callback) callback(); }, err => console.error('Error checking mic permission: ' + err)); }
function requestBatteryOptimizationPermission() { cordova.plugins.PowerOptimization.isIgnoringBatteryOptimizations((isIgnoring) => { if (!isIgnoring) { alert('For the app to run reliably in the background, please allow it to ignore battery optimizations.'); cordova.plugins.PowerOptimization.requestOptimizations(); } }); }
function parseAndExecuteCommand(command) { if (!command.includes('शक्ति')) return; updateNotification(`Last command: ${command}`); if (command.includes('कैमरा खोलो')) { navigator.camera.getPicture(() => {}, () => {}, { sourceType: Camera.PictureSourceType.CAMERA }); } else if (command.includes('नमस्ते बोलो')) { cordova.plugins.notification.local.schedule({ title: 'Voice CMD', text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।' }); } else if (command.includes('सो जाओ') || command.includes('बंद हो जाओ')) { stopListening(); } }
function showRunningNotification(text) { cordova.plugins.notification.local.schedule({ id: NOTIFICATION_ID, title: 'Voice CMD is running', text: text, foreground: true, ongoing: true, icon: 'res://icon' }); }
function updateNotification(text) { cordova.plugins.notification.local.update({ id: NOTIFICATION_ID, text: text }); }
function clearNotification() { cordova.plugins.notification.local.clear(NOTIFICATION_ID); }
