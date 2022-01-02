// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import mysql2 from "mysql2/promise";
import { config } from "../config";

export { PoolConnection } from "mysql2/promise";

type SQLParams = (string | number)[];

class Model_Utils {
    private _pool: mysql2.Pool;

    constructor() {
        this._pool = mysql2.createPool(config.get_mysql_options("app"));
    }

    async get_connection(): Promise<mysql2.PoolConnection> {
        return this._pool.getConnection();
    }

    async select<T>(sql: string, params: SQLParams): Promise<T[] | null> {
        let conn: mysql2.PoolConnection | null = null;
        try {
            conn = await this.get_connection();
            await conn.commit();

            const [rows]: any = await conn.execute(sql, params);
            if (Array.isArray(rows) && rows.length >= 1) {
                return rows;
            } else {
                return null;
            }
        } catch (e) {
            console.log(`Model_Utils.select<T>(): ${e}`);
            return null;
        } finally {
            conn?.release();
        }
    }

    async select_single<T>(sql: string, params: SQLParams): Promise<T | null> {
        const rows = await this.select<T>(sql, params);
        if (rows !== null) {
            return rows[0];
        } else {
            return null;
        }
    }
}

export const model_utils = new Model_Utils();
