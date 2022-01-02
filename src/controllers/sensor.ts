// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { model_measurements } from "../models/measurements";
import { model_sensors } from "../models/sensors";

export class Controller_Sensor {
    private _sensor_id: number | null = null;

    async authenticate(secret: any): Promise<boolean> {
        this._sensor_id = await model_sensors.authenticate(String(secret));
        return this._sensor_id !== null;
    }

    async store_values(values: any) {
        if (this._sensor_id === null) {
            return;
        }

        const is_values = (v: any): v is [number, number, number] =>
            Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number");

        if (!is_values(values)) {
            return;
        }

        await model_measurements.append(this._sensor_id, values);
    }
}
