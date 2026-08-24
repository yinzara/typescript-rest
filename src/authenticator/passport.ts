'use strict';
import express from 'express';
import _ from 'lodash';
import passport from 'passport';
import { ServiceAuthenticator } from '../server/model/server-types';

export interface PassportAuthenticatorOptions {
    /**
     * Options passed through to passport.authenticate().
     *
     * Note that `authOptions.session` defaults to false. Passport requires a
     * session store (such as express-session) to already be mounted on the
     * router before passport.session() is used, and it throws when one is
     * missing. Set `session: true` only after mounting your own session
     * middleware.
     */
    authOptions?: passport.AuthenticateOptions;
    rolesKey?: string;
    strategyName?: string;
    serializeUser?: (user: any) => string | Promise<string>;
    deserializeUser?: (user: string) => any;
}

export class PassportAuthenticator implements ServiceAuthenticator {
    private authenticator: express.Handler;
    private options: PassportAuthenticatorOptions;

    constructor(strategy: passport.Strategy, options: PassportAuthenticatorOptions = {}) {
        this.options = options;
        const authStrategy = options.strategyName || strategy.name || 'default_strategy';
        passport.use(authStrategy, strategy);
        this.authenticator = passport.authenticate(authStrategy, this.getAuthOptions());
    }

    /**
     * The options handed to passport.authenticate(). Sessions are opt-in: passport
     * establishes a login session unless told otherwise, and doing so throws when no
     * session store is mounted on the router.
     */
    private getAuthOptions(): passport.AuthenticateOptions {
        return _.defaults({}, this.options.authOptions, { session: false });
    }

    public getMiddleware(): express.RequestHandler {
        return this.authenticator;
    }

    public getRoles(req: express.Request): Array<string> {
        const roleKey = this.options.rolesKey || 'roles';
        return _.castArray(_.get(req.user, roleKey, []));
    }

    public initialize(router: express.Router): void {
        router.use(passport.initialize());
        const useSession = this.getAuthOptions().session;
        if (useSession) {
            router.use(passport.session());
            if (this.options.serializeUser && this.options.deserializeUser) {
                passport.serializeUser((user: any, done: (a: any, b: string) => void) => {
                    Promise.resolve(this.options.serializeUser(user))
                        .then((result: string) => {
                            done(null, result);
                        }).catch((err: Error) => {
                            done(err, null);
                        });
                });
                passport.deserializeUser((user: string, done: (a: any, b: any) => void) => {
                    Promise.resolve(this.options.deserializeUser(user))
                        .then((result: any) => {
                            done(null, result);
                        }).catch((err: Error) => {
                            done(err, null);
                        });
                });
            }
        }
    }
}