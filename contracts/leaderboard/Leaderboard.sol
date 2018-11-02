pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./StringUtils.sol";
import "./ReentrancyGuard.sol";


contract Leaderboard is ReentrancyGuard, StringUtils {
  using SafeMath for uint;

  // initialize variables
  struct Player {
    string name;
    address playerAddress;
    uint wins;
    uint losses;
    uint ties;
    uint numDisputedGames;
  }
  
  struct Game {
    uint id;
    address firstPlayer;
    address secondPlayer;
    uint bet;
    uint pot;
    address winner;
    string declaredWinnerFirstPlayer;
    string declaredWinnerSecondPlayer;
    uint startTime;
  }
    
  Player[] public players;
  Game public game;
  address private owner;
  mapping(address => bool) public playersAdded;
  mapping(address => Player) public player;
  mapping(address => uint) public playerIndex;
  uint public gameId;
  bool public gameInProgress;
  string public gameType;
  uint public totalNumPlayers;
  
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  modifier playerInLeaderboard() {
    require(playersAdded[msg.sender]);
    _;
  }

  modifier gameStarted() {
    require(gameInProgress);
    _;
  }

  modifier noGame() {
    require(!gameInProgress);
    _;
  }
  
  constructor(string _gameType) public {
    require(testEmptyString(bytes(_gameType)));
    owner = msg.sender;
    gameType = _gameType;
    gameId = 0;
    gameInProgress = false;
  }
    
  function addPlayerToLeaderboard(string name) public {
    bytes memory tempEmptyStringTest = bytes(name);
    require(testEmptyString(bytes(name)));
    require(tempEmptyStringTest.length > 0);
    // Make sure this particular address hasn't been added yet.
    require(!playersAdded[msg.sender]);
    
    playersAdded[msg.sender] = true;
    Player memory newPlayer = Player({
      name: name,
      playerAddress: msg.sender,
      wins: 0,
      losses: 0,
      ties: 0,
      numDisputedGames: 0
    });
    
    players.push(newPlayer);
    playerIndex[msg.sender] = players.length - 1;
    totalNumPlayers++;
  }
    
  function createGame() public payable playerInLeaderboard noGame {
    gameInProgress = true;
    gameId++;
    game = Game({
      id: gameId,
      firstPlayer: msg.sender,
      secondPlayer: address(0),
      bet: msg.value,
      pot: msg.value,
      winner: address(0),
      declaredWinnerFirstPlayer: "",
      declaredWinnerSecondPlayer: "",
      startTime: now
    });
  }

  function addSecondPlayerToGame() public payable playerInLeaderboard gameStarted {
    require(msg.sender != game.firstPlayer);
    require(game.secondPlayer == address(0));
    require(msg.value == game.bet);
    
    game.secondPlayer = msg.sender;
    game.pot = game.pot + msg.value;
  }

    // There is no technical oracle on this contract -- this is mostly a handshake deal.
  // Both players will have to send a message in declaring who won. If there is a dispute
  // The game will end up returning the individual funds.
  // _declaredWinner must be either: first or second or tie.
  function chooseWinner(string _declaredWinner) public playerInLeaderboard gameStarted {
    require(msg.sender == game.firstPlayer || msg.sender == game.secondPlayer);
    bool correctString = StringUtils.equal(_declaredWinner, "first") || 
      StringUtils.equal(_declaredWinner, "second") || 
      StringUtils.equal(_declaredWinner, "tie");
    require(correctString);

    if (msg.sender == game.firstPlayer) {
      game.declaredWinnerFirstPlayer = _declaredWinner;
    }
    
    if (msg.sender == game.secondPlayer) {
      game.declaredWinnerSecondPlayer = _declaredWinner;  
    }
    
    // If both strings aren't empty, check if they match or not.
    if (testEmptyString(bytes(game.declaredWinnerFirstPlayer)) &&
     testEmptyString(bytes(game.declaredWinnerSecondPlayer))) {

      if (StringUtils.equal(game.declaredWinnerFirstPlayer, game.declaredWinnerSecondPlayer)) {
        if (StringUtils.equal(game.declaredWinnerFirstPlayer, "first")) {
          payoutWinner(game.firstPlayer);
        }
        if (StringUtils.equal(game.declaredWinnerFirstPlayer, "second")) {
          payoutWinner(game.secondPlayer);
        }
        
        if (StringUtils.equal(game.declaredWinnerFirstPlayer, "tie")) {
          endGameInTie();
        }
        
      }
      
      if (!(StringUtils.equal(game.declaredWinnerFirstPlayer, game.declaredWinnerSecondPlayer)) ) {
          endGameWithDispute();
      }
      
    }
      
  }

  function closeGameIfTimedout() public playerInLeaderboard gameStarted {
    if (now >= game.startTime + 1 hours) {
      Player storage p1 = players[playerIndex[game.firstPlayer]];
      Player storage p2 = players[playerIndex[game.secondPlayer]];
      p1.numDisputedGames++;
      p2.numDisputedGames++;
      if (game.pot == game.bet) {
        p1.playerAddress.transfer(game.pot);
      } else {
        p1.playerAddress.transfer(game.pot / 2);
        p2.playerAddress.transfer(game.pot / 2);
      }
      resetGame();
    }
  }
  
  function payoutWinner(address _player) private playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];
    if (game.pot > 0) {
      _player.transfer(game.pot);
    }
    if (_player == game.firstPlayer) {
      p1.wins++;
      p2.losses++;
    } else {
      p1.losses++;
      p2.wins++;
    }
    
    resetGame();
  }
  
  function endGameInTie() private playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];
    p1.ties++;
    p2.ties++;
    
    refundPlayers();
    resetGame();
  }
  
  function endGameWithDispute() private playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];

    p1.numDisputedGames++;
    p2.numDisputedGames++;
    
    refundPlayers();
    resetGame();
  }
  
  function refundPlayers() private playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];

    uint refund = game.pot / 2;
    if (game.pot > 0) {
      p1.playerAddress.transfer(refund);
      p2.playerAddress.transfer(refund);
    }
  }
  
  function resetGame() private playerInLeaderboard gameStarted {
    game.firstPlayer = address(0);
    game.secondPlayer = address(0);
    game.bet = 0;
    game.pot = 0;
    game.declaredWinnerFirstPlayer = "";
    game.declaredWinnerSecondPlayer = "";
    gameInProgress = false;
  }

  function testEmptyString(bytes str) private pure returns (bool) {
    // If the byte length is zero, we know the string is empty. 
    return bytes(str).length > 0;
  }

}
