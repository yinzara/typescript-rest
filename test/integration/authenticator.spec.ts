import express from 'express';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import supertest from 'supertest';
import { Context, GET, PassportAuthenticator, Path, POST, PUT, Security, Server, ServiceContext } from '../../src/typescript-rest';


@Path('authorization')
@Security()
export class AuthenticatePath {
    @Context
    public context: ServiceContext;

    @GET
    public test(): Express.User {
        return this.context.request.user;
    }
}

@Path('authorization/with/role')
@Security('ROLE_ADMIN')
export class AuthenticateRole {
    @Context
    public context: ServiceContext;

    @GET
    public test(): Express.User {
        return this.context.request.user;
    }
}

@Path('authorization/secondAuthenticator')
@Security('ROLE_ADMIN', 'secondAuthenticator')
export class MultipleAuthenticateRole {
    @Context
    public context: ServiceContext;

    @GET
    public test(): Express.User {
        return this.context.request.user;
    }
}

@Path('authorization/without/role')
@Security('ROLE_NOT_EXISTING')
export class AuthenticateWithoutRole {
    @Context
    public context: ServiceContext;

    @GET
    public test(): Express.User {
        return this.context.request.user;
    }
}


@Path('/authorization/methods')
export class AuthenticateMethods {
    @Context
    public context: ServiceContext;

    @GET
    @Path('public')
    public test(): string {
        return 'OK';
    }

    @POST
    @Path('profile')
    @Security(['ROLE_ADMIN', 'ROLE_USER'])
    public test3(): Express.User {
        return this.context.request.user;
    }

    @GET
    @Path('profile')
    public test2(): string {
        return 'OK';
    }

    @PUT
    @Path('profile')
    @Security('ROLE_NOT_EXISTING')
    public test4(): Express.User {
        return this.context.request.user;
    }
}

let app: express.Application;

describe('Authenticator Tests', () => {
    beforeAll(() => {
        app = startApi();
    });

    describe('Authorization', () => {
        it('should not authorize without header', async () => {
            const response = await supertest(app).get('/authorization');
            expect(response.status).toEqual(401);
            expect(response.text).toEqual('Unauthorized');
        });
        it('should not authorize with wrong token', async () => {
            const response = await supertest(app).get('/authorization')
            .set('Authorization', 'Bearer xx');
            expect(response.status).toEqual(401);
            expect(response.text).toEqual('Unauthorized');
        });
        it('should authorize with header', async () => {
            const response = await supertest(app).get('/authorization')
            .set('Authorization', `Bearer ${generateJwt()}`);
            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toMatchObject({ username: 'admin' });
        });
    });

    describe('Authorization with role', () => {
        it('should not authorize without header', async () => {
            const response = await supertest(app).get('/authorization/with/role');
            expect(response.status).toEqual(401);
            expect(response.text).toEqual('Unauthorized');
        });
        it('should not authorize with wrong token', async () => {
            const response = await supertest(app).get('/authorization/with/role')
            .set('Authorization', 'Bearer xx');
            expect(response.status).toEqual(401);
            expect(response.text).toEqual('Unauthorized');
        });
        it('should authorize with header', async () => {
            const response = await supertest(app).get('/authorization/with/role')
            .set('Authorization', `Bearer ${generateJwt()}`);
            expect(response.status).toEqual(200);
            const user = JSON.parse(response.text);
            expect(user).toMatchObject({ username: 'admin' });
            expect(user).toMatchObject({ strategy: 'default' });
        });
    });

    describe('Multiple Authorizations registered', () => {
        it('should authorize with the correct autorization', async () => {
            const response = await supertest(app).get('/authorization/secondAuthenticator')
            .set('Authorization', `Bearer ${generateJwt()}`);
            expect(response.status).toEqual(200);
            const user = JSON.parse(response.text);
            expect(user).toMatchObject({ username: 'admin' });
            expect(user).toMatchObject({ strategy: 'second' });
        });
    });

    describe('Authorization without role', () => {
        it('should not authorize without header', async () => {
            const response = await supertest(app).get('/authorization/without/role');
            expect(response.status).toEqual(401);
            expect(response.text).toEqual('Unauthorized');
        });
        it('should not authorize with wrong token', async () => {
            const response = await supertest(app).get('/authorization/without/role')
            .set('Authorization', 'Bearer xx');
            expect(response.status).toEqual(401);
            expect(response.text).toEqual('Unauthorized');
        });
        it('should not authorize with header and without appropiate role', async () => {
            const response = await supertest(app).get('/authorization/without/role')
            .set('Authorization', `Bearer ${generateJwt()}`);
            expect(response.status).toEqual(403);
        });
    });

    describe('Authorization for methods', () => {
        it('should work in "public" methods', async () => {
            const response = await supertest(app).get('/authorization/methods/public');
            expect(response.status).toEqual(200);
            expect(response.text).toEqual('OK');
        });
        it('should not authorize without header', async () => {
            const response = await supertest(app).post('/authorization/methods/profile');
            expect(response.status).toEqual(401);
        });
        it('should not authorize with wrong token', async () => {
            const response = await supertest(app).post('/authorization/methods/profile')
            .set('Authorization', 'Bearer xx');
            expect(response.status).toEqual(401);
        });
        it('should authorize with header', async () => {
            const response = await supertest(app).post('/authorization/methods/profile')
            .set('Authorization', `Bearer ${generateJwt()}`);
            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toMatchObject({ username: 'admin' });
        });
        it('should authorize in GET method', async () => {
            const response = await supertest(app).get('/authorization/methods/profile');
            expect(response.status).toEqual(200);
            expect(response.text).toEqual('OK');
        });
        it('should not authorize in PUT method', async () => {
            const response = await supertest(app).put('/authorization/methods/profile')
            .set('Authorization', `Bearer ${generateJwt()}`);
            expect(response.status).toEqual(403);
        });
    });
});

