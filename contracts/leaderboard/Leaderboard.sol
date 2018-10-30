pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./StringUtils.sol";
import "./ReentrancyGuard.sol";


contract Leaderboard is ReentrancyGuard {
  using SafeMath for uint256;

  // initialize variables
  struct Player {
    string name;
    address playerAddress;
    uint256 wins;
    uint256 losses;
    uint256 ties;
    uint256 numDisputedGames;
  }
  
  struct Game {
    uint256 id;
    address firstPlayer;
    address secondPlayer;
    uint256 bet;
    uint256 pot;
    address winner;
    string declaredWinnerFirstPlayer;
    string declaredWinnerSecondPlayer;
  }
    
  Player[] public players;
  Game public game;
  address private owner;
  mapping(address => bool) public playersAdded;
  mapping(address => Player) public player;
  mapping(address => uint256) public playerIndex;
  uint256 public gameId;
  bool public gameInProgress;
  string public gameType;
  
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
      declaredWinnerSecondPlayer: ""
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
  // _declaredWinner must be either: first or second.
  function chooseWinner(string _declaredWinner) public playerInLeaderboard gameStarted {
    require(msg.sender == game.firstPlayer || msg.sender == game.secondPlayer);
    bool correctString = StringUtils.equal(_declaredWinner, "first") || StringUtils.equal(_declaredWinner, "second");
    require(correctString);

    if (msg.sender == game.firstPlayer) {
      game.declaredWinnerFirstPlayer = _declaredWinner;
    }
    
    if (msg.sender == game.secondPlayer) {
      game.declaredWinnerSecondPlayer = _declaredWinner;  
    }
    
    if (StringUtils.equal(game.declaredWinnerFirstPlayer, game.declaredWinnerSecondPlayer)) {
      if (StringUtils.equal(game.declaredWinnerFirstPlayer, "first")) {
        payoutWinner(game.firstPlayer);
      } else {
        payoutWinner(game.secondPlayer);
      }
    }
  }
  
  function payoutWinner(address _player) private playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];
    uint256 pot = game.pot;

    if (_player == game.firstPlayer) {
      p1.wins++;
      p2.losses++;
    } else {
      p1.losses++;
      p2.wins++;
    }
    game.firstPlayer = address(0);
    game.secondPlayer = address(0);
    game.bet = 0;
    game.pot = 0;
    game.declaredWinnerFirstPlayer = "";
    game.declaredWinnerSecondPlayer = "";
    gameInProgress = false;
    
    if (pot > 0) {
      _player.transfer(pot);
    }
  }

  function testEmptyString(bytes str) private pure returns (bool) {
    // If the byte length is zero, we know the string is empty. 
    return bytes(str).length > 0;
  }

}
