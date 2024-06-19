const mysql = require('mysql');

const pool = mysql.createPool({
        connectionLimit: 10,
        host: "z5zm8hebixwywy9d.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
        user: "zj02hkp7n8bv951j",
        password: "dagt3ezkmpunxux6",
        database: "tqi4qui90ew6idqm"
});

module.exports = pool;