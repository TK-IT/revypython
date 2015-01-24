// vim:set ft=javascript sw=4 et:
'use strict';

var ActsInput = React.createClass({
    getInitialState: function () {
        return {actsString: '', acts: []};
    },
    getActs: function (actsString) {
        var lines = actsString.split('\n');
        var rows = lines.filter(
            function (s) { return !!s; }
        ).map(
            function (s) { return s.split('\t'); }
        );
        var act = null;
        var actName = null;
        var result = [];
        for (var i = 0; i < rows.length; i += 1) {
            var row = rows[i];
            if (row[0] !== actName) {
                act = {
                    name: row[0],
                    parts: []
                };
                actName = act.name;
                result.push(act);
            }
            act.parts.push({
                name: row[1],
                kind: row[2],
                actor: row[3]
            });
        }
        return result;
    },
    render: function() {
        return <div>
            <textarea value={this.state.actsString}
                      onChange={this.actsStringChange} />
            <textarea value={JSON.stringify(this.state.acts)} readOnly={true} />
        </div>;
    },
    actsStringChange: function (event) {
        var s = event.target.value;
        if (s !== this.state.actsString) {
            var acts = this.getActs(s)
            this.setState({
                'actsString': s,
                'acts': acts
            });
            this.props.onChange(acts);
        }
    }
});

var Dropdown = React.createClass({
    componentDidMount: function () {
        this.windowClick = function (ev) {
            // If the user clicks outside our DOM parent, call onClickOutside.
            var e = ev.target;
            while (e.parentNode) {
                if (e === this.getDOMNode().parentNode) {
                    // Clicked inside a sibling of our DOM node
                    // => not an outside click.
                    return;
                }
                console.log(e);
                e = e.parentNode;
            }
            if (e === document) {
                this.props.onClickOutside();
            }
        }.bind(this);
        window.addEventListener('click', this.windowClick, false);

        this.removeClickListener = function () {
            var r = window.removeEventListener('click', this.windowClick, false);
        }.bind(this);
    },
    componentWillUnmount: function () {
        this.removeClickListener();
    },
    render: function () {
        var st = {
            'position': 'absolute',
            'top': this.props.top,
            'left': this.props.left,
            'zIndex': 1
        };
        return <div style={st} className='dropdown'>
            {this.props.children}
        </div>;
    }
});

var Choice = React.createClass({
    getInitialState: function () {
        return {
            open: false
        };
    },
    close: function () {
        this.setState({open: false});
    },
    onClick: function (ev) {
        ev.preventDefault();
        this.setState({open: true});
    },
    render: function () {
        var optionClick = function (k, ev) {
            ev.preventDefault();
            this.close();
            this.props.onChange(k);
        };

        var options = this.props.choices.map(
            function (c, i) {
                return <div key={c.key === null ? 'null' : c.key}>
                    <a onClick={optionClick.bind(this, c.key)}
                       href='#' className='choice_option'>
                        {c.name}
                    </a>
                </div>;
            }.bind(this)
        );
        var children = [
            <a href="#" key='link' onClick={this.onClick}>
                {this.props.value}
            </a>
        ];
        if (this.state.open) {
            children.push(
                <Dropdown key='dropdown' top={0} left={0}
                          onClickOutside={this.close}>
                    {options}
                </Dropdown>
            );
        }
        return <div style={{'position': 'relative'}} className='choices'>
            {children}
        </div>;
    }
});

var MultiChoice = React.createClass({
    getInitialState: function () {
        return {
            open: false,
            selected: []
        };
    },
    close: function () {
        var chosen = [];
        for (var i = 0; i < this.state.selected.length; ++i) {
            if (this.state.selected[i]) {
                chosen.push(this.props.choices[i].key);
            }
        }
        this.props.onChange(chosen);
        this.setState({open: false});
    },
    onClick: function (ev) {
        ev.preventDefault();
        var selected = this.props.choices.map(
            function (c, i) {
                return this.props.value.indexOf(c.key) !== -1;
            }.bind(this)
        );
        this.setState({open: true, selected: selected});
    },
    render: function () {
        var optionClick = function (k, ev) {
            ev.preventDefault();
            this.close();
            this.props.onChange(k);
        };

        var onChange = function (i, ev) {
            var value = ev.target.value;
            this.state.selected[i] = value;
            this.replaceState(this.state);
        }

        var options = this.props.choices.map(
            function (c, i) {
                return <div key={c.key}>
                    <label>
                        <input type="checkbox"
                               onChange={onChange.bind(this, i)}
                               checked={this.state.selected[i]} />
                        {' '}
                        {c.name}
                    </label>
                </div>;
            }.bind(this)
        );
        var valueString = this.props.value.join(', ');
        if (!valueString) {
            valueString = '---';
        }
        var children = [
            <a href="#" key='link' onClick={this.onClick}>
                {valueString}
            </a>
        ];
        if (this.state.open) {
            children.push(
                <Dropdown key='dropdown' top={0} left={0}
                          onClickOutside={this.close}>
                    {options}
                </Dropdown>
            );
        }
        return <div style={{'position': 'relative'}} className='choices'>
            {children}
        </div>;
    }
});

