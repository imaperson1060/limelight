import * as http from "http"; // Yes, I know Express exists, I just want to keep this as lightweight as possible (currently only one dependency!)
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import { parse } from "querystring";

import * as Lime from "./index";

export function startServer(db: Lime.LimelightDB) : http.Server {
    https.get("https://sublime.imaperson.dev/limelight.json", (res) => {
        let body = "";
    
        res.on("data", (chunk) => {
            body += chunk;
        });

        res.on("end", () => {
            try {
                let sublime = JSON.parse(body);

                    sublime.files.forEach(x => {
                        fs.mkdirSync(`${path.parse(require.resolve(".")).dir}/sublime/${path.parse(x).dir}`, { recursive: true });

                        const file = fs.createWriteStream(`${path.parse(require.resolve(".")).dir}/sublime/${x}`);
                        https.get(`https://sublime.imaperson.dev/${x}`, function(response) {
                            response.pipe(file);
                        });
                    });
            } catch (e) { }
        });
    });
    
    return http.createServer((req, res) => {
        const responses = {
            success: (response?: Object[] | Lime.Database | Object) => JSON.stringify({ "success": true, response }, null, 2),
            failure: (code: string) => JSON.stringify({ "success": false, code }, null, 2)
        }
    
        if (req.method == "GET") {
            if (new URL(req.url || "/", "http://localhost").pathname == "/") {
                res.writeHead(200, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST",
                    "Content-Type": "text/html"
                });

                return res.end(fs.readFileSync(`${path.parse(require.resolve(".")).dir}/sublime/index.html`))
            } else if (fs.existsSync(`${path.parse(require.resolve(".")).dir}/sublime/${req.url}`)) {
                res.writeHead(200, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST",
                    "Content-Type": path.parse(new URL(req.url || "/", "http://localhost").pathname).ext == ".html" ? "text/html" : path.parse(req.url || "").ext == ".js" ? "text/javascript" : path.parse(req.url || "").ext == ".css" ? "text/css" : path.parse(req.url || "").ext == ".png" ? "image/png" : "text/plain"
                });

                return res.end(fs.readFileSync(`${path.parse(require.resolve(".")).dir}/sublime/${req.url}`));
            } else {
                res.statusCode = 404;
                return res.end("404 not found");
            }
        }

        if (req.method != "POST") return res.end(responses.failure("INVALID_REQ_TYPE"));
        if (req.headers["content-type"]?.indexOf("application/x-www-form-urlencoded") == -1) return res.end(responses.failure("INVALID_CONTENT_TYPE"));

        res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Content-Type": "application/json"
        });

        let body = "";
        
        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", () => {
            let q = parse(body);
            Object.keys(q).forEach(x => {
                let key = q[x];

                if (typeof key != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"))
                q[x] = decodeURIComponent(key);
            });
            
            if (!q["type"]) return res.end(responses.failure("NO_INTERACTION_TYPE"));

            if ((!q["key"] || q["key"] != db.key) && q["type"] != "info") return res.end(responses.failure("INVALID_KEY"));
    
        switch (req.url?.slice(1, 6)) {
            case "query":
                    if (!q["table"] && q["type"] != "read") return res.end(responses.failure("NO_TABLE_NAME"));
    
                    if (q["type"] != "create" && q["type"] != "read" && !db.read().tables.find(x => x.name == q["table"])) return res.end(responses.failure("INVALID_TABLE"));
    
                    switch (q["type"]) {
                        case "alter":
                            if (typeof q["table"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));
                            if (typeof q["changes"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));

                            var table = q["table"];
                            var changes = JSON.parse(q["changes"]);
    
                            if (!changes["schema"] && !changes["name"] && !changes["autoId"]) return res.end(responses.failure("INVALID_JSON"));
                            if ((changes["schema"] && Object.keys(changes["schema"] || []).length == 0) || (changes["name"] && typeof changes["name"] != "string") || (changes["autoId"] && typeof changes["autoId"] != "boolean")) return res.end(responses.failure("INVALID_JSON"));
    
                            try {
                                db.alter(table, changes);
                            } catch (e) {
                                return res.end(responses.failure("INVALID_JSON"));
                            }
    
                            res.end(responses.success());
    
                            break;
                        case "select":
                            if (!q["filter"]) return res.end(responses.failure("NO_FILTER"));
                            if (typeof q["table"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));
                            if (q["limit"] && typeof q["limit"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));

                            var filter;
                            try {
                                var testFilter;
    
                                eval(`testFilter = ${q["filter"]}`);
    
                                [ "test" ].filter(x => testFilter(x));
    
                                filter = testFilter;
                            } catch (e) {
                                return res.end(responses.failure("INVALID_FILTER"));
                            }
    
                            var table = q["table"];
    
                            var limit;
                            try {
                                if (q["limit"] && typeof q["limit"] == "string") limit = parseInt(q["limit"]);
                            } catch (e) {}
    
                            res.end(responses.success(db.select(table, filter, limit)));
    
                            break;
                        case "create":
                            if (typeof q["table"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));
                            if (typeof q["cols"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));
                            if (typeof q["schema"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));


                            var table = q["table"];
                            var cols = JSON.parse(q["cols"]);
                            var schema = JSON.parse(q["schema"]);
                            var autoId = !!q["autoId"];
    
                            if (cols.length == 0) return res.end(responses.failure("INVALID_JSON"));
                            if (Object.keys(schema).length == 0) return res.end(responses.failure("INVALID_JSON"));
    
                            try {
                                db.create(table, cols, schema, autoId);
                            } catch (e) {
                                return res.end(responses.failure("INVALID_JSON"));
                            }
    
                            res.end(responses.success());
    
                            break;
                        case "insert":
                            if (typeof q["table"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));
                            if (typeof q["rows"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));

                            var table = q["table"];
                            var rows = JSON.parse(q["rows"]);
    
                            if (rows.length == 0) return res.end(responses.failure("INVALID_ROW"));
    
                            try {
                                db.insert(table, rows);
                            } catch (e) {
                                return res.end(responses.failure("INVALID_ROW"));
                            }
    
                            res.end(responses.success());
    
                            break;
                        case "update":
                            if (!q["filter"]) return res.end(responses.failure("NO_FILTER"));
                            if (typeof q["table"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));
                            if (typeof q["row"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));

    
                            var filter;
                            try {
                                var testFilter;
    
                                eval(`testFilter = ${q["filter"]}`);
    
                                [ "test" ].filter(x => testFilter(x));
    
                                filter = testFilter;
                            } catch (e) {
                                return res.end(responses.failure("INVALID_FILTER"));
                            }
    
                            var table = q["table"];
                            var row = JSON.parse(q["row"]);
    
                            if (row.length == 0) return res.end(responses.failure("INVALID_ROW"));
    
                            try {
                                db.update(table, filter, row);
                            } catch (e) {
                                return res.end(responses.failure("INVALID_ROW"));
                            }
    
                            res.end(responses.success());
    
                            break;
                        case "delete":
                            if (!q["filter"]) return res.end(responses.failure("NO_FILTER"));
                            if (typeof q["table"] != "string") return res.end(responses.failure("INVALID_QUERY_TYPE"));

                            var filter;
                            try {
                                var testFilter;
    
                                eval(`testFilter = ${q["filter"]}`);
    
                                [ "test" ].filter(x => testFilter(x));
    
                                filter = testFilter;
                            } catch (e) {
                                return res.end(responses.failure("INVALID_FILTER"));
                            }
    
                            var table = q["table"];
    
                            db.delete(table, filter);
    
                            res.end(responses.success());
                            
                            break;
                        default:
                            res.end(responses.failure("INVALID_TYPE"));
                    }
    
                    break;
                case "admin":
                    switch (q["type"]) {
                        case "info":
                            res.end(responses.success({ name: path.basename(db.filename, path.extname(db.filename)), version: db.version, uptime: Math.round(process.uptime()) }));
                            break;
                        case "login":
                            res.end(responses.success()); // Because it already fails if the key isn't valid above
                            break;
                        case "import":
                            const imtype = q["imtype"] || "json";
    
                            switch (imtype) {
                                case "json":
                                    break;
                                case "csv":
                                    break;
                                case "xml":
                                    break;
                                case "html":
                                    break;
                                default:
                                    res.end(responses.failure("INVALID_EXTYPE"));
                            }

                            break;
                        case "export":
                            res.end(JSON.stringify(db.read(), null, 2));
                            break;
                        case "read":
                            res.end(responses.success(db.read()));
                            break;
                        default:
                            res.end(responses.failure("INVALID_TYPE"));
                    }

                    break;
                default:
                    res.end(responses.failure("INVALID_PATH"));
            }
        });


    }).listen(db.port);
}
                        
    