const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const compiledLeaderboard = require('../build/Leaderboard.json');
let accounts, leaderboard;

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

beforeEach( async () => {
  // Get a list of all accounts;
  accounts = await web3.eth.getAccounts();

  leaderboard = await new web3.eth.Contract(JSON.parse(compiledLeaderboard.interface))
    .deploy({ data: compiledLeaderboard.bytecode, arguments: ["Ping Pong"] })
    .send({ from: accounts[0], gas: '1000000' });

});

describe("Leaderboard", () => {
  it("deploys a contract", () => {
    assert.ok(leaderboard.options.address);
  });

  it("Adds new players to the contract", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });
    
    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    const p1 = await leaderboard.methods.players(0).call();
    const p2 = await leaderboard.methods.players(1).call();
    assert.equal(p1.name, "Jason");
    assert.equal(p2.name, "George");

    const p1Added = await leaderboard.methods.playersAdded(p1.playerAddress);
    const p2Added = await leaderboard.methods.playersAdded(p2.playerAddress);

    assert(p1Added);
    assert(p2Added);
  });
  

  it("Prevents a new player from being added if their address exists", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    try {
      await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
        from: accounts[0],
        gas: '1000000'
      });
      assert.fail("Second player was added when it shouldn't.")
    } 
    catch (err) {
      assert(err);
    };
  });

  it("Can create a game", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("0.1", "ether")
    })

    const game = await leaderboard.methods.game().call();
    assert.equal(game.id, 1);
    assert.equal(game.firstPlayer, accounts[0]);
    assert.equal(game.secondPlayer, NULL_ADDRESS);
    assert.equal(game.pot, web3.utils.toWei("0.1", "ether"));
  })
  
});
