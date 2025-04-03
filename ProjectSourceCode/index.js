// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/src/views/layouts',
  partialsDir: __dirname + '/src/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.


//set up styles
app.use(express.static(path.join(__dirname, 'src', 'resources')));


// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get("/", (req, res) => {
  const events = [
    { title: "Comic-Con 2024", link: "https://www.comic-con.org/" },
    { title: "Anime Expo", link: "https://www.anime-expo.org/" },
    { title: "PAX West", link: "https://west.paxsite.com/" },
    { title: "GDC 2024", link: "https://gdconf.com/" },
    { title: "E3 Expo", link: "https://www.e3expo.com/" }
  ];
  res.render("pages/home", { title: "ConCave", events });
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post("/register", async (req, res) => {
  try {
    if (req.body.password !== req.body.confirmPassword) {
      return res.render("pages/register", {
        error: "Passwords do not match.",
        formData: req.body
      });
    }
    const hash = await bcrypt.hash(req.body.password, 10);
    await db.none(
      "INSERT INTO users (first_name, last_name, username, email, rank, password) VALUES ($1, $2, $3, $4, $5, $6)",
      [req.body.firstName, req.body.lastName, req.body.username, req.body.email, "user", hash]
    );
    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.render("pages/register", {
      error: "Could not create user. Maybe username or email is taken?",
      formData: req.body
    });
  }
});

app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.post("/login", async (req, res) => {
  try {
    const user = await db.oneOrNone(
      "SELECT * FROM users WHERE username = $1",
      [req.body.username]
    );
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      req.session.user = user;
      req.session.save();
      console.log("Logged in ", user);
      res.redirect("/im");
    } else {
      res.render("pages/login", { error: "Incorrect username or password." });
    }
  } catch (error) {
    console.log(error);
    res.render("pages/login", { error: "Error logging in." });
  }
});

const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

app.use(auth);

app.get('/im', (req, res) => {
  console.log("Handling IM request for:", req.session.user);

  if (req.query.conv_id) {
    // load in all messages from conv_id
    db.any(`SELECT * FROM messages WHERE conversation_id=${req.query.conv_id};`)
      .then(messages => {
        // get the other user's basic info (username, first_name, last_name, rank)
        db.one(
          `SELECT u.username, u.first_name, u.last_name, u.rank, u.id
           FROM users u 
           JOIN conversations c ON (u.id = c.user1_id OR u.id = c.user2_id) 
           WHERE c.id = $1 AND u.id != $2`,
          [req.query.conv_id, req.session.user.id]
        )
          .then(otherUser => {
            console.log("Finding conversation with user:", otherUser);
            messages.forEach((message, index) => {
              // console.log("Current message:", message);
              // extract date and time
              message.date = new Date(message.time_sent).toLocaleDateString();
              message.time = new Date(message.time_sent).toLocaleTimeString();
              //check who sent it
              message.recieved = message.user_id == otherUser.id;
              // determine if it is a new date or not
              if (index === 0 || message.date !== messages[index - 1].date) {
                message.new_date = true; // Mark as a new date
              } else {
                message.new_date = false; // Same date as the previous message
              }
            });

            // render page with all messages and other user's info
            console.log("Message data to be sent:", messages);
            res.render('pages/im', {
              other_user: otherUser,
              messages: messages
            });
          })
          .catch(error => {
            console.log("Error fetching other user's info:", error);
            res.render('pages/im', {
              message: "Could not load other user's info.",
              error: true
            });
          });
      })
      .catch(error => {
        console.log("Error fetching messages:", error);
        res.render('pages/im', {
          message: "Could not load messages.",
          error: true
        });
      });
  } else {
    // they haven't selected a conversation yet, send conversation data to let them select
    console.log("Finding conversations for user:", req.session.user.username);

    db.any(
      `SELECT c.id AS conversation_id, u.id AS user_id, u.first_name, u.last_name, u.username
       FROM conversations c
       JOIN users u ON (u.id = c.user1_id OR u.id = c.user2_id)
       WHERE (c.user1_id = $1 OR c.user2_id = $1) AND u.id != $1`,
      [req.session.user.id]
    )
      .then(conversations => {
        res.render('pages/im', {
          conversations: conversations
        });
      })
      .catch(error => {
        console.log("Error fetching conversations:", error);
        res.render('pages/im', {
          message: "Could not load conversations.",
          error: true
        });
      });
  }
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');