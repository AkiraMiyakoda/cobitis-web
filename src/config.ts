// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import fs from "fs";
import JSON5 from "json5";
import path from "path";

interface RawValues {
    service: {
        user: string;
    };

    https: {
        port: number;
        cert: string;
        key: string;
        ca: string[];
    };

    session: {
        secret: string;
    };

    oauth2: {
        google: {
            clientID: string;
            clientSecret: string;
            callbackURL: string;
        };
    };

    database: {
        app: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
        };
        session: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
        };
    };
}

interface HttpsOptions {
    cert: Buffer;
    key: Buffer;
    ca: Buffer[];
}

interface OAuth2Options {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
}

interface MysqlOptions {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

class Config {
    private _values: RawValues;

    constructor() {
        this._values = JSON5.parse(
            fs.readFileSync(path.join(__dirname, "../.secret/config.json5")).toString()
        );
    }

    get_service_user(): string {
        return this._values.service.user;
    }

    get_https_port(): number {
        return this._values.https.port;
    }

    get_https_options(): HttpsOptions {
        return {
            cert: fs.readFileSync(this._values.https.cert),
            key: fs.readFileSync(this._values.https.key),
            ca: this._values.https.ca.map((f) => fs.readFileSync(f)),
        };
    }

    get_session_secret(): string {
        return this._values.session.secret;
    }

    get_oauth2_options(provider: "google"): OAuth2Options {
        return { ...this._values.oauth2[provider] };
    }

    get_mysql_options(database: "app" | "session"): MysqlOptions {
        return { ...this._values.database[database] };
    }
}

export const config = new Config();
