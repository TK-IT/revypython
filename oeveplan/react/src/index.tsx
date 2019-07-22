import { action, computed, configure, observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Choice } from "./components/Choice";
import { MultiChoice } from "./components/MultiChoice";
import styles from "./index.scss";
import { Act, parse_roles } from "./parser";
import { duplicates, encode_utf8 } from "./util";

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
  rowIndex: number;
}

@observer
class PlannerRow extends React.Component<PlannerRowProps, {}> {
  get rowData() {
    return state.rowData[this.props.rowIndex];
  }

  @action
  setAct(idx: number, act: number | null) {
    const oldColumns = this.rowData.columns;
    const columns: { [k: string]: number | null } = {};
    for (let i = 0; i < state.columns.length; i += 1) {
      const k = state.columns[i];
      if (idx === i) columns[k] = act;
      else if (k in oldColumns) columns[k] = oldColumns[k];
    }
    this.rowData.columns = columns;
  }

  @action
  setOthers(others: string[]) {
    this.rowData.others = others;
  }

  getColumnPeople(idx: number) {
    if (!(state.columns[idx] in this.rowData.columns)) return [];
    const act = this.rowData.columns[state.columns[idx]];
    if (act === null) return [];
    let parts = state.revue.acts[act].parts;
    if (state.songFlags[idx]) {
      parts = parts.filter(o => o.singer);
    }
    const actors = parts.map(o => o.actor);
    return actors;
  }

  renderOthers(people: string[]) {
    const choices = state.revue.actors.map(actor => {
      if (
        people.indexOf(actor) !== -1 &&
        this.rowData.others.indexOf(actor) === -1
      ) {
        return { key: actor, name: "{" + actor + "}" };
      } else {
        return { key: actor, name: actor };
      }
    });
    return (
      <MultiChoice
        value={this.rowData.others}
        onChange={v => this.setOthers(v)}
        choices={choices}
      />
    );
  }

  renderColumn(idx: number, people: string[]) {
    const act =
      state.columns[idx] in this.rowData.columns
        ? this.rowData.columns[state.columns[idx]]
        : null;
    return (
      <SpecificAct
        people={people}
        onChange={act => this.setAct(idx, act)}
        singers={state.songFlags[idx]}
        value={act}
      />
    );
  }
  render() {
    const peopleSets = [];
    peopleSets.push(state.absent.concat([state.director]));
    for (let i = 0; i < state.columns.length; i += 1) {
      peopleSets.push(this.getColumnPeople(i));
    }
    peopleSets.push(this.rowData.others);
    const people = ([] as string[]).concat.apply([], peopleSets);

    const columns = [];
    for (let i = 0; i < state.columns.length; i += 1) {
      columns.push(this.renderColumn(i, people));
    }
    columns.push(this.renderOthers(people));
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
  rowData: RowData[] = [...Array(20)].map(() => ({ columns: {}, others: [] }));
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
    const rows: JSX.Element[] = [];
    for (let i = 0; i < state.rows; ++i) {
      rows.push(<PlannerRow key={i} rowIndex={i} />);
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
    const cols = [...Array(state.columns.length + 2)].map((_, i) => (
      <col width="*" key={i} />
    ));

    return (
      <>
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
      </>
    );
  }
}

configure({ enforceActions: "always", computedRequiresReaction: true });
ReactDOM.render(<Planner />, document.getElementById("app"));
