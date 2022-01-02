// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Router } from "express";
import { Controller_WebApp as Controller } from "../controllers/webapp";
import { API_V1 } from "./webapp";

const router = Router();

router.get("/", async (req, res) => {
    if (new Controller().authenticate(req)) {
        res.render("index", { title_suffix: "", api_v1: API_V1 });
    } else {
        res.redirect("/auth/signin");
    }
});

export const route_root = router;
