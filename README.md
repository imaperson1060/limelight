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
new LimeDB(filepath: string, humanReadable: boolean, key: string | null).initialize();
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
alter(table: string, changes: { }) // COMING SOON (probably 2.0)
select(table: string, filter: Function, limit?: number)
create(table: string, cols: string[], schema: object/* See below */, autoID: boolean) // AUTO ID COMING SOON (probably 1.1)
insert(table: string, row: object)
update(table: string, filter: Function, row: object)
delete(table: string, filter: Function)
```

<br>

**Schema examples**
<br>
This uses [AJV](https://ajv.js.org), so more details can be found there. User made schemas are only the `properties` property in the AJV schema object.
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