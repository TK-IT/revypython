import { action, computed, configure, observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Choice } from "./components/Choice";
import { MultiChoice } from "./components/MultiChoice";
import styles from "./index.scss";
import { Act, parse_roles } from "./parser";
import { duplicates, encode_utf8 } from "./util";

const Director = observer(({}) => {
  const choices = state.revue.actors.map(actor => ({
    key: actor,
    name: actor,
    conflicts: false
  }));
  choices.unshift({ key: "", name: "---", conflicts: false });
  return (
    <div>
      Destruktør:
      <Choice
        choices={choices}
        onChange={action((v: string | null) => (state.director = v as string))}
        value={state.director || "---"}
      />
    </div>
  );
});

const Absent = observer(({}) => {
  const choices = state.revue.actors.map(actor => ({
    key: actor,
    name: actor
  }));
  return (
    <div>
      Afbud:
      <MultiChoice
        choices={choices}
        onChange={action((v: string[]) => (state.absent = v))}
        value={state.absent}
      />
    </div>
  );
});

interface SpecificActProps {
  rowIndex: number;
  columnIndex: number;
}

const SpecificAct = observer(({ rowIndex, columnIndex }: SpecificActProps) => {
  let acts = state.revue.acts.map((act, idx) => {
    const conflicts = [];
    for (let j = 0; j < act.parts.length; j += 1) {
      const part = act.parts[j];
      if (!state.songFlags[columnIndex] || part.singer) {
        if (state.peopleInRow[rowIndex].includes(part.actor)) {
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
  const rowData = state.rowData[rowIndex];
  const column = state.columns[columnIndex];
  const actIndex = rowData.columns[column];
  const value = actIndex == null ? "---" : acts[actIndex].original_name;
  if (state.songFlags[columnIndex]) acts = acts.filter(a => a.kind === "Sang");
  acts.sort((a, b) =>
    a.kind !== b.kind
      ? a.kind.localeCompare(b.kind)
      : a.original_name.localeCompare(b.original_name)
  );
  const choices = [
    { key: null as string | null, name: "---", conflicts: false }
  ].concat(acts);
  const onChange = action((act: number | null) => {
    rowData.columns[column] = act;
  });
  return (
    <Choice
      value={value}
      choices={choices}
      onChange={v => onChange(v == null ? null : +v)}
    />
  );
});

interface RowData {
  columns: { [columnKey: string]: number | null };
  others: string[];
}

const PlannerRow = observer(({ rowIndex }: { rowIndex: number }) => {
  const rowData = state.rowData[rowIndex];

  const othersChoices = state.revue.actors.map(actor => {
    if (
      state.peopleInRow[rowIndex].includes(actor) &&
      !rowData.others.includes(actor)
    ) {
      return { key: actor, name: "{" + actor + "}" };
    } else {
      return { key: actor, name: actor };
    }
  });

  const others = (
    <MultiChoice
      value={rowData.others}
      onChange={action((v: string[]) => (rowData.others = v))}
      choices={othersChoices}
    />
  );

  const conflicts = duplicates(state.peopleInRow[rowIndex]).join(", ");

  const columns: JSX.Element[] = [];
  for (let i = 0; i < state.columns.length; i += 1) {
    columns.push(
      <td key={i}>
        <SpecificAct rowIndex={rowIndex} columnIndex={i} />
      </td>
    );
  }
  return (
    <tr>
      {columns}
      <td>{others}</td>
      <td>{conflicts}</td>
    </tr>
  );
});

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

  private getRowPeople(rowIndex: number) {
    const getCellPeople = (columnIndex: number) => {
      const act = state.rowData[rowIndex].columns[state.columns[columnIndex]];
      if (!act) return [];
      let parts = state.revue.acts[act].parts;
      if (state.songFlags[columnIndex]) {
        parts = parts.filter(o => o.singer);
      }
      const actors = parts.map(o => o.actor);
      return actors;
    };

    const people = [...state.absent, state.director];
    for (let i = 0; i < state.columns.length; i += 1) {
      people.push(...getCellPeople(i));
    }
    people.push(...state.rowData[rowIndex].others);

    return people;
  }

  @computed get peopleInRow() {
    return [...Array(state.rowData.length)].map((_, i) => this.getRowPeople(i));
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
        {<Absent />}
        {<Director />}
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
