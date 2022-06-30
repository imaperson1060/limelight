import Ajv, * as ajv from "ajv";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

class LimelightDB {
    filename: string;
    humanReadable: boolean;
    key: string | null;
    encrypted: boolean;

    constructor(filename: string, humanReadable?: boolean, key: string | null = null) {
        this.filename = filename;
        if (!path.extname(filename)) this.filename += ".limelight"

        this.humanReadable = humanReadable ? true : false;
        this.key = key;
    }

    initialize = () => {
        if (!fs.existsSync(this.filename) || fs.statSync(this.filename).size == 0) this.write(new Database());
        else {
            let database;
            
            try {
                database = JSON.parse(fs.readFileSync(this.filename, "utf-8"));
            } catch (e) {
                throw new Error("Database is corrupted.");
            }
    
            if (!database.iv && !database.encryptedData && this.key) {
                console.log("Database is not encrypted, but a key is provided. Rebuilding...");
                this.write(new Database(database));
                console.log("Database is now encrypted! If this was accidental, you can remove the key with the \".decrypt()\" method.");
            } else if (database.iv && database.encryptedData && !this.key) throw new Error("Database is encrypted, but no key is provided.");
            else if (database.iv && database.encryptedData && this.key) {
                try {
                    this.read();
                } catch (e) {
                    throw new Error("Database is encrypted, and the key provided is invalid, or the database is corrupted.");
                }
            } else {
                try {
                    this.read();
                } catch (e) {
                    throw new Error("Database is corrupted.");
                }
            }

            this.encrypted = (database.iv && database.encryptedData) || (!database.iv && !database.encryptedData && this.key);
        }

        return this;
    }

    decrypt = (key?: string) => {
        const database = JSON.parse(fs.readFileSync(this.filename, "utf-8"));

        if (!database.iv && !database.encryptedData) throw new Error("Database is not encrypted.");

        console.log("Decrypting database with key...");
        if (this.key) this.write(new Database(JSON.parse(decrypt(database, this.key))), true);
        else if (key) this.write(new Database(JSON.parse(decrypt(database, key))), true);
        else throw new Error("No key is provided.");
        console.log("Database is now decrypted. Do not provide a key when initializing the database or it will be re-encrypted.");

        this.key = null;
        this.encrypted = false;

        return this;
    }

    alter = (table: string, changes: { cols: string[], schema: object, name: string, autoId: boolean }) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);

        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)

        selectedTable.alterTable(changes, database);

        this.write(database);
    }

    select = (table: string, filter: Function, limit?: number) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);

        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)
        
        if (!limit) return selectedTable.rows.filter(x => filter(x));
        else return selectedTable.rows.filter(x => filter(x)).slice(0, limit);
    }

    create = (table: string, cols: string[], schema: object, autoID?: boolean) => {
        const database = this.read();
        
        if (!database.tables) database.tables = [];        

        const selectedTable = database.tables.find(x => x.name == table);

        if (selectedTable) throw new Error(`Table "${table}" already exists.`)

        if (cols.length != Object.keys(schema).length) throw new Error("Schema does not match columns.");
        cols.forEach(x => {
            if (Object.keys(schema).indexOf(x) == -1) throw new Error("Schema does not match columns.");
        });

        if (!schema["id"]) schema["id"] = { type: "number" };

        database.tables.push(new Table(table, cols, {
            type: "object",
            properties: schema,
            required: cols,
            additionalProperties: false
        }, autoID));

        this.write(database);
    }

    insert = (table: string, row: object[]) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);
        
        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)

        row.forEach(x => selectedTable.createRow(x));

        this.write(database);
    }

    update = (table: string, filter: Function, row: object) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);
        
        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)

        const rows = selectedTable.rows.filter(x => filter(x));
        
        if (!rows?.length) return;

        for (var i = 0; i < rows.length; i++) {
            const newRow = Object.assign({}, rows[i], row);

            if (!new Ajv().compile(selectedTable.schema)(newRow)) throw new Error(`Error while updating row in "${table}"
            ${JSON.stringify(newRow)} does not match
            ${JSON.stringify(selectedTable.schema.properties)}.`);

            Object.assign(rows[i], row);
        }

        this.write(database);
    }

    delete = (table: string, filter: Function) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);

        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)
        
        const rows = selectedTable.rows.filter(x => filter(x));

        if (!rows?.length) return;

        for (var i = 0; i < rows.length; i++) {
            const index = selectedTable.rows.indexOf(rows[i]);

            if (index == undefined) return;

            selectedTable.rows.splice(index, 1);
        }
        
        this.write(database);
    }

    read = () => {
        if (!this.key) {
            return new Database(JSON.parse(fs.readFileSync(this.filename, "utf-8")));
        } else {
            return new Database(JSON.parse(decrypt(JSON.parse(fs.readFileSync(this.filename, "utf-8")), this.key)));
        }
    }

    write = (database: Database, encryptOverride?: boolean) => {
        if (!this.key || encryptOverride) {
            fs.writeFileSync(this.filename, database.raw(this.humanReadable));
        } else {
            fs.writeFileSync(this.filename, JSON.stringify(encrypt(database.raw(this.humanReadable), this.key), null, this.humanReadable ? 2 : 0));
        }
    }
}

