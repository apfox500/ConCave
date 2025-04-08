INSERT INTO users (first_name, last_name, username, email, rank, password, created_at, last_login)
VALUES 
    ('Alex', 'Doe', 'u1', 'u1@mail.com', 'user', '$2a$10$HNDIEphDRPRZniXjscGPRufwXnGC6zdwP/1OsMNsml0n2Yj5X/PPC', '2025-04-02 23:54:14.881657', '2025-04-02 23:54:14.881657'),
    ('Bella', 'Smith', 'u2', 'u2@mail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904'),
    ('Chris', 'Brown', 'u3', 'u3@mail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904'),
    ('Darryl', 'Johnson', 'u4', 'u4@mail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904');



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

INSERT INTO conventions (id, name, location, start_date, end_date) VALUES
    (1, 'Tech Expo 2025', 'San Francisco, CA', '2025-06-12', '2025-06-14'),
    (2, 'Gaming Con 2025', 'Los Angeles, CA', '2025-07-05', '2025-07-07'),
    (3, 'AI & Robotics Summit', 'New York, NY', '2025-08-15', '2025-08-18'),
    (4, 'Cybersecurity Forum', 'Washington, D.C.', '2025-09-10', '2025-09-12'),
    (5, 'Comic Fest 2025', 'Seattle, WA', '2025-10-20', '2025-10-22'),
    (6, 'Blockchain World 2025', 'Miami, FL', '2025-11-05', '2025-11-07'),
    (7, 'Space Tech Conference', 'Houston, TX', '2025-12-10', '2025-12-12'),
    (8, 'Renewable Energy Summit', 'Denver, CO', '2026-01-15', '2026-01-17'),
    (9, 'Medical Innovations Expo', 'Chicago, IL', '2026-02-20', '2026-02-22'),
    (10, 'E-Sports Championship', 'Las Vegas, NV', '2026-03-08', '2026-03-10');
