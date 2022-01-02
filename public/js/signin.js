// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    document.querySelectorAll("button.social-signin").forEach((button) => {
        button.addEventListener("click", () => {
            location.replace(`/auth/${button.getAttribute("data-provider")}`);
        });
    });
});
