const app = require('./app');
const dotenv = require('dotenv');
dotenv.config({path: 'backend/config/config.env'});
const connectDatabase = require('./config/database');
const mysqlPool = require('./config/mysql_database');

//handling uncaught exceptions
process.on('uncaughtException', (err) =>{
    console.log('Error: '+err.message);
    console.log('Shutting down the server due to unhandled uncaught exceptions');
    process.exit(1);
})

//console.log(testing);

//connectDatabase();
mysqlPool.query('select 1').then((error)=>{
    console.log('mysql connection established');
})

const server = app.listen(process.env.PORT, () =>{
    console.log('server is working on port '+process.env.PORT);
})
 
// unhandled promise rejection
process.on('unhandledRejection', (err) =>{
    console.log('Error: '+err.message);
    console.log('Shutting down the server due to unhandled promise rejection');

    server.close(() =>{
        process.exit(1);
    })
})