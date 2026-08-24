import express from 'express';
import supertest from 'supertest';
import { Path, POST, PostProcessor, Server } from '../../src/typescript-rest';

@Path('postprocessor')
@PostProcessor(postprocessor1)
export class PostProcessedService {
    @Path('test')
    @POST
    @PostProcessor(postprocessor2)
    public test() {
        return 'OK';
    }

    @Path('asynctest')
    @POST
    @PostProcessor(asyncPostprocessor1)
    @PostProcessor(asyncPostprocessor2) // multiple postprocessors needed to test async
    public asynctest() {
        return 'OK';
    }
}

function postprocessor1(req: express.Request, res: express.Response) {
    res.setHeader('x-postprocessor1', '1');
}

function postprocessor2(req: express.Request, res: express.Response) {
    res.setHeader('x-postprocessor2', '1');
}

async function asyncPostprocessor1(req: express.Request, res: express.Response) {
    res.setHeader('x-asyncpostprocessor1', '1');
}

async function asyncPostprocessor2(req: express.Request, res: express.Response) {
    res.setHeader('x-asyncpostprocessor2', '1');
}

let app: express.Application;

describe('Postprocessor Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    describe('Synchronous Postrocessors', () => {
        it('should run after handling the request', async () => {
            const response = await supertest(app)
                .post('/postprocessor/test')
                    .set('content-type', 'application/json');
            expect(response.headers['x-postprocessor1']).toEqual('1');
            expect(response.headers['x-postprocessor2']).toEqual('1');
        });
    });

    describe('Assynchronous Postprocessors', () => {
        it('should run after handling the request', async () => {
            const response = await supertest(app)
                .post('/postprocessor/asynctest')
                    .set('content-type', 'application/json');
            expect(response.headers['x-postprocessor1']).toEqual('1');
            expect(response.headers['x-asyncpostprocessor1']).toEqual('1');
            expect(response.headers['x-asyncpostprocessor2']).toEqual('1');
        });
    });
});

function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    Server.buildServices(restApp, PostProcessedService);
    return restApp;
}