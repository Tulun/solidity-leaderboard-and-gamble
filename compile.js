const path = require("path");
const solc = require("solc");
const fs = require("fs-extra");

const buildPath = path.resolve(__dirname, "build");

// Remove build folder.
fs.removeSync(buildPath);

const leaderboardPath = path.resolve(__dirname, "contracts", "leaderboard", "Leaderboard.sol");
const safeMathPath = path.resolve(__dirname, "contracts", "leaderboard", "SafeMath.sol");
const reentrancyGuardPath = path.resolve(__dirname, "contracts", "leaderboard", "ReentrancyGuard.sol");

const input = {
  sources: {
    "Leaderboard.sol": fs.readFileSync(leaderboardPath, "utf8"),
    "SafeMath.sol": fs.readFileSync(safeMathPath, "utf8"),
    "ReentrancyGuard.sol": fs.readFileSync(reentrancyGuardPath, "utf8")
  }
}

const output = solc.compile(input, 1);
console.log('o', output, output.contracts);
const contracts = output.contracts;
fs.ensureDirSync(buildPath);

for (let contract in contracts) {
  const filename = contract.split(".")[0];
  console.log(`interface for ${contract}: `, contracts[contract].interface)
  fs.outputJsonSync(
    path.resolve(buildPath, `${filename}.json`),
    contracts[contract]
  );
}

console.log('compile successful!');
console.log('Your ABIs might need to be updated on any frontend apps.')
