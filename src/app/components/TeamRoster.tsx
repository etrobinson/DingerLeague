import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Users } from "lucide-react";
import { Button } from "./ui/button";

interface Player {
  id: string;
  name: string;
  team: string;
  position: string;
  homeRuns: number;
}

interface Team {
  id: string;
  name: string;
  owner: string;
  totalHomeRuns: number;
  players: string[];
}

interface TeamRosterProps {
  selectedTeam: Team | null;
  allPlayers: Player[];
  onSelectTeam: (teamId: string) => void;
  teams: Team[];
}

export function TeamRoster({ selectedTeam, allPlayers, onSelectTeam, teams }: TeamRosterProps) {
  const teamPlayers = selectedTeam
    ? allPlayers.filter((p) => selectedTeam.players.includes(p.id))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {teams.map((team) => (
          <Button
            key={team.id}
            variant={selectedTeam?.id === team.id ? "default" : "outline"}
            onClick={() => onSelectTeam(team.id)}
          >
            {team.name}
          </Button>
        ))}
      </div>

      {selectedTeam ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              {selectedTeam.name}
            </CardTitle>
            <CardDescription>
              Owner: {selectedTeam.owner} • {teamPlayers.length}/10 players selected
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamPlayers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead className="text-right">Home Runs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.team}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {player.homeRuns}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No players selected yet
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              Select a team to view their roster
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
