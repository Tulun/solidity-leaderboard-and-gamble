pragma solidity ^0.4.24;

import "./SafeMath.sol";


contract Leaderboard {
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
  }
    
  Player[] public players;
  Game public game;
  address private owner;
  mapping(address => bool) public playersAdded;
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
      winner: address(0)
    });
  }

  function addSecondPlayerToGame() public payable playerInLeaderboard gameStarted {
    require(msg.sender != game.firstPlayer);
    require(game.secondPlayer == address(0));
    require(msg.value == game.bet);
    
    game.secondPlayer = msg.sender;
    game.pot = game.pot + msg.value;
  }

  function testEmptyString(bytes str) private pure returns (bool) {
    // If the byte length is zero, we know the string is empty. 
    return bytes(str).length > 0;
  }

}
