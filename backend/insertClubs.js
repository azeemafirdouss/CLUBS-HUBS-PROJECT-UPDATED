


const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const Club = require('./models/Clubs');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.log("❌ DB Error:", err));

const clubs = [
  { name: "Organisation Committee", slug: "organisation-committee", description: "Handles all event organization.", image: "organisation.png", headUsername: "Ocommittee-head" },
  { name: "Public Relations", slug: "public-relations", description: "Manages PR and outreach.", image: "publicrelation.png", headUsername: "Publicrelation-head" },
  { name: "Aalap", slug: "aalap", description: "Music and club.", image: "Aalap.png", headUsername: "Aalap-head" },
  { name: "Abhinaya", slug: "abhinaya", description: "Drama and theatre club.", image: "Abhinaya.png", headUsername: "Abhinaya-head" },
  { name: "Aakarshan", slug: "aakarshan", description: "Art club.", image: "akarshan.png", headUsername: "Akarshan-head" },
  { name: "Kreeda Sports Club", slug: "kreeda-sports-club", description: "Sports and games club.", image: "Kreeda.png", headUsername: "Kreeda-head" },
  { name: "Mudra", slug: "mudra", description: "Dance club.", image: "Mudra.png", headUsername: "Mudra-head" },
  { name: "Traces of Lenses", slug: "traces-of-lenses", description: "Photography club.", image: "Traces.png", headUsername: "Traces-head" },
  { name: "Kaivalya", slug: "kaivalya", description: "Yoga and wellness club.", image: "Kaivalya.png", headUsername: "Kaivalya-head" },
  { name: "Kmitra", slug: "kmitra", description: "Innovation and technology club.", image: "Kmitra.png", headUsername: "Kmitra-head" },
  { name: "Recurse", slug: "recurse", description: "Coding and algorithms club.", image: "Recurse.png", headUsername: "Rescurse-head" },
  { name: "Vachan", slug: "vachan", description: "Literature and reading club.", image: "vachan.png", headUsername: "Vachan-head" }
];

async function insertClubs() {
  try {
    await Club.deleteMany({});
    console.log("🗑 Old data deleted");

    await Club.insertMany(clubs);
    console.log("✅ Clubs inserted successfully!");

  } catch (err) {
    console.error("❌ ERROR:", err);
  } finally {
    mongoose.disconnect();
  }
}

insertClubs();