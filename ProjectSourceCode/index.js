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

app.get('/conventions/:id/groups', async (req, res) => {
  try {
    const { id: conventionId } = req.params;
    const convention = await db.oneOrNone(
      'SELECT * FROM conventions WHERE id = $1',
      [conventionId]
    );
    if (!convention) {
      return res.status(404).send('Convention not found');
    }
    const groups = await db.any(
      'SELECT g.*, u.username AS created_by_username FROM groups g JOIN users u ON g.created_by = u.id WHERE g.convention_id = $1',
      [conventionId]
    );
    res.render('pages/groups', {
      convention,
      groups
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error fetching groups');
  }
});

app.post('/conventions/:id/groups/create', auth, async (req, res) => {
  try {
    const { id: conventionId } = req.params;
    const { groupName, description } = req.body;
    const userId = req.session.user.id;
    const newGroup = await db.one(
      'INSERT INTO groups (convention_id, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      [conventionId, groupName, description, userId]
    );
    await db.none(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [newGroup.id, userId]
    );
    res.redirect(`/conventions/${conventionId}/groups`);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error creating group');
  }
});

app.post('/groups/:groupId/join', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.session.user.id;
    const existingRow = await db.oneOrNone(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (existingRow) {
      return res.redirect('back');
    }
    await db.none(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [groupId, userId]
    );
    const group = await db.oneOrNone(
      'SELECT convention_id FROM groups WHERE id = $1',
      [groupId]
    );
    if (!group) {
      return res.status(404).send('Group not found');
    }
    res.redirect(`/conventions/${group.convention_id}/groups`);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error joining group');
  }
});
app.post('/submit_review', auth, async (req, res) => {
  const { rating, review, convention_id } = req.body;
  const user_id = req.session.user.id;

  try {
    await db.none(`
      INSERT INTO reviews (convention_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
    `, [convention_id, user_id, parseInt(rating[0]), review]);

    res.redirect(`/conventions/${convention_id}`);
  } catch (error) {
    console.log('Error submitting review:', error);

    try {
      const convention = await db.one(`SELECT c.*, 
        TO_CHAR(c.start_date, 'Mon DD YYYY') AS formatted_start_date, 
        TO_CHAR(c.end_date, 'Mon DD YYYY') AS formatted_end_date
        FROM conventions c 
        WHERE c.id = ${convention_id}`);

      const reviews = await db.any(`SELECT r.*, u.username,
        TO_CHAR(r.time_sent, 'Mon DD YYYY HH24:MI') AS formatted_time
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.convention_id = ${convention_id}
        ORDER BY r.rating DESC
        LIMIT 3`);

      res.render('pages/conventionDetails', {
        title: convention.name,
        convention,
        reviews,
        error: 'Could not submit your review. Please try again later.',
      });
    } catch (innerError) {
      console.log('Error loading fallback convention details:', innerError);
      res.status(500).send('Something went wrong.');
    }
  }
});
// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');