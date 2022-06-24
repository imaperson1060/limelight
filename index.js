"use strict";
exports.__esModule = true;
var ajv_1 = require("ajv");
var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var LimeDB = /** @class */ (function () {
    function LimeDB(filename, humanReadable, key) {
        if (humanReadable === void 0) { humanReadable = false; }
        if (key === void 0) { key = null; }
        var _this = this;
        this.initialize = function () {
            if (!fs.existsSync(_this.config.filename) || fs.statSync(_this.config.filename).size == 0)
                _this.write(new Database());
            else {
                try {
                    var database = JSON.parse(fs.readFileSync(_this.config.filename, "utf-8"));
                    if (!database.iv && !database.encryptedData && _this.config.key) {
                        console.log("Database is not encrypted, but a key is provided. Rebuilding...");
                        _this.write(new Database(database));
                        console.log("Database is now encrypted! If this was accidental, you can remove the key with the \".decrypt()\" method.");
                    }
                    else if (database.iv && database.encryptedData && !_this.config.key)
                        throw new Error("Database is encrypted, but no key is provided.");
                    else if (database.iv && database.encryptedData && _this.config.key) {
                        try {
                            _this.read();
                        }
                        catch (e) {
                            throw new Error("Database is encrypted, and the key provided is invalid.");
                        }
                    }
                }
                catch (e) {
                    throw new Error("Database is corrupted.");
                }
            }
            return _this;
        };
        this.decrypt = function () {
            var database = JSON.parse(fs.readFileSync(_this.config.filename, "utf-8"));
            if (!database.iv && !database.encryptedData || !_this.config.key)
                throw new Error("Database is not encrypted.");
            console.log("Decrypting database with key...");
            _this.write(new Database(JSON.parse(decrypt(database, _this.config.key))), true);
            console.log("Database is now decrypted. Do not provide a key when initializing the database or it will be re-encrypted.");
            _this.config.key = null;
        };
        this.alter = function (table, changes) {
            var database = _this.read();
            var selectedTable = database.tables.find(function (x) { return x.name == table; });
            if (!selectedTable)
                throw new Error("Table \"".concat(table, "\" does not exist. Did you mean to create it (\".create(...)\" method)?"));
            selectedTable.alterTable(changes, database);
            _this.write(database);
        };
        this.select = function (table, filter, limit) {
            var database = _this.read();
            var selectedTable = database.tables.find(function (x) { return x.name == table; });
            if (!selectedTable)
                throw new Error("Table \"".concat(table, "\" does not exist. Did you mean to create it (\".create(...)\" method)?"));
            if (!limit)
                return selectedTable.rows.filter(function (x) { return filter(x); });
            else
                return selectedTable.rows.filter(function (x) { return filter(x); }).slice(0, limit);
        };
        this.create = function (table, cols, schema, autoID) {
            var database = _this.read();
            if (!database.tables)
                database.tables = [];
            var selectedTable = database.tables.find(function (x) { return x.name == table; });
            if (selectedTable)
                throw new Error("Table \"".concat(table, "\" already exists."));
            if (cols.length != Object.keys(schema).length)
                throw new Error("Schema does not match columns.");
            cols.forEach(function (x) {
                if (Object.keys(schema).indexOf(x) == -1)
                    throw new Error("Schema does not match columns.");
            });
            database.tables.push(new Table(table, cols, {
                type: "object",
                properties: schema,
                required: cols,
                additionalProperties: false
            }));
            _this.write(database);
        };
        this.insert = function (table, row) {
            var database = _this.read();
            var selectedTable = database.tables.find(function (x) { return x.name == table; });
            if (!selectedTable)
                throw new Error("Table \"".concat(table, "\" does not exist. Did you mean to create it (\".create(...)\" method)?"));
            row.forEach(function (x) { return selectedTable.createRow(x); });
            _this.write(database);
        };
        this.update = function (table, filter, row) {
            var database = _this.read();
            var selectedTable = database.tables.find(function (x) { return x.name == table; });
            if (!selectedTable)
                throw new Error("Table \"".concat(table, "\" does not exist. Did you mean to create it (\".create(...)\" method)?"));
            var rows = selectedTable.rows.filter(function (x) { return filter(x); });
            if (!(rows === null || rows === void 0 ? void 0 : rows.length))
                return;
            for (var i = 0; i < rows.length; i++) {
                var newRow = Object.assign({}, rows[i], row);
                if (!new ajv_1["default"]().compile(selectedTable.schema)(newRow))
                    throw new Error("Error while inserting new row into \"".concat(table, "\"\n            ").concat(JSON.stringify(newRow), " does not match\n            ").concat(JSON.stringify(selectedTable.schema.properties), "."));
                Object.assign(rows[i], row);
            }
            _this.write(database);
        };
        this["delete"] = function (table, filter) {
            var database = _this.read();
            var selectedTable = database.tables.find(function (x) { return x.name == table; });
            if (!selectedTable)
                throw new Error("Table \"".concat(table, "\" does not exist. Did you mean to create it (\".create(...)\" method)?"));
            var rows = selectedTable.rows.filter(function (x) { return filter(x); });
            if (!(rows === null || rows === void 0 ? void 0 : rows.length))
                return;
            for (var i = 0; i < rows.length; i++) {
                var index = selectedTable.rows.indexOf(rows[i]);
                if (index == undefined)
                    return;
                selectedTable.rows.splice(index, 1);
            }
            _this.write(database);
        };
        this.read = function () {
            if (!_this.config.key) {
                return new Database(JSON.parse(fs.readFileSync("db.json", "utf-8")));
            }
            else {
                return new Database(JSON.parse(decrypt(JSON.parse(fs.readFileSync("db.json", "utf-8")), _this.config.key)));
            }
        };
        this.write = function (database, encryptOverride) {
            if (!_this.config.key || encryptOverride) {
                fs.writeFileSync(_this.config.filename, database.raw(_this.config.humanReadable));
            }
            else {
                fs.writeFileSync(_this.config.filename, JSON.stringify(encrypt(database.raw(_this.config.humanReadable), _this.config.key), null, _this.config.humanReadable ? 2 : 0));
            }
        };
        this.config = new Config(filename, humanReadable, key);
    }
    return LimeDB;
}());
var Config = /** @class */ (function () {
    function Config(filename, humanReadable, key) {
        if (humanReadable === void 0) { humanReadable = false; }
        if (key === void 0) { key = null; }
        this.filename = filename;
        if (path.extname(filename) == "") {
            this.filename += ".json";
        }
        this.humanReadable = humanReadable;
        this.key = key;
    }
    return Config;
}());
var Database = /** @class */ (function () {
    function Database(database) {
        var _this = this;
        this.raw = function (humanReadable) {
            return JSON.stringify(_this, null, humanReadable ? 2 : 0);
        };
        if (database === null || database === void 0 ? void 0 : database.tables) {
            this.tables = [];
            database.tables.forEach(function (x) {
                _this.tables.push(new Table(x.name, x.cols, x.schema, x.rows));
            });
        }
    }
    return Database;
}());
var Table = /** @class */ (function () {
    function Table(name, cols, schema, rows, autoId) {
        var _this = this;
        this.alterTable = function (changes, database) {
            if (changes.cols) {
                if (!changes.schema) {
                    if (changes.cols.length != Object.keys(_this.schema).length)
                        throw new Error("Schema does not match columns.");
                    changes.cols.forEach(function (x) {
                        if (Object.keys(_this.schema).indexOf(x) == -1)
                            throw new Error("Schema does not match columns.");
                    });
                }
                else {
                    if (changes.cols.length != Object.keys(changes.schema).length)
                        throw new Error("Schema does not match columns.");
                    changes.cols.forEach(function (x) {
                        if (Object.keys(changes.schema).indexOf(x) == -1)
                            throw new Error("Schema does not match columns.");
                    });
                }
                _this.schema.properties = changes.schema;
            }
            if (changes.schema) {
                if (!changes.cols) {
                    if (_this.cols.length != Object.keys(changes.schema).length)
                        throw new Error("Schema does not match columns.");
                    _this.cols.forEach(function (x) {
                        if (Object.keys(changes.schema).indexOf(x) == -1)
                            throw new Error("Schema does not match columns.");
                    });
                }
                else {
                    if (changes.cols.length != Object.keys(changes.schema).length)
                        throw new Error("Schema does not match columns.");
                    changes.cols.forEach(function (x) {
                        if (Object.keys(changes.schema).indexOf(x) == -1)
                            throw new Error("Schema does not match columns.");
                    });
                }
                _this.schema.properties = changes.schema;
            }
            if (changes.name) {
                if (database.tables.find(function (x) { return x.name == changes.name; }))
                    throw new Error("Table \"".concat(changes.name, "\" already exists."));
                _this.name = changes.name;
            }
            if (changes.autoId)
                _this.autoId = changes.autoId;
        };
        this.createRow = function (row) {
            if (!new ajv_1["default"]().compile(_this.schema)(row))
                throw new Error("Error while inserting new row into \"".concat(_this.name, "\"\n            ").concat(JSON.stringify(row), " does not match\n            ").concat(JSON.stringify(_this.schema.properties), "."));
            if (!_this.rows)
                _this.rows = [];
            _this.rows.push(row);
        };
        this.name = name;
        this.cols = cols;
        if (rows)
            this.rows = rows;
        this.schema = schema;
        if (autoId)
            this.autoId = autoId;
    }
    return Table;
}());
function encrypt(data, key) {
    var iv = crypto.randomBytes(16);
    key = crypto.createHash("md5").update(key).digest("hex");
    var cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
    var encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
}
function decrypt(data, key) {
    var iv = Buffer.from(data.iv, "hex");
    key = crypto.createHash("md5").update(key).digest("hex");
    var encryptedText = Buffer.from(data.encryptedData, "hex");
    var decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
    var decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
module.exports = { LimeDB: LimeDB };
