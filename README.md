[Reference]: <> (https://github.com/mysqljs/mysql)

# lime·light
/ˈlīmˌlīt/

_noun_
<br>
&nbsp;&nbsp;the focus of public attention.

<br>

[![NPM Version](https://img.shields.io/npm/v/limelightdb.svg)](https://github.com/imaperson1060/limelight)
[![NPM Weekly Downloads](https://img.shields.io/npm/dw/limelightdb)](https://github.com/imaperson1060/limelight)

<br>

**Database initialization:**
```ts
new LimelightDB(filepath: string, humanReadable: boolean, key: string | null).initialize();
```
If you want to decrypt your database before initialization, add the `decrypt(...)` method before the `initialize()` method.
```ts
new LimelightDB(filepath: string, humanReadable: boolean, key: string | null).decrypt(key: string).initialize();
```

<br>

**Database structure:**
```json
{
  "table": {
    "cols": [
      "example",
      "example2"
    ],
    "rows": [
      {
        "example": "test",
        "example2": null
      }
    ]
  }
}
```

<br>

**Database interaction:**
```ts
alter(table: string, changes: { schema: object, name: string, autoId: boolean })
select(table: string, filter: Function, limit?: number)
create(table: string, cols: string[], schema: object, autoId: boolean)
insert(table: string, row: object)
update(table: string, filter: Function, row: object)
delete(table: string, filter: Function)
```

<br>

**Schema examples**
<br>
This uses [AJV](https://ajv.js.org), so more details can be found there. User made schemas are only the `properties` property in the AJV schema object.
<br>
(Warning: Only the `type` property is guaranteed to work; everything else is "use at your own risk")
```json
{
  "example": {
    "type": "string"
  },
  "example2": {
    "type": "null"
  }
}
```


<br>

**Filter examples:**
```ts
(x => x.example == "test")    // Returns row
(x => x["example"] == "test") // Returns row
(x => x.example2 == null)     // Returns row
(x => true)                   // Returns row
(x => x.example == null)      // Doesn't return row
(x => x.example2 == "test")   // Doesn't return row
(x => false)                  // Doesn't return row
```

<br>

**v2.0.6 Changelog**
* Fix bug in `update(...)` schema validation if using `autoId`

**v2.0.5 Changelog**
* Allow `decrypt(...)` method to be called before initialization

**v2.0.4 Changelog**
* Revert accidental publish

**v2.0.3 Changelog**
* Change error message when schema doesn't match while running `update(...)`

**v2.0.2 Changelog**
* Revert transpilation (because people without TypeScript installed would not be able to do it)

**v2.0.1 Changelog**
* Fix "Initialization" section in README

**v2.0.0 Changelog**
* Fix MAJOR bug that prevented any file other than `db.json` from being read
* Rename class to `LimelightDB` from `LimeDB`
* Replace default JSON file with a new .limelight file (requires manual renaming)
* Add `encrypted` property to the database class
* Automatically assign an ID when `autoId` is `true`
* Remove option to replace all columns in table with `alter(...)`
* Replace rows that don't match updated schema with `0` or `null` (when using `alter(...)`)
* Update tests

**v1.1.0 Changelog**
* Make JSON human readable when encrypted
* Add `autoId` to `Table` class
* Update tests

**v1.0.0 Changelog**
* `LimeDB` class
* Encryption/Decryption
* `alter(...)`, `select(...)`, `create(...)`, `insert(...)`, `update(...)`, `delete(...)`
* Add tests file