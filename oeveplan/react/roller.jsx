// vim:set ft=javascript sw=4 et:
'use strict';

function unique(x) {
    var sorted = [].slice.call(x);
    sorted.sort();
    var k = 0;
    for (var i = 1; i < sorted.length; ++i) {
        if (sorted[k] != sorted[i]) {
            sorted[++k] = sorted[i];
        }
    }
    return sorted.slice(0, k + 1);
}

function duplicates(x) {
    var res = [].slice.call(x);
    res.sort();
    var prev = null;
    var k = 0;
    for (var i = 0; i < res.length; i += 1) {
        if (res[i] !== prev) {
            prev = res[i];
        } else {
            res[k++] = res[i];
        }
    }
    return unique(res.slice(0, k));
}

function Revue(actsString) {
    var lines = actsString ? actsString.split('\n') : [];
    var rows = lines.filter(
        function (s) { return !!s; }
    ).map(
        function (s) { return s.split('\t'); }
    );
    var act = null;
    var actName = null;
    this.acts = [];
    var actors = [];
    for (var i = 0; i < rows.length; i += 1) {
        var row = rows[i];
        if (row[0] !== actName) {
            act = {
                name: row[0],
                parts: []
            };
            actName = act.name;
            this.acts.push(act);
        }
        act.parts.push({
            name: row[1],
            kind: row[2],
            actor: row[3],
            singer: (row[2].indexOf('sang') !== -1)
        });
        actors.push(row[3]);
    }
    this.actors = unique(actors);
}

Revue.prototype.stringify = function Revue_stringify() {
    return JSON.stringify({acts: this.acts, actors: this.actors});
};

