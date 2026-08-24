import express from 'express';
import supertest from 'supertest';
import { Errors, GET, Path, Server } from '../../src/typescript-rest';

@Path('errors')
export class ErrorService {
    @Path('badrequest')
    @GET
    public test1(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.BadRequestError());
        });
    }

    @Path('conflict')
    @GET
    public test2(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.ConflictError());
        });
    }

    @Path('forbiden')
    @GET
    public test3(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.ForbiddenError());
        });
    }

    @Path('gone')
    @GET
    public test4(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.GoneError());
        });
    }

    @Path('internal')
    @GET
    public test5(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.InternalServerError());
        });
    }

    @Path('method')
    @GET
    public test6(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.MethodNotAllowedError());
        });
    }

    @Path('notacceptable')
    @GET
    public test7(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.NotAcceptableError());
        });
    }

    @Path('notfound')
    @GET
    public test8(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.NotFoundError());
        });
    }

    @Path('notimplemented')
    @GET
    public test9(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.NotImplementedError());
        });
    }

    @Path('unauthorized')
    @GET
    public test10(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.UnauthorizedError());
        });
    }

    @Path('unsupportedmedia')
    @GET
    public test11(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.UnsupportedMediaTypeError());
        });
    }

    @Path('unprocessableentity')
    @GET
    public test12(p: string): Promise<string> {
        return new Promise<string>(function (resolve, reject) {
            reject(new Errors.UnprocessableEntityError());
        });
    }

    @GET
    @Path('sync/badrequest')
    public test13(p: string): Promise<string> {
        throw new Errors.BadRequestError();
    }
}

let app: express.Application;

describe('Errors Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    describe('Error Service', () => {
        it('should be able to send 400', async () => {
            const response = await supertest(app).get('/errors/badrequest');
            expect(response.status).toEqual(400);
        });
        it('should be able to send 400', async () => {
            const response = await supertest(app).get('/errors/sync/badrequest');
            expect(response.status).toEqual(400);
        });
        it('should be able to send 409', async () => {
            const response = await supertest(app).get('/errors/conflict');
            expect(response.status).toEqual(409);
        });
        it('should be able to send 403', async () => {
            const response = await supertest(app).get('/errors/forbiden');
            expect(response.status).toEqual(403);
        });
        it('should be able to send 410', async () => {
            const response = await supertest(app).get('/errors/gone');
            expect(response.status).toEqual(410);
        });
        it('should be able to send 500', async () => {
            const response = await supertest(app).get('/errors/internal');
            expect(response.status).toEqual(500);
        });
        it('should be able to send 405', async () => {
            const response = await supertest(app).get('/errors/method');
            expect(response.status).toEqual(405);
        });
        it('should be able to send 406', async () => {
            const response = await supertest(app).get('/errors/notacceptable');
            expect(response.status).toEqual(406);
        });
        it('should be able to send 404', async () => {
            const response = await supertest(app).get('/errors/notfound');
            expect(response.status).toEqual(404);
        });
        it('should be able to send 501', async () => {
            const response = await supertest(app).get('/errors/notimplemented');
            expect(response.status).toEqual(501);
        });
        it('should be able to send 401', async () => {
            const response = await supertest(app).get('/errors/unauthorized');
            expect(response.status).toEqual(401);
        });
        it('should be able to send 415', async () => {
            const response = await supertest(app).get('/errors/unsupportedmedia');
            expect(response.status).toEqual(415);
        });

        it('should be able to send 422', async () => {
            const response = await supertest(app).get('/errors/unprocessableentity');
            expect(response.status).toEqual(422);
        });
    });
});

export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    Server.buildServices(restApp, ErrorService);
    return restApp;
}
