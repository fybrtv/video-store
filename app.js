var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var routes = require('./routes/index');
var redis = require('redis');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);

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
app.use(session({ resave: true,
                  store: new RedisStore({
                    host: '127.0.0.1',
                    port: 6379,
                    prefix: 'sess'
                  }),
                  saveUninitialized: true,
                  secret: 'fybriseverything' }));
app.use(multer({ dest: './uploads/',
    rename: function (fieldname, filename) {
        return filename+Date.now();
    },
    onFileUploadStart: function (file, response) {
      console.log(response.body)
      console.log(file.originalname + ' is starting ...')
    },
    onFileUploadComplete: function (file, req, res) {
      console.log(file)
      console.log(file.fieldname + ':' + req.session.seriesId + ' uploaded to  ' + file.path)
      done=true;
    },
    onError: function (error, next) {
      console.log(error)
      next(error)
    }
    }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

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
