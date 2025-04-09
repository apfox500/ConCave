INSERT INTO users (first_name, last_name, username, email, rank, password, created_at, last_login)
VALUES 
    ('Alex', 'Doe', 'u1', 'u1@mail.com', 'user', '$2a$10$HNDIEphDRPRZniXjscGPRufwXnGC6zdwP/1OsMNsml0n2Yj5X/PPC', '2025-04-02 23:54:14.881657', '2025-04-02 23:54:14.881657'),
    ('Bella', 'Smith', 'u2', 'u2@mail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904'),
    ('Chris', 'Brown', 'u3', 'u3@mail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904'),
    ('Darryl', 'Johnson', 'u4', 'u4@mail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904');

INSERT INTO users (first_name, last_name, username, email, rank, password) VALUES
('Leon', 'Vayedjian', 'leva5149', 'leva5149@colorado.edu', 'user', '$2y$10$PruaOATtY/iuRCMZZufqz.2t18fZUtXYEMfXHzfsLCFZc9yjZj5HC'),
('Jane', 'Smith', 'jasm1234', 'jasm1234@colorado.edu', 'user', '$2y$10$OxqM94dcbuIcmrZDfcNuK.rqDzcY3/lp97lZLJvia3UWnooLNRhRa'),
('Alex', 'Taylor', 'alta5678', 'alta5678@colorado.edu', 'user', '$2y$10$dtUYrY/1eRBhJhzoymzfMuliTn8A4A94JzNRPbnER1.FWAB2AnCLi'),
('Admin', 'Role', 'admin', 'admin@example.com', 'admin', '$2a$10$B9j4S5oYU5aLGgDodvYIVeS0SA49a9nAQLG018mOJ9avSpubmRhRC'),
('Convention', 'Host', 'convention_host', 'conventionhost@example.com', 'convention_host', '$2a$10$B9j4S5oYU5aLGgDodvYIVeS0SA49a9nAQLG018mOJ9avSpubmRhRC');

INSERT INTO conversations (user1_id, user2_id, user1_unread, user2_unread, created_at)
VALUES
    (1, 2, FALSE, TRUE, '2025-04-03 00:00:45.455904'),
    (3, 1, FALSE, TRUE, '2025-04-03 00:00:45.455904'),
    (2, 3, FALSE, TRUE, '2025-04-03 00:00:45.455904');

INSERT INTO messages (conversation_id, user_id, message_text, time_sent)
VALUES
    (1, 2, 'Hey, How are you?', '2025-04-03 00:00:45.455904'),
    (1, 1, 'Im good', '2025-04-03 00:01:45.455904'),
    (1, 1, 'How are you?', '2025-04-03 00:01:46.455904'),
    
    (2, 1, 'Hey, How are you?', '2025-04-03 00:00:45.455904'),
    (2, 3, 'Im good', '2025-04-03 00:01:45.455904'),
    (2, 3, 'How are you?', '2025-04-03 00:01:46.455904'),
    
    (3, 3, 'Hey, How are you?', '2025-04-03 00:00:45.455904'),
    (3, 2, 'Im good', '2025-04-03 00:01:45.455904'),
    (3, 2, 'How are you?', '2025-04-03 00:01:46.455904');


INSERT INTO conventions (name, location, convention_center, convention_bio, convention_image, start_date, end_date) VALUES 
('Comic-Con International: San Diego 2025', 'San Diego, CA', 'San Diego Convention Center',
'Comic-Con is the premier event for all things comics and related popular art, including movies, television, gaming, interactive multimedia, and so much more! Enjoy cosplay galore and take part in unique programming, exclusive previews, and presentations, not to mention the expansive and diverse Exhibit Hall featuring merchandise and displays representing all fandoms.',
'https://media.animecons.com/ConLogos/024/logo_C24805.png','2025-07-24', '2025-07-27'),
('Gen Con 2025', 'Indianapolis, IN', 'Indianapolis Convention Center',
'Founded in 1968 in Lake Geneva, WI by Dungeons & Dragons co-creator Gary Gygax, Gen Con is the largest annual event dedicated to tabletop gaming and culture in North America.
Each year, gamers and fans converge in Indianapolis, IN to share their love for all things gaming: from tournaments to guest appearances, exhibit hall booths to electronic games, workshops, seminars, anime, art shows, auctions, and countless other activities. In 2019, nearly 70,000 attendees and over 520 exhibitors made Gen Con their gaming destination!',
'https://media.animecons.com/ConLogos/025/logo_C25580.png','2025-07-31', '2025-08-03'),
('Fan Expo Boston 2025', 'Boston, MA', 'Boston Convention and Exhibition Center',
'If you''re into comics, sci-fi, horror, anime, gaming, or cosplay, come share our playground. You''ll feel out of this world - and right at home.
Find your fandom family at FAN EXPO Boston. All 55,000 of them.',
'https://media.animecons.com/ConLogos/023/logo_C23707.jpg','2025-08-08', '2025-08-10'),
('Anime Ultra 2025', 'San Antonio, TX', 'Rolling Oaks Mall',
'Shop our vendor hall filled with artists and anime vendors from all over Texas, in a one-stop shop! Meet the amazing actors to voice some of the best and hottest anime shows you probably watched and/or movie/tv show you''ve been binging! Learn more about the different ecchi workshops, celebrity panels, and performances happening all weekend long!',
'https://media.animecons.com/ConLogos/025/logo_C25105.png','2025-08-16', '2025-08-17'),
('New York Comic Con 2025', 'New York, NY', 'Jacob K. Javits Center',
'New York Comic Con (NYCC) is the biggest comic and pop culture event on the East Coast. From meeting celebrities to surprise appearances, to comic creators from every corner of the globe to the top anime, cosplay, and gaming stars ... it''s always one hell of a 4-day weekend.',
'https://media.animecons.com/ConLogos/024/logo_C24806.png','2025-10-09', '2025-10-12');


INSERT INTO reviews (convention_id, user_id, rating, review) VALUES
(1, 1, 5, 'Absolutely loved this convention! Great panels and guests.'),
(1, 2, 4, 'Had a great time, but the food options could be better.'),
(1, 3, 3, 'It was okay. Some events were disorganized but still fun overall.');
