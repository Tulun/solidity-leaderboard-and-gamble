# Solidity Leaderboard w/ stakes

## Things I should be able to do V1

- [x] Register players for leaderboard. Identify by name.
- [x] Start a game between 2 players only.
- [x] Determine winner. (Players should both sign off)
- [x] Track stats (Win, Losses, Ties, Undetermined )
- [x] Handle disputes (If both players don't agree, money gets returned)
- [x] Timeouts ( Games must be completed within a predetermined period)

## V2
- [] Multiple games can be played at the same time.
- [] Players can change their name
- [] Owner can cancel games and return funds.
- [] Reset all player stats (seasons)
- [] Compatible with FUEL.

## V3
- [ ] Round robin style tournaments


## Public functions (V1)

Structs:

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
  string declaredWinnerFirstPlayer;
  string declaredWinnerSecondPlayer;
}

Public variables:

- players <Player[]>. Array of Player structs 
- game <Game>.
- gameInProgress <boolean>.
- totalNumPlayers <uint>.
- gameType <string>. Type of game played on leaderboard, declared on constructor.

Events:
UpdateGameProgress <bool>
PlayerUpdated <uint>. Index of player in players.
GameUpdated <uint>. Id of game being played


1) addPlayerToLeaderboard(<string> name)
Address of the sender gets added to the playerboard. Required to unlock many of the functions in the app.

2) createGame() payable.
Requires being on leaderboard. Create a game if no game is in progress. Sender becomes player one.

If you want the game to have odds, sender just needs to send in some value of ETH.

3) addSecondPlayerToGame() payable.
Requires sender is on leaderboard, and a game has been created. Adds sender to player two slot.
If player one has put ETH into the contract on game creation, player two will have to match that ETH amount exactly.

4) chooseWinner(<string> _declaredWinner)
Requires sender to be in Leaderboard and game has been started.
Both players need to send a transaction to this function in order to resolve the game.

_declaredWinner can have the following values: first, second, tie.
If both players agree on a result, game resolves (and pays out) based on inputed data. If they disagree, game resolves in a dispute, and both players get their ETH back.

5) closeGame() 
Sender must be in leaderboard, game must be started. 
This will end immediatelly. Any ETH will be sent back to the respective owners.

