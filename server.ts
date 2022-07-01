import * as http from "http"; // Yes, I know Express exists, I just want to keep this as lightweight as possible (currently only one dependency!)
import * as Lime from "./index";

export function startServer(db: Lime.LimelightDB) {
    http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
    
        const responses = {
            success: (response?: Object[] | Lime.Database) => JSON.stringify({ "success": true, response }, null, 2),
            failure: (code: string) => JSON.stringify({ "success": false, code }, null, 2)
        }
    
        switch (req.url?.slice(1, 6)) {
            case "query":
                var q = new URL(`http://localhost:${db.port}${req.url}`).searchParams;
                
                if (!q.has("type")) return res.end(responses.failure("NO_INTERACTION_TYPE"));
                
                if (!q.has("key") || q.get("key") != db.key) return res.end(responses.failure("INVALID_KEY"));
    
                if (!q.has("table") && q.get("type") != "read") return res.end(responses.failure("NO_TABLE_NAME"));
    
                if (q.get("type") != "create" && q.get("type") != "read" && !db.read().tables.find(x => x.name == q.get("table"))) return res.end(responses.failure("INVALID_TABLE"));

                switch (q.get("type")) {
                    case "alter":
                        var table = q.get("table") || ""; // TypeScript doesn't allow possible null :P
                        var changes = JSON.parse(q.get("changes") || "[]"); // TypeScript doesn't allow possible null :P
    
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
                        if (!q.has("filter")) return res.end(responses.failure("NO_FILTER"));
    
                        var filter;
                        try {
                            var testFilter;
    
                            eval(`testFilter = ${q.get("filter")}`);
    
                            [ "test" ].filter(x => testFilter(x));
    
                            filter = testFilter;
                        } catch (e) {
                            return res.end(responses.failure("INVALID_FILTER"));
                        }
    
                        var table = q.get("table") || ""; // TypeScript doesn't allow possible null :P
    
                        var limit;
                        try {
                            limit = parseInt(q.get("limit") || "NaN :P");
                        } catch (e) {}
    
                        res.end(responses.success(db.select(table, filter, limit)));
                        
                        break;
                    case "create":
                        var table = q.get("table") || ""; // TypeScript doesn't allow possible null :P
                        var cols = JSON.parse(q.get("cols") || "[]"); // TypeScript doesn't allow possible null :P
                        var schema = JSON.parse(q.get("schema") || "[]"); // TypeScript doesn't allow possible null :P
                        var autoId = !!q.get("autoId") || false; // TypeScript doesn't allow possible null :P
    
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
                        var table = q.get("table") || ""; // TypeScript doesn't allow possible null :P
                        var rows = JSON.parse(q.get("rows") || "[]"); // TypeScript doesn't allow possible null :P
    
                        if (rows.length == 0) return res.end(responses.failure("INVALID_ROW"));
    
                        try {
                            db.insert(table, rows);
                        } catch (e) {
                            return res.end(responses.failure("INVALID_ROW"));
                        }
    
                        res.end(responses.success());
                        
                        break;
                    case "update":
                        if (!q.has("filter")) return res.end(responses.failure("NO_FILTER"));
    
                        var filter;
                        try {
                            var testFilter;
    
                            eval(`testFilter = ${q.get("filter")}`);
    
                            [ "test" ].filter(x => testFilter(x));
    
                            filter = testFilter;
                        } catch (e) {
                            return res.end(responses.failure("INVALID_FILTER"));
                        }
    
                        var table = q.get("table") || ""; // TypeScript doesn't allow possible null :P
                        var row = JSON.parse(q.get("row") || "[]"); // TypeScript doesn't allow possible null :P
    
                        if (row.length == 0) return res.end(responses.failure("INVALID_ROW"));
    
                        try {
                            db.update(table, filter, row);
                        } catch (e) {
                            return res.end(responses.failure("INVALID_ROW"));
                        }
    
                        res.end(responses.success());
                        
                        break;
                    case "delete":
                        if (!q.has("filter")) return res.end(responses.failure("NO_FILTER"));
    
                        var filter;
                        try {
                            var testFilter;
    
                            eval(`testFilter = ${q.get("filter")}`);
    
                            [ "test" ].filter(x => testFilter(x));
    
                            filter = testFilter;
                        } catch (e) {
                            return res.end(responses.failure("INVALID_FILTER"));
                        }
    
                        var table = q.get("table") || ""; // TypeScript doesn't allow possible null :P
    
                        db.delete(table, filter);
    
                        res.end(responses.success());
                        
                        break;
                    case "read":
                        res.end(responses.success(db.read()));
                        break;
                    default:
                        res.end(responses.failure("INVALID_TYPE"));
                }
    
                break;
            default:
                res.statusCode = 404;
                res.end();
        }
    }).listen(db.port);
}