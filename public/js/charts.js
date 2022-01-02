// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* global strftime */

export const draw_chart = async (params) => {
    "use strict";

    const Y_AXIS_MIN_DEGREES = 15;
    const Y_AXIS_MARGIN = 3;

    const get_x_label = (n) => {
        const d1 = new Date((params.base_tick + n) * params.tick_length * 1000);
        const d2 = new Date((params.base_tick + n - 1) * params.tick_length * 1000);

        switch (params.range) {
            case 0:
                if (d1.getHours() !== d2.getHours()) {
                    return strftime("%H:00", d1);
                }
                break;
            case 1:
                if (d1.getHours() % 3 === 0 && d1.getHours() !== d2.getHours()) {
                    return strftime("%H:00", d1);
                }
                break;
            case 2:
                if (d1.getDate() !== d2.getDate()) {
                    return strftime("%m/%d", d1);
                }
                break;
            case 3:
                if (d1.getDay() === 0 && d1.getDate() !== d2.getDate()) {
                    return strftime("%m/%d", d1);
                }
                break;
            default:
                // NOP
                break;
        }

        return null;
    };

    const get_y_label = (n, base) => {
        if (base !== null && (base + n) % 5 === 0) {
            return ((base + n) * params.scale).toString();
        } else {
            return null;
        }
    };

    const draw_line = (ctx, x1, y1, x2, y2) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    const draw_polyline = (ctx, coords) => {
        if (coords.length < 2) {
            return;
        }

        ctx.beginPath();

        coords.forEach((c, i) => {
            if (i === 0) {
                ctx.moveTo(c.x, c.y);
            } else {
                ctx.lineTo(c.x, c.y);
            }
        });

        ctx.stroke();
    };

    // Adjust the canvas size for dot-by-dot drawing.

    const canvas = document.querySelector(params.query);
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;

    const margin = {
        l: Math.round(canvas.width * 0.07),
        r: 0,
        t: Math.round(canvas.height * 0.03),
        b: Math.round(canvas.height * 0.05),
    };

    // Determine the Y-axis range.

    let y_axis_base = null;
    let y_axis_degrees = Y_AXIS_MIN_DEGREES;

    const numbers = params.series
        .flat()
        .filter((n) => typeof n === "number" && isFinite(n))
        .map((n) => n / params.scale);
    if (numbers.length > 0) {
        const max = Math.ceil(Math.max(...numbers));
        const min = Math.floor(Math.min(...numbers));
        y_axis_degrees = Math.max(y_axis_degrees, max - min + Y_AXIS_MARGIN * 2);
        y_axis_base = Math.round((max + min) / 2 - y_axis_degrees / 2);
    }

    const step = {
        x: (canvas.width - margin.l - margin.r + 1) / params.ticks,
        y: (canvas.height - margin.t - margin.b + 1) / y_axis_degrees,
    };

    const calc = {
        x: (n) => margin.l + step.x * n,
        y: (n) => canvas.height - margin.b - step.y * n,
    };

    // Prepare X/Y-axis labels.

    const x_labels = [...Array(params.ticks).keys()].map((n) => get_x_label(n));
    const y_labels = [...Array(y_axis_degrees + 1).keys()].map((n) => get_y_label(n, y_axis_base));

    // Draw grid lines.

    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 1]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";

    x_labels.forEach((label, n) => {
        if (label !== null) {
            const x = Math.round(calc.x(n)) + 0.5;
            draw_line(ctx, x, margin.t, x, canvas.height - margin.b);
        }
    });

    y_labels.forEach((label, n) => {
        if (label !== null) {
            ctx.setLineDash([]);
        } else {
            ctx.setLineDash([1, 1]);
        }

        const y = Math.round(calc.y(n)) + 0.5;
        draw_line(ctx, margin.l, y, canvas.width - margin.r, y);
    });

    // Draw series.

    ctx.lineWidth = Math.min(canvas.width, canvas.height) * 0.013;
    ctx.setLineDash([]);
    ctx.lineCap = "square";
    ctx.lineJoin = "round";

    ctx.shadowOffsetX = ctx.lineWidth * 0.5;
    ctx.shadowOffsetY = ctx.lineWidth * 0.5;
    ctx.shadowBlur = ctx.lineWidth;
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";

    ctx.save();
    ctx.rect(
        margin.l,
        margin.t,
        canvas.width - margin.l - margin.r,
        canvas.height - margin.t - margin.b
    );
    ctx.clip();

    const zipped = params.series.map((s, i) => ({ series: s, color: params.colors[i] })).reverse();

    zipped.forEach((z) => {
        ctx.strokeStyle = z.color;

        let coords = [];
        [...Array(params.ticks + 1).keys()].forEach((n) => {
            if (n in z.series && typeof z.series[n] === "number" && isFinite(z.series[n])) {
                coords.push({ x: calc.x(n), y: calc.y(z.series[n] / params.scale - y_axis_base) });
            } else {
                draw_polyline(ctx, coords);
                coords = [];
            }
        });
    });

    ctx.restore();

    // Draw X/Y-axis labels.

    const font_style = `400 ${margin.b - 1}px "Roboto Condensed"`;
    await document.fonts.load(font_style);

    ctx.font = font_style;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";

    x_labels.forEach((label, n) => {
        if (label !== null) {
            const x = Math.round(calc.x(n)) + 0.5;
            ctx.fillText(label, x, canvas.height - margin.b + 2);
        }
    });

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    y_labels.forEach((label, n) => {
        if (n > 0 && label !== null) {
            const y = Math.round(calc.y(n)) + 0.5;
            ctx.fillText(label, margin.l - 4, y - 0.5);
        }
    });
};
