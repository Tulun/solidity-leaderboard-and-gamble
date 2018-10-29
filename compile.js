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
const source = fs.readFileSync(leaderboardPath, "utf8");
const output = solc.compile(source, 1).contracts;

fs.ensureDirSync(buildPath);

for (let contract in output) {
  console.log(contract, output)
  fs.outputJsonSync(
    path.resolve(buildPath, `${contract.replace(":", "")}.json`),
    output[contract]
  );
}

console.log('compile successful!');