pragma solidity ^0.4.24;

contract Leaderboard {
  // initialize variables
  struct Player {
      string name;
      address playerAddress;
      uint wins;
      uint losses;
      uint ties;
      uint numDisputedGames;
  }
  
  Player[] public players;
  address private owner;
  mapping(address => bool) public playersAdded;
  string public game;
  
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }
  
  constructor(string leaderboardGame) public {
    game = leaderboardGame;
    owner = msg.sender;
  }
  
  function addPlayer(string name) public {
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
}
