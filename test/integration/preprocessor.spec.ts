import express from 'express';
import _ from 'lodash';
import supertest from 'supertest';
import { ContextRequest, Errors, Path, POST, PreProcessor, Server } from '../../src/typescript-rest';

@Path('preprocessor')
@PreProcessor(preprocessor1)
export class PreprocessedService {
    @ContextRequest
    public request: PreprocessedRequest;

    @Path('test')
    @POST
    @PreProcessor(preprocessor2)
    public test(body: any) {
        return this.request.preprocessor1 && this.request.preprocessor2;
    }

    @Path('asynctest')
    @POST
    @PreProcessor(asyncPreprocessor1)
    @PreProcessor(asyncPreprocessor2) // multiple preprocessors needed to test async
    public asynctest(body: any) {
        return this.request.preprocessor1 && (!this.request.preprocessor2) &&
            this.request.asyncPreproocessor1 && this.request.asyncPreproocessor2;
    }
}

function preprocessor1(req: PreprocessedRequest) {
    if (!req.body.valid) {
        throw new Errors.BadRequestError();
    }
    req.preprocessor1 = true;
}

function preprocessor2(req: PreprocessedRequest) {
    req.preprocessor2 = true;
}

async function asyncPreprocessor1(req: PreprocessedRequest) {
    if (!req.body.asyncValid) {
        throw new Errors.BadRequestError();
    }
    req.asyncPreproocessor1 = true;
}

async function asyncPreprocessor2(req: PreprocessedRequest) {
    req.asyncPreproocessor2 = true;
}

interface PreprocessedRequest extends express.Request {
    preprocessor1: boolean;
    preprocessor2: boolean;
    asyncPreproocessor1: boolean;
    asyncPreproocessor2: boolean;
}

let app: express.Application;

describe('Preprocessor Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    describe('Synchronous Preprocessors', () => {
        it('should validate before handling the request', async () => {
            const response = await supertest(app).post('/preprocessor/test')
                .set('content-type', 'application/json')
                .send(JSON.stringify({ valid: true }));
            expect(response.text).toEqual('true');
        });
        it('should fail validation when body is invalid', async () => {
            const response = await supertest(app).post('/preprocessor/test')
                .set('content-type', 'application/json')
                .send(JSON.stringify({}));
            expect(response.status).toEqual(400);
        });
    });

    describe('Assynchronous Preprocessors', () => {
        it('should validate before handling the request', async () => {
            const response = await supertest(app).post('/preprocessor/asynctest')
                .set('content-type', 'application/json')
                .send(JSON.stringify({ valid: true, asyncValid: true }));
            expect(response.text).toEqual('true');
        });
        it('should fail validation when body is invalid', async () => {
            const response = await supertest(app).post('/preprocessor/asynctest')
                .set('content-type', 'application/json')
                .send(JSON.stringify({ valid: true }));
            expect(response.status).toEqual(400);
        });
    });
});


export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    Server.buildServices(restApp, PreprocessedService);
    return restApp;
}
