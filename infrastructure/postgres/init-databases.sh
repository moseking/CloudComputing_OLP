#!/bin/sh
# The official entrypoint sources non-executable .sh files on the first empty volume.
(
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=users_password="$USER_DB_PASSWORD" \
  --set=courses_password="$COURSE_DB_PASSWORD" \
  --set=quizzes_password="$QUIZ_DB_PASSWORD" \
  --set=payments_password="$PAYMENT_DB_PASSWORD" <<'SQL'
CREATE ROLE users_app LOGIN PASSWORD :'users_password';
CREATE ROLE courses_app LOGIN PASSWORD :'courses_password';
CREATE ROLE quizzes_app LOGIN PASSWORD :'quizzes_password';
CREATE ROLE payments_app LOGIN PASSWORD :'payments_password';
CREATE DATABASE users_db OWNER users_app;
CREATE DATABASE courses_db OWNER courses_app;
CREATE DATABASE quizzes_db OWNER quizzes_app;
CREATE DATABASE payments_db OWNER payments_app;
REVOKE ALL ON DATABASE users_db FROM PUBLIC;
REVOKE ALL ON DATABASE courses_db FROM PUBLIC;
REVOKE ALL ON DATABASE quizzes_db FROM PUBLIC;
REVOKE ALL ON DATABASE payments_db FROM PUBLIC;
SQL
)
