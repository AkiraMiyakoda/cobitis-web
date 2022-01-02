// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { model_utils, PoolConnection } from "./utils";

type PostedValues = [number, number, number];
type LatestValues = [number, number];

interface SeriesParams {
    sensor_id: number;
    min_tick: number;
    max_tick: number;
    tick_length: number;
}

interface LatestSeries {
    min_tick: number;
    max_tick: number;
    series: [(number | null)[], (number | null)[], (number | null)[]];
}

class Model_Measurements {
    async get_latest(sensor_id: number): Promise<LatestValues | null> {
        interface Row {
            temp: number;
            tds: number;
        }

        const row = await model_utils.select_single<Row>(
            `
            SELECT
                ROUND(TRIMMEAN_20(temp1), 1) AS temp,
                ROUND(TRIMMEAN_20(tds),   1) AS tds
            FROM
                measurements
            WHERE
                    NOT is_deleted
                AND sensor_id = ?
                AND measured_at >= UNIX_TIMESTAMP() - 60
            ;
        `,
            [sensor_id]
        );

        if (row !== null) {
            return [row.temp, row.tds];
        } else {
            return null;
        }
    }

    async get_series(params: SeriesParams): Promise<LatestSeries | null> {
        interface Row {
            tick: number;
            temp1: number;
            temp2: number;
            tds: number;
        }

        const rows = await model_utils.select<Row>(
            `
            SELECT
                (measured_at DIV ?)          AS tick,
                ROUND(TRIMMEAN_20(temp1), 2) AS temp1,
                ROUND(TRIMMEAN_20(temp2), 2) AS temp2,
                ROUND(TRIMMEAN_20(tds),   2) AS tds
            FROM
                measurements
            WHERE
                    NOT is_deleted
                AND sensor_id = ?
                AND measured_at >= ?
                AND measured_at <  ?
            GROUP BY
                tick
            ORDER BY
                tick
            ;
        `,
            [
                params.tick_length,
                params.sensor_id,
                params.min_tick * params.tick_length,
                params.max_tick * params.tick_length,
            ]
        );

        if (rows === null) {
            return null;
        }

        const result: LatestSeries = {
            min_tick: params.min_tick,
            max_tick: params.max_tick,
            series: [
                Array(params.max_tick - params.min_tick).fill(null),
                Array(params.max_tick - params.min_tick).fill(null),
                Array(params.max_tick - params.min_tick).fill(null),
            ],
        };

        rows.forEach((row) => {
            const index = row.tick - params.min_tick;
            result.series[0][index] = row.temp1;
            result.series[1][index] = row.temp2;
            result.series[2][index] = row.tds;
        });

        return result;
    }

    async append(sensor_id: number, values: PostedValues) {
        let conn: PoolConnection | null = null;
        try {
            conn = await model_utils.get_connection();

            await conn.execute(
                `
                INSERT INTO measurements (
                    sensor_id,
                    temp1,
                    temp2,
                    tds
                ) VALUES (
                    ?,
                    ?,
                    ?,
                    ?
                )
                ;
                `,
                [sensor_id, ...values]
            );

            await conn.commit();
        } catch (e) {
            console.log(`Model_Measurements.append(): ${e}`);
            return null;
        } finally {
            conn?.release();
        }
    }
}

export const model_measurements = new Model_Measurements();
