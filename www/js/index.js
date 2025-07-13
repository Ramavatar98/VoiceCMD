// --- Global State Variables ---
let isListening = false;
let hasMicPermission = false;
const NOTIFICATION_ID = 1;

// --- उन्नत सुनने के लिए वेरिएबल्स ---
let finalTranscript = '';
let recognitionTimeout;
let proactiveRestartInterval; // कनेक्शन को ताज़ा रखने के लिए

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
        console.log('Background mode activated.');
        // जब ऐप बैकग्राउंड में जाए, तो एक पूर्ण पुनरारंभ करें
        if(isListening) {
            console.log('App moved to background, performing a full listener restart.');
            stopListening();
            setTimeout(startContinuousListening, 1000); // 1 सेकंड बाद फिर से शुरू करें
        }
    });
    cordova.plugins.backgroundMode.enable();
    
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        else if (hasMicPermission) startContinuousListening();
        else alert('Please grant Microphone permission first.');
    });
}


// --- Listening Logic (प्रोएक्टिव रीस्टार्ट के साथ) ---

function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Proactive listening...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('प्रोएक्टिव लिसनिंग सक्रिय है...');
    listenLoop();

    // **** प्रोएक्टिव रीस्टार्ट टाइमर शुरू करें ****
    // हर 45 सेकंड में, हम कनेक्शन को ताज़ा करने के लिए लिसनर को पूरी तरह से पुनरारंभ करेंगे।
    clearInterval(proactiveRestartInterval);
    proactiveRestartInterval = setInterval(() => {
        if (isListening) {
            console.log('Proactive Restart: Refreshing the listener to maintain background access.');
            window.plugins.speechRecognition.stopListening();
            setTimeout(listenLoop, 500); // 0.5 सेकंड बाद फिर से शुरू करें
        }
    }, 45000); // 45 सेकंड
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
        console.log(`Final command: ${finalTranscript}`);
        document.getElementById('result').innerHTML = `<strong>आपने कहा:</strong> ${finalTranscript}`;
        parseAndExecuteCommand(finalTranscript.toLowerCase().trim());
        finalTranscript = '';
        // यहाँ लूप को पुनरारंभ न करें, onError या proactiveRestart उसे संभाल लेगा
    }, 1500);
}

function onError(error) {
    clearTimeout(recognitionTimeout);
    console.log(`Listener error code: ${error}. Restarting.`);
    // किसी भी त्रुटि पर, बस थोड़ी देर बाद फिर से सुनने का प्रयास करें
    if (isListening) {
        finalTranscript = '';
        setTimeout(listenLoop, 1000); // 1 सेकंड की देरी
    }
}

function stopListening() {
    if (!isListening) return;
    isListening = false;
    clearInterval(proactiveRestartInterval); // प्रोएक्टिव रीस्टार्ट टाइमर बंद करें
    clearTimeout(recognitionTimeout);
    window.plugins.speechRecognition.stopListening();
    document.getElementById('status').textContent = "Status: Idle";
    document.getElementById('startBtn').textContent = "Start Listening";
    clearNotification();
}


// --- बाकी सभी फंक्शन पहले जैसे ही रहेंगे ---
function requestNotificationPermission(callback) { cordova.plugins.notification.local.hasPermission(granted => { if (granted) { callback(); } else { cordova.plugins.notification.local.requestPermission(() => callback()); } }); }
function checkAndRequestMicrophonePermission(callback) { window.plugins.speechRecognition.hasPermission(granted => { hasMicPermission = granted; if (!granted) { window.plugins.speechRecognition.requestPermission(() => { hasMicPermission = true; }, () => { hasMicPermission = false; alert('Microphone permission is required.'); }); } if (callback) callback(); }, err => console.error('Error checking mic permission: ' + err)); }
function requestBatteryOptimizationPermission() { cordova.plugins.PowerOptimization.isIgnoringBatteryOptimizations((isIgnoring) => { if (!isIgnoring) { alert('For the app to run reliably in the background, please allow it to ignore battery optimizations.'); cordova.plugins.PowerOptimization.requestOptimizations(); } }); }
function parseAndExecuteCommand(command) { if (!command.includes('शक्ति')) return; updateNotification(`Last command: ${command}`); if (command.includes('कैमरा खोलो')) { navigator.camera.getPicture(() => {}, () => {}, { sourceType: Camera.PictureSourceType.CAMERA }); } else if (command.includes('नमस्ते बोलो')) { cordova.plugins.notification.local.schedule({ title: 'Voice CMD', text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।' }); } else if (command.includes('सो जाओ') || command.includes('बंद हो जाओ')) { stopListening(); } }
function showRunningNotification(text) { cordova.plugins.notification.local.schedule({ id: NOTIFICATION_ID, title: 'Voice CMD is running', text: text, foreground: true, ongoing: true, icon: 'res://icon' }); }
function updateNotification(text) { cordova.plugins.notification.local.update({ id: NOTIFICATION_ID, text: text }); }
function clearNotification() { cordova.plugins.notification.local.clear(NOTIFICATION_ID); }
