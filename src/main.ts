// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import compression from "compression-next";
import express from "express";
import mysql_session from "express-mysql-session";
import * as session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import spdy from "spdy";
import { config } from "./config";
import { route_auth } from "./routes/auth";
import { route_root } from "./routes/root";
import { route_sensor } from "./routes/sensor";
import { route_webapp } from "./routes/webapp";

const app = express();
const server = spdy.createServer(config.get_https_options(), app);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(helmet());
app.use(
    helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
            "script-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
        },
    })
);
app.use(compression());
app.use(express.static(path.join(__dirname, "../public/")));
app.set("view engine", "pug");

const MySQLStore = mysql_session(session);
const session_middleware = session.default({
    secret: config.get_session_secret(),
    store: new MySQLStore(config.get_mysql_options("session")),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 31104000000,
        secure: true,
        httpOnly: true,
    },
});
app.use(session_middleware);

app.use(route_root);
app.use(route_auth);
route_webapp.setup(server, session_middleware);
route_sensor.setup(server);

server.listen(config.get_https_port(), () => {
    if (process.getuid() === 0) {
        process.setuid(config.get_service_user());
    }
    console.log("Started listening...");
});