class Database {
    tables: Table[];

    constructor(database?: Database) {
        if (database?.tables) {
            this.tables = [];

            database.tables.forEach(x => {
                this.tables.push(new Table(x.name, x.cols, x.schema, x.autoId, x.rows));
            });
        }
    }

    raw = (humanReadable: boolean) => {
        return JSON.stringify(this, null, humanReadable ? 2 : 0);
    }
}

class Table {
    name: string;
    cols: string[];
    rows: object[];
    schema: ajv.SchemaObject;
    autoId: boolean;

    constructor(name: string, cols: string[], schema: ajv.SchemaObject, autoId?: boolean, rows?: object[]) {
        this.name = name;
        this.cols = cols;
        if (rows) this.rows = rows;
        this.schema = schema;
        this.autoId = autoId ? true : false;
    }

    alterTable = (changes: { schema: object, name: string, autoId: boolean }, database: Database) => {
        if (changes.schema) {
            Object.keys(changes.schema).forEach(x => {
                if (!this.schema.properties[x] || this.schema.properties[x].type != changes.schema[x].type) {
                    this.rows.forEach(y => {
                        switch(changes.schema[x].type) {
                            case "number":
                            case "integer":
                                y[x] = 0;
                                break;
                            case "string":
                                y[x] = "";
                                break;
                            case "boolean":
                                y[x] = false;
                                break;
                            case "array":
                                y[x] = [];
                                break;
                            case "object":
                                y[x] = {};
                                break;
                            case "null":
                                y[x] = null;
                                break;
                        }
                    });
                }
            });

            Object.keys(this.schema.properties).forEach(x => {
                if (!changes.schema[x] && x != "id") this.rows.forEach(y => (delete y[x]));
            });

            this.schema.properties = changes.schema;
            this.schema.required = Object.keys(changes.schema);
        }
        if (changes.name) {
            if (database.tables.find(x => x.name == changes.name)) throw new Error(`Table "${changes.name}" already exists.`);

            this.name = changes.name;
        }
        if (changes.autoId) {
            if (changes.autoId) {
                this.rows.forEach(x => {
                    x["id"] = this.rows.length + 1;
                });
            } else {
                this.rows.forEach(x => (delete x["id"]));
            }

            this.autoId = changes.autoId;
        }
    }

    createRow = (row: object) => {
        if (!new Ajv().compile(this.schema)(row)) throw new Error(`Error while inserting new row into "${this.name}"
            ${JSON.stringify(row)} does not match
            ${JSON.stringify(this.schema.properties)}.`);

        if (!this.rows) this.rows = [];
        
        if (this.autoId) {
            row["id"] = this.rows.length + 1;
        }
        this.rows.push(row);
    }
}

function encrypt(data: string, key: string) {
    const iv = crypto.randomBytes(16);
    key = crypto.createHash("md5").update(key).digest("hex");
    let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
}

function decrypt(data: { iv: string, encryptedData: string }, key: string) {
    let iv = Buffer.from(data.iv, "hex");
    key = crypto.createHash("md5").update(key).digest("hex");
    let encryptedText = Buffer.from(data.encryptedData, "hex");
    let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = { LimelightDB }