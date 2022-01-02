CREATE AGGREGATE FUNCTION trimmean_20 RETURNS REAL SONAME 'libtrimmean_plugin.so';

CREATE USER cobitis_service@localhost IDENTIFIED BY '***';

CREATE DATABASE cobitis_session CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
GRANT ALL ON cobitis_session.* TO cobitis_service@localhost;

CREATE DATABASE cobitis_app CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
GRANT SELECT, INSERT, UPDATE ON cobitis_app.* TO cobitis_service@localhost;

-- On database cobitis_app

CREATE TABLE users (
    user_id       INT NOT NULL AUTO_INCREMENT,
    auth_provider VARCHAR(16) NOT NULL,
    auth_id       VARCHAR(64) NOT NULL UNIQUE,
    description   TEXT,
    is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id),
    INDEX (is_deleted)
);

CREATE TABLE sensors (
    sensor_id   INT NOT NULL AUTO_INCREMENT,
    user_id     INT,
    secret      CHAR(32) NOT NULL UNIQUE,
    description TEXT,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (sensor_id),
    FOREIGN KEY (user_id) REFERENCES users (user_id),
    INDEX (is_deleted)
);

CREATE TABLE measurements (
    sensor_id   INT NOT NULL,
    measured_at BIGINT UNSIGNED NOT NULL DEFAULT UNIX_TIMESTAMP(),
    temp1       FLOAT,
    temp2       FLOAT,
    tds         FLOAT,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (sensor_id, measured_at),
    FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id),
    INDEX (is_deleted)
);
