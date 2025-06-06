DROP TABLE IF EXISTS user_merchandise;
DROP TABLE IF EXISTS merchandise;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS replies;
DROP TABLE IF EXISTS tunnel_images;
DROP TABLE IF EXISTS tunnels;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS users_to_conventions;
DROP TABLE IF EXISTS conventions;
DROP TABLE IF EXISTS users_to_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    rank VARCHAR(20) NOT NULL, -- currently planned: admin, user, convention_host
    password VARCHAR(60) NOT NULL,
    profile_picture TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS badges (
    trophy_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS users_to_badges (
    user_badge_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    trophy_id INT REFERENCES badges(trophy_id) ON DELETE CASCADE
);

-- Potentially only for Dummy Data if we use an API
CREATE TABLE IF NOT EXISTS conventions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location TEXT NOT NULL,
    convention_center TEXT,
    convention_bio TEXT,
    convention_image TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS users_to_conventions (
    user_id INT NOT NULL,
    convention_id INT NOT NULL,
    attended_on DATE NOT NULL,
    PRIMARY KEY (user_id, convention_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (convention_id) REFERENCES conventions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    convention_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 0 AND 5),
    review TEXT,
    time_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (convention_id) REFERENCES conventions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    user1_unread BOOLEAN NOT NULL, -- true if user 1 has messages to read
    user2_unread BOOLEAN NOT NULL, -- false if they have read all
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    message_text TEXT NOT NULL,
    time_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

/* Tunnels Table */
CREATE TABLE IF NOT EXISTS tunnels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    convention_id INTEGER,
    FOREIGN KEY (convention_id) REFERENCES conventions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tunnel_images (
  id SERIAL PRIMARY KEY,
  tunnel_id INT REFERENCES tunnels(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL
);


/* Replies Table */
CREATE TABLE IF NOT EXISTS replies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  tunnel_id INTEGER,
  FOREIGN KEY (tunnel_id) REFERENCES tunnels(id) ON DELETE CASCADE,
  parent_reply_id INTEGER REFERENCES replies(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    convention_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by INT NOT NULL,
    FOREIGN KEY (convention_id) REFERENCES conventions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  tunnel_id INT,
  reply_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tunnel_id) REFERENCES tunnels(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE CASCADE,
  CONSTRAINT unique_tunnel_like UNIQUE (user_id, tunnel_id),
  CONSTRAINT unique_reply_like UNIQUE (user_id, reply_id)
);

CREATE TABLE IF NOT EXISTS merchandise (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    details TEXT[] NOT NULL,
    image_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_merchandise (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    merchandise_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (merchandise_id) REFERENCES merchandise(id) ON DELETE CASCADE,
    UNIQUE(username, merchandise_id)
);
