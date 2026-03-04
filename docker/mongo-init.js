db = db.getSiblingDB("admin")

db.createUser({
	user: "mongoquest_readonly",
	pwd: "mongoquest",
	roles: [{ role: "readAnyDatabase", db: "admin" }],
})

db.createUser({
	user: "mongoquest_writer",
	pwd: "mongoquest",
	roles: [{ role: "readWriteAnyDatabase", db: "admin" }],
})

print("MongoQuest users created successfully")
