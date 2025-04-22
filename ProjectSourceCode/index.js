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



// START OF CHATGPT GENERATED  MULTER FOR IMAGE UPLOAD
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'public/uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multer = require('multer');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public/uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
  limits: {
    files: 5 // Max 5 files
  }
});

const upload = multer({ storage: storage });

// END OF CHATGPT GENERATED 

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
  host: process.env.POSTGRES_HOST, // the database server
  port: process.env.POSTGRES_PORT, // the database port
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

//Allow images in public to be used 
app.use(express.static(path.join(__dirname, 'public')));



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
  const sort = req.query.sort || 'highest';

  let orderBy;
  switch (sort) {
    case 'newest':
      orderBy = 'r.time_sent DESC';
      break;
    case 'oldest':
      orderBy = 'r.time_sent ASC';
      break;
    case 'lowest':
      orderBy = 'r.rating ASC';
      break;
    case 'highest':
    default:
      orderBy = 'r.rating DESC';
      break;
  }

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
      ORDER BY ${orderBy}
      LIMIT 5`);

    res.render('pages/conventionDetails', {
      title: convention.name,
      convention,
      reviews,
      sort,
      isHighest: sort === 'highest',
      isLowest: sort === 'lowest',
      isNewest: sort === 'newest',
      isOldest: sort === 'oldest',
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

  const convention = req.query.convention || '';

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

    const images = await db.any('SELECT tunnel_id, image_path FROM tunnel_images');

    const imageList = {};
    images.forEach(image => {
      if (!imageList[image.tunnel_id]) imageList[image.tunnel_id] = [];
      imageList[image.tunnel_id].push(image);
    });

    const conventions = await db.any('SELECT id, name FROM conventions ORDER BY start_date ASC');

    let tunnelQuery = `
      SELECT tunnels.*, users.username, conventions.name AS convention_name,
        COUNT(DISTINCT replies.id) AS reply_count, 
        COUNT(DISTINCT likes.id) AS like_count, 
        BOOL_OR(likes.user_id = $1) AS liked_by_user
      FROM tunnels
      LEFT JOIN users ON tunnels.user_id = users.id
      LEFT JOIN conventions ON tunnels.convention_id = conventions.id
      LEFT JOIN replies ON replies.tunnel_id = tunnels.id
      LEFT JOIN likes ON likes.tunnel_id = tunnels.id
    `;
    
    const queryParams = [userId];

    if (convention) {
      tunnelQuery += ` WHERE tunnels.convention_id = $2 `;
      queryParams.push(convention);
    }

    tunnelQuery += `
      GROUP BY tunnels.id, users.username, conventions.name
      ORDER BY ${orderBy}
    `;

    const tunnels = await db.any(tunnelQuery, queryParams);

    tunnels.forEach(tunnel => {
      tunnel.images = imageList[tunnel.id] || [];
    });

    res.render('pages/cave', {
      title: 'ConCave: The Cave',
      tunnels: tunnels,
      conventions: conventions,
      isUser: userId != -1,
      sort: sort,
      selectedConvention: convention
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
    const images = await db.any('SELECT image_path FROM tunnel_images WHERE tunnel_id = $1', [tunnelId]);

    const tunnel = await db.one(`
      SELECT tunnels.*, users.username, conventions.name AS convention_name,
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

    tunnel.images = images

    res.render('pages/tunnel', {
      title: "ConCave: The Cave",
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
  res.render("pages/register", { title: "ConCave: Register" });
});

