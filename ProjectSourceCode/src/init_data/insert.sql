INSERT INTO users (id, first_name, last_name, username, email, rank, password, created_at, last_login)
VALUES 
    (1, 'Andrew', 'Fox', 'apfox500', 'apfox500@gmail.com', 'user', '$2a$10$HNDIEphDRPRZniXjscGPRufwXnGC6zdwP/1OsMNsml0n2Yj5X/PPC', '2025-04-02 23:54:14.881657', '2025-04-02 23:54:14.881657'),
    (2, 'Alex', 'Knight', 'aknight', 'aknight@gmail.com', 'user', '$2a$10$xCk69irCsjIPX2oJmGBzmeGCgJGHJI7BT3Hkkxf2WroVIPQXsscKe', '2025-04-03 00:00:45.455904', '2025-04-03 00:00:45.455904');


INSERT INTO conversations (id, user1_id, user2_id, created_at)
VALUES
    (1, 'apfox500', 'aknight', '2025-04-03 00:00:45.455904');

INSERT INTO messages (id, conversation_id, user_id, message_text, time_sent, user_read)
VALUES
    (1, 1, 2, "Hey, How are you?", '2025-04-03 00:00:45.455904', TRUE),
    (2, 1, 1, "I'm good", '2025-04-03 00:01:45.455904', FALSE),
    (2, 1, 1, "How are you?", '2025-04-03 00:01:46.455904', FALSE);

