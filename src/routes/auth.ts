// Copyright (c) 2021 Akira Miyakoda
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { Router } from "express";
import passport from "passport";
import { OAuth2Strategy as GoogleStrategy, VerifyFunction } from "passport-google-oauth";
import { config } from "../config";
import { model_users } from "../models/users";

interface AuthenticatedUser {
    user_id: number;
}

const is_authenticated_user = (u: any): u is AuthenticatedUser => typeof u?.user_id === "number";

passport.serializeUser((user, done) => {
    if (is_authenticated_user(user)) {
        done(null, { user_id: user.user_id });
    } else {
        done(null, null);
    }
});

passport.deserializeUser((user, done) => {
    if (is_authenticated_user(user)) {
        done(null, { user_id: user.user_id });
    } else {
        done(null, null);
    }
});

const authenticate = async (provider: string, id: string, done: VerifyFunction) => {
    const user_id = await model_users.authenticate(provider, id);
    if (user_id !== null) {
        done(null, { user_id: user_id });
    } else {
        done(null, null);
    }
};

passport.use(
    new GoogleStrategy(config.get_oauth2_options("google"), (_1, _2, profile, done) => {
        authenticate("google", profile.id, done);
    })
);

const router = Router();

router.use(passport.initialize());
router.use(passport.session());

router.get(
    "/auth/google",
    passport.authenticate("google", {
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ],
    })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        successRedirect: "/",
        failureRedirect: "/auth/signin",
        session: true,
    })
);

router.get("/auth/signin", (_, res) => {
    res.render("signin", { title_suffix: " - Sign in" });
});

router.get("/auth/signout", (req, res, next) => {
    try {
        req.session.destroy(() => {
            req.logout();
            res.redirect("/auth/signin");
        });
    } catch {
        next();
    }
});

export const route_auth = router;