app.post("/register", upload.single('profile_picture'), async (req, res) => {
  try {
    if (req.body.password !== req.body.confirmPassword) {
      return res.render("pages/register", {
        title: "ConCave: Register",
        error: "Passwords do not match.",
        formData: req.body
      });
    }
    const hash = await bcrypt.hash(req.body.password, 10);
    let profilePicturePath = null;
    if (req.file) {
      profilePicturePath = `/uploads/${req.file.filename}`;
    }
    await db.none(
      "INSERT INTO users (first_name, last_name, username, email, rank, password, profile_picture) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [req.body.firstName, req.body.lastName, req.body.username, req.body.email, "user", hash, profilePicturePath]
    );
    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.render("pages/register", {
      title: "ConCave: Register",
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
      res.render("pages/login", { title: "ConCave: Login", error: "Incorrect username or password." });
    }
  } catch (error) {
    console.log(error);
    res.render("pages/login", { title: "ConCave: Login", error: "Error logging in." });
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


// ********************************
// <!-- Section 4.2 : The Cave -->
// ********************************


// Cave Tunnel Post
app.post('/cave', upload.array('images', 5), async (req, res) => {
  const { title, message, convention_id } = req.body;
  const userId = req.session.user.id;
  const user = req.session.user;

  if (message.length > 10000) {
    return res.status(400).send("Message too long. Max 10,000 characters.");
  }

  try {
    const tunnel = await db.one(
      `INSERT INTO tunnels (title, message, user_id, convention_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [title, message, userId, convention_id || null]
    );

    const tunnelId = tunnel.id

    if (req.files && req.files.length > 0) {
      const insertPromises = req.files.map(file => {
        const imagePath = `/uploads/${file.filename}`;
        return db.none(
          'INSERT INTO tunnel_images (tunnel_id, image_path) VALUES ($1, $2)',
          [tunnelId, imagePath]
        );
      });
      await Promise.all(insertPromises);
    }

    const badge = await db.oneOrNone(
      `SELECT trophy_id FROM badges WHERE name = 'Cave Digger'`
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
    res.redirect('/cave');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error digging your tunnel.');
  }
});

// Cave Tunnel Reply Post
app.post('/cave/:id/reply', async (req, res) => {
  const tunnelId = req.params.id;
  const { message } = req.body;
  const user = req.session.user;

  try {
    const userId = req.session.user.id;
    await db.none(
      'INSERT INTO replies (tunnel_id, message, user_id) VALUES ($1, $2, $3)',
      [tunnelId, message, userId]
    );
    const badge = await db.oneOrNone(
      `SELECT trophy_id FROM badges WHERE name = 'Conversation Starter'`
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
    res.redirect(`/cave/${tunnelId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error posting reply.');
  }
});

// Like a tunnel
app.post('/like/tunnel/:id', async (req, res) => {
  const userId = req.session.user.id;
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
  const userId = req.session.user.id;
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

// *****************************************
// <!-- Section 4.3 : Adding Conventions -->
// *****************************************

const authorizeConventionHost = (req, res, next) => {
  //console.log("checking", req.user);
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized: No user logged in" });
  }
  if (req.session.user.rank === "user") {
    return res.status(403).json({ message: "Forbidden: Only Convention Hosts can add conventions." });
  }
  next();
};

app.post("/conventions/add", authorizeConventionHost, upload.single("convention_image_file"), async (req, res) => {
  try {
    const { name, location, convention_center, convention_bio, convention_image_url, start_date, end_date } = req.body;
    const convention_image = req.file
      ? `/uploads/${req.file.filename}`
      : convention_image_url;

    if (!name || !location || !convention_center || !convention_bio || !convention_image || !start_date || !end_date) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await db.task(async t => {
      const conventionQuery = `INSERT INTO conventions (name, location, convention_center, convention_bio, convention_image, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;`;
      const conventionResult = await t.one(conventionQuery, [
        name,
        location,
        convention_center,
        convention_bio,
        convention_image,
        start_date,
        end_date
      ]);
      return conventionResult;
    });

    res.status(201).json({ message: "Convention added successfully!", convention: result });

  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error.message });
  }
});

// ******************************************************************
// <!-- Section 4.5 : Instant Messaging Routes + Helper functions -->
// ******************************************************************

// Function to fetch messages and user info for a conversation
async function fetchMessagesAndUserInfo(conv_id, user_id) {
  try {
    const messages = await db.any(`SELECT * FROM messages WHERE conversation_id=$1 ORDER BY time_sent ASC;`, [conv_id]);

    const otherUser = await db.one(
      `SELECT u.username, u.first_name, u.last_name, u.rank, u.id
       FROM users u 
       JOIN conversations c ON (u.id = c.user1_id OR u.id = c.user2_id) 
       WHERE c.id = $1 AND u.id != $2`,
      [conv_id, user_id]
    );

    //makes time on messages print nice
    messages.forEach((message, index) => {
      const now = new Date();
      const messageTime = new Date(message.time_sent);
      const timeDifference = now - messageTime;

      if (timeDifference < 5000) { // Less than 5 seconds ago
        message.time = "now";
      } else if (timeDifference > 24 * 60 * 60 * 1000) { // More than 24 hours ago
        message.time = messageTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      } else if (timeDifference > 60 * 60 * 1000) { // Within 24 hours but more than an hour
        const hoursAgo = Math.round(timeDifference / (60 * 60 * 1000));
        message.time = `${hoursAgo} hours ago`;
      } else if (timeDifference > 60 * 1000) { // Within the last hour but more than a minute
        const minutesAgo = Math.round(timeDifference / (60 * 1000));
        message.time = `${minutesAgo} minutes ago`;
      } else { // Within the last minute
        const secondsAgo = Math.round(timeDifference / 1000);
        message.time = `${secondsAgo} seconds ago`;
      }

      message.date = messageTime.toLocaleDateString("en-US", { timeZone: "America/Denver" });
      message.received = message.user_id == otherUser.id;
      message.new_date = index === 0 || message.date !== messages[index - 1].date;

      message.received = message.user_id == otherUser.id;
      message.isJoinRequest = message.message_text && message.message_text.includes('[group:') && message.received;
    });

    //update conversation and mark this user as read
    const isU1 = await isUser1(user_id, conv_id);
    // console.log(`In conv ${conv_id} value of isUser1 is ${isU1}`);
    if (isU1 == true) {
      await db.none(
        `UPDATE conversations SET user1_unread = false WHERE id = $1`,
        [conv_id]
      );
    } else {
      await db.none(
        `UPDATE conversations SET user2_unread = false WHERE id = $1`,
        [conv_id]
      );
    }

    return { messages, otherUser };

  } catch (error) {
    console.error("Error fetching messages or user info:", error);
    throw error;
  }
}

async function fetchConversations(req, res, message = null, error = null) {
  await db.any(
    `SELECT c.id AS conversation_id, 
              u.id AS user_id, 
              u.first_name, 
              u.last_name, 
              u.username, 
              CASE 
                WHEN c.user1_id = $1 THEN c.user1_unread 
                WHEN c.user2_id = $1 THEN c.user2_unread 
              END AS current_unread
       FROM conversations c
       JOIN users u ON (u.id = c.user1_id OR u.id = c.user2_id)
       WHERE (c.user1_id = $1 OR c.user2_id = $1) AND u.id != $1`,
    [req.session.user.id]
  )
    .then(conversations => {
      console.log("Conversations found");
      res.render('pages/im', {
        title: "ConCave: Messages",
        conversations: conversations,
        message: message,
        error: error
      });
    })
    .catch(error => {
      console.log("Error fetching conversations:", error);
      res.render('pages/im', {
        title: "ConCave: Messages",
        message: "Could not load conversations.",
        error: true
      });
    });
}

async function isUser1(user_id, conv_id) {
  const ret = await db.one(
    `SELECT CASE WHEN user1_id = $1 THEN true ELSE false END AS is_user1
   FROM conversations WHERE id = $2`,
    [user_id, conv_id]
  );
  // console.log("INSIDE isUser1 returning:", ret.is_user1);
  return ret.is_user1;
}

app.get('/im', async (req, res) => {
  console.log("Handling IM request for:", req.session.user.username);

  const conv_id = req.query.conv_id;
  if (conv_id) { //They have selected a specific conversation
    console.log("Pulling messages in conversation:", conv_id);
    try {
      const { messages, otherUser } = await fetchMessagesAndUserInfo(conv_id, req.session.user.id);

      //now we render the page
      res.render('pages/im', {
        title: "ConCave: Messages",
        other_user: otherUser,
        messages: messages,
        conv_exists: true,
        conv_id: conv_id
      });
    } catch (error) {
      res.render('pages/im', {
        title: "ConCave: Messages",
        message: "Could not load messages or user info.",
        error: true
      });
    }
  } else { //Show a list of conversations
    console.log("Finding conversations for user:", req.session.user.username);

    fetchConversations(req, res);
  }
});

app.post('/im', async (req, res) => {
  //TODO:  everytime I reload the page it resends the text
  try {
    const { message, conv_id } = req.body;
    const user_id = req.session.user.id;

    console.log(`Sending a message from ${user_id} in conversation${conv_id}`);

    // Insert the new message into the database
    await db.none(
      `INSERT INTO messages (conversation_id, user_id, message_text, time_sent) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [conv_id, user_id, message]
    );
    console.log("Sent message");

    // Determine if the current user is user1 or user2 and update the unread value for the other user'
    const isU1 = await isUser1(user_id, conv_id);
    // console.log(`In conversation ${conv_id}, is user #1?: ${isU1}`)
    if (isU1 == true) {
      await db.none(
        `UPDATE conversations SET user2_unread = true WHERE id = $1`,
        [conv_id]
      );
    } else {
      await db.none(
        `UPDATE conversations SET user1_unread = true WHERE id = $1`,
        [conv_id]
      );
    }
    console.log("Re-rendering page");

    // Fetch updated messages and user info
    const { messages, otherUser } = await fetchMessagesAndUserInfo(conv_id, user_id);

    // Render the updated conversation
    res.render('pages/im', {
      title: "ConCave: Messages",
      other_user: otherUser,
      messages: messages,
      conv_exists: true,
      conv_id: conv_id
    });
  } catch (error) {
    console.log("Error adding message:", error);
    res.render('pages/im', {
      title: "ConCave: Messages",
      message: "Could not send message.",
      error: true
    });
  }
});

app.post('/im/create', async (req, res) => {
  try {
    const { username } = req.body;
    const user1_id = req.session.user.id;

    // Validate that the user exists
    const user2 = await db.oneOrNone(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (!user2) {
      await fetchConversations(req, res, `Could not locate user ${username}`, true)
    }

    const user2_id = user2.id;

    // Check if a conversation already exists between the two users
    const existingConversation = await db.oneOrNone(
      `SELECT id FROM conversations 
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [user1_id, user2_id]
    );

    if (existingConversation) {
      return res.redirect(`/im?conv_id=${existingConversation.id}`);
    }

    // Create a new conversation
    const newConversation = await db.one(
      `INSERT INTO conversations (user1_id, user2_id, user1_unread, user2_unread) 
       VALUES ($1, $2, false, true) RETURNING id`,
      [user1_id, user2_id]
    );

    // Redirect to the new conversation page
    res.redirect(`/im?conv_id=${newConversation.id}`);
  } catch (error) {
    console.log("Error creating conversation:", error);
    res.render('pages/im', {
      title: "ConCave: Login",
      message: "Could not create conversation.",
      error: true
    });
  }
});

// *******************************
// <!-- Section 4.6 : Reviews -->
// *******************************

app.get('/conventions/:id/groups', async (req, res) => {
  try {
    const { id: conventionId } = req.params;
    const convention = await db.oneOrNone('SELECT * FROM conventions WHERE id = $1', [conventionId]);
    if (!convention) {
      return res.status(404).send('Convention not found');
    }
    const groups = await db.any(`
      SELECT
        g.*,
        u.username AS created_by_username,
        (
          SELECT ARRAY_AGG(m.username)
          FROM group_members gm
          JOIN users m ON gm.user_id = m.id
          WHERE gm.group_id = g.id
        ) AS member_usernames
      FROM groups g
      JOIN users u ON g.created_by = u.id
      WHERE g.convention_id = $1
    `, [conventionId]);
    const enhancedGroups = groups.map(group => {
      group.ownedByUser = req.session.user && (group.created_by === req.session.user.id);

      group.isMember = false;
      if (req.session.user && group.member_usernames) {
        group.isMember = group.member_usernames.includes(req.session.user.username);
      }

      return group;
    });
    res.render('pages/groups', { title: "ConCave", convention, groups: enhancedGroups });
  } catch (error) {
    console.log(error);
    res.status(500).send('Error fetching groups');
  }
});

app.post('/conventions/:id/groups/create', auth, async (req, res) => {
  try {
    const { id: conventionId } = req.params
    const { groupName, description } = req.body
    const userId = req.session.user.id
    const newGroup = await db.one(
      'INSERT INTO groups (convention_id, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id',
      [conventionId, groupName, description, userId]
    )
    await db.none('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [newGroup.id, userId])
    res.redirect(`/conventions/${conventionId}/groups`)
  } catch (error) {
    console.log(error)
    res.status(500).send('Error creating group')
  }
});

app.post('/groups/:groupId/request-to-join', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterId = req.session.user.id;

    const group = await db.oneOrNone(
      'SELECT created_by FROM groups WHERE id = $1',
      [groupId]
    );
    if (!group) return res.status(404).send('Group not found');

    const ownerId = group.created_by;
    console.log({ requesterId, ownerId });

    let conv = await db.oneOrNone(`
      SELECT id FROM conversations 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [requesterId, ownerId]
    );

    if (!conv) {
      conv = await db.oneOrNone(`
        INSERT INTO conversations (user1_id, user2_id, user1_unread, user2_unread)
        VALUES ($1, $2, false, true)
        RETURNING id`,
        [requesterId, ownerId]
      );
    }

    if (!conv || !conv.id) throw new Error("Conversation creation failed.");

    const groupName = await db.one('SELECT name FROM groups WHERE id = $1', [groupId]);
    const messageText = `Hi! I'd like to join your group "${groupName.name}". [group:${groupId}]`;

    await db.none(`
      INSERT INTO messages (conversation_id, user_id, message_text, time_sent)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [conv.id, requesterId, messageText]
    );

    const isUser1Flag = await isUser1(requesterId, conv.id);
    await db.none(
      `UPDATE conversations SET ${isUser1Flag ? 'user2_unread' : 'user1_unread'} = true WHERE id = $1`,
      [conv.id]
    );

    res.redirect(`/im?conv_id=${conv.id}`);
  } catch (err) {
    console.error("Join request error:", err);
    res.status(500).send("Couldn't send join request.");
  }
});

app.post('/groups/accept-request', auth, async (req, res) => {
  try {
    const { message_text, requester_id } = req.body;

    const match = message_text.match(/\[group:(\d+)\]/);
    if (!match) return res.status(400).send("Invalid request format");

    const groupId = parseInt(match[1]);
    const ownerId = req.session.user.id;

    const group = await db.oneOrNone('SELECT * FROM groups WHERE id = $1', [groupId]);
    if (!group || group.created_by !== ownerId) {
      return res.status(403).send("You are not the owner of this group.");
    }

    const alreadyIn = await db.oneOrNone(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, requester_id]
    );

    if (!alreadyIn) {
      await db.none(
        'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
        [groupId, requester_id]
      );
    }

    res.redirect(`/conventions/${group.convention_id}/groups`);
  } catch (err) {
    console.error("Error adding user to group:", err);
    res.status(500).send("Could not add user to group.");
  }
});

app.post('/groups/:groupId/delete', auth, async (req, res) => {
  try {
    const { groupId } = req.params
    const userId = req.session.user.id
    const group = await db.oneOrNone('SELECT * FROM groups WHERE id = $1', [groupId])
    if (!group) return res.status(404).send('Group not found')
    if (group.created_by !== userId) return res.status(403).send('Forbidden')
    await db.none('DELETE FROM groups WHERE id = $1', [groupId])
    return res.redirect(`/conventions/${group.convention_id}/groups`)
  } catch (error) {
    console.error(error)
    return res.status(500).send('Error')
  }
});

app.post('/submit_review', auth, async (req, res) => {
  const { rating, review, convention_id } = req.body;
  const user_id = req.session.user.id;
  const user = req.session.user;

  try {
    await db.none(`
      INSERT INTO reviews (convention_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
    `, [convention_id, user_id, parseInt(rating[0]), review]);

    const badge = await db.oneOrNone(
      `SELECT trophy_id FROM badges WHERE name = 'Critique'`
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



// ********************************
// <!-- Section 4.7: Merch -->
// ********************************

app.get('/merch', async (req, res) => {
  try {
      let merchandise = await db.any(`
          SELECT m.*, um.username as creator_username 
          FROM merchandise m 
          LEFT JOIN user_merchandise um ON m.id = um.merchandise_id 
          ORDER BY m.id
      `);

      if (req.session.user) {
          merchandise = merchandise.map(item => ({
              ...item,
              is_creator: item.creator_username === req.session.user.username
          }));
      }

      res.render('pages/merch', { title: 'Merchandise', merchandise, user: req.session.user });
  } catch (error) {
      res.render('pages/merch', { title: 'Merchandise', message: 'Error loading merchandise', error: true });
  }
});

app.post('/merch', upload.single('image_upload'), async (req, res) => {
  try {
      if (!req.session.user) return res.redirect('/login');

      const { name, price, description, details, imageType, image_url } = req.body;
      const finalImagePath = imageType === 'url' ? image_url : '/uploads/' + req.file.filename;
      const detailsArray = details.split(',').map(item => item.trim());

      await db.tx(async t => {
          const result = await t.one(
              'INSERT INTO merchandise (name, price, description, image_url, details) VALUES ($1, $2, $3, $4, $5) RETURNING id',
              [name, price, description, finalImagePath, detailsArray]
          );
          await t.none(
              'INSERT INTO user_merchandise (username, merchandise_id) VALUES ($1, $2)',
              [req.session.user.username, result.id]
          );
      });

      res.redirect('/merch');
  } catch (error) {
      res.render('pages/merch', { title: 'Merchandise', message: 'Error adding merchandise', error: true });
  }
});

app.post('/merch/delete/:id', async (req, res) => {
  try {
      if (!req.session.user) return res.redirect('/login');
      
      const isCreator = await db.oneOrNone(
          'SELECT * FROM user_merchandise WHERE username = $1 AND merchandise_id = $2',
          [req.session.user.username, req.params.id]
      );
 
      if (!isCreator) throw new Error('Unauthorized');
      
      await db.none('DELETE FROM merchandise WHERE id = $1', [req.params.id]);
      res.redirect('/merch');
  } catch (error) {
      res.redirect('/merch');
  }
});

// ****************************************************
// <!-- Section 4.8 : User Customization and Badges-->
// ****************************************************


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

    res.render('pages/profile', { title: "Profile", badges });
  } catch (err) {
    console.error('Failed to load badges:', err.stack);
    res.status(500).send('Error retrieving badges');
  }
});

app.post('/profile', auth, async (req, res) => {
  const { username } = req.body;

  try {
    const user = await db.oneOrNone(
      `SELECT id, first_name, last_name, username, email, rank, profile_picture, bio, created_at
       FROM users 
       WHERE username = $1`,
      [username]
    );


    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    try {
      const badges = await db.query(
        `SELECT badges.name AS badge_name, 
          badges.description AS badge_description
          FROM badges
          LEFT JOIN users_to_badges ON badges.trophy_id = users_to_badges.trophy_id
          WHERE users_to_badges.user_id = $1;`,
        [user.id]
      );

      res.render('pages/profile', { title: "ConCave: Profile", user, badges, my_user: req.session.user });
    } catch (err) {
      console.error('Failed to load badges:', err.stack);
      res.status(500).send('Error retrieving badges');
    }

  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get("/settings", auth, (req, res) => {
  let = isAdmin = false;
  if (req.session.user) {
    isAdmin = req.session.user.rank == 'admin';
  }
  res.render("pages/settings", {
    title: "ConCave: Settings",
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

  if (!(user && (await bcrypt.compare(oldPassword, user.password)))) {
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

app.post('/settings/update-picture', auth, upload.single('profile_picture'), async (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ message: 'You are not logged in.' });
  }

  const filePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await db.none("UPDATE users SET profile_picture = $1 WHERE id = $2", [filePath, user.id]);
    req.session.user.profile_picture = filePath;
    res.redirect('/profile');
  } catch (err) {
    console.error("Error updating profile picture:", err);
    res.status(500).send("Internal Server Error");
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
    title: "ConCave: Settings",
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