// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { model_utils } from "./utils";

class Model_Users {
    async authenticate(provider: string, id: string): Promise<number | null> {
        interface Row {
            user_id: number;
        }

        const row = await model_utils.select_single<Row>(
            `
            SELECT
                user_id
            FROM
                users
            WHERE
                    NOT is_deleted
                AND auth_provider = ?
                AND auth_id = ?
            ;
        `,
            [provider, id]
        );

        if (row !== null) {
            return row.user_id;
        } else {
            return null;
        }
    }
}

export const model_users = new Model_Users();
