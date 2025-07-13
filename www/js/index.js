// --- Global State Variables and Initialization ---
// ... (यह पूरा हिस्सा पहले जैसा ही है, कोई बदलाव नहीं) ...
let isListening = false, hasMicPermission = false, NOTIFICATION_ID = 1;
let finalTranscript = '', recognitionTimeout, proactiveRestartInterval;
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
        if (isListening) { stopListening(); setTimeout(startContinuousListening, 1000); }
    });
    cordova.plugins.backgroundMode.enable();
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        else if (hasMicPermission) startContinuousListening();
        else alert('Please grant Microphone permission first.');
    });
}

// --- Listening Logic ---
// ... (यह पूरा हिस्सा पहले जैसा ही है, कोई बदलाव नहीं) ...
function startContinuousListening() {
    if (isListening || !hasMicPermission) return;
    isListening = true;
    document.getElementById('status').textContent = "Status: Proactive listening...";
    document.getElementById('startBtn').textContent = "Stop Listening";
    showRunningNotification('प्रोएक्टिव लिसनिंग सक्रिय है...');
    listenLoop();
    clearInterval(proactiveRestartInterval);
    proactiveRestartInterval = setInterval(() => {
        if (isListening) {
            console.log('Proactive Restart: Refreshing listener.');
            window.plugins.speechRecognition.stopListening();
            setTimeout(listenLoop, 500);
        }
    }, 45000);
}

function listenLoop() { /* ... पहले जैसा कोड ... */ }
function onResult(matches) { /* ... पहले जैसा कोड ... */ }
function onError(error) { /* ... पहले जैसा कोड ... */ }
function stopListening() { /* ... पहले जैसा कोड ... */ }


// --- Command Execution Logic (यहाँ मुख्य बदलाव हैं) ---

function parseAndExecuteCommand(command) {
    if (!command.includes('शक्ति')) {
        console.log("Wake word not found in: " + command);
        return;
    }
    
    updateNotification(`Last command: ${command}`);

    // **** समाधान 1: alert() को नोटिफिकेशन से बदलें ****
    // यह बैकग्राउंड से मज़बूती से काम करेगा।
    if (command.includes('नमस्ते बोलो')) {
        cordova.plugins.notification.local.schedule({
            id: new Date().getTime(), // हर बार एक यूनिक ID दें
            title: 'Voice CMD',
            text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।'
        });
    } 
    
    // **** समाधान 2: कैमरा खोलने से पहले ऐप को सामने लाएं ****
    else if (command.includes('कैमरा खोलो')) {
        // पहले ऐप को अग्रभूमि में लाएं
        cordova.plugins.backgroundMode.moveToForeground();
        // फिर, थोड़ी देर बाद कैमरा खोलें ताकि ऐप को सामने आने का समय मिल जाए
        setTimeout(() => {
            navigator.camera.getPicture(
                () => { console.log('Camera success'); }, 
                (err) => { console.error('Camera error: ' + err); }, 
                { sourceType: Camera.PictureSourceType.CAMERA }
            );
        }, 500); // 0.5 सेकंड की देरी
    } 
    
    else if (command.includes('सो जाओ') || command.includes('बंद हो जाओ')) {
        stopListening();
    }
}


// --- बाकी सभी फंक्शन पहले जैसे ही रहेंगे ---
// ... (इनमें कोई बदलाव नहीं है) ...
// --- Placeholders for unchanged functions ---
function listenLoop() { if (!isListening) return; let options = { language: 'hi-IN', showPartial: true, showPopup: false }; window.plugins.speechRecognition.startListening(onResult, onError, options); }
function onResult(matches) { if (!matches || matches.length === 0) return; clearTimeout(recognitionTimeout); finalTranscript = matches[0]; document.getElementById('result').innerHTML = `<strong>सुन रहा हूँ...</strong> ${finalTranscript}`; recognitionTimeout = setTimeout(() => { parseAndExecuteCommand(finalTranscript.toLowerCase().trim()); finalTranscript = ''; }, 1500); }
function onError(error) { clearTimeout(recognitionTimeout); if (isListening) { finalTranscript = ''; setTimeout(listenLoop, 1000); } }
function stopListening() { if (!isListening) return; isListening = false; clearInterval(proactiveRestartInterval); clearTimeout(recognitionTimeout); window.plugins.speechRecognition.stopListening(); document.getElementById('status').textContent = "Status: Idle"; document.getElementById('startBtn').textContent = "Start Listening"; clearNotification(); }
function requestNotificationPermission(callback) { cordova.plugins.notification.local.hasPermission(granted => { if (granted) { callback(); } else { cordova.plugins.notification.local.requestPermission(() => callback()); } }); }
function checkAndRequestMicrophonePermission(callback) { window.plugins.speechRecognition.hasPermission(granted => { hasMicPermission = granted; if (!granted) { window.plugins.speechRecognition.requestPermission(() => { hasMicPermission = true; }, () => { hasMicPermission = false; alert('Microphone permission is required.'); }); } if (callback) callback(); }, err => console.error('Error checking mic permission: ' + err)); }
function requestBatteryOptimizationPermission() { cordova.plugins.PowerOptimization.isIgnoringBatteryOptimizations((isIgnoring) => { if (!isIgnoring) { alert('For the app to run reliably in the background, please allow it to ignore battery optimizations.'); cordova.plugins.PowerOptimization.requestOptimizations(); } }); }
function showRunningNotification(text) { cordova.plugins.notification.local.schedule({ id: NOTIFICATION_ID, title: 'Voice CMD is running', text: text, foreground: true, ongoing: true, icon: 'res://icon' }); }
function updateNotification(text) { cordova.plugins.notification.local.update({ id: NOTIFICATION_ID, text: text }); }
function clearNotification() { cordova.plugins.notification.local.clear(NOTIFICATION_ID); }
