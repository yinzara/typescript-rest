import express from 'express';
import supertest from 'supertest';
import { Inject, OnlyInstantiableByContainer } from 'typescript-ioc';
import { DefaultServiceFactory, GET, Path, Server } from '../../src/typescript-rest';

Server.registerServiceFactory('typescript-rest-ioc');

@OnlyInstantiableByContainer
export class InjectableObject { }

@OnlyInstantiableByContainer
@Path('ioctest')
export class IoCService {
    @Inject
    private injectedObject: InjectableObject;

    @GET
    public test(): string {
        return (this.injectedObject) ? 'OK' : 'NOT OK';
    }
}

@Path('ioctest2')
@OnlyInstantiableByContainer
export class IoCService2 {
    @Inject
    private injectedObject: InjectableObject;

    @GET
    public test(): string {
        return (this.injectedObject) ? 'OK' : 'NOT OK';
    }
}

@Path('ioctest3')
@OnlyInstantiableByContainer
export class IoCService3 {
    private injectedObject: InjectableObject;

    constructor(@Inject injectedObject: InjectableObject) {
        this.injectedObject = injectedObject;
    }

    @GET
    public test(): string {
        return (this.injectedObject) ? 'OK' : 'NOT OK';
    }
}

@Path('ioctest4')
@OnlyInstantiableByContainer
export class IoCService4 extends IoCService2 {
}

let app: express.Application;

describe('IoC Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    afterAll(() => {
        Server.registerServiceFactory(new DefaultServiceFactory());
    });

    describe('Server integrated with typescript-ioc', () => {
        it('should use IoC container to instantiate the services', async () => {
            const response = await supertest(app).get('/ioctest');
            expect(response.text).toEqual('OK');
        });
        it('should use IoC container to instantiate the services, does not carrying about the decorators order', async () => {
            const response = await supertest(app).get('/ioctest2');
            expect(response.text).toEqual('OK');
        });
        it('should use IoC container to instantiate the services with injected params on constructor', async () => {
            const response = await supertest(app).get('/ioctest3');
            expect(response.text).toEqual('OK');
        });
        it('should use IoC container to instantiate the services with superclasses', async () => {
            const response = await supertest(app).get('/ioctest4');
            expect(response.text).toEqual('OK');
        });
    });
});

function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    Server.buildServices(restApp, IoCService, IoCService2, IoCService3, IoCService4);
    return restApp;
}
