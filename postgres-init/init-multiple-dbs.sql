-- Runs once when PostgreSQL initializes an empty data volume.
-- Keep database names aligned with DB_NAME in docker-compose.yml.
\getenv user_db_password USER_DB_PASSWORD
\getenv course_db_password COURSE_DB_PASSWORD
\getenv quiz_db_password QUIZ_DB_PASSWORD
\getenv payment_db_password PAYMENT_DB_PASSWORD

CREATE ROLE users_app LOGIN PASSWORD :'user_db_password';
CREATE ROLE courses_app LOGIN PASSWORD :'course_db_password';
CREATE ROLE quizzes_app LOGIN PASSWORD :'quiz_db_password';
CREATE ROLE payments_app LOGIN PASSWORD :'payment_db_password';

CREATE DATABASE user_db OWNER users_app;
CREATE DATABASE course_db OWNER courses_app;
CREATE DATABASE quiz_db OWNER quizzes_app;
CREATE DATABASE payment_db OWNER payments_app;

REVOKE ALL ON DATABASE user_db FROM PUBLIC;
REVOKE ALL ON DATABASE course_db FROM PUBLIC;
REVOKE ALL ON DATABASE quiz_db FROM PUBLIC;
REVOKE ALL ON DATABASE payment_db FROM PUBLIC;
