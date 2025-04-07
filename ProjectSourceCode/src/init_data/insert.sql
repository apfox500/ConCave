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

