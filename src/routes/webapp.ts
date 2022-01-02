// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { Controller_WebApp as Controller } from "../controllers/webapp";

export const API_V1 = {
    PATH: "/socket.io.webapp.v1/",
    INIT_SESSION: "I",
    PUSH_VALUES: "V",
    PUSH_SERIES: "S",
    UPDATE_SENSOR: "T",
};

class Route_WebApp {
    setup(http_server: HttpServer, session_middleware: any) {
        const io = new Server(http_server, {
            path: API_V1.PATH,
            perMessageDeflate: { threshold: 4096 },
        });

        io.use((socket, next) => {
            session_middleware(socket.request, {}, next);
        });

        io.on("connection", async (socket: Socket) => {
            const callbacks = {
                push_values: (values: any) => {
                    io.to(socket.id).emit(API_V1.PUSH_VALUES, values);
                },
                push_series: (series: any) => {
                    io.to(socket.id).emit(API_V1.PUSH_SERIES, series);
                },
            };

            let controller: Controller | null = new Controller(callbacks);

            console.log(`Web app [\x1b[33m${socket.id}\x1b[0m] connected.`);

            socket.on("disconnect", () => {
                console.log(`Web app [\x1b[33m${socket.id}\x1b[0m] disconnected.`);
                controller = null;
            });

            if (controller.authenticate(socket.request)) {
                console.log(`Web app [\x1b[33m${socket.id}\x1b[0m] authenticated.`);
            } else {
                console.log(`Web app [\x1b[33m${socket.id}\x1b[0m] rejected.`);
                socket.disconnect();
            }

            socket.on(API_V1.INIT_SESSION, async (params, callback) => {
                const req: any = socket.request;
                callback(await controller?.init_session(req?.session, params));
                req.session.save();
            });

            socket.on(API_V1.UPDATE_SENSOR, async (params, callback) => {
                callback(await controller?.update_sensor(params));
            });
        });
    }
}

export const route_webapp = new Route_WebApp();
