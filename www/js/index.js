let isListening = false;

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    // Permissions मांगें
    window.plugins.speechRecognition.requestPermission(() => {}, () => alert('Permission Denied'));

    // --- यहाँ नया कोड जोड़ा गया है ---
    // बैकग्राउंड मोड के लिए नोटिफिकेशन को कॉन्फ़िगर करें
    // यह बहुत ज़रूरी है ताकि ऐप क्रैश न हो
    cordova.plugins.backgroundMode.setDefaults({
        title:  'Voice CMD is Active',
        text:   'Listening for "शक्ति" commands.',
        icon:   'ic_launcher', // यह आपके ऐप का डिफ़ॉल्ट आइकन इस्तेमाल करेगा
        color:  '4A90E2', // नोटिफिकेशन का कलर (Optional)
        silent: false // इसे false रखें ताकि नोटिफिकेशन दिखे
    });
    // ------------------------------------

    // अब बैकग्राउंड मोड को चालू करें
    cordova.plugins.backgroundMode.enable();

    // जब ऐप बैकग्राउंड में जाए तो सुनिश्चित करें कि वह सुन रहा है
    cordova.plugins.backgroundMode.on('activate', () => {
        console.log('Background mode activated');
        if (!isListening) {
            startContinuousListening();
        }
    });

    // बटन का लॉजिक
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', () => {
        if (isListening) {
            stopListening();
        } else {
            startContinuousListening();
        }
    });
}

function startContinuousListening() {
    if (isListening) return;
    isListening = true;
    document.getElementById('status').innerHTML = "Status: Listening...";
    document.getElementById('startBtn').innerHTML = "Stop Listening";
    console.log("Starting continuous listening...");
    listenLoop();
}

function listenLoop() {
    if (!isListening) return; // अगर सुनना बंद हो गया है तो रुक जाएं

    let options = {
        language: 'hi-IN', // हिंदी में सुनें
        matches: 1,
    };

    window.plugins.speechRecognition.startListening(
        (matches) => {
            const command = matches[0].toLowerCase().trim();
            document.getElementById('result').innerHTML = "<strong>आपने कहा:</strong> " + command;
            parseAndExecuteCommand(command);
            
            // कमांड के बाद फिर से सुनना शुरू करें
            setTimeout(listenLoop, 500);
        },
        (error) => {
            console.error(error);
            if (isListening) {
                // एरर आने पर 2 सेकंड बाद फिर से कोशिश करें
                setTimeout(listenLoop, 2000);
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

    if (!command.includes('शक्ति')) {
        console.log("Activation word 'शक्ति' not found.");
        return;
    }

    if (command.includes('कैमरा खोलो') || command.includes('camera open')) {
        alert('कैमरा खोला जा रहा है...');
        navigator.camera.getPicture(
            () => {}, () => {}, 
            { sourceType: Camera.PictureSourceType.CAMERA, destinationType: Camera.DestinationType.DATA_URL }
        );
    }
    else if (command.includes('नमस्ते बोलो') || command.includes('hello bolo')) {
        alert('नमस्ते! मैं आपकी क्या मदद कर सकता हूँ?');
    }
    else if (command.includes('सो जाओ') || command.includes('stop listening')) {
        alert('ठीक है, मैं सुनना बंद कर रहा हूँ।');
        stopListening();
    }
    else {
        console.log("Command not recognized: " + command);
    }
}
