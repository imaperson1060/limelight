const { LimelightDB } = require("..");

const database = new LimelightDB("db.limelight", true, "secret_encryption_key").initialize();

try { // Create the table if it does not exist
    database.create("fruits", [ "name", "yumyum" ], {
        "name": {
            "type": "string"
        },
        "yumyum": {
            "type": "boolean"
        }
    }, true);    
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

database.update("fruits", (x => x.name == "Apple"), { name: "Apple Inc.", yumyum: false });

database.alter("fruits", {
    "name": "furits"
});

console.log("Not yum yum fruits:", database.select("furits", (x => !x.yumyum))); // Shows only elements that are not yumyum

database.alter("furits", { // Add color property
    "schema": {
        "name": {
            "type": "string"
        },
        "yumyum": {
            "type": "boolean"
        },
        "color": {
            "type": "string"
        }
    }
});

console.log("All fruits (new color property demo):", database.select("furits", (x => true))); // Show all elements in the table

database.alter("furits", { // Remove color property
    "schema": {
        "name": {
            "type": "string"
        },
        "yumyum": {
            "type": "boolean"
        }
    }
});

console.log("All fruits (removed color property demo):", database.select("furits", (x => true))); // Show all elements in the table

database.delete("furits", (x => true)); // Delete all fruits

console.log("Haha fruits go poof:", database.select("furits", (x => true)));

database.alter("furits", {
    "name": "fruits",
});