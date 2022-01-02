// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export class Utils {
    static remove_control_chars(s: string): string {
        return s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    }
}
