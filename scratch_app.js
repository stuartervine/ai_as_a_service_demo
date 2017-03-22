// Step 1: import AWS and explain the stickItInS3.

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();
const bucketName = 'ai-as-a-service-demo';
const keyName = 'image.png';

const stickItInS3 = (req) => {
    return new Promise((resolve, reject) => {
        s3.createBucket({Bucket: bucketName}, () => {
            s3.putObject({
                Bucket: bucketName,
                Key: keyName,
                Body: new Buffer(req.payload.split(",")[1], 'base64')
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        })
    });
};
server.route({
    method: 'POST',
    path: "/uploadImage",
    handler: (req, res) => {
        stickItInS3(req).then(() => {
            rekognition.detectFaces({
                Image: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: keyName
                    }
                },
                Attributes: [
                    'ALL'
                ]
            }, (err, data) => {
                res(data);
            });
        });
    }
});

// Step 2: Introduce face detection.

server.route({
    method: 'POST',
    path: "/facedetection",
    handler: (req, res) => {
        stickItInS3(req).then(() => {
            rekognition.detectFaces({
                Image: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: keyName
                    }
                },
                Attributes: [
                    'ALL'
                ]
            }, (err, data) => {
                res(data);
            });
        });
    }
});

// Step 3: Introduce object detection
server.route({
    method: 'POST',
    path: "/objectdetection",
    handler: (req, res) => {
        stickItInS3(req).then(() => {
            rekognition.detectLabels({
                Image: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: keyName
                    }
                },
                MaxLabels: 123,
                MinConfidence: 70
            }, function (err, data) {
                console.log(err);
                res(data);
            });
        }).catch((err) => console.log(err));
    }
});

//Step 4: Is it Stuart?
server.route({
    method: 'POST',
    path: "/isItStuart",
    handler: (req, res) => {
        stickItInS3(req)
            .then(() => {
                rekognition.compareFaces({
                    SimilarityThreshold: 90,
                    SourceImage: {
                        S3Object: {
                            Bucket: bucketName,
                            Name: "stuart.png"
                        }
                    },
                    TargetImage: {
                        S3Object: {
                            Bucket: bucketName,
                            Name: keyName
                        }
                    }
                }, function (err, data) {
                    if(err) {
                        console.log("Error in compare");
                        res({FaceMatches:[]});
                    } else {
                        res(data);
                    }
                })
            })
            .catch((err) => {
                console.log("Error in sending to S3");
                console.log(err);
                res({FaceMatches: []});
            });
    }
});
