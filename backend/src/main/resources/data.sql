-- Lab 5 sample data. ON CONFLICT DO NOTHING keeps this idempotent across restarts.

INSERT INTO lab5_todos (id, title, description, completed, priority, due_date, created_at)
VALUES (1, 'Set up PostgreSQL database', 'Create the tododb database and todouser role for Lab 5', false, 'HIGH', CURRENT_DATE + 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab5_todos (id, title, description, completed, priority, due_date, created_at)
VALUES (2, 'Build Spring Boot REST API', 'Implement CRUD endpoints for the Todo entity', false, 'MEDIUM', CURRENT_DATE + 3, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lab5_todos (id, title, description, completed, priority, due_date, created_at)
VALUES (3, 'Style the React frontend', 'Add priority badges and completed task styling', true, 'LOW', CURRENT_DATE - 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Realign the identity sequence so the next auto-generated id doesn't collide with the seed rows above.
SELECT setval('lab5_todos_id_seq', GREATEST((SELECT MAX(id) FROM lab5_todos), 1));
