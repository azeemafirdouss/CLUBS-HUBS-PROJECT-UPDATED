const mongoose = require('mongoose');
const MONGO_URI = "mongodb://127.0.0.1:27017/kmit-club";

function escapeRegex(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

const clubSchema = new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true, required: true },
    headUsername: { type: String, unique: true, sparse: true },
    description: String,
    image: String
});

const clubHeadSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    name: String,
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' },
    isActive: { type: Boolean, default: true }
});

const Club = mongoose.model('Club', clubSchema);
const ClubHead = mongoose.model('ClubHead', clubHeadSchema);

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // Simulate /clubhead/dashboard
        const clubHead = await ClubHead.findOne({ username: "Mudra-head" });
        console.log("Found ClubHead:", clubHead);

        if (!clubHead) {
            console.log("Clubhead not found in DB");
            await mongoose.disconnect();
            return;
        }

        let clubData = await Club.findById(clubHead.club);
        console.log("Direct findById(clubHead.club):", clubData);

        if (!clubData) {
            console.log("Self-healing query headUsername pattern:", `^${escapeRegex(clubHead.username)}$`);
            const correctClub = await Club.findOne({ headUsername: { $regex: new RegExp(`^${escapeRegex(clubHead.username)}$`, 'i') } });
            console.log("Found correct club through regex matching headUsername:", correctClub);
            if (correctClub) {
                clubHead.club = correctClub._id;
                await clubHead.save();
                console.log("Saved clubhead with updated club ID:", correctClub._id);
                clubData = await Club.findById(correctClub._id);
                console.log("Refetched club data:", clubData);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
