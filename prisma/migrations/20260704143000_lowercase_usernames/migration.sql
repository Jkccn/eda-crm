-- 用户名统一为小写，登录时不区分大小写
UPDATE "User" SET username = LOWER(username);
