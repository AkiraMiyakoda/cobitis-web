// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* global API_V1 */
/* global io */

import { draw_chart } from "./charts.min.js";

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const SNACKBAR_DURATION = 3000;

    const utils = {
        set_text: (el, text) => {
            if (!(el instanceof HTMLElement)) {
                el = document.querySelector(el);
            }

            el.innerText = text;
        },

        activate: (el, active) => {
            if (!(el instanceof HTMLElement)) {
                el = document.querySelector(el);
            }

            if (active) {
                el.classList.add("active");
            } else {
                el.classList.remove("active");
            }
        },
    };

    // =========================================================================
    //  Latest Values & Charts
    // =========================================================================

    const update_values = (data) => {
        const is_valid_data = (data) => {
            return (
                Array.isArray(data) &&
                data.length === 2 &&
                data.every((v) => typeof v === "number" && isFinite(v))
            );
        };

        if (is_valid_data(data)) {
            utils.set_text(".value-box#temp-box > .value", data[0].toFixed(1));
            utils.set_text(".value-box#tds-box > .value", data[1].toFixed(1));
        } else {
            utils.set_text(".value-box#temp-box > .value", "--.-");
            utils.set_text(".value-box#tds-box > .value", "---.-");
        }
    };

    const update_charts = (data) => {
        const is_valid_data = (data) => {
            return (
                data !== null &&
                "min_tick" in data &&
                typeof data.min_tick === "number" &&
                isFinite(data.min_tick) &&
                "max_tick" in data &&
                typeof data.min_tick === "number" &&
                isFinite(data.min_tick) &&
                "series" in data &&
                Array.isArray(data.series) &&
                data.series.length === 3 &&
                data.series.every(
                    (s) => Array.isArray(s) && s.length === data.max_tick - data.min_tick
                )
            );
        };

        if (is_valid_data(data)) {
            const shift = data.max_tick - data.min_tick;
            series[0] = series[0].slice(shift).concat(data.series[0]);
            series[1] = series[1].slice(shift).concat(data.series[1]);
            series[2] = series[2].slice(shift).concat(data.series[2]);

            draw_chart({
                query: "#temp-box canvas",
                scale: 1,
                series: [series[0], series[1]],
                colors: ["#5DADE2", "#82E0AA"],
                base_tick: data.max_tick - session.chart_ticks,
                ticks: session.chart_ticks,
                tick_length: session.tick_length,
                range: session.range_index,
            });
            draw_chart({
                query: "#tds-box canvas",
                scale: 5,
                series: [series[2]],
                colors: ["#EB984E"],
                base_tick: data.max_tick - session.chart_ticks,
                ticks: session.chart_ticks,
                tick_length: session.tick_length,
                range: session.range_index,
            });
        }

        utils.activate(".overlay", false);
    };

    // =========================================================================
    //  Nav Bar & Side Drawer
    // =========================================================================

    const update_session = (data) => {
        if (data === null) {
            return;
        }

        Object.assign(session, data);
        series[0] = Array(session.chart_ticks).fill(null);
        series[1] = Array(session.chart_ticks).fill(null);
        series[2] = Array(session.chart_ticks).fill(null);

        utils.set_text("#current-sensor", session.sensors[session.sensor_index]);

        {
            const ul = document.querySelector("#list-ranges");
            ul.innerHTML = "";

            session.ranges.forEach((range, i) => {
                const li = document.createElement("li");
                utils.activate(li, i === session.range_index);
                li.innerText = range;
                li.addEventListener("click", () => {
                    init_session({ range_index: i });
                    utils.activate("nav.drawer", false);
                });

                ul.appendChild(li);
            });
        }

        {
            const ul = document.querySelector("#list-sensors");
            ul.innerHTML = "";

            session.sensors.forEach((sensor, i) => {
                const li = document.createElement("li");
                utils.activate(li, i === session.sensor_index);
                li.innerText = sensor;
                li.classList.add("editable");
                li.addEventListener("click", (e) => {
                    if (e.offsetX < li.offsetX + li.offsetWidth - 50) {
                        init_session({ sensor_index: i });
                        utils.activate("nav.drawer", false);
                    } else {
                        edit_sensor(i);
                    }
                });

                ul.appendChild(li);
            });
        }
    };

    document.querySelector("#button-menu").addEventListener("click", () => {
        utils.activate("nav.drawer", true);
    });

    document.querySelector(".drawer-backdrop").addEventListener("click", () => {
        utils.activate("nav.drawer", false);
    });

    document.querySelector("#item-signout").addEventListener("click", () => {
        location.replace("/auth/signout");
    });

    // =========================================================================
    //  Dialogs
    // =========================================================================

    const edit_sensor = (index) => {
        const input_description = document.querySelector("#sensor-description");
        input_description.value = session.sensors[index];
        input_description.select();

        const dialog = document.querySelector("#dialog-sensor");
        dialog.execute = () => {
            utils.activate(".overlay", true);
            utils.activate("nav.drawer", false);
            update_sensor({
                sensor_index: index,
                description: input_description.value,
            });
            dialog.close();
        };
        dialog.showModal();
    };

    const edit_sensor_callback = (result) => {
        if (result) {
            show_snackbar("センサー情報の更新に成功しました");
            init_session();
        } else {
            show_snackbar("センサー情報の更新に失敗しました");
        }
    };

    document.querySelectorAll("button.execute-dialog").forEach((button) => {
        button.addEventListener("click", () => {
            const dialog = button.closest("dialog");
            if ("execute" in dialog) {
                dialog.execute();
            }
        });
    });

    document.querySelectorAll("button.cancel-dialog").forEach((button) => {
        button.addEventListener("click", () => {
            button.closest("dialog").close();
        });
    });

    // =========================================================================
    //  Snackbar
    // =========================================================================

    const show_snackbar = (text) => {
        const bar = document.querySelector("#snackbar");
        bar.innerText = text;
        utils.activate(bar, true);
        window.setTimeout(() => {
            utils.activate(bar, false);
        }, SNACKBAR_DURATION);
    };

    // =========================================================================
    //  Communication with Server
    // =========================================================================

    const session = {
        ranges: [],
        range_index: 0,
        sensors: [],
        sensor_index: 0,
        chart_ticks: 0,
        tick_length: 0,
    };

    const series = [[], [], []];

    const socket = io(`https://${location.host}`, { path: API_V1.PATH });

    const init_session = async (params) => {
        utils.activate(".overlay", true);
        socket.emit(API_V1.INIT_SESSION, params, update_session);
    };

    socket.on("connect", () => {
        init_session();
    });

    const update_sensor = async (params) => {
        socket.emit(API_V1.UPDATE_SENSOR, params, edit_sensor_callback);
    };

    socket.on(API_V1.PUSH_VALUES, update_values);
    socket.on(API_V1.PUSH_SERIES, update_charts);
});
