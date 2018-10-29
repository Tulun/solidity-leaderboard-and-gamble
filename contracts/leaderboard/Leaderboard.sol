pragma solidity ^0.4.24;

import "./SafeMath.sol";


contract Leaderboard {
  using SafeMath for uint256;

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
  }
    
  Player[] public players;
  Game public game;
  address private owner;
  mapping(address => bool) public playersAdded;
  uint public gameId;
  bool public gameInProgress;
  
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }
  
  constructor() public {
    owner = msg.sender;
    gameId = 0;
    gameInProgress = false;
  }
    
  function addPlayerToLeaderboard(string name) public {
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
    
  function createGame() public payable {
    require(!gameInProgress);
    require(playersAdded[msg.sender]);
    require(msg.value > 0);

    gameInProgress = true;
    game = Game({
        id: gameId++,
        firstPlayer: msg.sender,
        secondPlayer: address(0),
        bet: msg.value,
        pot: msg.value,
        winner: address(0)
    });
  }

  function addSecondPlayerToGame() public payable {
    require(gameInProgress);
    require(playersAdded[msg.sender]);
    require(msg.sender != game.firstPlayer);
    require(game.secondPlayer == address(0));
    require(msg.value == game.bet);
    
    game.secondPlayer = msg.sender;
    game.pot = game.pot + msg.value;
  }

}
