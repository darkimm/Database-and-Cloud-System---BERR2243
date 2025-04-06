const { MongoClient } = require('mongodb');

const drivers = [
    {
        name: "John Doe",
        vehicleType: "Sedan",
        isAvailable: true,
        rating: 4.8
    },
    {
        name: "Alice Smith",
        vehicleType: "SUV",
        isAvailable: false,
        rating: 4.5
    }
];

console.log(drivers); //show the data in console

drivers.forEach((name) => console.log(name));

drivers.push({
    name: "Alice Smith",
        vehicleType: "SUV",
        isAvailable: false,
        rating: 4.5
});

async function main(){

    const uri = "mongodb://localhost:27017"
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const db = client.db("testDB");
        const collection = db.collection("users");

        //insert document
        await collection.insertOne({ name: "Hakim", age : 22});
        console.log("Document inserted!");

        //Query the document
        const result = await collection.findOne({ name: "Hakim"});
        console.log("Query result:", result);
    } catch(err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

main();
// 