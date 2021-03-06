const video = document.querySelector('video');
const canvas = document.querySelector('canvas');

const errorsToConsole = function (e) {
    console.log("Something went a bit wrong", e);
};

function startVideoCapture() {
    navigator.getUserMedia({video: true, audio: false}, function (stream) {
        video.src = window.URL.createObjectURL(stream);
    }, errorsToConsole);
}

const ctx = canvas.getContext('2d');

// video.addEventListener('click', snapshot, false);

function snapshot() {
    console.log("Taking snapshot and sending to AI");
    ctx.drawImage(video, 0, 0);
    microsoftDescribePicture(responsiveVoice.speak);
}

var timer;

function startPolling() {
    timer = setInterval(function () {
        snapshot()
    }, 5000);
}

function stopPolling() {
    clearInterval(timer);
}


function microsoftDescribePicture(speakFn) {
    let apiKey = document.getElementById("ocpApiKey").value;
    const requestDetails = {
        method: 'POST',
        body: dataUrlToBlob(canvas.toDataURL("image/png")),
        headers: new Headers({
            "Content-Type": "application/octet-stream",
            "Ocp-Apim-Subscription-Key": apiKey,
        }),
        mode: 'cors',
        cache: 'default'
    };

    fetch('https://api.projectoxford.ai/vision/v1.0/analyze?visualFeatures=Categories,description&subscription-key=' + apiKey, requestDetails)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            json.description.captions.forEach(function (caption) {
                speakFn(caption.text);
            });
        });
}

function awsUploadToS3() {
    const requestDetails = {
        method: 'POST',
        body: canvas.toDataURL("image/png"),
        headers: new Headers({
            "Content-Type": "application/octet-stream"
        }),
        mode: 'no-cors',
        cache: 'default'
    };

    fetch('http://localhost:5000/uploadToS3', requestDetails)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            console.log(json);
        });
}

function awsRecognizeFaces(speakFn) {
    const requestDetails = {
        method: 'POST',
        body: canvas.toDataURL("image/png"),
        headers: new Headers({
            "Content-Type": "application/octet-stream"
        }),
        mode: 'no-cors',
        cache: 'default'
    };

    fetch('http://localhost:5000/facedetection', requestDetails)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            console.log(json);
            var toSpeak = json.FaceDetails.map(function (faceDetails) {
                console.log(faceDetails);
                return "A " + faceDetails.Gender.Value +
                    " aged between " + faceDetails.AgeRange.Low + " and " + faceDetails.AgeRange.High +
                    " that looks " + faceDetails.Emotions[0].Type;
            }).join(" and ");
            speakFn(toSpeak);
        });
}

function awsRecognizeObjects(speakFn) {
    const requestDetails = {
        method: 'POST',
        body: canvas.toDataURL("image/png"),
        headers: new Headers({
            "Content-Type": "application/octet-stream"
        }),
        mode: 'no-cors',
        cache: 'default'
    };

    fetch('http://localhost:5000/objectdetection', requestDetails)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            console.log(json);
            speakFn(json.Labels.map(label => label.Name).join(" and "));
        });
}

function isItStuart(speakFn) {
    const requestDetails = {
        method: 'POST',
        body: canvas.toDataURL("image/png"),
        headers: new Headers({
            "Content-Type": "application/octet-stream"
        }),
        mode: 'no-cors',
        cache: 'default'
    };

    fetch('http://localhost:5000/isItStuart', requestDetails)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            console.log(json);
            const matches = json.FaceMatches
                .map(face => face.Similarity)
                .filter(similarity => similarity > 90);

            speakFn("I can see " + matches.length + " Stuarts");
        });
}
