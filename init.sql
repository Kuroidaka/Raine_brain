use raine_DB;
-- Insert into User table
INSERT INTO User (id, display_name, username, password, created_at, updated_at, role_id) VALUES
('3969d671-6d6d-4d94-a2d8-1a30168c9476', NULL, 'canh', '$2b$10$bqdJ3jO5AuC.eP2V/OXHbeWz/M/ndg/pKDzeS07Zhfanr4as7w8pS', '2024-08-23 16:37:18.089', '2024-08-23 16:37:18.089', NULL);

-- Insert into AiTool table
INSERT INTO AiTool (id, createdAt, updatedAt, name, description) VALUES
('b16f9f7e-7f61-4977-bf34-6fbcfa01f0db', NOW(), NOW(), 'ReminderChatService', 'This tool processes task management queries. It can fetch tasks based on specific criteria (e.g., tasks in a particular area). For example, if the user asks to ''search task with area in work with its subtask,'' the tool will process this by setting ''q'' to ''search task with area in work'''),
('3f1dbef6-d69b-4c97-b4c1-f729f04b728a', NOW(), NOW(), 'RoutineChatService', 'This tool processes routine management queries. It can fetch routines based on specific criteria (e.g., routines in a particular area) or routines that completed recently. For example, if the user asks to ''search routine with area in work'' the tool will process this by setting ''q'' to ''search routine with area in work''');

-- Insert into UserOnAiTools table
INSERT INTO UserOnAiTools (userId, aiToolId, assignedAt) VALUES
('3969d671-6d6d-4d94-a2d8-1a30168c9476', '3f1dbef6-d69b-4c97-b4c1-f729f04b728a', NOW()),
('3969d671-6d6d-4d94-a2d8-1a30168c9476', 'b16f9f7e-7f61-4977-bf34-6fbcfa01f0db', NOW());
