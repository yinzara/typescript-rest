import express from 'express';
import supertest from 'supertest';
import { GET, IgnoreNextMiddlewares, Path, Server } from '../../src/typescript-rest';

@Path('/ignoreEndpoint')
export class EndpointTestService {
    @GET
    @Path('/withoutMiddlewares')
    @IgnoreNextMiddlewares
    public test(): string {
        return 'OK';
    }

    @GET
    @Path('/withMiddlewares')
    public testWithAllMiddlewares(): string {
        return 'OK';
    }
}

let middlewareCalled: boolean;
let app: express.Application;

describe('Customized Endpoint Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    beforeEach(() => {
        middlewareCalled = false;
    });

    describe('@IgnoreNexts Decorator', () => {
        it('should make the server ignore next middlewares (does not call next())', async () => {
            const response = await supertest(app).get('/ignoreEndpoint/withoutMiddlewares');
            expect(response.text).toEqual('OK');
            expect(middlewareCalled).toBeFalsy();
        });

        it('should not prevent the server to call next middlewares for sibbling methods', async () => {
            const response = await supertest(app).get('/ignoreEndpoint/withMiddlewares');
            expect(response.text).toEqual('OK');
            expect(middlewareCalled).toBeTruthy();
        });
    });

    describe('Server.ignoreNextMiddlewares', () => {
        beforeAll(() => {
            Server.ignoreNextMiddlewares(true);
        });

        afterAll(() => {
            Server.ignoreNextMiddlewares(false);
        });

        it('should make the server ignore next middlewares for all services', async () => {
            const response = await supertest(app).get('/ignoreEndpoint/withMiddlewares');
            expect(response.text).toEqual('OK');
            expect(middlewareCalled).toBeFalsy();
        });
    });

});

export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    Server.buildServices(restApp, EndpointTestService);

    restApp.use((req, res, next) => {
        middlewareCalled = true;
        next();
    });
    return restApp;
}
