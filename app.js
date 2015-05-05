var express = require('express');
var path = require('path');
var fs = require('fs');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var request = require('request');
var routes = require('./routes/index');
var redis = require('redis');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var ffmpeg = require('fluent-ffmpeg');
var objectid = require('objectid');
var exec = require('child_process').exec;
var app = express();
var cors = require('cors');
var fs = require('fs');
app.use(cors())
app.use('/uploads', express.static('uploads'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', 8080)
    // uncomment after placing your favicon in /public
    //app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(cookieParser());
app.use(session({
    resave: false,
    store: new RedisStore({
        host: '127.0.0.1',
        port: 6379,
        prefix: 'sess'
    }),
    saveUninitialized: false,
    secret: 'fybriseverything'
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({
    dest: './uploads//',
    rename: function(fieldname, filename, req, res) {
        var id = objectid();
        return id.toString();
    },
    onParseStart: function() {

    },
    onParseEnd: function(req, next) {
        var data = req.body;

        if (data.episodeName == null || typeof data.episodeName == "undefined") {
            console.log("No episode name sent")
            next({
                error: "No episode name sent"
            })
        } else if (data.seriesId == null || typeof data.seriesId == "undefined") {
            console.log("No series id sent")
            next({
                error: "No series id sent"
            })
        }
    },
    onFileUploadStart: function(file, response) {
        console.log(response.body)
        console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function(file, req, res) {
        var episodeName = req.body.episodeName;
        var seriesId = req.body.seriesId;
        console.log(file);
        var command = ffmpeg(file.path);
        var fileId = file.name.split(".")[0];
        command.ffprobe(0, function(err, data) {
            if (err) throw err;
            var duration = data.format.duration || 0;
            duration = (duration / 60).toFixed(3);
            var dataVid = {
                fileId: fileId,
                episodeName: episodeName,
                seriesId: seriesId,
                fileName: file.name,
                lengthOfFile: duration
            }
            fs.mkdir('./uploads/' + fileId, function(s) {
                var c1 = exec('ffmpeg -codec:a libvo_aacenc -ar 44100 -ac 1 -codec:v libx264 -profile:v baseline -crf 50 -preset ultrafast -level 13 -b:v 25k ./uploads/' + fileId + '/_out.mp4 -i ' + file.path, function(error, stdout, etderr) {
                    if (error) {
                        process.stdout.write('1', error)
                    } else {
                        c1.kill('SIGINT');
                        process.stdout.write("1" + stdout);
                        var c2 = exec('ls', function(error, stdout, etderr) {
                            if (error) {
                                process.stdout.write('1', error)
                            } else {
                                c2.kill('SIGINT');
                                var c3 = exec('ls', function(error, stdout, etderr) {
                                    if (error) {
                                        process.stdout.write('1', error)
                                    } else {
                                        c3.kill('SIGINT');
                                        var c4 = exec('MP4Box -bs-switching no -dash 10000 -profile live -segment-ext mp4 -segment-name DASH_%s -out ./uploads/' + fileId + '/_dash.mpd ./uploads/' + fileId + '/_out.mp4#video ./uploads/' + fileId + '/_out.mp4#audio', function(error, stdout, etderr) {
                                            if (error) {
                                                process.stdout.write(error)
                                            } else {
                                                c4.kill('SIGINT');
                                                process.stdout.write("2" + stdout);
                                                request.post({
                                                    url: "http://localhost:5000/videos",
                                                    form: dataVid
                                                }, function(err, response, body) {
                                                    if (err) console.log(err);
                                                    console.log(file.fieldname + ' uploaded to  ' + file.path);
                                                    console.log(body);
                                                    done = true;
                                                    res.send();
                                                })
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }


                });
            });
        });
    },
    onError: function(error, next) {
        console.log(error)
        next(error)
    }
}));


app.post('/upload', routes.uploadPOST);
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(app.get("port"), function() {
    console.log("Video Store listening on port " + app.get("port"))
});
module.exports = app;