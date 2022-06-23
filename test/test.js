const { LimeDB } = require("limelightdb");

const database = new LimeDB("db", true).initialize();

try { // Create the table if it does not exist
    database.create("fruits", [ "name", "yumyum" ], {
        "name": {
            "type": "string"
        },
        "yumyum": {
            "type": "boolean"
        }
    });    
} catch (e) { /* Table already exists */ }

database.insert("fruits", [{ // Insert 4 fruits into the table
    "name": "Apple",
    "yumyum": true
}, {
    "name": "Orange",
    "yumyum": true
}, {
    "name": "Banana",
    "yumyum": true
}, {
    "name": "Durian", // Google it if you don't think it's real
    "yumyum": false
}]);

console.log("All fruits:", database.select("fruits", (x => true))); // Show all elements in the table

console.log("First 2 fruits:", database.select("fruits", (x => true), 2)); // Show only the first 2 elements (apple and orange)

database.update("fruits", (x => x.name == "Apple"), { name: "Apple Inc.", yumyum: false })

console.log("Not yum yum fruits:", database.select("fruits", (x => !x.yumyum))); // Shows only elements that are not yumyum

database.delete("fruits", (x => true)); // Delete all fruits

console.log("Haha fruits go poof:", database.select("fruits", (x => true)));