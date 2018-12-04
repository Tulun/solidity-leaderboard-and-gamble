pragma solidity ^0.4.24;

import "./SafeMath.sol";
import "./ReentrancyGuard.sol";

contract Leaderboard is ReentrancyGuard {
  using SafeMath for uint;

  // initialize variables
  struct Player {
    uint id;
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
    WinnerChoices declaredWinnerFirstPlayer;
    WinnerChoices declaredWinnerSecondPlayer;
  }

  enum WinnerChoices {
    Undefined,
    First,
    Second,
    Tie
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

  event UpdateGameProgress(bool _gameInProgress);
  event PlayerUpdated(uint _id);
  event GameUpdated(uint _id);

  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner can call this function.");
    _;
  }

  modifier playerInLeaderboard() {
    require(playersAdded[msg.sender], "Sender must be in leaderboard.");
    _;
  }

  modifier gameStarted() {
    require(gameInProgress, "Game must be started.");
    _;
  }

  modifier noGame() {
    require(!gameInProgress, "Game must not be in progress.");
    _;
  }
  
  constructor(string _gameType) public {
    require(testEmptyString(bytes(_gameType)), "Game type string must be given a value.");
    owner = msg.sender;
    gameType = _gameType;
    gameId = 0;
    gameInProgress = false;
  }

  // Revert transactions on default
  function() public payable {
    revert();
  }
    
  function addPlayerToLeaderboard(string name) public {
    require(testEmptyString(bytes(name)), "Name string is empty.");
    // Make sure this particular address hasn't been added yet.
    require(!playersAdded[msg.sender], "Player has already been added.");
    
    playersAdded[msg.sender] = true;
    Player memory newPlayer = Player({
      id: players.length,
      name: name,
      playerAddress: msg.sender,
      wins: 0,
      losses: 0,
      ties: 0,
      numDisputedGames: 0
    });
    
    player[msg.sender] = newPlayer;
    players.push(newPlayer);
    playerIndex[msg.sender] = players.length - 1;
    totalNumPlayers++;

    // Send up the index so dApps can look up the new user.
    emit PlayerUpdated(players.length - 1);
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
      declaredWinnerFirstPlayer: WinnerChoices.Undefined,
      declaredWinnerSecondPlayer: WinnerChoices.Undefined
    });

    emit UpdateGameProgress(gameInProgress);
    emit GameUpdated(game.id);
  }

  function addSecondPlayerToGame() public payable playerInLeaderboard gameStarted {
    require(msg.sender != game.firstPlayer, "Sender is already first player.");
    require(game.secondPlayer == address(0), "Second player has already signed up.");
    require(msg.value == game.bet, "Value sent it must equal bet value.");
    
    game.secondPlayer = msg.sender;
    game.pot = game.pot + msg.value;
    emit GameUpdated(game.id);
  }

    // There is no technical oracle on this contract -- this is mostly a handshake deal.
  // Both players will have to send a message in declaring who won. If there is a dispute
  // The game will end up returning the individual funds.
  // _declaredWinner must be either: first or second or tie.
  function chooseWinner(uint _declaredWinner) public playerInLeaderboard gameStarted {
    require(msg.sender == game.firstPlayer || msg.sender == game.secondPlayer, "Only players in game can call chooselWinner.");
    require(_declaredWinner > 0 && _declaredWinner < 4);
    
    WinnerChoices choice;

    if (_declaredWinner == 1) {
      choice = WinnerChoices.First;
    } 
    if (_declaredWinner == 2) {
      choice = WinnerChoices.Second;
    }

    if (_declaredWinner == 3) {
      choice = WinnerChoices.Tie;
    }

    if (msg.sender == game.firstPlayer) {
      game.declaredWinnerFirstPlayer = choice;
    }
    
    if (msg.sender == game.secondPlayer) {
      game.declaredWinnerSecondPlayer = choice;  
    }

    emit GameUpdated(game.id);
    
    // If both strings aren't empty, check if they match or not.


    if (game.declaredWinnerFirstPlayer != WinnerChoices.Undefined && game.declaredWinnerSecondPlayer != WinnerChoices.Undefined) {

      if (game.declaredWinnerFirstPlayer == game.declaredWinnerSecondPlayer) {
        if (game.declaredWinnerFirstPlayer == WinnerChoices.First) {
          payoutWinner(game.firstPlayer);
        }

        if (game.declaredWinnerFirstPlayer == WinnerChoices.Second) {
          payoutWinner(game.secondPlayer);
        }
        
        if (game.declaredWinnerFirstPlayer == WinnerChoices.Tie) {
          endGameInTie();
        }
      } else {
        endGameWithDispute();
      }
      
    }
      
  }

  function closeGame() public playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];
    p1.numDisputedGames++;
    p2.numDisputedGames++;

    // Update players in mapping.
    player[p1.playerAddress] = p1;
    player[p2.playerAddress] = p2;

    if (game.pot == game.bet) {
      p1.playerAddress.transfer(game.pot);
    } else {
      p1.playerAddress.transfer(game.pot / 2);
      p2.playerAddress.transfer(game.pot / 2);
    }
    resetGame();
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

    // Update players in mapping.
    player[p1.playerAddress] = p1;
    player[p2.playerAddress] = p2;

    emit PlayerUpdated(p1.id);
    emit PlayerUpdated(p2.id);
    resetGame();
  }
  
  function endGameInTie() private playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];
    p1.ties++;
    p2.ties++;
    
    // Update players in mapping.
    player[p1.playerAddress] = p1;
    player[p2.playerAddress] = p2;

    emit PlayerUpdated(p1.id);
    emit PlayerUpdated(p2.id);

    refundPlayers();
    resetGame();
  }
  
  function endGameWithDispute() private playerInLeaderboard gameStarted {
    Player storage p1 = players[playerIndex[game.firstPlayer]];
    Player storage p2 = players[playerIndex[game.secondPlayer]];

    p1.numDisputedGames++;
    p2.numDisputedGames++;
    
    // Update players in mapping.
    player[p1.playerAddress] = p1;
    player[p2.playerAddress] = p2;

    emit PlayerUpdated(p1.id);
    emit PlayerUpdated(p2.id);

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
    game.declaredWinnerFirstPlayer = WinnerChoices.Undefined;
    game.declaredWinnerSecondPlayer = WinnerChoices.Undefined;
    gameInProgress = false;

    emit GameUpdated(game.id);
    emit UpdateGameProgress(gameInProgress);
  }

  function testEmptyString(bytes str) private pure returns (bool) {
    // If the byte length is zero, we know the string is empty. 
    return bytes(str).length > 0;
  }

}
