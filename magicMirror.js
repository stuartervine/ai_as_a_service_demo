'use strict';
const AWS = require('aws-sdk');
const Hapi = require('hapi');
const Path = require('path');

AWS.config.update({region: 'us-east-1'});
const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();
const bucketName = 'ai-as-a-service-demo';

const profiles = [
    {
        name: 'vegetarian',
        matches: (product) => product.categories.indexOf('vegetarian') >= 0
    },
    {
        name: 'gluten free',
        matches: (product) => product.categories.indexOf('gluten free') >= 0
    },
    {
        name: 'a barbecue lover',
        matches: (product) => product.categories.indexOf('a barbecue lover') >= 0
    },
    {
        name: 'generic',
        matches: (product) => true
    }
];

const server = new Hapi.Server({
    connections: {
        routes: {
            files: {
                relativeTo: Path.join(__dirname)
            }
        }
    }
});

const stickItInS3 = (keyName, body) => {
    console.log("Sticking it in S3");
    return new Promise((resolve, reject) => {
        s3.createBucket({Bucket: bucketName}, () => {
            s3.putObject({
                Bucket: bucketName,
                Key: keyName,
                Body: body
            }, (err, data) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                else resolve(data);
            });
        })
    });
};

const getFromS3 = (keyName) => {
    console.log("Getting it from S3");
    return new Promise((resolve, reject) => {
        s3.getObject({
            Bucket: bucketName,
            Key: keyName
        }, (err, data) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            else resolve(data);
        });
    });
};

const indexFace = (jsonFile, keyName) => {
    return new Promise((resolve, reject) => {
        rekognition.indexFaces({
            CollectionId: "magicmirror",
            DetectionAttributes: [],
            ExternalImageId: jsonFile,
            Image: {
                S3Object: {
                    Bucket: bucketName,
                    Name: keyName
                }
            }
        }, function (err, data) {
            if (err) reject(err);
            else     resolve(data);
        });
    });
};

const findFace = (imageName) => {
    return new Promise((resolve, reject) => {
        rekognition.searchFacesByImage({
            CollectionId: "magicmirror",
            FaceMatchThreshold: 90,
            Image: {
                S3Object: {
                    Bucket: bucketName,
                    Name: imageName
                }
            },
            MaxFaces: 5
        }, function (err, data) {
            if (err) reject(err); // an error occurred
            else     resolve(data);           // successful response
        })
    })
};

server.register(require('inert'), (err) => {
    server.connection({port: 5001});
    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: 'public',
                listing: true
            }
        }
    });
    server.route({
        method: 'POST',
        path: "/storeUser",
        handler: (req, res) => {
            let json = JSON.parse(req.payload.json);
            const matchingProfiles = profiles.filter(profile => {
                return json.basket.reduce((acc, product) => {
                    return acc && profile.matches(product);
                }, true)
            });
            let imageName = json.name + ".png";
            let jsonFile = json.name + ".json";
            stickItInS3(jsonFile, JSON.stringify({
                name: json.name,
                profile: matchingProfiles.map(profile => profile.name)[0],
                lastPurchase: json.basket && json.basket[0] || {name:'unknown'}
            }))
                .then(stickItInS3(imageName, new Buffer(json.image.split(",")[1], 'base64')))
                .then(indexFace(jsonFile, imageName))
                .then(() => res({result: 'User stored'}))
                .catch((err) => console.log(err));
        }
    });
    server.route({
        method: 'POST',
        path: '/findUser',
        handler: (req, res) => {
            stickItInS3("magicmirror.png", new Buffer(req.payload.split(",")[1], 'base64'))
                .then(() => findFace("magicmirror.png"))
                .then((json) => {
                    console.log(json);
                    if (json.FaceMatches) {
                        let matchingFace = json.FaceMatches[0];
                        console.log("Matching:");
                        console.log(matchingFace);
                        return matchingFace.Face.ExternalImageId;
                    } else {
                        res({});
                    }
                })
                .then((jsonFile) => getFromS3(jsonFile))
                .then((s3File) => {
                    let profile = JSON.parse(s3File.Body.toString());
                    console.log(profile);
                    res(profile);
                }).catch((err) => {
                console.log(err);
                res(err);
            })
        }
    });
    server.route({
        method: 'POST',
        path: '/deleteTestData',
        handler: (req, res) => {
            rekognition.deleteCollection({
                CollectionId: "magicmirror"
            }, (err, data) => {
                rekognition.createCollection({
                    CollectionId: "magicmirror"
                }, (err, data) => {
                    if (err) res(err, err.stack); // an error occurred
                    else     res(data);           // successful response
                });
            });

        }
    });
    server.start();
});

rekognition.createCollection({
    CollectionId: "magicmirror"
}, (err, data) => {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
});

