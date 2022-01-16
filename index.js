const http = require("http");
const https = require("https");

/**
    * Create the database connection
    * @param {String} auth Authorization token
    * @param {String} url Custom database URL
*/
const Database = function (authorization, url) {
    if (!authorization) throw new TypeError("database.construct() valid authorization token must be provided");
    if (!url) throw new TypeError("database.construct() valid database url must be provided");
    const parsedURL = url ? new URL(url) : {};
    this.connection = { hostname: parsedURL["hostname"] ? parsedURL["hostname"] : "database.macstudio.pro" }
    this.connection.protocol = parsedURL ? (parsedURL["protocol"] === "https:" ? https : http) : "https:";
    this.connection["authorization"] = authorization;
    if (parsedURL["port"]) this.connection["port"] = parsedURL["port"];
}
/**
    * Create a network request
    * @param {object} options request options
    * @param {string} [options.path] request path
    * @param {string} [options.method] request method
    * @param {object} [options.headers={}] request headers
    * @param {string} data request data
    * @returns {object} response request response
*/
Database.prototype.request = function (options, data) {
    const type = data ? typeof data.on === 'function' : false;
    return new Promise(async (resolve, reject) => {
        try {
            const headers = options["headers"] ? options["headers"] : {};
            headers["authorization"] = this.connection.authorization;
            options["headers"] = headers;
            options["hostname"] = this.connection.hostname;
            if (this.connection.port) options["port"] = this.connection.port;
            if (type) options["headers"]["Transfer-Encoding"] = "chunked";
            const req = this.connection.protocol.request(options, async (res) => {
                resolve(res);
            });
            req.on('error', error => reject(error));
            if (data) {
                if (type) {
                    data.pipe(req, { end: true });
                } else {
                    req.write(data);
                    req.end();
                }
            } else {
                req.end();
            }
        } catch (e) {
            reject(e);
        }
    });
}

/**
    * Save data into the database
    * @param {string} key key
    * @param {string || stream || buffer} data data
*/
Database.prototype.set = async function (key, data) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this.request({
                path: `/content/${encodeURIComponent(key)}`,
                method: 'PUT',
            }, data);
            if (res.statusCode === 200) {
                resolve();
            } else {
                reject(res.statusCode);
            }
        } catch (e) {
            reject(e);
        }
    });
}

/**
    * Get's a text value from the database
    * @param {string} key Key
    * @param {boolean} [options.raw=false] Makes it so that we return the raw string value. Default is false.
    * @returns {any} data
*/
Database.prototype.get = async function (key, options) {
    options = options ? options : {};
    options.key = options.key ? options.key : false;
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this.request({
                path: `/content/${encodeURIComponent(key)}`,
                method: 'GET',
            });
            if (res.statusCode === 200) {
                var data = [];
                res.on("data", async (chunk) => {
                    data.push(chunk);
                }).on("end", async () => {
                    data = Buffer.concat(data);
                    if (key.endsWith(".json") && !options.raw) {
                        resolve(JSON.parse(data));
                    } else {
                        resolve(data);
                    }
                });
            } else {
                reject(res.statusCode);
            }
        } catch (e) {
            reject(e);
        }
    });
}


/**
    * Deletes a value from the database
    * @param {string} key Key
*/
Database.prototype.delete = async function (key) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this.request({
                path: `/content/${encodeURIComponent(key)}`,
                method: 'DELETE',
            }, data);
            if (res.statusCode === 200) {
                resolve();
            } else {
                reject(res.statusCode);
            }
        } catch (e) {
            reject(e);
        }
    });
}

/**
    * Lists all the files in a path
    * @param {string} key Key
    * @returns {object} Directory list
*/
Database.prototype.list = async function (key) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this.request({
                path: `/list/${encodeURIComponent(key)}`,
                method: 'GET',
            });
            if (res.statusCode === 200) {
                const data = [];
                res.on("data", async (chunk) => {
                    data.push(chunk);
                }).on("end", async () => {
                    resolve(JSON.parse(Buffer.concat(data)));
                });
            } else {
                reject(res.statusCode);
            }
        } catch (e) {
            reject(e);
        }
    });
}

exports = module.exports = Database;