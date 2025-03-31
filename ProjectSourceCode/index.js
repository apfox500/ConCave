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

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'ConCave',
    message: 'Welcome to ConCave!'
  });
});

//Check if the user is a convention host
/*const authorizeConventionHost = (req, res, next) => {
  if (req.user.rank !== "convention_host") {
      return res.status(403).json({ message: "Forbidden: Only Convention Hosts can add conventions." });
  }
  next();
};*/

app.post("/conventions/add", async (req, res) => {
    try {
        const { name, location, convention_center, convention_bio, start_date, end_date } = req.body;

        if (!name || !location || !convention_center || !convention_bio || !start_date || !end_date) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const result = await db.task(async t => {
            // Insert convention
            const conventionQuery = `
                INSERT INTO conventions (name, location, convention_center, convention_bio, start_date, end_date)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id;`;
            const conventionResult = await t.one(conventionQuery, [name, location, convention_center, convention_bio, start_date, end_date]);
            return conventionResult;
        });

        res.status(201).json({ message: "Convention added successfully!", convention: result });
    } catch (error) {
        res.status(500).json({ message: "An error occurred", error: error.message });
    }
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');