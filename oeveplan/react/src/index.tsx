import { action, computed, configure, observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";

import styles from "./index.scss";
import { classNames } from "./util";

interface Part {
  name: string;
  kind: string;
  actor: string;
  singer: boolean;
}
interface Act {
  name: string;
  parts: Part[];
  kind: ActKind;
}

interface Revue {
  acts: Act[];
  actors: string[];
}

function unique(x: string[]): string[] {
  const sorted = [].slice.call(x);
  sorted.sort();
  let k = 0;
  for (let i = 1; i < sorted.length; ++i) {
    if (sorted[k] != sorted[i]) {
      sorted[++k] = sorted[i];
    }
  }
  return sorted.slice(0, k + 1);
}

function duplicates(x: string[]): string[] {
  const res = [].slice.call(x);
  res.sort();
  let prev = null;
  let k = 0;
  for (let i = 0; i < res.length; i += 1) {
    if (res[i] !== prev) {
      prev = res[i];
    } else {
      res[k++] = res[i];
    }
  }
  return unique(res.slice(0, k));
}

// http://ecmanaut.blogspot.dk/2006/07/encoding-decoding-utf8-in-javascript.html
function encode_utf8(s: string): string {
  return unescape(encodeURIComponent(s));
}

// function decode_utf8(s: string): string {
//     return decodeURIComponent(escape(s));
// }

function startswith(s: string, p: string): boolean {
  return s.substring(0, p.length) === p;
}

function clean_act_name(n: string): string {
  n = n.replace(/ \\cdot /g, "");
  n = n.replace(/\\dots/, "...");
  if (startswith(n, "Fuck det "))
    return n.substring(0, 19) + n.substring(n.length - 9);
  else if (startswith(n, "AU -- hvorfor")) return "Skoleskyderi";
  else return n;
}

function parse_roles(rolesString: string): Revue {
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
  let act: Act | null = null;
  let actName: string | null = null;
  const acts: Act[] = [];
  const actorsCasing: { [actorLower: string]: string } = {};
  const actors: string[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (act == null || row[0] !== actName) {
      actName = row[0];
      act = {
        name: clean_act_name(row[0]),
        parts: [],
        kind: "Fisk" // Dummy
      };
      acts.push(act);
    }
    let actor = row[3];
    const actorLower = actor.toLowerCase();
    if (!(actorLower in actorsCasing)) {
      if (actorLower.substring(0, 2) == "fu" && actorLower.length == 4) {
        actor = actor.toUpperCase();
      }
      actorsCasing[actorLower] = actor;
    }
    act.parts.push({
      name: row[1],
      kind: row[2],
      actor: actorsCasing[actorLower],
      singer: row[2].toLowerCase().indexOf("sang") !== -1
    });
    actors.push(row[3]);
  }
  for (let i = 0; i < acts.length; i += 1) {
    acts[i].kind = get_act_kind(acts[i]);
  }
  return { acts: acts, actors: unique(actors) };
}

type ActKind = "Sang" | "Fisk" | "Sketch";

function get_act_kind(act: Act) {
  let song = false;
  let fisk = true;
  for (let i = 0; i < act.parts.length; i += 1) {
    if (act.parts[i].singer) song = true;
    if (act.parts[i].kind.indexOf("Stor") !== -1) fisk = false;
  }
  if (song) return "Sang";
  else if (fisk) return "Fisk";
  else return "Sketch";
}

interface DropdownProps {
  onClickOutside: () => void;
}

class Dropdown extends React.Component<DropdownProps, {}> {
  windowClick = function(this: Dropdown, ev: MouseEvent) {
    // If the user clicks outside our DOM parent, call onClickOutside.
    let e = ev.target as Node;
    const me = ReactDOM.findDOMNode(this);
    if (me == null) return;
    while (e.parentNode) {
      if (e === me.parentNode) {
        // Clicked inside a sibling of our DOM node
        // => not an outside click.
        return;
      }
      e = e.parentNode;
    }
    if (e === document) {
      this.props.onClickOutside();
    }
  }.bind(this);

  componentDidMount() {
    window.addEventListener("click", this.windowClick, false);
  }

  componentWillUnmount() {
    window.removeEventListener("click", this.windowClick, false);
  }

  render() {
    return <div className={styles.dropdown}>{this.props.children}</div>;
  }
}

interface ChoiceProps {
  value: string;
  onChange: (key: string | null) => void;
  choices: Array<{
    conflicts: boolean;
    key: string | null;
    name: string;
  }>;
}

class Choice extends React.Component<ChoiceProps, { open: boolean }> {
  state = { open: false };
  close() {
    this.setState({ open: false });
  }
  onClick(ev: React.MouseEvent) {
    ev.preventDefault();
    this.setState({ open: true });
  }
  render() {
    const optionClick = (k: string | null, ev: React.MouseEvent) => {
      ev.preventDefault();
      this.close();
      this.props.onChange(k);
    };

    const options = this.props.choices.map(c => {
      const classes = classNames({
        [styles.choice_option]: true,
        [styles.conflicts]: c.conflicts
      });
      return (
        <div
          key={c.key === null ? "null" : c.key}
          className={styles.dropdown_item}
        >
          <a onClick={e => optionClick(c.key, e)} href="#" className={classes}>
            {c.name}
          </a>
        </div>
      );
    });
    const children = [
      <a href="#" key="link" onClick={e => this.onClick(e)}>
        {this.props.value}
      </a>
    ];
    if (this.state.open) {
      children.push(
        <Dropdown key="dropdown" onClickOutside={() => this.close()}>
          {options}
        </Dropdown>
      );
    }
    const classes = classNames({
      [styles.choices]: true,
      [styles.choices_active]: this.state.open
    });
    return <div className={classes}>{children}</div>;
  }
}

interface MultiChoiceProps {
  value: string[];
  onChange: (value: string[]) => void;
  choices: Array<{
    key: string;
    name: string;
  }>;
}

class MultiChoice extends React.Component<
  MultiChoiceProps,
  { open: boolean; selected: boolean[] }
> {
  state = {
    open: false,
    selected: [] as boolean[]
  };
  close() {
    const chosen = [];
    for (let i = 0; i < this.state.selected.length; ++i) {
      if (this.state.selected[i]) {
        chosen.push(this.props.choices[i].key);
      }
    }
    this.props.onChange(chosen);
    this.setState({ open: false });
  }
  onClick(ev: React.MouseEvent) {
    ev.preventDefault();
    const selected = this.props.choices.map(
      c => this.props.value.indexOf(c.key) !== -1
    );
    this.setState({ open: true, selected: selected });
  }
  render() {
    const onChange = (i: number) => {
      const sel = this.state.selected.slice();
      sel[i] = !sel[i];
      this.setState({ selected: sel });
    };

    const options = this.props.choices.map((c, i) => (
      <div key={c.key} className={styles.dropdown_item}>
        <label>
          <input
            type="checkbox"
            onChange={() => onChange(i)}
            checked={this.state.selected[i]}
          />{" "}
          {c.name}
        </label>
      </div>
    ));
    let valueString = this.props.value.join(", ");
    if (!valueString) {
      valueString = "---";
    }
    const children = [
      <a href="#" key="link" onClick={e => this.onClick(e)}>
        {valueString}
      </a>
    ];
    if (this.state.open) {
      children.push(
        <Dropdown key="dropdown" onClickOutside={() => this.close()}>
          {options}
        </Dropdown>
      );
    }
    const classes = classNames({
      [styles.choices]: true,
      [styles.choices_active]: this.state.open
    });
    return <div className={classes}>{children}</div>;
  }
}

interface ActorChoiceProps {
  value: string;
  onChange: (value: string) => void;
  actors: string[];
  blank: boolean;
}

class ActorChoice extends React.Component<ActorChoiceProps, {}> {
  render() {
    const choices = this.props.actors.map(actor => ({
      key: actor,
      name: actor,
      conflicts: false
    }));
    if (this.props.blank) {
      choices.unshift({ key: "", name: "---", conflicts: false });
    }
    return (
      <Choice
        choices={choices}
        onChange={v => this.props.onChange(v as string)}
        value={this.props.value}
      />
    );
  }
}

interface MultiActorChoiceProps {
  value: string[];
  onChange: (value: string[]) => void;
  actors: string[];
}

class MultiActorChoice extends React.Component<MultiActorChoiceProps, {}> {
  render() {
    const choices = this.props.actors.map(actor => ({
      key: actor,
      name: actor
    }));
    return (
      <MultiChoice
        choices={choices}
        onChange={v => this.props.onChange(v)}
        value={this.props.value}
      />
    );
  }
}

interface SpecificActProps {
  singers: boolean;
  people: string[];
  revue: Revue;
  value: number | null;
  onChange: (value: number | null) => void;
}

class SpecificAct extends React.Component<SpecificActProps, {}> {
  render() {
    let acts = this.props.revue.acts.map((act, idx) => {
      const conflicts = [];
      for (let j = 0; j < act.parts.length; j += 1) {
        const part = act.parts[j];
        if (!this.props.singers || part.singer) {
          if (this.props.people.indexOf(part.actor) !== -1) {
            conflicts.push(part.actor);
          }
        }
      }
      let label = "[" + conflicts.length + "] " + act.name;
      if (conflicts.length > 0) {
        conflicts.sort();
        label += " (" + conflicts.join(", ") + ")";
      }

      // The `key` here is what ends up in PlannerRow.state.acts
      return {
        key: String(idx),
        original_name: act.name,
        name: label,
        kind: act.kind,
        conflicts: conflicts.length > 0
      };
    });
    const value =
      this.props.value === null ? "---" : acts[this.props.value].original_name;
    if (this.props.singers) acts = acts.filter(a => a.kind === "Sang");
    acts.sort((a, b) =>
      a.kind !== b.kind
        ? a.kind.localeCompare(b.kind)
        : a.original_name.localeCompare(b.original_name)
    );
    const choices = [
      { key: null as string | null, name: "---", conflicts: false }
    ].concat(acts);
    return (
      <Choice
        value={value}
        choices={choices}
        onChange={v => {
          this.props.onChange(v == null ? null : +v);
        }}
      />
    );
  }
}

interface RowData {
  columns: { [k: string]: number | null };
  others: string[];
}

interface PlannerRowProps {
  value: RowData;
  columns: Array<{
    key: string;
    singers: boolean;
  }>;
  revue: Revue;
  onChange: (value: RowData) => void;
  usedPeople: string[];
}

class PlannerRow extends React.Component<PlannerRowProps, {}> {
  setAct(idx: number, act: number | null) {
    const oldColumns = this.props.value.columns;
    const columns: { [k: string]: number | null } = {};
    for (let i = 0; i < this.props.columns.length; i += 1) {
      const k = this.props.columns[i].key;
      if (idx === i) columns[k] = act;
      else if (k in oldColumns) columns[k] = oldColumns[k];
    }
    this.props.onChange({ columns: columns, others: this.props.value.others });
  }
  setOthers(others: string[]) {
    this.props.onChange({ columns: this.props.value.columns, others: others });
  }
  getColumnPeople(idx: number | "others") {
    if (idx === "others") {
      return this.props.value.others;
    }
    const column = this.props.columns[idx];
    if (!(column.key in this.props.value.columns)) return [];
    const act = this.props.value.columns[column.key];
    if (act === null) return [];
    let parts = this.props.revue.acts[act].parts;
    if (column.singers) {
      parts = parts.filter(o => o.singer);
    }
    const actors = parts.map(o => o.actor);
    return actors;
  }
  renderColumn(idx: number | "others", people: string[]) {
    if (idx === "others") {
      const choices = this.props.revue.actors.map(actor => {
        if (
          people.indexOf(actor) !== -1 &&
          this.props.value.others.indexOf(actor) === -1
        ) {
          return { key: actor, name: "{" + actor + "}" };
        } else {
          return { key: actor, name: actor };
        }
      });
      return (
        <MultiChoice
          value={this.props.value.others}
          onChange={v => this.setOthers(v)}
          choices={choices}
        />
      );
    }
    const column = this.props.columns[idx];
    const act =
      column.key in this.props.value.columns
        ? this.props.value.columns[column.key]
        : null;
    return (
      <SpecificAct
        people={people}
        revue={this.props.revue}
        onChange={act => this.setAct(idx, act)}
        singers={column.singers}
        value={act}
      />
    );
  }
  render() {
    const peopleSets = [];
    peopleSets.push(this.props.usedPeople);
    for (let i = 0; i < this.props.columns.length; i += 1) {
      peopleSets.push(this.getColumnPeople(i));
    }
    peopleSets.push(this.getColumnPeople("others"));
    const people = ([] as string[]).concat.apply([], peopleSets);

    const columns = [];
    for (let i = 0; i < this.props.columns.length; i += 1) {
      columns.push(this.renderColumn(i, people));
    }
    columns.push(this.renderColumn("others", people));
    columns.push(duplicates(people).join(", "));

    const cells = columns.map(function(o, i) {
      return <td key={i}>{o}</td>;
    });
    return <tr>{cells}</tr>;
  }
}

class PlannerState {
  @observable
  rolesString = "";
  @computed
  get revue() {
    return parse_roles(this.rolesString);
  }
  @observable
  columns = "Scenen,I aflukket,Bandet (d01)";
  @observable
  rows = 20;
  @observable
  songFlags = [false, false, true];
  @observable
  absent: string[] = [];
  @observable
  director = "";
  @observable
  rowData: RowData[] = [];
}

const state = new PlannerState();

@observer
class Planner extends React.Component<{}, {}> {
  @computed get actCountsByKind() {
    const counts: number[] = [];
    for (let i = 0; i < state.rowData.length; ++i) {
      const row = state.rowData[i];
      if (!row) continue;
      for (let k in row.columns) {
        const v = row.columns[k];
        if (v !== null) {
          counts[v] = (counts[v] || 0) + 1;
        }
      }
    }
    const actsByKind: { [kind: string]: { act: Act; count: number }[] } = {};
    for (let i = 0; i < state.revue.acts.length; ++i) {
      actsByKind[state.revue.acts[i].kind] = [];
    }
    for (let i = 0; i < state.revue.acts.length; ++i) {
      const a = state.revue.acts[i];
      const count = counts[i] || 0;
      actsByKind[a.kind].push({ act: a, count: count });
    }
    return actsByKind;
  }
  render() {
    const acts = state.revue.acts;
    const columns = state.columns.split(",");
    const header = [];

    const songChange = action((j: number) => {
      state.songFlags[j] = !state.songFlags[j];
    });

    for (let j = 0; j < columns.length; j += 1) {
      header.push(
        <th key={j}>
          <input
            type="checkbox"
            onChange={() => songChange(j)}
            checked={!!state.songFlags[j]}
          />
          {columns[j]}
        </th>
      );
    }
    header.push(<th key="others">Andre</th>);
    header.push(<th key="conflicts">Konflikter</th>);
    const cols = header.map(o => (
      <col width="*" key={o.key == null ? "null" : o.key} />
    ));

    const plannerRowColumns = columns.map((name, j) => ({
      key: name,
      singers: state.songFlags[j]
    }));
    const usedPeople = state.absent.concat([state.director]);
    const rows = [];
    for (let i = 0; i < state.rows; i += 1) {
      const onChange = action((d: RowData) => (state.rowData[i] = d));
      const v = state.rowData[i]
        ? state.rowData[i]
        : { columns: {}, others: [] };
      rows.push(
        <PlannerRow
          columns={plannerRowColumns}
          revue={state.revue}
          usedPeople={usedPeople}
          key={i}
          onChange={onChange}
          value={v}
        />
      );
    }

    const actCountsByKind = this.actCountsByKind;
    const actCounts = [];
    for (let k in actCountsByKind) {
      actCountsByKind[k].sort((a, b) => a.act.name.localeCompare(b.act.name));
      const c = actCountsByKind[k].map(function(a) {
        return (
          <li key={a.act.name}>
            {a.count}: {a.act.name}
          </li>
        );
      });
      actCounts.push(<ul key={k}>{c}</ul>);
    }

    const csvRows = [];
    csvRows.push(columns);
    for (let i = 0; i < rows.length; ++i) {
      if (!state.rowData[i]) continue;
      csvRows.push(
        columns.map(k => {
          const c = state.rowData[i].columns[k];
          return c ? acts[c].name : "";
        })
      );
      csvRows[csvRows.length - 1].push(state.rowData[i].others.join(", "));
    }
    const csv = csvRows
      .map(function(r) {
        return r.join("\t") + "\n";
      })
      .join("");
    const dataURI = "data:text/csv;base64," + window.btoa(encode_utf8(csv));
    const download = (
      <a href={dataURI} download={"oeveplan.csv"}>
        Download CSV
      </a>
    );

    return (
      <div>
        Steder:{" "}
        <input
          value={state.columns}
          onChange={e => (state.columns = e.target.value)}
        />
        <div>
          Afbud:
          <MultiActorChoice
            actors={state.revue.actors}
            value={state.absent}
            onChange={action((v: string[]) => (state.absent = v))}
          />
        </div>
        <div>
          Destruktør:
          <ActorChoice
            actors={state.revue.actors}
            value={state.director || "---"}
            blank={true}
            onChange={action((v: string) => (state.director = v))}
          />
        </div>
        <table className={styles.planner}>
          <colgroup>{cols}</colgroup>
          <thead>
            <tr>{header}</tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <div>{download}</div>
        <div>Revynumre:</div>
        {actCounts}
      </div>
    );
  }
}

@observer
class Main extends React.Component {
  render() {
    return (
      <div>
        <h1>Øveplan</h1>
        <p>1. Indlæs rollefordelingen fra regneark:</p>
        <div>
          <textarea
            value={state.rolesString}
            onChange={action(
              (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                (state.rolesString = e.target.value)
            )}
          />
        </div>
        <p>2. Konstruér øveplan:</p>
        <Planner />
      </div>
    );
  }
}

configure({ enforceActions: "strict", computedRequiresReaction: true });
ReactDOM.render(<Main />, document.getElementById("app"));
