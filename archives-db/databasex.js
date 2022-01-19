const fs = require("fs");
const http = require("http");
const https = require("https");


class Network {
    async uploadData(url, data) {
        const type = typeof this.value.on === 'function';
        return new Promise(async (resolve, reject) => {
            try {
                const options = {
                    hostname: this.connection.hostname,
                    //port: this.connection.port,
                    path: `/content/${encodeURIComponent(url)}`,
                    method: 'PUT',
                    headers: {
                        "authorization": this.connection.authorization,
                    }
                }
                if (type) options["headers"]["Transfer-Encoding"] = "chunked";
                const req = this.connection.protocol.request(options, res => {
                    if (res.statusCode != 500) {
                        resolve();
                    } else {
                        reject(500);
                    }
                });
                req.on('error', error => {
                    reject(error);
                });
                if (type) {
                    data.pipe(req, { end: true });
                } else {
                    req.write(data);
                    req.end();
                }
            } catch (e) {
                reject(e);
            }
        });
    }
    async getData(url) {
        return new Promise(async (resolve, reject) => {
            try {
                const req = this.connection.protocol.request({
                    hostname: this.connection.hostname,
                    //port: this.connection.port,
                    path: `/content/${encodeURIComponent(url)}`,
                    method: 'GET',
                    headers: {
                        "authorization": this.connection.authorization,
                    }
                }, async res => {
                    return resolve(res); // get statuscode res.statusCode
                });
                req.on('error', error => {
                    reject(error);
                })
                req.end()
            } catch (error) {
                reject(error);
            }
        });
    }
    async listData(url) {
        return new Promise(async (resolve, reject) => {
            try {
                const req = this.connection.protocol.request({
                    hostname: this.connection.hostname,
                    //port: this.connection.port,
                    path: `/list/${encodeURIComponent(url)}`,
                    method: 'GET',
                    headers: {
                        "authorization": this.connection.authorization,
                    }
                }, async res => {
                    return resolve(res); // get statuscode res.statusCode
                });
                req.on('error', error => {
                    reject(error);
                })
                req.end()
            } catch (error) {
                reject(error);
            }
        });
    }
    async deleteData(url) {
        return new Promise(async (resolve, reject) => {
            try {
                const req = this.connection.protocol.request({
                    hostname: this.connection.hostname,
                    //port: this.connection.port,
                    path: `/content/${encodeURIComponent(url)}`,
                    method: 'DELETE',
                    headers: {
                        "authorization": this.connection.authorization,
                    }
                }, async res => {
                    return resolve(res); // get statuscode res.statusCode
                });
                req.on('error', error => {
                    reject(error);
                })
                req.end()
            } catch (error) {
                reject(error);
            }
        });
    }
}

class DatabaseObject extends Network {
    // what will be returned when calls the get("name") function on a database
    constructor(url, connection) {
        super()
        this.url = url;
        this.value = undefined;
        this.connection = connection;
    }
    async fetch() {
        return new Promise(async (resolve, reject) => {
            try {
                this.value = await this.fetchValue();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
    async delete() {
        this.value = undefined;
        this.deleteData(this.url);
    }
    async save() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.uploadData(this.url, this.url.endsWith(".json") ? JSON.stringify(this.value) : this.value);
                resolve();
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });
    }
    async fetchValue() {
        return new Promise(async (resolve, reject) => {
            try {
                const data = await this.getData(this.url);
                if (data.statusCode === 404) {
                    return resolve(undefined);
                } else if (data.statusCode != 200) {
                    throw Error(data.statusCode);
                }
                if (this.url.endsWith(".json")) {
                    var contents = [];
                    data.on("data", function (d) {
                        contents.push(d);
                    }).on("end", function () {
                        resolve(JSON.parse(Buffer.concat(contents).toString()));
                    });
                } else if (this.url.endsWith(".txt")) {
                    var toString = [];
                    data.on("data", function (d) {
                        toString.push(d);
                    }).on("end", function () {
                        resolve(Buffer.concat(toString).toString());
                    });
                } else {
                    resolve(data);
                }
            } catch (e) {
                reject(e);
            }
        });
    }
}

class Database extends Network {
    constructor() {
        super();
        this.connection = {};
    }
    async connect(connectionString, authorization) {
        return new Promise(async (resolve, reject) => {
            // initiate a connection with the server and set this variables
            try {
                const parseConnection = new URL(connectionString);
                if (!parseConnection.hostname || !parseConnection.protocol) {
                    throw Error("Does not contain needed params in connection URL.");
                }
                this.connection.hostname = parseConnection.hostname;
                this.connection.protocol = parseConnection.protocol === "https:" ? https : http;
                // this.connection.port = parseConnection.port || parseConnection.protocol === "https:" ? 445 : 80;
                if (!authorization) {
                    throw Error("Missing authorization token.");
                }
                this.connection.authorization = authorization;
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
    get(url) {
        // returns an object from the database
        return new DatabaseObject(url, this.connection);
    }
    async list(url) {
        return new Promise(async (resolve, reject) => {
            try {
                const list = await this.listData(url);
                const data = [];
                list.on("data", function(d) {
                    data.push(d);
                }).on("end", function() {
                    resolve(JSON.parse(Buffer.concat(data).toString()));
                });
            } catch(e) {
                reject(e);
            }
        });
    }
}

module.exports = Database;