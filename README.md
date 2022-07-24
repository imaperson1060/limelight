[Reference]: <> (https://github.com/mysqljs/mysql)

# lime·light
/ˈlīmˌlīt/

_noun_
<br>
&nbsp;&nbsp;the focus of public attention.

<br>

<img src="assets/limelight.png" width="256" height="256" style="border-radius:50%;">

<br>

[![NPM Version](https://img.shields.io/npm/v/limelightdb.svg)](https://github.com/imaperson1060/limelight)
[![NPM Weekly Downloads](https://img.shields.io/npm/dw/limelightdb)](https://npm-stat.com/charts.html?package=limelightdb)

<br>

**Import Limelight**
```ts
const { LimelightDB } = require("limelightdb"); // CommonJS
const Lime = require("limelightdb"); // CommonJS, for accessing all classes (Lime.LimelightDB, Lime.Database, Lime.Table)

import { LimelightDB } from "limelightdb"; // ES6
import * as Lime from "limelightdb"; // ES6, for accessing all classes (Lime.LimelightDB, Lime.Database, Lime.Table)
```

<br>

**Database initialization:**
```ts
new LimelightDB(filepath: string, humanReadable: boolean, key: string | null, port?: number).initialize();
```
If you want to decrypt your database before initialization, add the `decrypt(...)` method before the `initialize()` method.
```ts
new LimelightDB(filepath: string, humanReadable: boolean, key: string | null, port?: number).decrypt(key: string).initialize();
```
Providing a port will start an HTTP server on that port that can be used to access/modify your database externally, provided the port isn't already taken. You can interact with this server using the [Sublime Admin Panel](https://sublime.imaperson.dev).

<br>

**Database structure:**
```json
{
  "filename": "db.limelight",
  "humanReadable": true,
  "key": "secret_encryption_key",
  "encrypted": true,
  "tables": [
    {
      "name": "table",
      "cols": [
        "example",
        "example2"
      ],
      "rows": [
        {
          "example": "test",
          "example2": null
        }
      ],
      "schema": {
        "example": {
          "type": "string"
        },
        "example2": {
          "type": "null"
        }
      },
      "autoId": true
    }
  ]
}
```

<br>

**Database interaction:**
```ts
alter(table: string, changes: { schema: object, name: string, autoId: boolean })
select(table: string, filter: Function, limit?: number)
create(table: string, cols: string[], schema: object, autoId: boolean)
insert(table: string, rows: object[])
update(table: string, filter: Function, row: object)
delete(table: string, filter: Function)

read()
```
Interactions can also be done externally if a port is provided for the HTTP server to run on.
<br>
<br>
NOTE: For security, the server will only start if a key is required. Because the filter is just a JavaScript function, it could lead to remote code execution.
<br>
<br>
**General Syntax**: `/query?type={{INTERACTION_TYPE}}&table={{TABLE_NAME}}&key={{ENCRYPTION_KEY}}`
<br>
For additional parameters, use the same key names as are listed above.
<br>
All parameters must be [URI Encoded](https://www.urlencoder.org/). (`(x => true)` --> `%28x%20%3D%3E%20true%29`)
<br>
**Examples:**
```
GET /query?type=select&table=table&filter=%28x%20%3D%3E%20true%29&limit=5&key=secret_encryption_key
GET /query?type=alter&table=table&changes=%7B%20%22schema%22%3A%20%7B%20%22example%22%3A%20%7B%20%22type%22%3A%20%22number%22%20%7D%20%7D%20%7D&key=secret_encryption_key
```
Responses will have a `success` boolean, and depending on that, either `code` (error code) or `response`.
```json
{
  "success": false,
  "code": "NO_INTERACTION_TYPE"
}

{
  "success": true,
  "response": [
    {
      "example": "test",
      "example2": null
    }
  ]
}
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

**v3.1.4 Changelog**
* Bugfix the bugfix of the bugfix

**v3.1.3 Changelog**
* Bugfix the bugfix

**v3.1.2 Changelog**
* Convert strings to numbers to appease AJV

**v3.1.1 Changelog**
* Always redownload Sublime

**v3.1.0 Changelog**
* Add Sublime admin panel
* Fix bugs with schema/columns when altering table

**v3.0.0 Changelog**
* Add HTTP server for external editing (very _Sublime_)

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