jest.mock('passport');

import _ from 'lodash';
import { PassportAuthenticator } from '../../src/authenticator/passport';
import passport from 'passport';

const wait = (ms: number = 0) => new Promise<void>(resolve => setTimeout(resolve, ms));

const expressStub: any = 
{
    use: jest.fn()
};
const authenticate = passport.authenticate as jest.Mock;
const deserializeUser = passport.deserializeUser as jest.Mock;
const initialize = passport.initialize as jest.Mock;
const serializeUser = passport.serializeUser as jest.Mock;
const session = passport.session as jest.Mock;
const use = passport.use as jest.Mock;

describe('PassportAuthenticator', () => {
    const testStrategy: any = { name: 'test-strategy' };
    const authenticator = jest.fn();
    const initializer = jest.fn();
    const sessionHandler = jest.fn();

    beforeEach(() => {

        authenticate.mockReturnValue(authenticator);
        initialize.mockReturnValue(initializer);
        session.mockReturnValue(sessionHandler);
    });

    afterEach(() => {
        authenticate.mockClear();
        deserializeUser.mockClear();
        initialize.mockClear();
        serializeUser.mockClear();
        session.mockClear();
        use.mockClear();
        expressStub.use.mockClear();
    });

    it('should be able to create a simple authenticator with a given passport strategy', async () => {
        const auth: any = new PassportAuthenticator(testStrategy);

        expect(Object.keys(auth.options)).toHaveLength(0);
        expect(use).toHaveBeenCalledWith(testStrategy.name, testStrategy);
        expect(use).toHaveBeenCalledTimes(1);
        expect(authenticate).toHaveBeenCalledWith(testStrategy.name, expect.anything());
        expect(auth.getMiddleware()).toEqual(authenticator);
    });

    it('should be able to create a simple authenticator with default strategy name', async () => {
        const strategy: any = {};
        const auth = new PassportAuthenticator(strategy);

        expect(auth).toBeDefined();
        expect(use).toHaveBeenCalledWith('default_strategy', strategy);
        expect(use).toHaveBeenCalledTimes(1);
        expect(authenticate).toHaveBeenCalledWith('default_strategy', expect.anything());
        expect(authenticate).toHaveBeenCalledTimes(1);
    });

    it('should be able to create a simple authenticator with custom auth options', async () => {
        const options = {
            authOptions: {
                session: false
            },
            strategyName: 'my-custom-strategy'
        };
        const auth: any = new PassportAuthenticator(testStrategy, options);

        expect(auth.options).toEqual(options);
        expect(authenticate).toHaveBeenCalledWith(options.strategyName, options.authOptions);
        expect(authenticate).toHaveBeenCalledTimes(1);
    });

    it('should be able to initialize a sessionless authenticator', async () => {
        const options = {
            authOptions: {
                session: false
            }
        };
        const auth = new PassportAuthenticator(testStrategy, options);
        auth.initialize(expressStub);

        expect(initialize).toHaveBeenCalledTimes(1);
        expect(expressStub.use).toHaveBeenCalledTimes(1);
        expect(expressStub.use).toHaveBeenCalledWith(initializer);
        expect(session).toHaveBeenCalledTimes(0);
    });

    describe('Session tests', () => {
        const serializationCallbackStub = jest.fn();
        const deserializationCallbackStub = jest.fn();
        const options = {
            authOptions: { session: true },
            deserializeUser: jest.fn(),
            serializeUser: jest.fn()
        };

        afterEach(() => {
            options.deserializeUser.mockClear();
            options.serializeUser.mockClear();
            deserializationCallbackStub.mockClear();
            serializationCallbackStub.mockClear();
        });

        it('should be able to initialize an authenticator with session', async () => {
            const user = { 'id': '123', 'name': 'Joe' };
            const serialization = JSON.stringify(user);
            options.serializeUser.mockReturnValue(serialization);
            options.deserializeUser.mockReturnValue(user);

            serializeUser.mockImplementation((callback) => {
                callback(user, serializationCallbackStub);
            });
            deserializeUser.mockImplementation((callback) => {
                callback(serialization, deserializationCallbackStub);
            });
            const auth = new PassportAuthenticator(testStrategy, options);
            auth.initialize(expressStub);
            await wait(1);
            expect(initialize).toHaveBeenCalledTimes(1);
            expect(expressStub.use).toHaveBeenCalledTimes(2);
            expect(expressStub.use).toHaveBeenCalledWith(initializer);
            expect(session).toHaveBeenCalledTimes(1);
            expect(expressStub.use).toHaveBeenCalledWith(sessionHandler);
            expect(serializeUser).toHaveBeenCalledTimes(1);
            expect(deserializeUser).toHaveBeenCalledTimes(1);
            expect(serializationCallbackStub).toHaveBeenCalledWith(null, serialization);
            expect(serializationCallbackStub).toHaveBeenCalledTimes(1);
            expect(deserializationCallbackStub).toHaveBeenCalledWith(null, user);
            expect(deserializationCallbackStub).toHaveBeenCalledTimes(1);
        });

        it('should be able to fail when serialization fail', async () => {
            const user = { 'id': '123', 'name': 'Joe' };
            const serialization = JSON.stringify(user);
            const error = new Error('any error');
            options.serializeUser.mockReturnValue(Promise.reject(error));
            options.deserializeUser.mockReturnValue(Promise.reject(error));

            serializeUser.mockImplementation((callback) => {
                callback(user, serializationCallbackStub);
            });
            deserializeUser.mockImplementation((callback) => {
                callback(serialization, deserializationCallbackStub);
            });
            const auth = new PassportAuthenticator(testStrategy, options);
            auth.initialize(expressStub);
            await wait(1);
            expect(serializationCallbackStub).toHaveBeenCalledWith(error, null);
            expect(serializationCallbackStub).toHaveBeenCalledTimes(1);
            expect(deserializationCallbackStub).toHaveBeenCalledWith(error, null);
            expect(deserializationCallbackStub).toHaveBeenCalledTimes(1);
        });
    });

});