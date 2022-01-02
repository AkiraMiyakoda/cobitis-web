// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { Controller_Sensor as Controller } from "../controllers/sensor";

export const API_V1 = {
    PATH: "/socket.io.sensor.v1/",
    AUTHENTICATE: "A",
    POST_VALUES: "V",
};

class Route_Sensor {
    setup(http_server: HttpServer) {
        const io = new Server(http_server, { path: API_V1.PATH });

        io.on("connection", (socket: Socket) => {
            let controller: Controller | null = new Controller();

            console.log(`Sensor [\x1b[33m${socket.id}\x1b[0m] connected.`);

            socket.on("disconnect", () => {
                console.log(`Sensor [\x1b[33m${socket.id}\x1b[0m] disconnected.`);
                controller = null;
            });

            socket.on(API_V1.AUTHENTICATE, async (secret) => {
                if (await controller?.authenticate(secret)) {
                    console.log(`Sensor [\x1b[33m${socket.id}\x1b[0m] authenticated.`);
                } else {
                    console.log(`Sensor [\x1b[33m${socket.id}\x1b[0m] rejected.`);
                    socket.disconnect();
                }
            });

            socket.on(API_V1.POST_VALUES, async (values) => {
                await controller?.store_values(values);
            });
        });
    }
}

export const route_sensor = new Route_Sensor();
