import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { UserPlus, Search } from "lucide-react";
import { Input } from "./ui/input";
import { useState } from "react";

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

interface PlayerSelectionProps {
  availablePlayers: Player[];
  selectedTeam: Team | null;
  onAddPlayer: (playerId: string) => void;
}

export function PlayerSelection({ availablePlayers, selectedTeam, onAddPlayer }: PlayerSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlayers = availablePlayers.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.team.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canAddMore = selectedTeam ? selectedTeam.players.length < 10 : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="size-5" />
          Available Players
        </CardTitle>
        <CardDescription>
          {selectedTeam
            ? `Select up to 10 players for ${selectedTeam.name} (${selectedTeam.players.length}/10 selected)`
            : "Select a team from the Teams tab to start adding players"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search players or MLB teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {selectedTeam ? (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Home Runs</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => {
                  const isAlreadySelected = selectedTeam.players.includes(player.id);
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.team}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell className="text-right">{player.homeRuns}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => onAddPlayer(player.id)}
                          disabled={isAlreadySelected || !canAddMore}
                        >
                          {isAlreadySelected ? "Added" : "Add"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Select a team to start adding players
          </p>
        )}
      </CardContent>
    </Card>
  );
}
