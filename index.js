const http = require("http"),
    https = require("https");
const Database = function(token, url) {
    if (!token) throw new TypeError("database.construct() valid token must be provided");
    const parsedURL = url ? new URL(url) : { "protocol": "https:", "port": 443 };
    this.connection = { hostname: parsedURL["hostname"] ? parsedURL["hostname"] : "database.macstudio.pro" }
    this.connection.protocol = parsedURL["protocol"] === "https:" ? https : http;
    this.connection.token = token;
    if (parsedURL["port"]) this.connection.pport = parsedURL["port"];
}
/**
 * make a request to any server
 * @param {Object} options - options for the request
 * @param {Any} data - the data to send with the request
 */
Database.prototype._request = function(options, data) {
    const type = data ? typeof data.on === 'function' : false;
    return new Promise(async (resolve, reject) => {
        try {
            const headers = options["headers"] ? options["headers"] : {};
            headers["authorization"] = this.connection.token;
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
 * get a value from the database
 * @param {String} key - the key of the data to return
 * @returns {Object} - the value stored within the database
 */
Database.prototype._get = function(key) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this._request({
                path: `/content/${encodeURIComponent(key)}`,
                method: 'GET',
            });
            if (res.statusCode === 200) {
                var data = [];
                res.on("data", async (chunk) => {
                    data.push(chunk);
                }).on("end", async () => {
                    data = Buffer.concat(data);
                    resolve(JSON.parse(data));
                });
            } else if (res.statusCode === 404) {
                resolve({});
            } else {
                throw { status: res.statusCode };
            }
        } catch (e) {
            reject(e);
        }
    });
}
/**
 * sets a value into the database
 * @param {String} key - the key to store the value
 * @param {String} value - the value to save
 */
Database.prototype._set = function(key, value) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this._request({
                path: `/content/${encodeURIComponent(key)}`,
                method: 'PUT',
            }, value);
            if (res.statusCode === 200) {
                resolve();
            } else {
                throw { status: res.statusCode };
            }
        } catch (e) {
            reject(e);
        }
    });
}
/**
 * deletes a value from the database
 * @param {String} key - the key for the value to delete
 */
Database.prototype._delete = function(key) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this._request({
                path: `/content/${encodeURIComponent(key)}`,
                method: 'DELETE',
            });
            if (res.statusCode === 200) {
                resolve();
            } else {
                throw { status: res.statusCode };
            }
        } catch (e) {
            reject(e);
        }
    });
}
/**
 * lists all the files in a path
 * @param {string} key Key
 * @returns {object} Directory list
 */
Database.prototype.list = async function(key) {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await this._request({
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
/**
 * returns object to manipulate another object
 * @param {string} key key
 * @param {object} defaults default values
 * @returns {object} data
 */
Database.prototype.get = async function(key, defaults) {
    return new Promise(async (resolve, reject) => {
        const prototype = {
            "_key": key,
            "_database": this,
            "_save": async function() {
                return new Promise(async (resolve, reject) => {
                    try {
                        resolve(await this._database._set(this._key, JSON.stringify(this)));
                    } catch (e) {
                        reject(e);
                    }
                });
            },
            "_delete": async function() {
                return new Promise(async (resolve, reject) => {
                    try {
                        resolve(await this._database._delete(this._key));
                    } catch (e) {
                        reject(e);
                    }
                });
            },
        };
        const data = await this._get(key);
        const item = Object.create(prototype);
        Object.assign(item, defaults ? defaults : {});
        Object.assign(item, data);
        resolve(item);
    });
}

exports = module.exports = Database;