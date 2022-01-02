// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { model_utils, PoolConnection } from "./utils";

export interface Sensor {
    sensor_id: number;
    description: string;
}

interface UpdateParams {
    sensor_id: number;
    description: string;
}

class Model_Sensors {
    async authenticate(secret: string): Promise<number | null> {
        interface Row {
            sensor_id: number;
        }

        const row = await model_utils.select_single<Row>(
            `
            SELECT
                sensor_id
            FROM
                sensors
            WHERE
                    NOT is_deleted
                AND secret = ?
            ;
        `,
            [secret]
        );

        if (row !== null) {
            return row.sensor_id;
        } else {
            return null;
        }
    }

    async find_by_user_id(user_id: number): Promise<Sensor[] | null> {
        return await model_utils.select<Sensor>(
            `
            SELECT
                sensor_id,
                description
            FROM
                sensors
            WHERE
                    NOT is_deleted
                AND user_id = ?
            ORDER BY
                sensor_id
            ;
        `,
            [user_id]
        );
    }

    async update(params: UpdateParams) {
        let conn: PoolConnection | null = null;
        try {
            conn = await model_utils.get_connection();

            const [results]: any = await conn.execute(
                `
                UPDATE sensors SET
                    description = ?
                WHERE
                        NOT is_deleted
                    AND sensor_id = ?
                ;
                `,
                [params.description, params.sensor_id]
            );

            await conn.commit();

            return typeof results?.affectedRows === "number" && results.affectedRows === 1;
        } catch (e) {
            console.log(`Model_Measurements.append(): ${e}`);
            return false;
        } finally {
            conn?.release();
        }
    }
}

export const model_sensors = new Model_Sensors();
