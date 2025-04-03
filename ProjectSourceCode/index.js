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

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

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
      res.redirect("/");
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

app.get('/search', (req, res) => {
  const searchQuery = req.query.q;
  const query = `SELECT * FROM conventions WHERE name LIKE $1;`;
  const values = [`%${searchQuery}%`];
  
  db.any(query, values)
   .then(results => {
       res.json(results);
   })
   .catch(err => {
       console.error('Error executing query:', err);
       res.status(500).json({ error: 'Internal Server Error' });
   });
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');