var Planner = React.createClass({
    mixins: [React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {
            columns: 'Scenen,Bandet,Aflukket',
            rows: 20,
            cells: [],
            songFlags: [false, true, false],
            absent: '',
            director: ''
        };
    },
    getCell: function (i, j, def) {
        if (this.state.cells.length <= i) {
            return def;
        } else if (this.state.cells[i].length <= j) {
            return def;
        } else {
            return this.state.cells[i][j];
        }
    },
    getAllActors: function () {
        var actors = [];
        for (var i = 0; i < this.props.acts.length; i += 1) {
            var act = this.props.acts[i];
            for (var j = 0; j < act.parts.length; j += 1) {
                var part = act.parts[j];
                if (actors.indexOf(part.actor) === -1) {
                    actors.push(part.actor);
                }
            }
        }
        return actors;
    },
    render: function() {
        var acts = this.props.acts;
        var columns = this.state.columns.split(',');
        var header = [];
        var allActors = this.getAllActors();

        var songChange = function (j, b) {
            var flags = [].slice.call(this.state.songFlags);
            flags[j] = !flags[j];
            this.setState({songFlags: flags});
        };

        var absent = this.state.absent.split(',');

        for (var j = 0; j < columns.length; j += 1) {
            header.push(
                <th key={j}>
                    <input type="checkbox" onChange={songChange.bind(this, j)}
                           checked={!!this.state.songFlags[j]} />
                    {columns[j]}
                </th>
            );
        }
        header.push(<th key='conflicts'>Konflikter</th>);
        header.push(<th key='others'>Andre</th>);

        var onChange = function (ii, jj, value) {
            console.log("Set", ii, jj, "to", value);
            var cells = [];
            for (var i = 0; i < this.state.rows; i += 1) {
                cells.push([]);
                for (var j = 0; j < columns.length; j += 1) {
                    cells[i].push(this.getCell(i, j, null));
                }
            }
            cells[ii][jj] = value;
            this.setState({'cells': cells});
        };

        var rows = [];
        for (var i = 0; i < this.state.rows; i += 1) {
            var row = [];
            var actors = {};  // all actors that are part of this timeslot
            var timeslotActs = {};

            // Create list of actors that are part of this timeslot
            for (var j = 0; j < absent.length; j += 1) {
                actors[absent[j]] = 1;
            }
            actors[this.state.director] = 1;
            for (var j = 0; j < columns.length; j += 1) {
                var actIndex = this.getCell(i, j, null);
                timeslotActs[actIndex] = true;
                var act = (actIndex !== null) && acts[actIndex];
                var parts = act && act.parts;
                if (parts && this.state.songFlags[j]) {
                    parts = parts.filter(
                        function (part) {
                            return part.kind.indexOf('sang') !== -1;
                        }
                    );
                }
                var actActors = parts && parts.map(
                    function (part) { return part.actor; }
                );
                if (actActors) {
                    actActors.forEach(
                        function (actor) {
                            actors[actor] = actors[actor] + 1 || 1;
                        }
                    );
                }
            }
            for (var j = 0; j < columns.length; j += 1) {
                var choices = [
                    {key: null, name: '---'}
                ];
                var selectedIndex = this.getCell(i, j, null);
                var value = (
                    (selectedIndex === null)
                    ? '---'
                    : acts[selectedIndex].name
                );

                for (var k = 0; k < acts.length; k += 1) {
                    var parts = acts[k].parts.filter(
                        function (part) {
                            return actors[part.actor];
                        }
                    );
                    if (this.state.songFlags[j]) {
                        parts = parts.filter(
                            function (part) {
                                return part.kind.indexOf('sang') !== -1;
                            }
                        );
                    }
                    var actActors = parts.map(
                        function (part) {
                            return part.actor;
                        }
                    );
                    var text = acts[k].name;
                    if (!timeslotActs[k]) {
                        var cnt = actActors.length;
                        text = '[' + cnt + '] ' + text;
                        if (cnt > 0) {
                            text += ' (' + actActors.join(', ') + ')';
                        }
                    }
                    choices.push(
                        {key: k, name: text}
                    );
                }
                row.push(
                    <td key={j}>
                    <Choice value={value}
                            choices={choices}
                            onChange={onChange.bind(this, i, j)} />
                    </td>
                );
            }

            // Add conflicts cell
            var conflicts = [];
            for (var actor in actors) {
                if (actors[actor] > 1) {
                    conflicts.push(actor);
                }
            }
            row.push(<td key='conflicts'>{conflicts.join(', ')}</td>);
            row.push(
                <td key='others'>
                    <MultiChoice value={[]} choices={[{key: 1, name: 2}, {key: 3, name: 4}]} onChange={function () {}}/>
                </td>
            );

            rows.push(<tr key={i}>{row}</tr>);
        }

        return <div>
            Steder: <input valueLink={this.linkState('columns')} />
            Afbud: <input valueLink={this.linkState('absent')} />
            Destruktør: <input valueLink={this.linkState('director')} />
            <table className='planner'>
            <thead>{header}</thead>
            <tbody>{rows}</tbody>
            </table>
        </div>;
    }
});

var Rollefordeling = React.createClass({
    mixins: [React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {acts: []};
    },
    setActs: function (acts) {
        this.setState({'acts': acts});
    },
    render: function () {
        return <div>
            <ActsInput onChange={this.setActs} />
            <Planner acts={this.state.acts} />
        </div>
    }
});

React.render(
    <Rollefordeling />,
    document.body
);
