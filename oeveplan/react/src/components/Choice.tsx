import * as React from "react";

import styles from "../index.scss";
import { classNames } from "../util";
import { Dropdown } from "./Dropdown";

interface ChoiceProps {
  value: string;
  onChange: (key: string | null) => void;
  choices: Array<{
    conflicts: boolean;
    key: string | null;
    name: string;
  }>;
}

export class Choice extends React.Component<ChoiceProps, { open: boolean }> {
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
