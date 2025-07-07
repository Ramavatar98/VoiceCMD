// यह ट्रैक करेगा कि क्या सुनना चालू है और क्या अनुमति मिली है
let isListening = false;
let hasPermission = false;

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    // --- बैकग्राउंड मोड के लिए नोटिफिकेशन को कॉन्फ़िगर करें (यह क्रैश को रोकता है) ---
    cordova.plugins.backgroundMode.setDefaults({
        title:  'Voice CMD is Active',
        text:   'Listening for your "शक्ति" commands.',
        icon:   'ic_launcher', // यह आपके ऐप का डिफ़ॉल्ट आइकन है
        color:  '4A90E2', 
        silent: false 
    });
    // बैकग्राउंड मोड को चालू करें
    cordova.plugins.backgroundMode.enable();

    // जब ऐप बैकग्राउंड में जाए तो सुनिश्चित करें कि वह सुन रहा है
    cordova.plugins.backgroundMode.on('activate', () => {
        console.log('Background mode activated');
        // अगर अनुमति है तभी सुनने की कोशिश करें
        if (hasPermission && !isListening) {
            startContinuousListening();
        }
    });

    // --- माइक्रोफ़ोन की अनुमति को और मज़बूत तरीके से हैंडल करें ---
    checkAndRequestPermission();

    // बटन का लॉजिक
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) {
            stopListening();
        } else {
            // सुनने से पहले अनुमति जांचें
            if (hasPermission) {
                startContinuousListening();
            } else {
                alert('Please grant Microphone permission first.');
                checkAndRequestPermission(); // दोबारा अनुमति मांगें
            }
        }
    });
}

function checkAndRequestPermission() {
    window.plugins.speechRecognition.hasPermission(
        (isGranted) => {
            if (isGranted) {
                console.log('Permission already granted.');
                hasPermission = true;
            } else {
                console.log('Requesting permission...');
                window.plugins.speechRecognition.requestPermission(
                    () => {
                        console.log('Permission granted!');
                        hasPermission = true;
                    },
                    () => {
                        console.log('Permission denied.');
                        hasPermission = false;
                        alert('Microphone permission is required for this app to work.');
                    }
                );
            }
        },
        (error) => {
            console.error('Error checking permission: ' + error);
        }
    );
}

function startContinuousListening() {
    if (isListening || !hasPermission) return;
    isListening = true;
    document.getElementById('status').innerHTML = "Status: Listening...";
    document.getElementById('startBtn').innerHTML = "Stop Listening";
    console.log("Starting continuous listening...");
    listenLoop();
}

function listenLoop() {
    if (!isListening) return;

    let options = { language: 'hi-IN', matches: 1 };

    window.plugins.speechRecognition.startListening(
        (matches) => {
            const command = matches[0].toLowerCase().trim();
            document.getElementById('result').innerHTML = "<strong>आपने कहा:</strong> " + command;
            parseAndExecuteCommand(command);
            setTimeout(listenLoop, 500);
        },
        (error) => {
            console.error(error);
            // कुछ फोन पर एरर के बाद सुनना खुद बंद हो जाता है, इसलिए दोबारा शुरू करें
            if (isListening) {
                setTimeout(listenLoop, 1000);
            }
        },
        options
    );
}

function stopListening() {
    isListening = false;
    window.plugins.speechRecognition.stopListening();
    document.getElementById('status').innerHTML = "Status: Idle";
    document.getElementById('startBtn').innerHTML = "Start Listening";
    console.log("Stopped listening.");
}

function parseAndExecuteCommand(command) {
    console.log("Executing command: " + command);
    if (!command.includes('शक्ति')) return;

    if (command.includes('कैमरा खोलो')) {
        navigator.camera.getPicture(() => {}, () => {}, { sourceType: Camera.PictureSourceType.CAMERA });
    } else if (command.includes('नमस्ते बोलो')) {
        alert('नमस्ते! मैं आपकी सेवा में हाज़िर हूँ।');
    } else if (command.includes('सो जाओ')) {
        stopListening();
    }
}
