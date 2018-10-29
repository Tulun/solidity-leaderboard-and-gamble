const path = require("path");
const solc = require("solc");
const fs = require("fs-extra");

const buildPath = path.resolve(__dirname, "build");

// Remove build folder.
fs.removeSync(buildPath);

// var input = {
//   'strings.sol': fs.readFileSync('strings.sol', 'utf8'),
//   'StringLib.sol': fs.readFileSync('StringLib.sol', 'utf8'),
//   'Killable.sol': fs.readFileSync('Killable.sol', 'utf8'),
//   'Ownable.sol': fs.readFileSync('Ownable.sol', 'utf8'),
//   'LMS.sol': fs.readFileSync('LMS.sol', 'utf8')
// };
// let compiledContract = solc.compile({sources: input}, 1);

const leaderboardPath = path.resolve(__dirname, "contracts", "leaderboard", "Leaderboard.sol");
const safeMathPath = path.resolve(__dirname, "contracts", "math", "SafeMath.sol");
const input = {
  "Leaderboard.sol": fs.readFileSync(leaderboardPath, "utf8"),
  "SafeMath.sol": fs.readFileSync(safeMathPath, "utf8")
}

const output = solc.compile({sources: input}, 1).contracts;
console.log('o', output);
fs.ensureDirSync(buildPath);

for (let contract in output) {
  console.log('c', contract);
  const filename = contract.split(".")[0];
  fs.outputJsonSync(
    path.resolve(buildPath, `${filename}.json`),
    output[contract]
  );
}

console.log('compile successful!');