var ActsInput = React.createClass({
    getInitialState: function () {
        return {acts: '', revueString: ''};
    },
    render: function() {
        return <div>
            <textarea value={this.state.acts}
                      onChange={this.actsStringChange} />
            <textarea value={this.state.revueString} readOnly={true} />
        </div>;
    },
    actsStringChange: function (event) {
        var s = event.target.value;
        if (s !== this.state.acts) {
            var r = new Revue(s);
            this.setState({'acts': s, 'revueString': r.stringify()});
            this.props.onChange(r);
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

        var onChange = function (i) {
            var sel = this.state.selected.slice();
            sel[i] = !sel[i];
            this.setState({selected: sel});
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

var ActorChoice = React.createClass({
    choiceChange: function (k) {
        this.props.onChange(k);
    },
    render: function () {
        var choices = this.props.actors.map(
            function (actor, i) {
                return {key: actor, name: actor};
            }
        );
        if (this.props.blank) {
            choices.splice(0, 0, {key: '', name: '---'});
        }
        return <Choice choices={choices} onChange={this.choiceChange}
                       value={this.props.value} />;
    }
});

var MultiActorChoice = React.createClass({
    choiceChange: function (k) {
        this.props.onChange(k);
    },
    render: function () {
        var choices = this.props.actors.map(
            function (actor, i) {
                return {key: actor, name: actor};
            }
        );
        return <MultiChoice
            choices={choices}
            onChange={this.choiceChange}
            value={this.props.value} />;
    }
});

var SpecificAct = React.createClass({
    render: function () {
        function act_to_choice(act, idx) {
            var conflicts = [];
            for (var j = 0; j < act.parts.length; j += 1) {
                var part = act.parts[j];
                if (!this.props.singers || part.singer) {
                    if (this.props.people.indexOf(part.actor) !== -1) {
                        conflicts.push(part.actor);
                    }
                }
            }
            var label = '[' + conflicts.length + '] ' + act.name;
            if (conflicts.length > 0) {
                conflicts.sort();
                label += ' (' + conflicts.join(', ') + ')';
            }

            // The `key` here is what ends up in PlannerRow.state.acts
            return {key: idx, name: label};
        }
        var choices = this.props.revue.acts.map(act_to_choice.bind(this));
        choices.unshift({key: null, name: '---'});
        console.log("The value is", this.props.value);
        var value = (this.props.value === null) ? '---'
            : this.props.revue.acts[this.props.value].name;
        return <Choice value={value}
                       choices={choices}
                       onChange={this.props.onChange} />;
    }
});

var PlannerRow = React.createClass({
    propTypes: {
        columns: React.PropTypes.arrayOf(React.PropTypes.shape({
            key: React.PropTypes.string,
            singers: React.PropTypes.bool
        })),
        revue: React.PropTypes.instanceOf(Revue)
    },
    getInitialState: function () {
        return {
            acts: {},
            others: []
        };
    },
    setAct: function (idx, act) {
        var acts = {};
        for (var i = 0; i < this.props.columns.length; i += 1) {
            var k = this.props.columns[i].key;
            var v = (k in this.state.acts) ? this.state.acts[k] : null;
            acts[k] = (idx === i) ? act : v;
        }
        console.log("Set act", idx, "to", act);
        console.log("acts:", acts);
        this.setState({'acts': acts});
    },
    setOthers: function (others) {
        this.setState({'others': others});
    },
    getColumnPeople: function (idx) {
        if (idx === 'others') {
            return this.state.others;
        }
        var column = this.props.columns[idx];
        if (!(column.key in this.state.acts)) return [];
        var act = this.state.acts[column.key];
        if (act === null) return [];
        var parts = this.props.revue.acts[act].parts;
        if (column.singers) {
            parts = parts && parts.filter(
                function (part) {
                    return part.kind.indexOf('sang') !== -1;
                }
            );
        }
        console.log("Parts is", parts);
        var actors = parts && parts.map(function (part) { return part.actor; });
        console.log("Actors", actors);
        return actors || [];
    },
    renderColumn: function (idx, people) {
        if (idx === 'others') {
            var choices = this.props.revue.actors.map(
                function (actor, i) {
                    if (people.indexOf(actor) !== -1 && this.state.others.indexOf(actor) === -1) {
                        return {key: actor, name: '{' + actor + '}'};
                    } else {
                        return {key: actor, name: actor};
                    }
                }.bind(this)
            );
            return <MultiChoice value={this.state.others}
                                onChange={this.setOthers}
                                choices={choices} />
        }
        var column = this.props.columns[idx];
        var act = (column.key in this.state.acts) ? this.state.acts[column.key] : null;
        return <SpecificAct people={people} revue={this.props.revue}
                            onChange={this.setAct.bind(this, idx)}
                            singers={column.singers}
                            value={act} />
    },
    render: function () {
        var peopleSets = [];
        peopleSets.push(this.props.usedPeople);
        for (var i = 0; i < this.props.columns.length; i += 1) {
            peopleSets.push(this.getColumnPeople(i));
        }
        peopleSets.push(this.getColumnPeople('others'));
        var people = [].concat.apply([], peopleSets);

        var columns = [];
        for (var i = 0; i < this.props.columns.length; i += 1) {
            columns.push(this.renderColumn(i, people));
        }
        columns.push(this.renderColumn('others', people));
        columns.push(duplicates(people).join(', '));

        var cells = columns.map(
            function (o, i) {
                return <td key={i}>{o}</td>;
            }
        );
        return <tr>{cells}</tr>;
    }
});

var Planner = React.createClass({
    mixins: [React.addons.LinkedStateMixin],
    getInitialState: function () {
        return {
            columns: 'Scenen,I aflukket,Bandet (d01)',
            rows: 20,
            songFlags: [false, false, true],
            absent: [],
            director: ''
        };
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
    setAbsent: function (a) {
        this.setState({absent: a});
    },
    setDirector: function (d) {
        this.setState({director: d});
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

        var absent = this.state.absent;

        for (var j = 0; j < columns.length; j += 1) {
            header.push(
                <th key={j}>
                    <input type="checkbox" onChange={songChange.bind(this, j)}
                           checked={!!this.state.songFlags[j]} />
                    {columns[j]}
                </th>
            );
        }
        header.push(<th key='others'>Andre</th>);
        header.push(<th key='conflicts'>Konflikter</th>);

        var plannerRowColumns = columns.map(
            function (name, j) {
                return {key: name, singers: this.state.songFlags[j]};
            }.bind(this)
        );
        var usedPeople = this.state.absent.concat([this.state.director]);
        var rows = [];
        for (var i = 0; i < this.state.rows; i += 1) {
            rows.push(
                <PlannerRow columns={plannerRowColumns}
                            revue={this.props.revue}
                            usedPeople={usedPeople} key={i} />);
        }

        return <div>
            Steder: <input valueLink={this.linkState('columns')} />
            <div>
                Afbud:
                <MultiActorChoice actors={this.props.revue.actors}
                                  value={this.state.absent}
                                  onChange={this.setAbsent} />
            </div>
            <div>
                Destruktør:
                <ActorChoice actors={this.props.revue.actors}
                             value={this.state.director || '---'}
                             blank={true}
                             onChange={this.setDirector} />
            </div>
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
        return {revue: new Revue()};
    },
    setActs: function (revue) {
        this.setState({'revue': revue});
    },
    render: function () {
        return <div>
            <ActsInput onChange={this.setActs} />
            <Planner revue={this.state.revue} acts={this.state.revue.acts} />
        </div>
    }
});

React.render(
    <Rollefordeling />,
    document.body
);
