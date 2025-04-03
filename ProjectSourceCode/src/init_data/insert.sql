INSERT INTO users (first_name, last_name, username, email, rank, password, created_at, last_login)
VALUES 
    ('Andrew', 'Fox', 'apfox500', 'apfox500@gmail.com', 'user', '$2a$10$HNDIEphDRPRZniXjscGPRufwXnGC6zdwP/1OsMNsml0n2Yj5X/PPC', '2025-04-02 23:54:14.881657', '2025-04-02 23:54:14.881657'),
    ('Alex', 'Knight', 'aknight', 'aknight@gmail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904'),
    ('Caleb', 'L', 'Calebl', 'calebl@gmail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904');



INSERT INTO conversations (user1_id, user2_id, created_at)
VALUES
    (1, 2, '2025-04-03 00:00:45.455904'),
    (3, 1, '2025-04-03 00:00:45.455904'),
    (2, 3, '2025-04-03 00:00:45.455904');

INSERT INTO messages (conversation_id, user_id, message_text, time_sent, user_read)
VALUES
    (1, 2, 'Hey, How are you?', '2025-04-03 00:00:45.455904', TRUE),
    (1, 1, 'Im good', '2025-04-03 00:01:45.455904', FALSE),
    (1, 1, 'How are you?', '2025-04-03 00:01:46.455904', FALSE),
    
    (2, 1, 'Hey, How are you?', '2025-04-03 00:00:45.455904', TRUE),
    (2, 3, 'Im good', '2025-04-03 00:01:45.455904', FALSE),
    (2, 3, 'How are you?', '2025-04-03 00:01:46.455904', FALSE),
    
    (3, 3, 'Hey, How are you?', '2025-04-03 00:00:45.455904', TRUE),
    (3, 2, 'Im good', '2025-04-03 00:01:45.455904', FALSE),
    (3, 2, 'How are you?', '2025-04-03 00:01:46.455904', FALSE);

