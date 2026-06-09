export interface RosterPlayer {
  id: string;
  key: string;
  name: string;
  mlbName: string;
  team: string;
  position: string;
  spreadsheetHomeRuns: number;
}

export interface RosterTeam {
  id: string;
  name: string;
  owner: string;
  players: string[];
}

export const LEAGUE_SEASON = 2026;

export const rosterPlayers: RosterPlayer[] = [
  { id: "592450", key: "JUDGE, AARON", name: "Aaron Judge", mlbName: "Aaron Judge", team: "", position: "RF", spreadsheetHomeRuns: 8 },
  { id: "701350", key: "ROMAN, ANTHONY", name: "Anthony Roman", mlbName: "Roman Anthony", team: "", position: "LF", spreadsheetHomeRuns: 1 },
  { id: "677951", key: "WITT JR, BOBBY", name: "Bobby Witt Jr.", mlbName: "Bobby Witt Jr.", team: "", position: "SS", spreadsheetHomeRuns: 0 },
  { id: "667670", key: "ROOKER, BRENT", name: "Brent Rooker", mlbName: "Brent Rooker", team: "", position: "DH", spreadsheetHomeRuns: 2 },
  { id: "547180", key: "HARPER, BRYCE", name: "Bryce Harper", mlbName: "Bryce Harper", team: "", position: "1B", spreadsheetHomeRuns: 4 },
  { id: "621439", key: "BUXTON, BYRON", name: "Byron Buxton", mlbName: "Byron Buxton", team: "", position: "CF", spreadsheetHomeRuns: 3 },
  { id: "663728", key: "RALEIGH, CAL", name: "Cal Raleigh", mlbName: "Cal Raleigh", team: "", position: "C", spreadsheetHomeRuns: 2 },
  { id: "666624", key: "MOREL, CHRIS", name: "Chris Morel", mlbName: "Christopher Morel", team: "", position: "1B", spreadsheetHomeRuns: 0 },
  { id: "641355", key: "BELLINGER, CODY", name: "Cody Bellinger", mlbName: "Cody Bellinger", team: "", position: "LF", spreadsheetHomeRuns: 1 },
  { id: "695657", key: "MONTGOMERY, COLSON", name: "Colson Montgomery", mlbName: "Colson Montgomery", team: "", position: "SS", spreadsheetHomeRuns: 3 },
  { id: "553993", key: "SUAREZ, EUGENIO", name: "Eugenio Suarez", mlbName: "Eugenio Suarez", team: "", position: "DH", spreadsheetHomeRuns: 2 },
  { id: "665487", key: "TATIS JR, FERNANDO", name: "Fernando Tatis Jr.", mlbName: "Fernando Tatis Jr.", team: "", position: "RF", spreadsheetHomeRuns: 0 },
  { id: "596019", key: "LINDOR, FRANCISCO", name: "Francisco Lindor", mlbName: "Francisco Lindor", team: "", position: "SS", spreadsheetHomeRuns: 1 },
  { id: "518692", key: "FREEMAN, FREDDY", name: "Freddie Freeman", mlbName: "Freddie Freeman", team: "", position: "1B", spreadsheetHomeRuns: 3 },
  { id: "543807", key: "SPRINGER, GEORGE", name: "George Springer", mlbName: "George Springer", team: "", position: "DH", spreadsheetHomeRuns: 2 },
  { id: "683002", key: "HENDERSON, GUNNAR", name: "Gunnar Henderson", mlbName: "Gunnar Henderson", team: "", position: "SS", spreadsheetHomeRuns: 6 },
  { id: "695506", key: "CAGLIANONE, JAC", name: "Jac Caglianone", mlbName: "Jac Caglianone", team: "", position: "RF", spreadsheetHomeRuns: 0 },
  { id: "702616", key: "HOLIDAY, JACKSON", name: "Jackson Holliday", mlbName: "Jackson Holliday", team: "", position: "2B", spreadsheetHomeRuns: 0 },
  { id: "695578", key: "WOOD, JAMES", name: "James Wood", mlbName: "James Wood", team: "", position: "RF", spreadsheetHomeRuns: 5 },
  { id: "608070", key: "RAMIREZ, JOSE", name: "Jose Ramirez", mlbName: "Jose Ramirez", team: "", position: "3B", spreadsheetHomeRuns: 4 },
  { id: "673962", key: "JUNG, JOSH", name: "Josh Jung", mlbName: "Josh Jung", team: "", position: "3B", spreadsheetHomeRuns: 1 },
  { id: "665742", key: "SOTO, JUAN", name: "Juan Soto", mlbName: "Juan Soto", team: "", position: "LF", spreadsheetHomeRuns: 1 },
  { id: "677594", key: "RODRIGUEZ, JULIO", name: "Julio Rodriguez", mlbName: "Julio Rodriguez", team: "", position: "CF", spreadsheetHomeRuns: 1 },
  { id: "691406", key: "CAMINERO, JUNIOR", name: "Junior Caminero", mlbName: "Junior Caminero", team: "", position: "3B", spreadsheetHomeRuns: 4 },
  { id: "700932", key: "MANZARDO, KYLE", name: "Kyle Manzardo", mlbName: "Kyle Manzardo", team: "", position: "1B", spreadsheetHomeRuns: 1 },
  { id: "656941", key: "SCHWARBER, KYLE", name: "Kyle Schwarber", mlbName: "Kyle Schwarber", team: "", position: "DH", spreadsheetHomeRuns: 6 },
  { id: "621566", key: "OLSON, MATT", name: "Matt Olson", mlbName: "Matt Olson", team: "", position: "1B", spreadsheetHomeRuns: 5 },
  { id: "683737", key: "BUSCH, MICHAEL", name: "Michael Busch", mlbName: "Michael Busch", team: "", position: "1B", spreadsheetHomeRuns: 0 },
  { id: "701762", key: "KURTZ, NICK", name: "Nick Kurtz", mlbName: "Nick Kurtz", team: "", position: "1B", spreadsheetHomeRuns: 1 },
  { id: "665833", key: "CRUZ, O'NEIL", name: "O'Neil Cruz", mlbName: "Oneil Cruz", team: "", position: "CF", spreadsheetHomeRuns: 5 },
  { id: "624413", key: "ALONSO, PETE", name: "Pete Alonso", mlbName: "Pete Alonso", team: "", position: "1B", spreadsheetHomeRuns: 2 },
  { id: "691718", key: "CROW-ARMSTRONG, PETE", name: "Pete Crow-Armstrong", mlbName: "Pete Crow-Armstrong", team: "", position: "CF", spreadsheetHomeRuns: 1 },
  { id: "646240", key: "DEVERS, RAFAEL", name: "Rafael Devers", mlbName: "Rafael Devers", team: "", position: "1B", spreadsheetHomeRuns: 2 },
  { id: "682985", key: "GREENE, RILEY", name: "Riley Greene", mlbName: "Riley Greene", team: "", position: "LF", spreadsheetHomeRuns: 1 },
  { id: "660670", key: "ACUNA JR, RONALD", name: "Ronald Acuna Jr.", mlbName: "Ronald Acuna Jr.", team: "", position: "RF", spreadsheetHomeRuns: 1 },
  { id: "694212", key: "BASALLO, SAMUEL", name: "Samuel Basallo", mlbName: "Samuel Basallo", team: "", position: "C", spreadsheetHomeRuns: 3 },
  { id: "669127", key: "LANGELIERS, SHEA", name: "Shea Langeliers", mlbName: "Shea Langeliers", team: "", position: "C", spreadsheetHomeRuns: 6 },
  { id: "660271", key: "OHTANI, SHOHEI", name: "Shohei Ohtani", mlbName: "Shohei Ohtani", team: "", position: "TWP", spreadsheetHomeRuns: 5 },
  { id: "679529", key: "TORKELSON, SPENCER", name: "Spencer Torkelson", mlbName: "Spencer Torkelson", team: "", position: "1B", spreadsheetHomeRuns: 0 },
  { id: "686469", key: "PASQUINTINO, VINNIE", name: "Vinnie Pasquintino", mlbName: "Vinnie Pasquantino", team: "", position: "1B", spreadsheetHomeRuns: 1 },
  { id: "665489", key: "GUERRERO JR, VLAD", name: "Vladimir Guerrero Jr.", mlbName: "Vladimir Guerrero Jr.", team: "", position: "1B", spreadsheetHomeRuns: 1 },
  { id: "670541", key: "ALVAREZ, YORDAN", name: "Yordan Alvarez", mlbName: "Yordan Alvarez", team: "", position: "DH", spreadsheetHomeRuns: 7 },
];

