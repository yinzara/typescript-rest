'use strict';

import express from 'express';
import fs from 'fs';
import _ from 'lodash';
import supertest from 'supertest';
import { Container } from 'typescript-ioc';
import {
    BodyOptions, BodyType, Context, ContextNext,
    ContextRequest, ContextResponse, CookieParam, FileParam, FormParam,
    GET, HeaderParam, Param, ParserType, Path, PathParam, POST, PUT, QueryParam, Return, Server, ServiceContext
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
export interface DataParam {
    param1: string;
    param2: Date;
}

@Path('testparams')
export class TestParamsService {
    @Context
    public context: ServiceContext;

    @HeaderParam('my-header')
    private myHeader: ServiceContext;

    @Path('people/:id')
    @GET
    public getPerson(@PathParam('id') id: number): Promise<Person> {
        return new Promise<Person>(function (resolve, reject) {
            resolve(new Person(id, `This is the person with ID = ${id}`, 35));
        });
    }

    @PUT
    @Path('/people/:id')
    public setPerson(person: Person): string {
        return JSON.stringify(person);
    }

    @POST
    @Path('/people')
    @BodyOptions({ limit: '50b' })
    public addPerson(@ContextRequest req: express.Request, person: Person): Return.NewResource<{ id: number }> {
        return new Return.NewResource<{ id: number }>(req.url + '/' + person.id, { id: person.id });
    }

    @POST
    @Path('/date')
    @BodyOptions({
        reviver: (key: string, value: any) => {
            if (key === 'param2') {
                return new Date(value);
            }
            return value;
        }
    })
    public testData(param: DataParam) {
        if ((param.param2 instanceof Date) && (param.param2.toString() === param.param1)) {
            return 'OK';
        }
        return 'NOT OK';
    }


    @GET
    @Path('/people')
    public getAll(@QueryParam('start') start: number,
        @QueryParam('size') size: number): Array<Person> {
        const result: Array<Person> = new Array<Person>();

        for (let i: number = start; i < (start + size); i++) {
            result.push(new Person(i, `This is the person with ID = ${i}`, 35));
        }
        return result;
    }

    @GET
    @Path('myheader')
    public testMyHeader(): string {
        return 'header: ' + this.myHeader;
    }

    @GET
    @Path('headers')
    public testHeaders(@HeaderParam('my-header') header: string,
        @CookieParam('my-cookie') cookie: string): string {
        return 'cookie: ' + cookie + '|header: ' + header;
    }

    @POST
    @Path('multi-param')
    public testMultiParam(@Param('param') param: string): string {
        return param;
    }

    @GET
    @Path('context')
    public testContext(@QueryParam('q') q: string,
        @ContextRequest req: express.Request,
        @ContextResponse response: express.Response,
        @ContextNext next: express.NextFunction): void {

        if (req && response && next) {
            response.status(201);
            if (q === '123') {
                response.send(true);
            }
            else {
                response.send(false);
            }
        }
    }

    @GET
    @Path('default-query')
    public testDefaultQuery(@QueryParam('limit') limit: number = 20,
        @QueryParam('prefix') prefix: string = 'default',
        @QueryParam('expand') expand: boolean = true): string {
        return `limit:${limit}|prefix:${prefix}|expand:${expand}`;
    }

    @GET
    @Path('optional-query')
    public testOptionalQuery(@QueryParam('limit') limit?: number,
        @QueryParam('prefix') prefix?: string,
        @QueryParam('expand') expand?: boolean): string {
        return `limit:${limit}|prefix:${prefix}|expand:${expand}`;
    }

    @POST
    @Path('upload')
    public testUploadFile(@FileParam('myFile') file: Express.Multer.File,
        @FormParam('myField') myField: string): boolean {
        return (file
            && (_.startsWith(file.buffer.toString(), '\'use strict\';'))
            && (myField === 'my_value'));
    }

    @GET
    @Path('download')
    public testDownloadFile(): Promise<Return.DownloadBinaryData> {
        return new Promise<Return.DownloadBinaryData>((resolve, reject) => {
            fs.readFile(__dirname + '/datatypes.spec.ts', (err, data) => {
                if (err) {
                    return reject(err);
                }
                return resolve(new Return.DownloadBinaryData(data, 'application/javascript', 'test-rest.spec.js'));
            });
        });
    }

    @Path('download/ref')
    @GET
    public testDownloadFile2(): Promise<Return.DownloadResource> {
        return new Promise<Return.DownloadResource>((resolve, reject) => {
            resolve(new Return.DownloadResource(__dirname + '/datatypes.spec.ts', 'test-rest.spec.js'));
        });
    }

    @Path('stringbody')
    @POST
    @BodyType(ParserType.text)
    public async testStringBody(data: string) {
        return data;
    }

    @Path('stringbodytype')
    @POST
    @BodyType(ParserType.text)
    @BodyOptions({ type: 'text/myformat' })
    public async testStringWithTypeBody(data: string) {
        return data;
    }

    @Path('rawbody')
    @POST
    @BodyType(ParserType.raw)
    @BodyOptions({ type: 'text/plain' })
    public async testRawBody(data: Buffer) {
        return Buffer.isBuffer(data);
    }
}

@Path('testreturn')
export class TestReturnService {

    @GET
    @Path('noresponse')
    public testNoResponse() {
        return Return.NoResponse;
    }

    @GET
    @Path('empty')
    public testEmptyObjectResponse() {
        return {};
    }

    @POST
    @Path('/externalmodule')
    public testExternal(@ContextRequest req: express.Request): Return.NewResource<Container> {
        const result = new Return.NewResource<Container>(req.url + '/123');
        result.body = new Container();
        return result;
    }
}

let app: express.Application;

describe('Data Types Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    describe('Services that handle Objects', () => {
        it('should be able to return Objects as JSON', async () => {
            const response = await supertest(app).get('/testparams/people/123');
            const result: Person = JSON.parse(response.text);
            expect(result.id).toEqual(123);
        });

        it('should be able to receive parametes as Objects', async () => {
            const person = new Person(123, 'Person 123', 35);
            const response = await supertest(app).put('/testparams/people/123')
                .set('content-type', 'application/json')
                .send(JSON.stringify(person));
            const receivedPerson = JSON.parse(response.text);
            expect(receivedPerson).toEqual(person);
        });

        it('should be able to return an array of Objects', async () => {
            const response = await supertest(app).get('/testparams/people?start=0&size=3');
            const result: Array<Person> = JSON.parse(response.text);
            expect(result.length).toEqual(3);
        });

        it('should be able to receive objects that follow size constraints', async () => {
            const response = await supertest(app).post('/testparams/people')
                .set('content-type', 'application/json')
                .send(JSON.stringify(new Person(123, 'person', 35)));
            expect(response.status).toEqual(201);
            expect(response.headers['location']).toEqual('/testparams/people/123');
            const result: Person = JSON.parse(response.text);
            expect(result.id).toEqual(123);
        });

        it('should be able to reject objects that do not follow size constraints', async () => {
            const response = await supertest(app).post('/testparams/people')
                .set('content-type', 'application/json')
                .send(JSON.stringify(new Person(123,
                    'this is a very large payload that should be rejected', 35)));
            expect(response.status).toEqual(413);
        });

        it('should be able to send a Date into a json object ', async () => {
            const date = new Date();
            const response = await supertest(app).post('/testparams/date')
                .send({
                    param1: date.toString(),
                    param2: date
                });
            expect(response.text).toEqual('OK');
        });
    });

    describe('A rest Service', () => {
        it('should parse header and cookies correclty', async () => {
            const response = await supertest(app).get('/testparams/headers')
                .set('my-header', 'header value')
                .set('Cookie', 'my-cookie=cookie value');
            expect(response.text).toEqual('cookie: cookie value|header: header value');
        });

        it('should read parameters as class property', async () => {
            const response = await supertest(app).get('/testparams/myheader')
                .set('my-header', 'header value');
            expect(response.text).toEqual('header: header value');
        });

        it('should parse multi param as query param', async () => {
            const response = await supertest(app).post('/testparams/multi-param?param=myQueryValue');
            expect(response.text).toEqual('myQueryValue');
        });

        it('should parse multi param as form param', async () => {
            const form = {
                'param': 'formParam'
            };
            const response = await supertest(app).post('/testparams/multi-param')
                .type('form')
                .send(form);
            expect(response.text).toEqual('formParam');
            expect(response.status).toEqual(200);
        });

        it('should accept Context parameters', async () => {
            const response = await supertest(app).get('/testparams/context?q=123');
            expect(response.text).toEqual('true');
            expect(response.status).toEqual(201);
        });

        it('should accept file parameters', async () => {
            const response = await supertest(app).post('/testparams/upload')
                .field('myField', 'my_value')
                .attach('myFile', __dirname + '/datatypes.spec.ts', 'test-rest.spec.ts');
            expect(response.text).toEqual('true');
            expect(response.status).toEqual(200);
        });

        it('should use sent value for query param that defines a default', async () => {
            const response = await supertest(app).get('/testparams/default-query?limit=5&prefix=test&expand=false');
            expect(response.text).toEqual('limit:5|prefix:test|expand:false');
        });

        it('should use provided default value for missing query param', async () => {
            const response = await supertest(app).get('/testparams/default-query');
            expect(response.text).toEqual('limit:20|prefix:default|expand:true');
        });

        it('should handle empty string value for default parameter', async () => {
            const response = await supertest(app).get('/testparams/default-query?limit=&prefix=&expand=');
            expect(response.text).toEqual('limit:NaN|prefix:|expand:false');
        });

        it('should use sent value for optional query param', async () => {
            const response = await supertest(app).get('/testparams/optional-query?limit=5&prefix=test&expand=false');
            expect(response.text).toEqual('limit:5|prefix:test|expand:false');
        });

        it('should use undefined as value for missing optional query param', async () => {
            const response = await supertest(app).get('/testparams/optional-query');
            expect(response.text).toEqual('limit:undefined|prefix:undefined|expand:undefined');
        });

        it('should handle empty string value for optional parameter', async () => {
            const response = await supertest(app).get('/testparams/optional-query?limit=&prefix=&expand=');
            expect(response.text).toEqual('limit:NaN|prefix:|expand:false');
        });
    });
    describe('Download Service', () => {
        it('should return a file', async () => {
            const response = await supertest(app).get('/testparams/download');
            expect(response.headers['content-type']).toEqual('application/javascript');
            expect(_.startsWith(response.text.toString(), '\'use strict\';')).toEqual(true);
        });
        it('should return a referenced file', async () => {
            const response = await supertest(app).get('/testparams/download/ref')
                .buffer(true);
            expect(_.startsWith(response.body.toString(), '\'use strict\';')).toEqual(true);
        });
    });

    describe('Raw Body Service', () => {
        it('should accept a string as a body', async () => {
            const data = '1;2;3;4;\n5;6;7;8;\n9;10;11;12;';
            const response = await supertest(app).post('/testparams/stringbody')
                .set('content-type', 'text/plain')
                .send(data);
            expect(response.text).toEqual(data);
        });

        it('should accept a buffer as a body', async () => {
            const data = Buffer.from('1;2;3;4;\n5;6;7;8;\n9;10;11;12;');
            const response = await supertest(app).post('/testparams/rawbody')
                .set('content-type', 'text/plain')
                .send(data);
            expect(response.text).toEqual('true');
        });

        it('should accept a string as a body with custom mediatype', async () => {
            const data = '1;2;3;4;\n5;6;7;8;\n9;10;11;12;';
            const response = await supertest(app).post('/testparams/stringbodytype')
                .set('content-type', 'text/myformat')
                .send(data);
            expect(response.text).toEqual(data);
        });

        it('should accept a string as a body with custom mediatype', async () => {
            const data = '1;2;3;4;\n5;6;7;8;\n9;10;11;12;';
            const response = await supertest(app).post('/testparams/stringbodytype')
                .set('content-type', 'text/plain')
                .send(data);
            expect(response.text).toEqual('');
            expect(response.status).toEqual(204);
        });
    });

    describe('No Response Service', () => {
        it('should not send a value when NoResponse is returned', async () => {
            const response = await supertest(app).get('/testreturn/noresponse');
            expect(response.text).toEqual('handled by middleware');
        });
        it('should not be handled as an empty object', async () => {
            const response = await supertest(app).get('/testreturn/empty');
            const val = JSON.parse(response.text);
            expect(Object.keys(val)).toHaveLength(0);
        });
    });

    describe('NewResource return type', () => {
        it('should handle types referenced from other modules', async () => {
            const response = await supertest(app).post('/testreturn/externalmodule');
            expect(response.status).toEqual(201);
            expect(response.headers.location).toEqual('/testreturn/externalmodule/123');
        });
    });

    describe('Param Converters', () => {
        it('should intercept parameters', async () => {
            Server.addParameterConverter((param: Person) => {
                if (param.salary === 424242) {
                    param.salary = 434343;
                }
                return param;
            }, Person);
            const person = new Person(123, 'Person 123', 35, 424242);
            const response = await supertest(app).put('/testparams/people/123')
                .set('content-type', 'application/json')
                .send(JSON.stringify(person));
            const receivedPerson = JSON.parse(response.text);
            expect(receivedPerson.salary).toEqual(434343);
            Server.removeParameterConverter(Person);
        });
    });



});


export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    Server.buildServices(restApp, TestParamsService, TestReturnService);
    restApp.use('/testreturn', (req, res, next) => {
        if (!res.headersSent) {
            res.send('handled by middleware');
        }
    });
    return restApp;
}

export function stopApi() {
    if (server) {
        server.close();
    }
}