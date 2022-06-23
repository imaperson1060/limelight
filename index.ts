import Ajv, * as ajv from "ajv";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

class LimeDB {
    private readonly config: Config

    constructor(filename: string, humanReadable: boolean = false, key: string | null = null) {
        this.config = new Config(filename, humanReadable, key);
    }

    public initialize = () => {
        if (!fs.existsSync(this.config.filename) || fs.statSync(this.config.filename).size == 0) this.write(new Database());
        else {
            try {
                const database = JSON.parse(fs.readFileSync(this.config.filename, "utf-8"));
    
                if (!database.iv && !database.encryptedData && this.config.key) {
                    console.log("Database is not encrypted, but a key is provided. Rebuilding...");
                    this.write(new Database(database));
                    console.log("Database is now encrypted! If this was accidental, you can remove the key with the \".decrypt()\" method.");
                } else if (database.iv && database.encryptedData && !this.config.key) throw new Error("Database is encrypted, but no key is provided.");
                else if (database.iv && database.encryptedData && this.config.key) {
                    try {
                        this.read();
                    } catch (e) {
                        throw new Error("Database is encrypted, and the key provided is invalid.");
                    }
                }
            } catch (e) {
                throw new Error("Database is corrupted.");
            }
        }

        return this;
    }

    public decrypt = () => {
        const database = JSON.parse(fs.readFileSync(this.config.filename, "utf-8"));

        if (!database.iv && !database.encryptedData || !this.config.key) throw new Error("Database is not encrypted.");

        console.log("Decrypting database with key...");
        this.write(new Database(JSON.parse(decrypt(database, this.config.key))), true);
        console.log("Database is now decrypted. Do not provide a key when initializing the database or it will be re-encrypted.");

        this.config.key = null;
    }

    public alter = (table: string, changes: { cols: string[], schema: object, name?: string }) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);

        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)

        selectedTable.alterTable(changes, database);

        this.write(database);
    }

    public select = (table: string, filter: Function, limit?: number) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);

        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)
        
        if (!limit) return selectedTable.rows.filter(x => filter(x));
        else return selectedTable.rows.filter(x => filter(x)).slice(0, limit);
    }

    public create = (table: string, cols: string[], schema: object, autoID: boolean) => {
        const database = this.read();
        
        if (!database.tables) database.tables = [];        

        const selectedTable = database.tables.find(x => x.name == table);

        if (selectedTable) throw new Error(`Table "${table}" already exists.`)

        if (cols.length != Object.keys(schema).length) throw new Error("Schema does not match columns.");
        cols.forEach(x => {
            if (Object.keys(schema).indexOf(x) == -1) throw new Error("Schema does not match columns.");
        });

        database.tables.push(new Table(table, cols, {
            type: "object",
            properties: schema,
            required: cols,
            additionalProperties: false
        }));

        this.write(database);
    }

    public insert = (table: string, row: object[]) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);
        
        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)

        row.forEach(x => selectedTable.createRow(x));

        this.write(database);
    }

    public update = (table: string, filter: Function, row: object) => {
        const database = this.read();

        const selectedTable = database.tables.find(x => x.name == table);
        
        if (!selectedTable) throw new Error(`Table "${table}" does not exist. Did you mean to create it (".create(...)" method)?`)

        const rows = selectedTable.rows.filter(x => filter(x));
        
        if (!rows?.length) return;

        for (var i = 0; i < rows.length; i++) {
            const newRow = Object.assign({}, rows[i], row);
            
            if (!new Ajv().compile(selectedTable.schema)(newRow)) throw new Error(`Error while inserting new row into "${table}"
            ${JSON.stringify(newRow)} does not match
            ${JSON.stringify(selectedTable.schema.properties)}.`);

            Object.assign(rows[i], row);
        }

        this.write(database);
    }

    public delete = (table: string, filter: Function) => {
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

    protected read = () => {
        if (!this.config.key) {
            return new Database(JSON.parse(fs.readFileSync("db.json", "utf-8")));
        } else {
            return new Database(JSON.parse(decrypt(JSON.parse(fs.readFileSync("db.json", "utf-8")), this.config.key)));
        }
    }

    protected write = (database: Database, encryptOverride?: boolean) => {
        if (!this.config.key || encryptOverride) {
            fs.writeFileSync(this.config.filename, database.raw(this.config.humanReadable));
        } else {
            fs.writeFileSync(this.config.filename, JSON.stringify(encrypt(database.raw(this.config.humanReadable), this.config.key)));
        }
    }
}

class Config {
    filename: string
    humanReadable: boolean
    key: string | null
  
    constructor(filename: string, humanReadable: boolean = false, key: string | null = null) {
        this.filename = filename
        
        if (path.extname(filename) == "") {
            this.filename += ".json"
        }
        
        this.humanReadable = humanReadable;

        this.key = key;
    }
}

class Database {
    tables: Table[]

    constructor(database?: Database) {
        if (database?.tables) {
            this.tables = [];

            database.tables.forEach(x => {
                this.tables.push(new Table(x.name, x.cols, x.schema, x.rows));
            });
        }
    }

    raw = (humanReadable: boolean) => {
        return JSON.stringify(this, null, humanReadable ? 2 : 0);
    }
}

class Table {
    name: string
    cols: string[]
    rows: object[]
    schema: ajv.SchemaObject

    constructor(name: string, cols: string[], schema: ajv.SchemaObject, rows?: object[]) {
        this.name = name;
        this.cols = cols;
        if (rows) this.rows = rows;
        this.schema = schema;
    }

    alterTable = (changes: { cols: string[], schema: object, name?: string }, database: Database) => {
        if (changes.cols) {
            if (!changes.schema) {
                if (changes.cols.length != Object.keys(this.schema).length) throw new Error("Schema does not match columns.");
                changes.cols.forEach(x => {
                    if (Object.keys(this.schema).indexOf(x) == -1) throw new Error("Schema does not match columns.");
                });
            } else {
                if (changes.cols.length != Object.keys(changes.schema).length) throw new Error("Schema does not match columns.");
                changes.cols.forEach(x => {
                    if (Object.keys(changes.schema).indexOf(x) == -1) throw new Error("Schema does not match columns.");
                });
            }

            this.schema.properties = changes.schema;
        }
        if (changes.schema) {
            if (!changes.cols) {
                if (this.cols.length != Object.keys(changes.schema).length) throw new Error("Schema does not match columns.");
                this.cols.forEach(x => {
                    if (Object.keys(changes.schema).indexOf(x) == -1) throw new Error("Schema does not match columns.");
                });
            } else {
                if (changes.cols.length != Object.keys(changes.schema).length) throw new Error("Schema does not match columns.");
                changes.cols.forEach(x => {
                    if (Object.keys(changes.schema).indexOf(x) == -1) throw new Error("Schema does not match columns.");
                });
            }

            this.schema.properties = changes.schema;
        }
        if (changes.name) {
            if (database.tables.find(x => x.name == changes.name)) throw new Error(`Table "${changes.name}" already exists.`)

            this.name = changes.name;
        }
    }

    createRow = (row: object) => {
        if (!new Ajv().compile(this.schema)(row)) throw new Error(`Error while inserting new row into "${this.name}"
            ${JSON.stringify(row)} does not match
            ${JSON.stringify(this.schema.properties)}.`); 

        if (!this.rows) this.rows = [];
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

module.exports = { LimeDB }