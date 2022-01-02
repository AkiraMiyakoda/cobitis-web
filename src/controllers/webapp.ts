// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { model_measurements } from "../models/measurements";
import { model_sensors } from "../models/sensors";
import { Utils } from "../utils";

const CHART_TICKS = 360;
const CHART_RANGES = [
    { range: 6 * 60 * 60, label: "6時間" },
    { range: 24 * 60 * 60, label: "24時間" },
    { range: 7 * 24 * 60 * 60, label: "7日間" },
    { range: 30 * 24 * 60 * 60, label: "30日間" },
];
CHART_RANGES.forEach((r) => console.assert(r.range % CHART_TICKS === 0));

const PUSH_INTERVAL = 10000;

interface Callbacks {
    push_values: (values: any) => void;
    push_series: (series: any) => void;
}

interface ClientSession {
    ranges: string[];
    range_index: number;
    sensors: string[];
    sensor_index: number;
    chart_ticks: number;
    tick_length: number;
}

interface Sensor {
    sensor_id: number;
    description: string;
}

export class Controller_WebApp {
    private _callbacks?: Callbacks;

    private _user_id: number | null = null;
    private _sensors: Sensor[] | null = null;
    private _sensor_id: number | null = null;
    private _tick_length: number | null = null;

    private _timer: NodeJS.Timeout | null = null;
    private _prev_max_tick: number = 0;

    constructor(callbacks?: Callbacks) {
        this._callbacks = callbacks;
    }

    authenticate(request: any): boolean {
        interface AuthenticatedRequest {
            session: {
                passport: {
                    user: {
                        user_id: number;
                    };
                };
            };
        }

        const is_authenticated_request = (r: any): r is AuthenticatedRequest =>
            typeof r?.session?.passport?.user?.user_id === "number";

        if (is_authenticated_request(request)) {
            this._user_id = request.session.passport.user.user_id;
        } else {
            this._user_id = null;
        }

        return this._user_id !== null;
    }

    async init_session(session: any, params: any): Promise<ClientSession | null> {
        if (this._timer !== null) {
            clearInterval(this._timer);
            this._timer = null;
        }

        if (this._user_id === null) {
            return null;
        }

        this._sensors = await model_sensors.find_by_user_id(this._user_id);
        if (this._sensors === null) {
            return null;
        }

        if (typeof params?.range_index === "number") {
            session.range_index = params.range_index;
        }

        if (!(session.range_index in CHART_RANGES)) {
            session.range_index = 0;
        }

        if (typeof params?.sensor_index === "number") {
            session.sensor_index = params.sensor_index;
        }

        if (!(session.sensor_index in this._sensors)) {
            session.sensor_index = 0;
        }

        this._sensor_id = this._sensors[session.sensor_index].sensor_id;
        this._tick_length = CHART_RANGES[session.range_index].range / CHART_TICKS;
        this._prev_max_tick = 0;

        this._timer = setInterval(() => {
            this.push();
        }, PUSH_INTERVAL);

        setImmediate(() => {
            this.push();
        });

        return {
            ranges: CHART_RANGES.map((r) => r.label),
            range_index: session.range_index,
            sensors: this._sensors.map((s) => s.description),
            sensor_index: session.sensor_index,
            chart_ticks: CHART_TICKS,
            tick_length: this._tick_length,
        };
    }

    async update_sensor(params: any): Promise<boolean> {
        interface Params {
            sensor_index: number;
            description: string;
        }

        const is_params = (p: any): p is Params =>
            typeof p?.sensor_index === "number" && typeof p?.description === "string";
        if (!is_params(params)) {
            return false;
        }

        if (this._sensors === null || !(params.sensor_index in this._sensors)) {
            return false;
        }

        params.description = Utils.remove_control_chars(params.description).trim();
        if (params.description.length === 0) {
            return false;
        }

        return model_sensors.update({
            sensor_id: this._sensors[params.sensor_index].sensor_id,
            description: params.description,
        });
    }

    private async push() {
        if (!this._callbacks) {
            return;
        }

        if (this._sensor_id === null) {
            return;
        }

        if (this._tick_length === null) {
            return;
        }

        this._callbacks.push_values(await model_measurements.get_latest(this._sensor_id));

        const max_tick = Math.floor(Date.now() / this._tick_length / 1000);
        if (max_tick > this._prev_max_tick) {
            const min_tick = Math.max(this._prev_max_tick, max_tick - CHART_TICKS);
            this._callbacks.push_series(
                await model_measurements.get_series({
                    sensor_id: this._sensor_id,
                    min_tick: min_tick,
                    max_tick: max_tick,
                    tick_length: this._tick_length,
                })
            );

            this._prev_max_tick = max_tick;
        }
    }
}
