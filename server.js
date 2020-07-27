const express = require('express');
const app = express();
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs');

app.use(fileUpload());

app.use(express.static('public'));
if (!fs.existsSync('rendered-images')) {
	fs.mkdirSync('rendered-images');
}
app.use(express.static('rendered-images'));

app.get('/', function(req, res) {
	res.sendFile(path.join(__dirname, '/views', 'index.html'));
});

const AWS = require('aws-sdk');
// AWS.config.loadFromPath('./config.json');
const s3 = new AWS.S3();
const bucketName = process.env.BUCKET || 'poc-worker-safety-bucket-17prxsi45gt4w';

app.post('/upload', function(req, res) {
	if (!req.files) {
		return res.status(400).send('No files were uploaded.');
	}

	const sampleFile = req.files.sampleFile;
	
	// TODO uuid
	const newFileName = sampleFile.name.replace('.', `_${Date.now()}.`);

	const keyName = `inbound/${newFileName}`;
	const params = {Bucket: bucketName, Key: keyName, Body: sampleFile.data};
	s3.putObject(params, function(err, data) {
		if (err)
			res.status(500).send(err);
		else {
			console.log("Successfully uploaded data to " + bucketName + "/" + keyName);
			res.send(newFileName);
		}
	});
});

app.get('/result/:fileName', function(req, res) {
	const params = {
		Bucket: bucketName, 
		Key: 'rendered-inbound/' + req.params.fileName
	   };
	s3.getObject(params, function(err, data) {
		if (err)
			res.status(500).send(err);
		else {
			fs.writeFile('./rendered-images/' + req.params.fileName, data.Body, (err) => {
				if(err) 
					res.status(500).send(err);
				else {
					res.send(req.params.fileName);
				}
			  });
		}
	});
});

app.listen(3000, function() {
	console.log('Example app listening on port 3000!');
});