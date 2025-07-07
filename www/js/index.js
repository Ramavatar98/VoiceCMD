let isListening = false;

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    document.getElementById('deviceready').classList.add('ready');

    // Permissions मांगें
    window.plugins.speechRecognition.requestPermission(() => {}, () => alert('Permission Denied'));

    // बैकग्राउंड मोड को चालू करें
    cordova.plugins.backgroundMode.enable();
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
            setTimeout(listenLoop, 500); // 0.5 सेकंड का ब्रेक
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
    console.log("Stopped listening.");
}

function parseAndExecuteCommand(command) {
    console.log("Executing command: " + command);

    // --- कस्टम कमांड्स यहाँ डालें ---
    // कमांड में "शक्ति" शब्द होना जरूरी है
    if (!command.includes('शक्ति')) {
        console.log("Activation word 'शक्ति' not found.");
        return;
    }

    // 1. कैमरा खोलने का कमांड
    if (command.includes('कैमरा खोलो') || command.includes('camera open')) {
        alert('कैमरा खोला जा रहा है...');
        navigator.camera.getPicture(
            () => {}, () => {}, 
            { sourceType: Camera.PictureSourceType.CAMERA, destinationType: Camera.DestinationType.DATA_URL }
        );
    }
    // 2. हेलो बोलने का कमांड
    else if (command.includes('नमस्ते बोलो') || command.includes('hello bolo')) {
        alert('नमस्ते! मैं आपकी क्या मदद कर सकता हूँ?');
    }
    // 3. ऐप बंद करने का कमांड (सुनना बंद कर देगा)
    else if (command.includes('सो जाओ') || command.includes('stop listening')) {
        alert('ठीक है, मैं सुनना बंद कर रहा हूँ।');
        stopListening();
    }
    // कमांड समझ न आने पर
    else {
        console.log("Command not recognized: " + command);
    }
      }
