// --- Global State Variables ---
let isListening = false;
let hasMicPermission = false;
const NOTIFICATION_ID = 1;

// --- Advanced Listening Variables ---
let finalTranscript = '';
let recognitionTimeout;
let proactiveRestartInterval;

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

    // --- Background Mode Configuration (Most Important Part) ---
    cordova.plugins.backgroundMode.setDefaults({
        title: 'Voice CMD is Active',
        text: 'Listening for "शक्ति" commands.',
        silent: true
    });
    
    // **** यही मुख्य समाधान है ****
    // जब भी ऐप बैकग्राउंड में जाए, WebView ऑप्टिमाइज़ेशन को अक्षम करें
    cordova.plugins.backgroundMode.on('activate', () => {
        console.log('BACKGROUND MODE ACTIVATED: Disabling WebView optimizations.');
        cordova.plugins.backgroundMode.disableWebViewOptimizations(); 
        
        // एक साफ शुरुआत के लिए लिसनर को पुनरारंभ करना अभी भी एक अच्छा विचार है
        if (isListening) {
            window.plugins.speechRecognition.stopListening();
            setTimeout(listenLoop, 1000);
        }
    });

    // जब ऐप वापस सामने आए तो इसे फिर से सक्षम किया जा सकता है (वैकल्पिक, लेकिन अच्छा अभ्यास)
    cordova.plugins.backgroundMode.on('deactivate', () => {
        console.log('BACKGROUND MODE DEACTIVATED: Re-enabling WebView optimizations.');
        cordova.plugins.backgroundMode.enableWebViewOptimizations();
    });

    cordova.plugins.backgroundMode.enable();
    
    // --- UI Button Logic ---
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) stopListening();
        else if (hasMicPermission) startContinuousListening();
        else alert('Please grant Microphone permission first.');
    });
}

// --- Listening Logic ---
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
            console.log('Proactive Restart: Refreshing the listener.');
            window.plugins.speechRecognition.stopListening();
            setTimeout(listenLoop, 500);
        }
    }, 45000);
}

// --- Command Execution Logic ---
function parseAndExecuteCommand(command) {
    if (!command.includes('शक्ति')) return;
    
    updateNotification(`Executing: ${command}`);

    if (command.includes('नमस्ते बोलो')) {
        // यह अब बैकग्राउंड से तुरंत काम करना चाहिए
        cordova.plugins.notification.local.schedule({
            id: new Date().getTime(),
            title: 'Voice CMD',
            text: 'नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।'
        });
    } 
    else if (command.includes('कैमरा खोलो')) {
        // यह प्रक्रिया अब अधिक विश्वसनीय होनी चाहिए
        cordova.plugins.backgroundMode.moveToForeground();
        setTimeout(() => {
            navigator.camera.getPicture(
                () => console.log('Camera success'), 
                (err) => console.error('Camera error: ' + err), 
                { sourceType: Camera.PictureSourceType.CAMERA }
            );
        }, 500);
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
