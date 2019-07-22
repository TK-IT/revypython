import { action, computed, configure, observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Dropdown } from "./components/Dropdown";
import styles from "./index.scss";
import { classNames, duplicates, encode_utf8 } from "./util";

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

function clean_act_name(n: string): string {
  n = n.replace(/ \\cdot /g, "");
  n = n.replace(/\\dots/, "...");
  return n;
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

type ActKind = "Sang" | "Fisk" | "Sketch";

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
  blank: boolean;
}

@observer
class ActorChoice extends React.Component<ActorChoiceProps, {}> {
  render() {
    const choices = state.revue.actors.map(actor => ({
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
}

@observer
class MultiActorChoice extends React.Component<MultiActorChoiceProps, {}> {
  render() {
    const choices = state.revue.actors.map(actor => ({
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
  value: number | null;
  onChange: (value: number | null) => void;
}

@observer
class SpecificAct extends React.Component<SpecificActProps, {}> {
  render() {
    let acts = state.revue.acts.map((act, idx) => {
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
  columns: { [columnKey: string]: number | null };
  others: string[];
}

interface PlannerRowProps {
  value: RowData;
  columns: Array<{
    key: string;
    singers: boolean;
  }>;
  onChange: (value: RowData) => void;
  usedPeople: string[];
}

@observer
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
    let parts = state.revue.acts[act].parts;
    if (column.singers) {
      parts = parts.filter(o => o.singer);
    }
    const actors = parts.map(o => o.actor);
    return actors;
  }
  renderColumn(idx: number | "others", people: string[]) {
    if (idx === "others") {
      const choices = state.revue.actors.map(actor => {
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
  columnsString = "Scenen,I aflukket,Bandet (d01)";
  @computed
  get columns() {
    return this.columnsString.split(",");
  }
  @observable
  songFlags = [false, false, true];
  @observable
  absent: string[] = [];
  @observable
  director = "";
  @observable
  rowData: RowData[] = new Array(20).map(() => ({ columns: {}, others: [] }));
  @computed
  get rows() {
    return this.rowData.length;
  }

  @computed get actCountsByKind() {
    const counts: number[] = [];
    for (let i = 0; i < this.rowData.length; ++i) {
      const row = this.rowData[i];
      if (!row) continue;
      for (let k in row.columns) {
        const v = row.columns[k];
        if (v !== null) {
          counts[v] = (counts[v] || 0) + 1;
        }
      }
    }
    const actCountsByKind: {
      [kind: string]: { act: Act; count: number }[];
    } = {};
    for (let i = 0; i < this.revue.acts.length; ++i) {
      actCountsByKind[this.revue.acts[i].kind] = [];
    }
    for (let i = 0; i < this.revue.acts.length; ++i) {
      const a = this.revue.acts[i];
      const count = counts[i] || 0;
      actCountsByKind[a.kind].push({ act: a, count: count });
    }
    for (let k in actCountsByKind) {
      actCountsByKind[k].sort((a, b) => a.act.name.localeCompare(b.act.name));
    }
    return actCountsByKind;
  }
}

const state = new PlannerState();

@observer
class Planner extends React.Component<{}, {}> {
  renderHeader() {
    const header: JSX.Element[] = [];

    const songChange = action((j: number) => {
      state.songFlags[j] = !state.songFlags[j];
    });

    for (let j = 0; j < state.columns.length; j += 1) {
      header.push(
        <th key={j}>
          <input
            type="checkbox"
            onChange={() => songChange(j)}
            checked={!!state.songFlags[j]}
          />
          {state.columns[j]}
        </th>
      );
    }
    header.push(<th key="others">Andre</th>);
    header.push(<th key="conflicts">Konflikter</th>);
    return header;
  }

  renderRows() {
    const plannerRowColumns = state.columns.map((name, j) => ({
      key: name,
      singers: state.songFlags[j]
    }));
    const usedPeople = state.absent.concat([state.director]);
    const rows: JSX.Element[] = [];
    for (let i = 0; i < state.rows; i += 1) {
      const onChange = action((d: RowData) => (state.rowData[i] = d));
      const v = state.rowData[i]
        ? state.rowData[i]
        : { columns: {}, others: [] };
      rows.push(
        <PlannerRow
          columns={plannerRowColumns}
          usedPeople={usedPeople}
          key={i}
          onChange={onChange}
          value={v}
        />
      );
    }
    return rows;
  }

  renderActCounts() {
    const actCountsByKind = state.actCountsByKind;
    const actCounts = [];
    for (let k in actCountsByKind) {
      const c = actCountsByKind[k].map(function(a) {
        return (
          <li key={a.act.name}>
            {a.count}: {a.act.name}
          </li>
        );
      });
      actCounts.push(<ul key={k}>{c}</ul>);
    }
    return actCounts;
  }

  renderDownload() {
    const csvRows = [];
    csvRows.push(state.columns);
    for (let i = 0; i < state.rowData.length; ++i) {
      if (!state.rowData[i]) continue;
      csvRows.push(
        state.columns.map(k => {
          const c = state.rowData[i].columns[k];
          return c ? state.revue.acts[c].name : "";
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
    return (
      <div>
        <a href={dataURI} download={"oeveplan.csv"}>
          Download CSV
        </a>
      </div>
    );
  }

  renderColumns() {
    return (
      <div>
        Steder:{" "}
        <input
          value={state.columnsString}
          onChange={e => (state.columnsString = e.target.value)}
        />
      </div>
    );
  }

  renderAbsent() {
    return (
      <div>
        Afbud:
        <MultiActorChoice
          value={state.absent}
          onChange={action((v: string[]) => (state.absent = v))}
        />
      </div>
    );
  }

  renderDirector() {
    return (
      <div>
        Destruktør:
        <ActorChoice
          value={state.director || "---"}
          blank={true}
          onChange={action((v: string) => (state.director = v))}
        />
      </div>
    );
  }

  renderIntro() {
    return (
      <>
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
      </>
    );
  }

  render() {
    const cols = Array(state.columns.length + 2).map((_, i) => (
      <col width="*" key={i} />
    ));

    return (
      <div>
        {this.renderIntro()}
        {this.renderColumns()}
        {this.renderAbsent()}
        {this.renderDirector()}
        <div>
          <table className={styles.planner}>
            <colgroup>{cols}</colgroup>
            <thead>
              <tr>{this.renderHeader()}</tr>
            </thead>
            <tbody>{this.renderRows()}</tbody>
          </table>
        </div>
        {this.renderDownload()}
        <div>Revynumre:</div>
        {this.renderActCounts()}
      </div>
    );
  }
}

configure({ enforceActions: "always", computedRequiresReaction: true });
ReactDOM.render(<Planner />, document.getElementById("app"));
