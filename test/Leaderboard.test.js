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
    .send({ from: accounts[0], gas: '3000000' });

});

describe("Leaderboard", () => {
  it("deploys a contract", () => {
    assert.ok(leaderboard.options.address);
    console.log(leaderboard)
  });

  describe("Adding players", () => {
    beforeEach( async () => {
      await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
        from: accounts[0],
        gas: '1000000'
      });
      
      await leaderboard.methods.addPlayerToLeaderboard("George").send({
        from: accounts[1],
        gas: '1000000'
      });
    });

    it("Adds new players to the contract", async () => {

      const p1 = await leaderboard.methods.players(0).call();
      const p2 = await leaderboard.methods.players(1).call();
      assert.equal(p1.name, "Jason");
      assert.equal(p2.name, "George");
  
      const p1Added = await leaderboard.methods.playersAdded(p1.playerAddress);
      const p2Added = await leaderboard.methods.playersAdded(p2.playerAddress);
  
      assert(p1Added);
      assert(p2Added);
  
      const totalNumPlayers = await leaderboard.methods.totalNumPlayers().call();
  
      assert.equal(totalNumPlayers, 2);
    });
    
  
    it("Prevents a new player from being added if their address exists", async () => {
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
  });

  describe("It can create a game", () => {
    beforeEach( async () => { 
      await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
        from: accounts[0],
        gas: '1000000'
      });

      await leaderboard.methods.addPlayerToLeaderboard("George").send({
        from: accounts[1],
        gas: '1000000'
      });

      await leaderboard.methods.addPlayerToLeaderboard("Tim").send({
        from: accounts[2],
        gas: '1000000'
      });
    });

    it("Can create a game", async () => {
      await leaderboard.methods.createGame().send({
        from: accounts[0],
        gas: "1000000",
        value: web3.utils.toWei("1", "ether")
      })
  
      const game = await leaderboard.methods.game().call();
      assert.equal(game.id, 1);
      assert.equal(game.firstPlayer, accounts[0]);
      assert.equal(game.secondPlayer, NULL_ADDRESS);
      assert.equal(game.bet, web3.utils.toWei("1", "ether"));
      assert.equal(game.pot, web3.utils.toWei("1", "ether"));
      assert.equal(game.winner, NULL_ADDRESS);
    });
  })
  
  describe("Players interacting with game", () => {
    beforeEach( async() => {
      await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
        from: accounts[0],
        gas: '1000000'
      });

      await leaderboard.methods.addPlayerToLeaderboard("George").send({
        from: accounts[1],
        gas: '1000000'
      });

      await leaderboard.methods.addPlayerToLeaderboard("Tim").send({
        from: accounts[2],
        gas: '1000000'
      });

      await leaderboard.methods.createGame().send({
        from: accounts[0],
        gas: "1000000",
        value: web3.utils.toWei("1", "ether")
      })
    });

    it("prevents a second game from being created while one exists", async () => {
      try {
        await leaderboard.methods.createGame().send({
          from: accounts[0],
          gas: "1000000",
          value: web3.utils.toWei("1", "ether")
        })
        assert.fail("Second game call was successful when it should throw.");
      }
      catch (err) {
        assert(err);
      }
    });

    it("prevents a user from creating a game if they haven't registered on the board", async () => {
      try {
        await leaderboard.methods.createGame().send({
          from: accounts[3],
          gas: "1000000",
          value: web3.utils.toWei("1", "ether")
        });
        assert.fail("Game was created without a user registering.");
      }
      catch (err) {
        assert(err);
      }
    });

    it("Add a second player to a game", async () => {
      await leaderboard.methods.addSecondPlayerToGame().send({
        from: accounts[1],
        gas: "1000000",
        value: web3.utils.toWei("1", "ether")
      })
  
      const game = await leaderboard.methods.game().call();
      assert.equal(game.secondPlayer, accounts[1]);
      assert.equal(game.pot, web3.utils.toWei("2", "ether"));
    })

    it("Prevents a 3rd player from entering the game", async () => {
      await leaderboard.methods.addSecondPlayerToGame().send({
        from: accounts[1],
        gas: "1000000",
        value: web3.utils.toWei("1", "ether")
      })
  
      try {
        await leaderboard.methods.addSecondPlayerToGame().send({
          from: accounts[2],
          gas: "1000000",
          value: web3.utils.toWei("1", "ether")
        });
        assert.fail("addSecondPlayerToGame call didn't throw an error, although a third player tried to come in.");
      }
      catch (err) {
        assert(err);
      }
    });

    it("Forces a user to send the correct bet value", async  () => {
      try {
        await leaderboard.methods.addSecondPlayerToGame().send({
          from: accounts[1],
          gas: "1000000",
          value: web3.utils.toWei("2", "ether")
        })
        assert.fail("Second player was added without sending in the correct bet amount")
      }
      catch (err) {
        assert(err)
      }
  
      try {
        await leaderboard.methods.addSecondPlayerToGame().send({
          from: accounts[1],
          gas: "1000000",
        });
        assert.fail("Second player was added without sending any bet amount");
      }
      catch (err) {
        assert(err)
      }
    });

    it("Allows first player to choose a winner", async () => {
      await leaderboard.methods.addSecondPlayerToGame().send({
        from: accounts[1],
        gas: "1000000",
        value: web3.utils.toWei("1", "ether")
      });
  
      await leaderboard.methods.chooseWinner("first").send({
        from: accounts[0],
        gas: "1000000",
      });
  
      const game = await leaderboard.methods.game().call();
      assert.equal(game.declaredWinnerFirstPlayer, "first");
    });

    it("Allows second player to choose a winner", async () => {
      await leaderboard.methods.addSecondPlayerToGame().send({
        from: accounts[1],
        gas: "1000000",
        value: web3.utils.toWei("1", "ether")
      });
  
      await leaderboard.methods.chooseWinner("second").send({
        from: accounts[1],
        gas: "1000000",
      });
  
      const game = await leaderboard.methods.game().call();
      assert.equal(game.declaredWinnerSecondPlayer, "second");
    });
  })
  
  it("Only allows first, second, or tie as the chooseWinner string", async() => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("first").send({
      from: accounts[0],
      gas: "1000000",
    });

    let game = await leaderboard.methods.game().call();
    assert.equal(game.declaredWinnerFirstPlayer, "first");

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[0],
      gas: "1000000",
    });

    game = await leaderboard.methods.game().call();
    assert.equal(game.declaredWinnerFirstPlayer, "second");

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[0],
      gas: "1000000",
    });

    game = await leaderboard.methods.game().call();
    assert.equal(game.declaredWinnerFirstPlayer, "tie");

  })

  it("Prevents a user from sending in an incorrect string to chooseWinner", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    try {
      await leaderboard.methods.chooseWinner("third").send({
        from: accounts[0],
        gas: "1000000",
      });
      assert.fail("A string that isn't first or second or tie was accepted.")
    }
    catch(err) {
      assert(err);
    }
  })

  it("Prevents a user who is not playing the game from changing the winner", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("first").send({
      from: accounts[0],
      gas: "1000000",
    });

    // From a player not even on the board
    try {
      await leaderboard.methods.chooseWinner("first").send({
        from: accounts[2],
        gas: "1000000"
      });
      assert.fail("A person not on the board was able to choose the winner.")
    } 
    catch(err) {
      assert(err);
    };

    // Member adds itself to board, attempts to try.
    await leaderboard.methods.addPlayerToLeaderboard("Tim").send({
      from: accounts[2],
      gas: '1000000'
    });

    try {
      await leaderboard.methods.chooseWinner("first").send({
        from: accounts[2],
        gas: "1000000"
      });
      assert.fail("A person not in the game was able to choose the winner.")
    } 
    catch(err) {
      assert(err);
    };
  });

  it("Pays out the firstPlayer when both users agree on firstPlayer", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    const initialBalance = await web3.eth.getBalance(accounts[0]) / 10 ** 18;

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("first").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("first").send({
      from: accounts[1],
      gas: "1000000",
    });

    const newBalance = await web3.eth.getBalance(accounts[0]) / 10 ** 18;

    assert(newBalance > initialBalance);
  });

  it("Pays out the secondPlayer when both users agree on secondPlayer", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    const initialBalance = await web3.eth.getBalance(accounts[1]) / 10 ** 18;

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[1],
      gas: "1000000",
    });

    const newBalance = await web3.eth.getBalance(accounts[1]) / 10 ** 18;

    assert(newBalance > initialBalance);
  });

  it("Game returns to initial state after payout", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[1],
      gas: "1000000",
    });

    const game = await leaderboard.methods.game().call();
    assert.equal(game.id, 1);
    assert.equal(game.firstPlayer, NULL_ADDRESS);
    assert.equal(game.secondPlayer, NULL_ADDRESS);
    assert.equal(game.bet, 0);
    assert.equal(game.pot, 0);
    assert.equal(game.winner, NULL_ADDRESS);
    assert.equal(game.declaredWinnerFirstPlayer, "");
    assert.equal(game.declaredWinnerSecondPlayer, "");

    const gameInProgress = await leaderboard.methods.gameInProgress().call();
    assert.equal(gameInProgress, false);
  });

  it("After payout, winner gets a win added, loser gets a loss added", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[1],
      gas: "1000000",
    });

    const p1 = await leaderboard.methods.players(0).call();
    const p2 = await leaderboard.methods.players(1).call();

    assert.equal(p2.wins, 1);
    assert.equal(p1.wins, 0);
    assert.equal(p1.losses, 1);
    assert.equal(p2.losses, 0);
  });

  it("If both members agree it's a tie, they both get a tie added to their stats", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[1],
      gas: "1000000",
    });

    const p1 = await leaderboard.methods.players(0).call();
    const p2 = await leaderboard.methods.players(1).call();

    assert.equal(p2.ties, 1);
    assert.equal(p1.ties, 1);
  });

  it("In the event of a tie, game should be reset", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[1],
      gas: "1000000",
    });

    const game = await leaderboard.methods.game().call();
    assert.equal(game.id, 1);
    assert.equal(game.firstPlayer, NULL_ADDRESS);
    assert.equal(game.secondPlayer, NULL_ADDRESS);
    assert.equal(game.bet, 0);
    assert.equal(game.pot, 0);
    assert.equal(game.winner, NULL_ADDRESS);
    assert.equal(game.declaredWinnerFirstPlayer, "");
    assert.equal(game.declaredWinnerSecondPlayer, "");

    const gameInProgress = await leaderboard.methods.gameInProgress().call();
    assert.equal(gameInProgress, false);
  });

  it("Refunds the user in the event of a tie", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[1],
      gas: "1000000",
    });


  })

  it("If both members disagree on outcome, they get a disputed outcome added to their stats", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("first").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("second").send({
      from: accounts[1],
      gas: "1000000",
    });

    const p1 = await leaderboard.methods.players(0).call();
    const p2 = await leaderboard.methods.players(1).call();

    assert.equal(p2.numDisputedGames, 1);
    assert.equal(p1.numDisputedGames, 1);
  })

  it("In the event of a dispute, game should be reset", async () => {
    await leaderboard.methods.addPlayerToLeaderboard("Jason").send({
      from: accounts[0],
      gas: '1000000'
    });

    await leaderboard.methods.addPlayerToLeaderboard("George").send({
      from: accounts[1],
      gas: '1000000'
    });

    await leaderboard.methods.createGame().send({
      from: accounts[0],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.addSecondPlayerToGame().send({
      from: accounts[1],
      gas: "1000000",
      value: web3.utils.toWei("1", "ether")
    });

    await leaderboard.methods.chooseWinner("first").send({
      from: accounts[0],
      gas: "1000000",
    });

    await leaderboard.methods.chooseWinner("tie").send({
      from: accounts[1],
      gas: "1000000",
    });
    
    const game = await leaderboard.methods.game().call();
    assert.equal(game.id, 1);
    assert.equal(game.firstPlayer, NULL_ADDRESS);
    assert.equal(game.secondPlayer, NULL_ADDRESS);
    assert.equal(game.bet, 0);
    assert.equal(game.pot, 0);
    assert.equal(game.winner, NULL_ADDRESS);
    assert.equal(game.declaredWinnerFirstPlayer, "");
    assert.equal(game.declaredWinnerSecondPlayer, "");

    const gameInProgress = await leaderboard.methods.gameInProgress().call();
    assert.equal(gameInProgress, false);
  })
  
});
