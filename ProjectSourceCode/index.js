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

  const userId = 1;

  const sort = req.query.sort || 'newest'; 

  let orderBy;
  switch (sort) {
    case 'oldest':
      orderBy = 'tunnels.created_at ASC';
      break;
    case 'most_liked':
      orderBy = 'like_count DESC';
      break;
    case 'least_liked':
      orderBy = 'like_count ASC';
      break;
    case 'newest':
    default:
      orderBy = 'tunnels.created_at DESC';
  }
  
  
  try {

    const conventions = await db.any('SELECT id, name FROM conventions ORDER BY start_date ASC');

    const tunnels = await db.any(`
      SELECT tunnels.*, users.username, 
        COUNT(DISTINCT replies.id) AS reply_count, 
        COUNT(DISTINCT likes.id) AS like_count, 
        BOOL_OR(likes.user_id = $1) AS liked_by_user
      FROM tunnels
      LEFT JOIN users ON tunnels.user_id = users.id
      LEFT JOIN conventions ON tunnels.convention_id = conventions.id
      LEFT JOIN replies ON replies.tunnel_id = tunnels.id
      LEFT JOIN likes ON likes.tunnel_id = tunnels.id
      GROUP BY tunnels.id, users.username, conventions.name
      ORDER BY ${orderBy}
    `, [userId]);

    res.render('pages/cave', {
      title: 'ConCave',
      tunnels: tunnels,
      conventions: conventions,
      sort: sort
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading the cave.');
  }
});

// Cave Tunnel Post
app.post('/cave', async (req, res) => {
  const { title, message, convention_id } = req.body;
  const userId = 1; // Replace with actual user id when login is implemented.

  try {
    await db.none(
      `INSERT INTO tunnels (title, message, user_id, convention_id)
       VALUES ($1, $2, $3, $4)`,
      [title, message, userId, convention_id || null]
    );
    res.redirect('/cave');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error digging your tunnel.');
  }
});

// Cave Tunnel Page Get
app.get('/cave/:id', async (req, res) => {
  const tunnelId = req.params.id;
  const userId = 1; // Replace later

  try {
    const tunnel = await db.one(`
      SELECT tunnels.*, users.username,
        COUNT(DISTINCT likes.id) AS like_count,
        BOOL_OR(likes.user_id = $1) AS liked_by_user
      FROM tunnels
      LEFT JOIN users ON tunnels.user_id = users.id
      LEFT JOIN conventions ON tunnels.convention_id = conventions.id
      LEFT JOIN likes ON likes.tunnel_id = tunnels.id
      WHERE tunnels.id = $2
      GROUP BY tunnels.id, users.username, conventions.name
    `, [userId, tunnelId]);

    const replies = await db.any(`
      SELECT replies.*, users.username,
        COUNT(DISTINCT likes.id) AS like_count,
        BOOL_OR(likes.user_id = $1) AS liked_by_user
      FROM replies
      LEFT JOIN users ON replies.user_id = users.id
      LEFT JOIN likes ON likes.reply_id = replies.id
      WHERE replies.tunnel_id = $2
      GROUP BY replies.id, users.username
      ORDER BY replies.created_at ASC
    `, [userId, tunnelId]);

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
    const userId = 1; // Replace with actual user id when login is implemented.
    await db.none(
      'INSERT INTO replies (tunnel_id, message, user_id) VALUES ($1, $2, $3)',
      [tunnelId, message, userId]
    );
    res.redirect(`/cave/${tunnelId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error posting reply.');
  }
});

// Like a tunnel
app.post('/like/tunnel/:id', async (req, res) => {
  const userId = 1; // Replace later
  const tunnelId = req.params.id;
  const redirectTo = req.body.redirectTo || '/cave';

  try {

    const liked = await db.oneOrNone(
      'SELECT id FROM likes WHERE user_id = $1 AND tunnel_id = $2',
      [userId, tunnelId]
    );

    if (liked) {
      await db.none('DELETE FROM likes WHERE user_id = $1 AND tunnel_id = $2', [userId, tunnelId]);
    } else {
      await db.none(
        'INSERT INTO likes (user_id, tunnel_id) VALUES ($1, $2)',
        [userId, tunnelId]
      );

    }

    res.redirect(redirectTo);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error when liking tunnel');
  }
});

// Like a reply
app.post('/like/reply/:id', async (req, res) => {
  const userId = 1; // Replace later
  const replyId = req.params.id;

  try {

    const liked = await db.oneOrNone(
      'SELECT id FROM likes WHERE user_id = $1 AND reply_id = $2',
      [userId, replyId]
    );

    if (liked) {
      await db.none('DELETE FROM likes WHERE user_id = $1 AND reply_id = $2', [userId, replyId]);
    } else {
      await db.none(
        'INSERT INTO likes (user_id, reply_id) VALUES ($1, $2)',
        [userId, replyId]
      );
    }

    const result = await db.one(
      'SELECT tunnel_id FROM replies WHERE id = $1',
      [replyId]
    );

    res.redirect(`/cave/${result.tunnel_id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error when liking reply');
  }
});



// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');