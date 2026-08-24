[![npm version](https://badge.fury.io/js/typescript-rest.svg)](https://badge.fury.io/js/typescript-rest)
![Master Workflow](https://github.com/thiagobustamante/typescript-rest/workflows/Master%20Workflow/badge.svg)
[![Coverage Status](https://codecov.io/gh/thiagobustamante/typescript-rest/branch/master/graph/badge.svg)](https://codecov.io/gh/thiagobustamante/typescript-rest)
[![Known Vulnerabilities](https://snyk.io/test/github/thiagobustamante/typescript-rest/badge.svg?targetFile=package.json)](https://snyk.io/test/github/thiagobustamante/typescript-rest?targetFile=package.json)
[![BCH compliance](https://bettercodehub.com/edge/badge/thiagobustamante/typescript-rest?branch=master)](https://bettercodehub.com/)

# REST Services for Typescript
This is a lightweight annotation-based [expressjs](http://expressjs.com/) extension for typescript.

It can be used to define your APIs using decorators.

**Table of Contents** 

- [REST Services for Typescript](#)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Basic Usage](#basic-usage)
  - [Using with an IoC Container](#using-with-an-ioc-container)
  - [Documentation](https://github.com/thiagobustamante/typescript-rest/wiki)
  - [Boilerplate Project](#boilerplate-project)  

## Requirements

- Node.js 20.19 or newer
- TypeScript 5.0 or newer
- Express 5

## Installation

This library only works with typescript. Ensure it is installed:

```bash
npm install -D typescript
```

To install typescript-rest:

```bash
npm install typescript-rest --save
```

## Configuration

Typescript-rest requires the following TypeScript compilation options in your tsconfig.json file:

```typescript
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "es6", // or anything newer like esnext
    "useDefineForClassFields": false
  }
}
```

`useDefineForClassFields` defaults to `true` when `target` is `ES2022` or newer. It
must be set to `false`: with it enabled, declared class fields are re-defined as
`undefined` on every instance, which erases the values that `@Context`, `@PathParam`
and IoC property injection assign to those fields.

## Upgrading to 4.x

Version 4 moves the library to Express 5 and updates every other dependency. The
changes that can affect your code:

- **Express 5 is now required.** Express 5 uses `path-to-regexp` v8, which changes
  the syntax accepted by `@Path`. Both of the old forms are now hard errors at
  startup, not silent misbehaviour:

  | Old (Express 4) | New (Express 5) | Notes                                                                                                   |
  | --- | --- |---------------------------------------------------------------------------------------------------------|
  | `@Path('/user/:id?')` | `@Path('/user{/:id}')` | the braces wrap the slash too with optional path params                                                 |
  | `@Path('/files/*')` | `@Path('/files/*splat')` | wildcards must be named; the value is an **array** of segments, e.g. `['a','b','c']` for `/files/a/b/c` |

  Plain parameters such as `@Path('/user/:id')` are unchanged, so most services
  need no edits.
- **`request.body` is `undefined` when no body was parsed.** Express 5 no longer
  defaults it to `{}`. A `@BodyParam`-style parameter now receives `undefined`
  rather than an empty object when the request carries no matching body.
  `@Param` and `@FormParam` handle this internally and are unaffected.
- **Passport sessions are opt-in.** `PassportAuthenticator` no longer registers
  `passport.session()` by default, because Passport 0.6+ throws when no session
  store is mounted. If you use sessions, mount your session middleware (for example
  `express-session`) on the router and construct the authenticator with
  `authOptions: { session: true }`.
- **`body-parser` is no longer a dependency.** The library uses the parsers built
  into Express 5. `@BodyOptions` is unchanged.

## Basic Usage

```typescript
import express from "express";
import {Server, Path, GET, PathParam} from "typescript-rest";

@Path("/hello")
class HelloService {
  @Path(":name")
  @GET
  sayHello( @PathParam('name') name: string ): string {
    return "Hello " + name;
  }
}

let app: express.Application = express();
Server.buildServices(app);

app.listen(3000, function() {
  console.log('Rest Server listening on port 3000!');
});

```

That's it. You can just call now:

```
GET http://localhost:3000/hello/joe
```

## Using with an IoC Container

Install the IoC container and the serviceFactory for the IoC Container

```bash
npm install typescript-rest --save
npm install typescript-ioc --save
npm install typescript-rest-ioc --save
```

Then add a rest.config file in the root of your project:

```json
{
  "serviceFactory": "typescript-rest-ioc"
}
```

And you can use Injections, Request scopes and all the features of the IoC Container. It is possible to use it with any other IoC Container, like Inversify.

Example:

```typescript
class HelloService {
  sayHello(name: string) {
    return "Hello " + name;
  }
}

@Path("/hello")
class HelloRestService {
  @Inject
  private helloService: HelloService;

  @Path(":name")
  @GET
  sayHello( @PathParam('name') name: string): string {
    return this.sayHello(name);
  }
}
```

## Complete Guide

Check our [documentation](https://github.com/thiagobustamante/typescript-rest/wiki).

## Boilerplate Project

You can check [this project](https://github.com/vrudikov/typescript-rest-boilerplate) to get started.
