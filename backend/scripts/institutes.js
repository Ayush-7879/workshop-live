// Platform owner tool. Run from the backend folder:
//   npm run institutes                       -> list institutes and their codes
//   npm run institutes -- create "Name"      -> create an institute and print its codes
require("dotenv").config();
const mongoose = require("mongoose");
const Institute = require("../models/Institute");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "create") {
    const name = rest.join(" ").trim();
    if (!name) throw new Error('Usage: npm run institutes -- create "Institute name"');
    const inst = await Institute.create({
      name,
      studentCode: Institute.generateCode("STU"),
      adminCode: Institute.generateCode("ADM"),
    });
    console.log(`Created "${inst.name}"\n  Student code: ${inst.studentCode}\n  Admin code:   ${inst.adminCode}`);
  } else {
    const all = await Institute.find().sort({ createdAt: 1 });
    if (!all.length) console.log("No institutes yet.");
    all.forEach((i) =>
      console.log(`${i.name}\n  Student code: ${i.studentCode}\n  Admin code:   ${i.adminCode}`)
    );
  }
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
