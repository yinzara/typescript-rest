import express from 'express';
import _ from 'lodash';
import supertest from 'supertest';
import {
    Accept, AcceptLanguage, ContextAccept, ContextLanguage, GET,
    Path, POST, PUT, Return, Server
} from '../../src/typescript-rest';

export class Person {
    public id: number;
    public name: string;
    public age: number;
    public salary: number;
    constructor(id: number, name: string, age: number, salary: number = age * 1000) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.salary = salary;
    }
}

@Path('/accept')
@AcceptLanguage('en', 'pt-BR')
export class AcceptServiceTest {

    @GET
    public testLanguage(@ContextLanguage language: string): string {
        if (language === 'en') {
            return 'accepted';
        }
        return 'aceito';
    }

    @PUT
    public testLanguageChange(@ContextLanguage language: string): void {
        return;
    }

    @GET
    @AcceptLanguage('fr')
    @Path('fr')
    public testLanguageFr(@ContextLanguage language: string): string {
        if (language === 'fr') {
            return 'OK';
        }
        return 'NOT OK';
    }

    @GET
    @Path('types')
    @Accept('application/json')
    public testAccepts(@ContextAccept type: string): string {
        if (type === 'application/json') {
            return 'accepted';
        }
        return 'not accepted';
    }
}

@Path('/reference')
export class ReferenceServiceTest {
    @Path('accepted')
    @POST
    public testAccepted(p: Person): Promise<Return.RequestAccepted<void>> {
        return new Promise<Return.RequestAccepted<void>>(function (resolve, reject) {
            resolve(new Return.RequestAccepted<void>('' + p.id));
        });
    }

    @Path('moved')
    @POST
    public testMoved(p: Person): Promise<Return.MovedPermanently<void>> {
        return new Promise<Return.MovedPermanently<void>>(function (resolve, reject) {
            resolve(new Return.MovedPermanently<void>('' + p.id));
        });
    }

    @Path('movedtemp')
    @POST
    public testMovedTemp(p: Person): Promise<Return.MovedTemporarily<void>> {
        return new Promise<Return.MovedTemporarily<void>>(function (resolve, reject) {
            resolve(new Return.MovedTemporarily<void>('' + p.id));
        });
    }
}

@Path('async/test')
export class AsyncServiceTest {
    @GET
    public async test() {
        const result = await this.aPromiseMethod();
        return result;
    }

    private aPromiseMethod() {
        return new Promise<string>((resolve, reject) => {
            setTimeout(() => {
                resolve('OK');
            }, 10);
        });
    }
}

@Path('othersimplepath')
export class SimpleService {
    @GET
    public test(): string {
        return 'othersimpleservice';
    }
}

let app: express.Application;

describe('Server Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    // describe('Server', () => {
    //     it('should provide a catalog containing the exposed paths', (done) => {
    //         expect(Server.getPaths()).to.include.members(['/mypath', '/mypath2/secondpath',
    //             '/asubpath/person/:id', '/headers', '/multi-param', '/context', '/upload',
    //             '/download', '/download/ref', '/accept', '/accept/conflict', '/async/test']);
    //         expect(Server.getHttpMethods('/asubpath/person/:id')).to.have.members([HttpMethod.GET, HttpMethod.PUT]);
    //         expect(Server.getHttpMethods('/mypath2/secondpath')).to.have.members([HttpMethod.GET, HttpMethod.DELETE]);
    //         done();
    //     });
    // });

    describe('Server', () => {
        it('should choose language correctly', async () => {
            const response = await supertest(app).get('/accept')
                .set('Accept-Language', 'pt-BR');
            expect(response.text).toEqual('aceito');
        });

        it('should choose language correctly, when declared on methods', async () => {
            const response = await supertest(app).get('/accept/fr')
                .set('Accept-Language', 'fr');
            expect(response.text).toEqual('OK');
        });

        it('should reject unacceptable languages', async () => {
            const response = await supertest(app).get('/accept')
                .set('Accept-Language', 'fr');
            expect(response.status).toEqual(406);
        });

        it('should use default language if none specified', async () => {
            const response = await supertest(app).get('/accept');
            expect(response.text).toEqual('accepted');
        });

        it('should use default media type if none specified', async () => {
            const response = await supertest(app).get('/accept/types');
            expect(response.text).toEqual('accepted');
        });
        it('should reject unacceptable media types', async () => {
            const response = await supertest(app).get('/accept/types')
                .set('Accept', 'text/html');
            expect(response.status).toEqual(406);
        });

        it('should return 404 when unmapped resources are requested', async () => {
            const response = await supertest(app).get('/unmapped/resource');
            expect(response.status).toEqual(404);
        });

        it('should return 405 when a not supported method is requeted to a mapped resource', async () => {
            const response = await supertest(app).post('/accept');
            expect(response.status).toEqual(405);
            const allowed: string | Array<string> = response.headers['allow'];
            expect(allowed).toContain('GET');
            expect(allowed).toContain('PUT');
        });
        it('should support async and await on REST methods', async () => {
            const response = await supertest(app).get('/async/test');
            expect(response.text).toEqual('OK');
        });
    });

    describe('Services that use referenced types', () => {
        it('should return 202 for POST on path: /accepted', async () => {
            const response = await supertest(app).post('/reference/accepted')
                .set('content-type', 'application/json')
                .send(JSON.stringify(new Person(123, 'person 123', 35)));
            expect(response.status).toEqual(202);
            expect(response.headers['location']).toEqual('123');
        });

        it('should return 301 for POST on path: /moved', async () => {
            const response = await supertest(app).post('/reference/moved')
                .set('content-type', 'application/json')
                .send(JSON.stringify(new Person(123, 'person 123', 35)));
            expect(response.status).toEqual(301);
            expect(response.headers['location']).toEqual('123');
        });

        it('should return 302 for POST on path: /movedtemp', async () => {
            const response = await supertest(app).post('/reference/movedtemp')
                .set('content-type', 'application/json')
                .send(JSON.stringify(new Person(123, 'person 123', 35)));
            expect(response.status).toEqual(302);
            expect(response.headers['location']).toEqual('123');
        });
    });

    describe('Service classes with same name', () => {
        it('should should work when imported via loadServices', async () => {
            const response = await supertest(app).get('/simplepath');
            expect(response.status).toEqual(200);
            expect(response.text).toEqual('simpleservice');
        });
        it('should should work when imported via buildServices', async () => {
            const response = await supertest(app).get('/othersimplepath');
            expect(response.status).toEqual(200);
            expect(response.text).toEqual('othersimpleservice');
        });
    });

});


export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    // Server.setFileLimits({
    //     fieldSize: 1024 * 1024
    // });
    Server.loadControllers(restApp, ['test/data/*', '!**/*.yaml'], `${__dirname}/../..`);
    Server.buildServices(restApp, AcceptServiceTest, ReferenceServiceTest,
        AsyncServiceTest, SimpleService);
    return restApp;
}

