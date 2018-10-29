const path = require("path");
const solc = require("solc");
const fs = require("fs-extra");

const buildPath = path.resolve(__dirname, "build");

// Remove build folder.
fs.removeSync(buildPath);

const leaderboardPath = path.resolve(__dirname, "contracts", "leaderboard", "Leaderboard.sol");
const safeMathPath = path.resolve(__dirname, "contracts", "leaderboard", "math", "SafeMath.sol");
const input = {
  sources: {
    "Leaderboard.sol": fs.readFileSync(leaderboardPath, "utf8"),
    "SafeMath.sol": fs.readFileSync(safeMathPath, "utf8")
  }
}

const output = solc.compile(input, 1).contracts;
console.log('o', output);
fs.ensureDirSync(buildPath);

for (let contract in output) {
  const filename = contract.split(".")[0];
  fs.outputJsonSync(
    path.resolve(buildPath, `${filename}.json`),
    output[contract]
  );
}

console.log('compile successful!');
