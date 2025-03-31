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

// Cave route
app.get('/cave', async (req, res) => {
  try {
    const tunnels = await db.any('SELECT * FROM tunnels ORDER BY created_at DESC');
    res.render('pages/cave', {
      title: 'ConCave',
      tunnels: tunnels,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading the cave.');
  }
});

// Cave Tunnel Post
app.post('/cave', async (req, res) => {
  const { title, message } = req.body;
  try {
    await db.none('INSERT INTO tunnels (title, message) VALUES ($1, $2)', [title, message]);
    res.redirect('/cave');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error digging your tunnel.');
  }
});

// Cave Tunnel Page Get
app.get('/cave/:id', async (req, res) => {
  const tunnelId = req.params.id;

  try {
    const tunnel = await db.one('SELECT * FROM tunnels WHERE id = $1', [tunnelId]);
    const replies = await db.any(
      'SELECT * FROM replies WHERE tunnel_id = $1 ORDER BY created_at ASC',
      [tunnelId]
    );

    res.render('pages/tunnel', {
      tunnel,
      replies,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading tunnel.');
  }
});

// Cave Tunnel Reply Post
app.post('/cave/:id/reply', async (req, res) => {
  const tunnelId = req.params.id;
  const { message } = req.body;

  try {
    await db.none(
      'INSERT INTO replies (tunnel_id, message) VALUES ($1, $2)',
      [tunnelId, message]
    );
    res.redirect(`/cave/${tunnelId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error posting reply.');
  }
});



// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');