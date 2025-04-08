INSERT INTO conventions (name, location, start_date, end_date)
VALUES
('Comic-Con 2024','San Diego, CA','2024-07-18','2024-07-21'),
('Anime Expo','Los Angeles, CA','2024-07-04','2024-07-07'),
('PAX West','Seattle, WA','2024-08-31','2024-09-03'),
('GDC 2024','San Francisco, CA','2024-03-21','2024-03-25'),
('E3 Expo','Los Angeles, CA','2024-06-11','2024-06-14');

INSERT INTO users (id, first_name, last_name, username, email, rank, password)
VALUES
(1, 'John', 'Doe', 'johndoe', 'john@example.com', 'user', 'dummyhash'),
(2, 'Jane', 'Smith', 'janesmith', 'jane@example.com', 'user', 'dummyhash');


INSERT INTO groups (convention_id, name, description, created_by)
VALUES
(1, 'Comic-Con Cosplay Crew', 'Cosplayers planning for Comic-Con 2024', 1),
(1, 'Comic-Con Indie Devs', 'Indie dev meetup group', 2),
(2, 'Anime Expo Otakus', 'Fans meeting at Anime Expo', 1),
(3, 'PAX West Board Gamers', 'Offline board gamers unite', 2),
(4, 'GDC 2024 Networking', 'Networking group for GDC', 1),
(5, 'E3 Expo Hype', 'E3 enthusiasts gathering', 2);

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
