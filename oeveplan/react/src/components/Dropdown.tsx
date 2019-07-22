import * as React from "react";
import * as ReactDOM from "react-dom";

import styles from "../index.scss";

interface DropdownProps {
  onClickOutside: () => void;
}

export class Dropdown extends React.Component<DropdownProps, {}> {
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
