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

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

//home page
app.get('/', async (req, res) => {
  try {
    const conventions = await db.any('SELECT * FROM conventions ORDER BY start_date ASC');
    let = isConvOrAdmin = false;
    if (req.session.user) {
      isConvOrAdmin = req.session.user.rank != 'user';
    }
    res.render('pages/home', {
      title: 'ConCave',
      message: 'Welcome to ConCave!',
      isConvOrAdmin: isConvOrAdmin,
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
    const convention = await db.one(`
      SELECT c.*, 
      TO_CHAR(c.start_date, 'Mon DD YYYY') AS formatted_start_date, 
      TO_CHAR(c.end_date, 'Mon DD YYYY') AS formatted_end_date 
      FROM conventions c 
      WHERE c.id = ${conventionId}`);
    const reviews = await db.any(`
      SELECT r.*, u.username,
      TO_CHAR(r.time_sent, 'Mon DD YYYY HH24:MI') AS formatted_time
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.convention_id = ${conventionId}
      ORDER BY r.rating DESC
      LIMIT 3`);

    res.render('pages/conventionDetails', {
      title: convention.name,
      convention,
      reviews,
    });
  } catch (error) {
    console.log('ERROR:', error.message || error);
    res.status(500).send('Error fetching convention details.');
  }
});

//Searching
app.get('/search', async (req, res) => {
  const searchQuery = req.query.q;
  if (!searchQuery) {
    return res.json([]);
  }

  console.log(`Search Query: ${searchQuery}`);

  const results = await db.any(
    'SELECT * FROM conventions WHERE name ILIKE $1',
    [`${searchQuery}%`]
  );

  console.log(`Query Results:`, results);
  try {
    res.json(results);
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Cave route

app.get('/cave', async (req, res) => {
  let userId = -1;

  if (req.session.user) {
    userId = req.session.user.id;
  }

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
      isUser: userId != -1,
      sort: sort
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading the cave.');
  }
});

// ******************************
// <!-- Section 4.4 : Search -->
// ******************************


//Note: cave/search MUST be above cave:id or it will get oh so confused
app.get('/cave/search', async (req, res) => {
  const searchQuery = req.query.q;
  if (!searchQuery) {
    return res.json([]);
  }

  console.log(`Search Query: ${searchQuery}`);

  const results = await db.any(
    'SELECT * FROM tunnels WHERE title ILIKE $1;',
    [`%${searchQuery}%`]
  );

  console.log(`Query Results:`, results);
  try {
    res.json(results);
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Cave Tunnel Page Get
app.get('/cave/:id', async (req, res) => {
  let userId = -1;

  if (req.session.user) {
    userId = req.session.user.id;
  }
  const tunnelId = req.params.id;

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
      isUser: userId != -1
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading tunnel.');
  }
});

// *************************************
// <!-- Section 4.1 : Login/Register -->
// *************************************
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
      await req.session.save();
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

app.use(auth);



// ****************************************************
// <!-- Section 4.8 : User Customization and Badges-->
// ****************************************************

/*app.get("/profile", auth, (req, res) => {
  res.render("pages/profile");
});*/

app.get('/profile', auth, async (req, res) => {
  try {
    const badges = await db.query(
        `SELECT badges.name AS badge_name, 
        badges.description AS badge_description
        FROM badges
        LEFT JOIN users_to_badges ON badges.trophy_id = users_to_badges.trophy_id
        WHERE users_to_badges.user_id = $1;`,
        [req.session.user.id]
    );

    res.render('pages/profile', { badges });
  } catch (err) {
    console.error('Failed to load badges:', err.stack);
    res.status(500).send('Error retrieving badges');
  }
});



app.get("/settings", auth, (req, res) => {
  let = isAdmin = false;
     if (req.session.user) {
       isAdmin = req.session.user.rank == 'admin';
     }
  res.render("pages/settings", {
    isAdmin: isAdmin
  });
});

app.post('/settings/update-profile', auth, async (req, res) => {
  const { firstName, lastName, newEmail } = req.body;
  const user = req.session.user;

  if (!user) {
    return res.status(400).json({ message: 'User is not logged in or session expired.' });
  }

  try {
    const result = await db.task(async t => {
      const updateResult = await t.none(
        `UPDATE users
         SET first_name = $1,
             last_name = $2,
             email = $3
         WHERE username = $4`,
        [firstName, lastName, newEmail, user.username]
      );

      const updatedUser = await t.one(
        `SELECT * FROM users WHERE username = $1`,
        [user.username]
      );

      req.session.user = updatedUser;

      return updatedUser;
    });

    res.json({
      message: 'Profile updated successfully!',
      user: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error.' });
  }
});

app.post('/settings/update-bio', auth, async (req, res) => {
  const { bio } = req.body;
  const user = req.session.user;

  if (!user) {
    return res.status(400).json({ message: 'User is not logged in or session expired.' });
  }

  try {
    const result = await db.task(async t => {
      const updateResult = await t.none(
        `UPDATE users
         SET bio = $1
         WHERE username = $2`,
        [bio, user.username]
      );

      const badge = await t.oneOrNone(
        `SELECT trophy_id FROM badges WHERE name = 'Storyteller'`
      );

      if (badge) {
        const alreadyHasBadge = await t.oneOrNone(
          `SELECT 1 FROM users_to_badges 
           WHERE user_id = (SELECT id FROM users WHERE username = $1)
           AND trophy_id = $2`,
          [user.username, badge.trophy_id]
        );

        if (!alreadyHasBadge) {
          await t.none(
            `INSERT INTO users_to_badges (user_id, trophy_id)
             VALUES ((SELECT id FROM users WHERE username = $1), $2)`,
            [user.username, badge.trophy_id]
          );
        }
      }

      const updatedUser = await t.one(
        `SELECT * FROM users WHERE username = $1`,
        [user.username]
      );

      req.session.user = updatedUser;

      return updatedUser;
    });

    res.json({
      message: 'Bio updated successfully!',
      user: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error.' });
  }
});

app.post('/settings/update-password', auth, async (req, res) => {
  const { oldPassword, newPassword, reNewPassword } = req.body;
  const user = req.session.user;

  if (!user) {
    return res.status(400).json({ message: 'User is not logged in or session expired.' });
  }

  if (!(user && (await bcrypt.compare(oldPassword, user.password)))){
    return res.status(400).json({ message: 'Old password does not match current password' });
  }

  if (newPassword != reNewPassword) {
    return res.status(400).json({ message: 'New passwords do not match' });
  }

  try {
    const hash = await bcrypt.hash(newPassword, 10);

    await db.none(
      `UPDATE users
       SET password = $1
       WHERE username = $2`,
      [hash, user.username]
    );

    const badge = await db.oneOrNone(
      `SELECT trophy_id FROM badges WHERE name = 'Security Expert'`
    );

    if (badge) {
      const alreadyHasBadge = await db.oneOrNone(
        `SELECT 1 FROM users_to_badges 
         WHERE user_id = (SELECT id FROM users WHERE username = $1)
         AND trophy_id = $2`,
        [user.username, badge.trophy_id]
      );

      if (!alreadyHasBadge) {
        await db.none(
          `INSERT INTO users_to_badges (user_id, trophy_id)
           VALUES ((SELECT id FROM users WHERE username = $1), $2)`,
          [user.username, badge.trophy_id]
        );
      }
    }

    res.json({
      message: 'Password updated successfully!'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error.' });
  }
});

app.post('/settings/delete-profile', auth, async (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ message: 'You are not logged in.' });
  }

  try {
    await db.none('DELETE FROM users WHERE id = $1', [user.id]);

    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: 'Account deleted, but logout failed.' });
      }
      return res.json({ message: 'Your account has been deleted successfully.' });
    });

  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete account.' });
  }
});

app.get("/adminSettings", auth, async (req, res) => {
  const users = await db.any('SELECT * FROM users ORDER BY username ASC');
  res.render("pages/adminSettings", {
    users,
  });
});

app.post("/settings/updateUserRank", auth, async (req, res) => {
  const { username, rank } = req.body;
  try {
    await db.none("UPDATE users SET rank = $1 WHERE username = $2", [rank, username]);
    res.redirect("/adminSettings");
  } catch (err) {
    console.error("Error updating user rank:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/settings/deleteUser", auth, async (req, res) => {
  const { username } = req.body;
  try {
    await db.none("DELETE FROM users WHERE username = $1", [username]);
    res.redirect("/adminSettings");
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send("Internal Server Error");
  }
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');

