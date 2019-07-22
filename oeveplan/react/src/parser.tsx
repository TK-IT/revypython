interface Part {
  name: string;
  kind: string;
  actor: string;
  singer: boolean;
}

type ActKind = "Sang" | "Fisk" | "Sketch";

export interface Act {
  name: string;
  parts: Part[];
  kind: ActKind;
}

interface Revue {
  acts: Act[];
  actors: string[];
}

function clean_act_name(n: string): string {
  n = n.replace(/ \\cdot /g, "");
  n = n.replace(/\\dots/, "...");
  return n;
}

export function parse_roles(rolesString: string): Revue {
  const lines = rolesString ? rolesString.split("\n") : [];
  const rows = lines
    .filter(function(s) {
      return !!s;
    })
    .map(function(s) {
      return s.split("\t");
    })
    .map(function(s) {
      if (s[2] === "Stor" || s[2] === "Lille")
        return [s[0], s[1], s[2] + " " + s[3], s[4]];
      else return s;
    })
    .filter(function(s) {
      return s[3];
    });

  if (rows.length > 0 && rows[0][0] === "Nummer") rows.shift();
  const acts: Act[] = [];
  const actorsCasing: { [actorLower: string]: string } = {};
  for (let i = 0; i < rows.length; ) {
    let j = i;
    while (i < rows.length && rows[i][0] === rows[j][0]) ++i;
    const parts: Part[] = [];
    for (const row of rows.slice(j, i)) {
      let actor = row[3];
      const actorLower = actor.toLowerCase();
      if (actorLower in actorsCasing) {
        actor = actorsCasing[actorLower];
      } else {
        if (actorLower.substring(0, 2) == "fu" && actorLower.length == 4) {
          actor = actor.toUpperCase();
        }
        actorsCasing[actorLower] = actor;
      }
      parts.push({
        name: row[1],
        kind: row[2],
        actor,
        singer: row[2].toLowerCase().indexOf("sang") !== -1
      });
    }

    const name = clean_act_name(rows[j][0]);
    const kind = parts.some(p => p.singer)
      ? "Sang"
      : parts.some(p => p.kind.includes("Stor"))
      ? "Sketch"
      : "Fisk";
    acts.push({
      name,
      parts,
      kind
    });
  }
  return { acts: acts, actors: Object.values(actorsCasing) };
}
