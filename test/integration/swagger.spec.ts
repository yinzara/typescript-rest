import express from 'express';
import fs from 'fs';
import _ from 'lodash';
import supertest from 'supertest';
import YAML from 'yaml';
import { Server } from '../../src/typescript-rest';

let swaggerFile: any;
let app: express.Application;

describe('Swagger Tests', () => {

    beforeAll(() => {
        app = startApi();
    });

    describe('Api Docs', () => {
        it('should be able to send the YAML API swagger file', async () => {
            const response = await supertest(app).get('/api-docs/yaml');
            const swaggerDocument: any = YAML.parse(response.text);
            const expectedSwagger = _.cloneDeep(swaggerFile);
            expectedSwagger.host = 'localhost:5674';
            expectedSwagger.schemes = ['http'];
            expect(expectedSwagger).toEqual(swaggerDocument);
        });
        it('should be able to send the JSON API swagger file', async () => {
            const response = await supertest(app).get('/api-docs/json');
            const swaggerDocument: any = JSON.parse(response.text);
            expect(swaggerDocument.basePath).toEqual('/v1');
        });
    });
});

export function startApi(): express.Application {
    const restApp: express.Application = express();
    restApp.set('env', 'test');
    swaggerFile = YAML.parse(fs.readFileSync('./test/data/swagger.yaml', 'utf8'));
    Server.swagger(restApp, {
        endpoint: 'api-docs',
        filePath: './test/data/swagger.yaml',
        host: 'localhost:5674',
        schemes: ['http']
    });
    return restApp;
}