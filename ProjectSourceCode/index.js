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

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

app.get('/', async (req, res) => {
  try {
    const conventions = await db.any('SELECT * FROM conventions ORDER BY start_date ASC');
    
    res.render('pages/home', {
      title: 'ConCave',
      message: 'Welcome to ConCave!',
      conventions,
    });
  } catch (error) {
    console.error('Error fetching conventions:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/conventions/:id', async (req, res) => {
  const conventionId = req.params.id;
  
  try {
    const convention = await db.one(`SELECT * FROM conventions WHERE id = ${conventionId}`);
    
    res.render('pages/conventionDetails', {
      title: convention.name,
      convention: convention,
    });
  } catch (error) {
    console.log('ERROR:', error.message || error);
    res.status(500).send('Error fetching convention details.');
  }
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

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

const auth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

/*const authorizeConventionHost = (req, res, next) => {
  if (req.user.rank !== "convention_host" || req.user.rank !== "admin") {
      return res.status(403).json({ message: "Forbidden: Only Convention Hosts can add conventions." });
  }
  next();
};*/

app.post("/conventions/add", async (req, res) => {
  try {
      const { name, location, convention_center, convention_bio, convention_image, start_date, end_date } = req.body;

      if (!name || !location || !convention_center || !convention_bio || !convention_image || !start_date || !end_date) {
          return res.status(400).json({ message: "All fields are required" });
      }

      const result = await db.task(async t => {
          // Insert convention
          const conventionQuery = `
              INSERT INTO conventions (name, location, convention_center, convention_bio, convention_image, start_date, end_date)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id;`;
          const conventionResult = await t.one(conventionQuery, [name, location, convention_center, convention_bio, convention_image, start_date, end_date]);
          return conventionResult;
      });

      res.status(201).json({ message: "Convention added successfully!", convention: result });
  } catch (error) {
      res.status(500).json({ message: "An error occurred", error: error.message });
  }
});

app.get("/profile", (req, res) => {
  res.render("pages/profile");
});

app.get('/profile', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]); // Assuming req.user.id contains the logged-in user’s ID
    const user = result.rows[0];

    res.render('profile', { user }); // Pass the user data to the profile view
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving user profile');
  }
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');