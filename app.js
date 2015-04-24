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

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', 8080)
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

app.use(function(req, res, next) {
  res.header("Content-Type", "multipart/form-data");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Cache-Control, X-Requested-With");
  next();
});

app.use(logger('dev'));
app.use(cookieParser());
app.use(session({ resave: false,
                  store: new RedisStore({
                    host: '127.0.0.1',
                    port: 6379,
                    prefix: 'sess'
                  }),
                  saveUninitialized: false,
                  secret: 'fybriseverything' }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({ dest: './uploads/',
    rename: function (fieldname, filename) {
        return filename+Date.now();
    },
    onParseStart: function() {

    },
    onParseEnd: function(req, next) {
      var data = req.body;

      if(data.episodeName == null || typeof data.episodeName == "undefined") {
        console.log("No episode name sent")
        next({error: "No episode name sent"})
      } else if (data.seriesId == null || typeof data.seriesId == "undefined") {
        console.log("No series id sent")
        next({error: "No series id sent"})
      } 
    },
    onFileUploadStart: function (file, response) {
      console.log(response.body)
      console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function (file, req, res) {
      var episodeName = req.body.episodeName;
      var seriesId = req.body.seriesId;

      //get length of file w/ ffmpeg

      var command = ffmpeg(file.path);
      command.ffprobe(0, function(err, data) {
        console.log(file.path+' metadata:');
        console.dir(data);
        var duration = data.streams[0].duration || 0;
        data = {
          episodeName: episodeName,
          seriesId: seriesId,
          fileName: file.filename,
          lengthOfFile: duration
        }

        request.post("http://localhost:5000/videos", data, function(err, data){
          if (err) console.log(err);
          console.log(file.fieldname+  ' uploaded to  ' + file.path);
          done=true;
          next();
        })
        
      });

      


    
    },
    onError: function (error, next) {
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
    console.log("Video Store listening on port "+app.get("port"))
});
module.exports = app;