const playerIdByKey = rosterPlayers.reduce<Record<string, string>>((playersByKey, player) => {
  playersByKey[player.key] = player.id;
  return playersByKey;
}, {});

export const rosterTeams: RosterTeam[] = [
  createRosterTeam("paulino-sotomayor", "Paulino Sotomayor", ["JUDGE, AARON", "ALVAREZ, YORDAN", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "CAMINERO, JUNIOR", "RAMIREZ, JOSE", "RALEIGH, CAL", "DEVERS, RAFAEL", "RODRIGUEZ, JULIO", "WITT JR, BOBBY"]),
  createRosterTeam("zach-bishop", "Zach Bishop", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "MONTGOMERY, COLSON", "ALONSO, PETE", "SOTO, JUAN", "ACUNA JR, RONALD", "GUERRERO JR, VLAD", "PASQUINTINO, VINNIE", "TATIS JR, FERNANDO"]),
  createRosterTeam("kyle-gallahan", "Kyle Gallahan", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "OLSON, MATT", "RALEIGH, CAL", "ROOKER, BRENT", "DEVERS, RAFAEL", "SOTO, JUAN", "PASQUINTINO, VINNIE", "BUSCH, MICHAEL"]),
  createRosterTeam("isaiah-shelton", "Isaiah Shelton", ["JUDGE, AARON", "HENDERSON, GUNNAR", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "BUXTON, BYRON", "SOTO, JUAN", "KURTZ, NICK", "BELLINGER, CODY", "PASQUINTINO, VINNIE", "CAGLIANONE, JAC"]),
  createRosterTeam("joel-seaman", "Joel Seaman", ["JUDGE, AARON", "ALVAREZ, YORDAN", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "CAMINERO, JUNIOR", "RAMIREZ, JOSE", "SOTO, JUAN", "RODRIGUEZ, JULIO", "CROW-ARMSTRONG, PETE", "LINDOR, FRANCISCO"]),
  createRosterTeam("jake-fahnestock", "Jake Fahnestock", ["JUDGE, AARON", "OHTANI, SHOHEI", "RAMIREZ, JOSE", "RALEIGH, CAL", "SOTO, JUAN", "ACUNA JR, RONALD", "KURTZ, NICK", "GUERRERO JR, VLAD", "CROW-ARMSTRONG, PETE", "PASQUINTINO, VINNIE"]),
  createRosterTeam("greg-duracinski", "Greg Duracinski", ["JUDGE, AARON", "SCHWARBER, KYLE", "CRUZ, O'NEIL", "OHTANI, SHOHEI", "ALONSO, PETE", "SOTO, JUAN", "JUNG, JOSH", "TORKELSON, SPENCER", "MOREL, CHRIS", "HOLIDAY, JACKSON"]),
  createRosterTeam("jack-nelson", "Jack Nelson", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "CAMINERO, JUNIOR", "ROOKER, BRENT", "ACUNA JR, RONALD", "KURTZ, NICK", "GUERRERO JR, VLAD", "CAGLIANONE, JAC", "TATIS JR, FERNANDO"]),
  createRosterTeam("jon-gready", "Jon Gready", ["JUDGE, AARON", "ALVAREZ, YORDAN", "HENDERSON, GUNNAR", "SCHWARBER, KYLE", "WOOD, JAMES", "OHTANI, SHOHEI", "CAMINERO, JUNIOR", "BUXTON, BYRON", "RALEIGH, CAL", "WITT JR, BOBBY"]),
  createRosterTeam("dave-cherry", "Dave Cherry", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "OLSON, MATT", "CAMINERO, JUNIOR", "RALEIGH, CAL", "ROOKER, BRENT", "DEVERS, RAFAEL", "ACUNA JR, RONALD", "PASQUINTINO, VINNIE"]),
  createRosterTeam("dan-leseur", "Dan Leseur", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "FREEMAN, FREDDY", "SPRINGER, GEORGE", "ALONSO, PETE", "SOTO, JUAN", "CROW-ARMSTRONG, PETE", "BELLINGER, CODY", "BUSCH, MICHAEL"]),
  createRosterTeam("erik-mauro", "Erik Mauro", ["JUDGE, AARON", "HENDERSON, GUNNAR", "SCHWARBER, KYLE", "WOOD, JAMES", "OHTANI, SHOHEI", "RALEIGH, CAL", "KURTZ, NICK", "GUERRERO JR, VLAD", "WITT JR, BOBBY", "TATIS JR, FERNANDO"]),
  createRosterTeam("bryan-jackson", "Bryan Jackson", ["JUDGE, AARON", "ALVAREZ, YORDAN", "LANGELIERS, SHEA", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "CAMINERO, JUNIOR", "BASALLO, SAMUEL", "ALONSO, PETE", "RODRIGUEZ, JULIO", "PASQUINTINO, VINNIE"]),
  createRosterTeam("eddie-robinson", "Eddie Robinson", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "OLSON, MATT", "CAMINERO, JUNIOR", "ROOKER, BRENT", "DEVERS, RAFAEL", "SOTO, JUAN", "GUERRERO JR, VLAD", "MANZARDO, KYLE"]),
  createRosterTeam("joe-babic", "Joe Babic", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "OLSON, MATT", "HARPER, BRYCE", "RALEIGH, CAL", "ROOKER, BRENT", "ALONSO, PETE", "PASQUINTINO, VINNIE", "WITT JR, BOBBY"]),
  createRosterTeam("cal-shillings", "Cal Shillings", ["JUDGE, AARON", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "RAMIREZ, JOSE", "DEVERS, RAFAEL", "ACUNA JR, RONALD", "KURTZ, NICK", "GUERRERO JR, VLAD", "GREENE, RILEY", "PASQUINTINO, VINNIE"]),
  createRosterTeam("ryan-lucas", "Ryan Lucas", ["JUDGE, AARON", "ALVAREZ, YORDAN", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "RALEIGH, CAL", "DEVERS, RAFAEL", "ROOKER, BRENT", "SOTO, JUAN", "ACUNA JR, RONALD", "CAGLIANONE, JAC"]),
  createRosterTeam("micah-karnes", "Micah Karnes", ["HENDERSON, GUNNAR", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "HARPER, BRYCE", "SUAREZ, EUGENIO", "DEVERS, RAFAEL", "SOTO, JUAN", "ROMAN, ANTHONY", "KURTZ, NICK", "GUERRERO JR, VLAD"]),
  createRosterTeam("jon-negley", "Jon Negley", ["JUDGE, AARON", "LANGELIERS, SHEA", "SCHWARBER, KYLE", "OHTANI, SHOHEI", "RALEIGH, CAL", "DEVERS, RAFAEL", "SOTO, JUAN", "RODRIGUEZ, JULIO", "PASQUINTINO, VINNIE", "LINDOR, FRANCISCO"]),
];

function createRosterTeam(id: string, owner: string, playerKeys: string[]): RosterTeam {
  return {
    id,
    name: owner,
    owner,
    players: playerKeys.map((key) => playerIdByKey[key]),
  };
}
