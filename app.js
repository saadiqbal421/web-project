const express =  require('express');
const path    =  require('path');
var http = require('http')
var fs = require('fs')
const app1 = http.createServer(requestHandler)

const bodyParser = require('body-parser');
const session = require('express-session');
var cookieParser = require('cookie-parser');
var flash = require('express-flash');
var logger = require('morgan');

const app = express();


app.set('view engine', 'ejs');
app.set('views', 'views');

//own module
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
    session({
      secret: 'secret',
      resave: true,
      saveUninitialized: false
    })
  );

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '/public')));

app.use(flash());
app.use(userRouter);
app.use("/admin" ,adminRouter);

app.listen(3000, () => console.log("Server is Running..."));
function requestHandler(request, response) {
  console.log(`🖥 Received request for ${request.url}`);
  // append /client to serve pages from that folder
  var filePath = "./client" + request.url;
  if (filePath == "./client/") {
    // serve index page on request /
    filePath = "./client/contact.ejs";
  }
  var extname = String(path.extname(filePath)).toLowerCase();
  console.log(`🖥 Serving ${filePath}`);
  var mimeTypes = {
    ".ejs": "text/ejs",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };
  var contentType = mimeTypes[extname] || "application/octet-stream";
  fs.readFile(filePath, function (error, content) {
    if (error) {
      if (error.code == "ENOENT") {
        fs.readFile("./client/404.html", function (error, content) {
          response.writeHead(404, { "Content-Type": contentType });
          response.end(content, "utf-8");
        });
      } else {
        response.writeHead(500);
        response.end("Sorry, there was an error: " + error.code + " ..\n");
      }
    } else {
      response.writeHead(200, { "Content-Type": contentType });
      response.end(content, "utf-8");
    }
  });
}

// SOCKET.IO CHAT EVENT HANDLING
const io = require("socket.io")(app1, {
  path: "/socket.io",
});

io.attach(app1, {
  // includes local domain to avoid CORS error locally
  // configure it accordingly for production
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ["websocket", "polling"],
  },
  allowEIO3: true,
});

var users = {};

io.on("connection", (socket) => {
  console.log("👾 New socket connected! >>", socket.id);

  // handles new connection
  socket.on("new-connection", (data) => {
    // captures event when new clients join
    console.log(`new-connection event received`, data);
    // adds user to list
    users[socket.id] = data.username;
    console.log("users :>> ", users);
    // emit welcome message event
    socket.emit("welcome-message", {
      user: "server",
      message: `Welcome to this Socket.io chat ${data.username}. There are ${
        Object.keys(users).length
      } users connected`,
    });
  });

  // handles message posted by client
  socket.on("new-message", (data) => {
    console.log(`👾 new-message from ${data.user}`);
    // broadcast message to all sockets except the one that triggered the event
    socket.broadcast.emit("broadcast-message", {
      user: users[data.user],
      message: data.message,
    });
  });
});