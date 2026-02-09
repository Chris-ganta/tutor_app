import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { getPool, storage } from "./storage.js";
import { User } from "./schema.js";

export function setupAuth(app: Express) {
    const PostgresqlStore = pgSession(session);
    const sessionStore = new PostgresqlStore({
        pool: getPool(),
        createTableIfMissing: true,
    });

    app.use(
        session({
            store: sessionStore,
            secret: process.env.SESSION_SECRET || "super secret session secret",
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            },
        })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID || "",
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
                callbackURL: "/auth/google/callback",
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const googleId = profile.id;
                    const email = profile.emails?.[0]?.value;
                    const name = profile.displayName;
                    const picture = profile.photos?.[0]?.value;

                    if (!email) {
                        return done(new Error("No email found in Google profile"));
                    }

                    let user = await storage.getUserByGoogleId(googleId);

                    if (!user) {
                        user = await storage.createUser({
                            googleId,
                            email,
                            name,
                            picture,
                        });
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err as Error);
                }
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
}
