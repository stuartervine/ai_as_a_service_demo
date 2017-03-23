var video = document.querySelector('video');
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');
var timer;

var errorsToConsole = function (e) {
    console.log("Something went a bit wrong", e);
};

function startPolling() {
    timer = setInterval(function () {
        snapshot()
    }, 5000);
}

function stopPolling() {
    clearInterval(timer);
}

function snapshot() {
    console.log("Taking snapshot and sending to AI");
    ctx.drawImage(video, 0, 0);
    // microsoftDescribePicture(responsiveVoice.speak);
}

function startVideoCapture() {
    navigator.getUserMedia({video: true, audio: false}, function (stream) {
        // video.addEventListener('click', snapshot, false);
        video.src = window.URL.createObjectURL(stream);
    }, function() {
        console.log("Some weird video error.");
    });
}

function microsoftDescribePicture(speakFn) {
    const requestDetails = {
        method: 'POST',
        body: dataUrlToBlob(canvas.toDataURL("image/png")),
        headers: new Headers({
            "Content-Type": "application/octet-stream",
            "Ocp-Apim-Subscription-Key": $("#ocpApiKey").val(),
        }),
        mode: 'cors',
        cache: 'default'
    };

    fetch('https://api.projectoxford.ai/vision/v1.0/analyze?visualFeatures=Categories,description&subscription-key=' + $("#ocpApiKey").val(), requestDetails)
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