const JWT_SECRET: string = 'some-jwt-secret';

const jwtConfig: StrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: Buffer.from(JWT_SECRET, 'base64'),
};

interface JwtUser {
    username: string;
    roles: Array<string>;
    strategy: string;
}

interface JwtUserPayload {
    sub: string;
    auth: string;
}

function configureAuthenticator() {
    const strategy = new Strategy(jwtConfig, (payload: JwtUserPayload, done: (a: null, b: JwtUser) => void) => {
        const user: JwtUser = {
            roles: payload.auth.split(','),
            strategy: 'default',
            username: payload.sub
        };
        done(null, user);
    });

    const secondStrategy = new Strategy(jwtConfig, (payload: JwtUserPayload, done: (a: null, b: JwtUser) => void) => {
        const user: JwtUser = {
            roles: payload.auth.split(','),
            strategy: 'second',
            username: payload.sub
        };
        done(null, user);
    });

    Server.registerAuthenticator(new PassportAuthenticator(strategy, {
        deserializeUser: (user: string) => JSON.parse(user),
        serializeUser: (user: JwtUser) => {
            return JSON.stringify(user);
        }
    }));
    Server.registerAuthenticator(new PassportAuthenticator(secondStrategy, {
        deserializeUser: (user: string) => JSON.parse(user),
        serializeUser: (user: JwtUser) => {
            return JSON.stringify(user);
        },
        strategyName: 'secondAuthenticator'
    }), 'secondAuthenticator');
}

function generateJwt() {
    const user = { sub: 'admin', auth: 'ROLE_ADMIN,ROLE_USER' };
    return jwt.sign(user, Buffer.from(JWT_SECRET, 'base64'), { algorithm: 'HS512' });
}


export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    configureAuthenticator();
    Server.buildServices(restApp, AuthenticatePath, AuthenticateRole,
        AuthenticateWithoutRole, AuthenticateMethods, MultipleAuthenticateRole);
    return restApp;
}

export function stopApi() {
    if (server) {
        server.close();
    }
}