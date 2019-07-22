import * as React from "react";

import styles from "../index.scss";
import { classNames } from "../util";
import { Dropdown } from "./Dropdown";

interface MultiChoiceProps {
  value: string[];
  onChange: (value: string[]) => void;
  choices: Array<{
    key: string;
    name: string;
  }>;
}

export class MultiChoice extends React.Component<
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
