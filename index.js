const http = require("http");
const https = require("https");

class Database {
    /**
        * Create the database connection
        * @param {String} auth Authorization token
        * @param {String} url Custom database URL
    */
    constructor(authorization, url) {
        const parsedURL = url ? new URL(url) : {};
        this.connection = {hostname: parsedURL["hostname"] ? parsedURL["hostname"] : "database.macstudio.pro"}
        this.connection.protocol = parsedURL ? parsedURL["protocol"] === "https:" ? https : http : "https:"; 
        if (parsedURL["port"]) this.connection["port"] = parsedURL["port"];
        if (!authorization) {
            throw Error("A valid authorization token must be provided to use this database.");
        } else {
            this.connection["authorization"] = authorization;
        }
    };

    /**
        * Create a network request
        * @param {Object} options Request options
        * @param {String} [options.path] Path for the request.
        * @param {String} [options.method] Method for the request.
        * @param {Object} [options.headers={}] Enter extra headers if needed.
        * @param {String} data Data to post, if making a POST request
    */
    async request(options, data) {
        const type = data ? typeof data.on === 'function' : false;
        return new Promise(async (resolve, reject) => {
            try {
                const headers = options["headers"] ? options["headers"] : {};
                headers["authorization"] = this.connection.authorization;
                options["headers"] = headers;
                options["hostname"] = this.connection.hostname;
                if (this.connection.port) options["port"] = this.connection.port;
                if (type) options["headers"]["Transfer-Encoding"] = "chunked"; // make it chuncked if it is posting a stream
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
        * @param {String} key Key
        * @param {String || Stream || Buffer} data Data you want to save
    */
    async set(key, data) {
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
            } catch(e) {
                reject(e);
            }
        });
    }

    /**
        * Get's a text value from the database
        * @param {String} key Key
        * @param {boolean} [options.raw=false] Makes it so that we return the raw string value. Default is false.
    */
    async get(key, options) {
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
            } catch(e) {
                reject(e);
            }
        });
    }


    /**
        * Deletes a value from the database
        * @param {String} key Key
    */
     async delete(key) {
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
            } catch(e) {
                reject(e);
            }
        });
    }

    /**
        * Lists all the files in a path
        * @param {String} key Key
    */
    async list(key) {
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
            } catch(e) {
                reject(e);
            }
        });
    }
}

module.exports = Database;