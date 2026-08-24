import express from 'express';
import _ from 'lodash';
import supertest from 'supertest';
import { Abstract, Context, GET, HttpMethod, Path, PathParam, PUT, Server, ServiceContext } from '../../src/typescript-rest';

@Path('/pathtest')
export class PathTestService {
    @GET
    public test(): string {
        return 'OK';
    }
}
export class PathOnlyOnMethodTestService {
    @GET
    @Path('methodpath')
    public test(): string {
        return 'OK';
    }
}

@Path('pathtest2')
export class SubPathTestService {
    @GET
    public test(): string {
        return 'OK';
    }

    @GET
    @Path('secondpath')
    public test2(): string {
        return 'OK';
    }
}
@Abstract
export abstract class BaseApi {
    @Context
    protected context: ServiceContext;

    @GET
    @Path(':id')
    public testCrudGet(@PathParam('id') id: string) {
        if (this.context) {
            return 'OK_' + id;
        }
        return 'false';
    }

    @Path('overload/:id')
    @GET
    public testOverloadGet(@PathParam('id') id: string) {
        if (this.context) {
            return 'OK_' + id;
        }
        return 'false';
    }

    @PUT
    @Path('overload/:id')
    public testOverloadPut(@PathParam('id') id: string) {
        if (this.context) {
            return 'OK_' + id;
        }
        return 'false';
    }
}
@Path('superclasspath')
export class SuperClassService extends BaseApi {
    @GET
    @Path('overload/:id')
    public testOverloadGet(@PathParam('id') id: string) {
        if (this.context) {
            return 'superclass_OK_' + id;
        }
        return 'false';
    }

    @Path('overload/:id')
    @PUT
    public testOverloadPut(@PathParam('id') id: string) {
        if (this.context) {
            return 'superclass_OK_' + id;
        }
        return 'false';
    }
}

let app: express.Application;

describe('Paths Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    describe('Server', () => {
        it('should provide a catalog containing the exposed paths', () => {
            expect(Server.getPaths()).toContain('/pathtest');
            expect(Server.getPaths()).toContain('/pathtest2');
            expect(Server.getPaths()).toContain('/methodpath');
            expect(Server.getPaths()).toContain('/pathtest2/secondpath');
            expect(Server.getPaths()).toContain('/superclasspath/overload/:id');
            expect(Server.getPaths()).toContain('/pathtest');
            expect(Server.getPaths()).not.toContain('/overload/:id');
            expect(Server.getHttpMethods('/pathtest')).toContain(HttpMethod.GET);
            expect(Server.getHttpMethods('/pathtest2/secondpath')).toContain(HttpMethod.GET);
            expect(Server.getHttpMethods('/superclasspath/overload/:id')).toContain(HttpMethod.GET);
            expect(Server.getHttpMethods('/superclasspath/overload/:id')).toContain(HttpMethod.PUT);
        });
    });

    describe('Path Annotation', () => {
        it('should configure a path', async () => {
            const response = await supertest(app).get('/pathtest');
            expect(response.text).toEqual('OK');
        });
        it('should configure a path without an initial /', async () => {
            const response = await supertest(app).get('/pathtest2');
            expect(response.text).toEqual('OK');
        });
        it('should be able to build a composed path bwetween class and method', async () => {
            const response = await supertest(app).get('/pathtest2/secondpath');
            expect(response.text).toEqual('OK');
        });
        it('should be able to register services with present only on methods of a class', async () => {
            const response = await supertest(app).get('/methodpath');
            expect(response.text).toEqual('OK');
        });
    });

    describe('Service on Subclass', () => {
        it('should return OK when calling a method of its super class', async () => {
            const response = await supertest(app).get('/superclasspath/123');
            expect(response.text).toEqual('OK_' + 123);
        });

        it('should return OK when calling an overloaded method of its super class', async () => {
            const response = await supertest(app).get('/superclasspath/overload/123');
            expect(response.text).toEqual('superclass_OK_' + 123);
        });
        it('should return OK when calling an overloaded PUT method of its super class', async () => {
            const response = await supertest(app).put('/superclasspath/overload/123');
            expect(response.text).toEqual('superclass_OK_' + 123);
        });
    });
});

export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    Server.buildServices(restApp, PathTestService, PathOnlyOnMethodTestService,
        SubPathTestService, SuperClassService);
    return restApp;
}

