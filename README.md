## Description
```
This is backend of my internship application. The goal of the project is to test various coding 
technologies in conditions close to real ones.
```

### Technologies
```
Nest.js v.10.0.0
TypeScript v.5.1.3
Jest v.29.5.0
```

### Requirements
```
Node.js v.22.13.0
```

## Compile and run the application

### Deployment
```bash
# At first you need clone the project to local directory
$ git clone https://github.com/uralban/meduzzenBack.git

# Second, switch to the branch 'develop'
$ git checkout develop

# Third, install all dependencies
$ npm install
```

### Environment variables

You need to create .env file in project root directory. This file should contain the following data:
```
API_VERSION=1.0 ;current application version

PORT=8080 ;the port of the application is running on, you can set the one you need

DB_HOST=localhost ;database connection settings, don`t used at the moment
DB_USER=root
DB_PASS=root
```

### Build and start application

```bash
# Build project to /dist directory
$ npm run build

# Default start project
$ npm run start

# Start project in developer mode
$ npm run start:dev

# Start project in debug mode
$ npm run start:debug

# Start project in production mode
$ npm run start:prod
```

### The application will start on
```
localhost:8080
```

## Testing application

```bash
# Unit tests via Jest
$ npm run test

# Unit tests in watch mode
$ npm run test:watch

# Unit tests in debug mode
$ npm run test:debug

# Unit tests with coverage
$ npm run test:cov

# e2e tests via Jest
$ npm run test:e2e
```

## API documentation

The project uses *swagger* to create API documentation. It is available here:

```
localhost:8080/api
```

## Automatic checking and formating code 

```bash
# Check and fix code via ESLint
$ npm run lint

# Formating code via Prettier
$ npm run format
```